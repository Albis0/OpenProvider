/**
 * Faz 6 bitiş kriteri.
 *
 * `session.quota()` should say used / limit / remaining per provider, and for a
 * provider that publishes rate-limit headers the number should match what the
 * provider itself reports.
 *
 * The store and the parsers are checked deterministically against a temp
 * directory and synthetic headers. The last section makes one real request
 * with the header observer installed, which is the only way to find out
 * whether the headers are actually there.
 *
 *   bun run src/probe-quota.ts
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	formatQuota,
	MissingProviderError,
	observeRateLimits,
	OpenProviderSession,
	parseDuration,
	parseRateLimitHeaders,
	providerForUrl,
	QuotaTracker,
	resolveProvider,
	UsageStore,
} from "./index";

const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
function record(name: string, passed: boolean, detail: string): void {
	checks.push({ name, passed, detail });
	console.log(`  ${passed ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}
function heading(title: string): void {
	console.log(`\n${"─".repeat(68)}\n${title}\n${"─".repeat(68)}`);
}

async function testStore(): Promise<void> {
	heading("1. Usage store (temp dir, fixed clock)");
	const dir = await mkdtemp(path.join(tmpdir(), "openprovider-quota-"));
	try {
		let clock = 1_000_000_000_000;
		const store = new UsageStore({ dir, now: () => clock });

		await store.record({ providerId: "groq", inputTokens: 100, outputTokens: 50, ok: true });
		clock += 30_000;
		await store.record({ providerId: "groq", inputTokens: 200, outputTokens: 80, ok: true });
		clock += 5 * 60_000; // push the first two out of the minute window
		await store.record({ providerId: "groq", inputTokens: 10, outputTokens: 5, ok: false });

		const lastMinute = await store.totals("groq", 60_000);
		record(
			"window query counts only what is inside it",
			lastMinute.requests === 1 && lastMinute.totalTokens === 15,
			`requests=${lastMinute.requests}, tokens=${lastMinute.totalTokens}`,
		);

		const today = await store.today("groq");
		record(
			"daily totals include everything since midnight",
			today.requests === 3 && today.totalTokens === 445,
			`requests=${today.requests}, tokens=${today.totalTokens}`,
		);

		// A daily cap is meaningless if it resets when the process exits.
		const reopened = new UsageStore({ dir, now: () => clock });
		const persisted = await reopened.today("groq");
		record(
			"usage survives a new process",
			persisted.requests === 3,
			`reloaded requests=${persisted.requests}`,
		);

		record(
			"failed requests are still counted",
			(await store.since("groq", 60_000)).some((event) => !event.ok),
			"a rejected request can still consume quota",
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

function testHeaderParsing(): void {
	heading("2. Header parsing");

	record(
		"bare numbers are seconds (retry-after)",
		parseDuration("48") === 48_000,
		`"48" -> ${parseDuration("48")}ms`,
	);
	record(
		"compound durations",
		parseDuration("1m30s") === 90_000 && parseDuration("7.66s") === 7660,
		`"1m30s" -> ${parseDuration("1m30s")}, "7.66s" -> ${parseDuration("7.66s")}`,
	);
	record(
		"milliseconds are not read as seconds",
		parseDuration("500ms") === 500,
		`"500ms" -> ${parseDuration("500ms")}`,
	);

	const headers = new Headers({
		"x-ratelimit-limit-tokens": "8000",
		"x-ratelimit-remaining-tokens": "6500",
		"x-ratelimit-reset-tokens": "11.25s",
	});
	const snapshot = parseRateLimitHeaders("groq", headers, 123);
	record(
		"reads the x-ratelimit family",
		snapshot?.tokensLimit === 8000 &&
			snapshot?.tokensRemaining === 6500 &&
			snapshot?.resetsInMs === 11_250,
		`limit=${snapshot?.tokensLimit}, remaining=${snapshot?.tokensRemaining}, reset=${snapshot?.resetsInMs}ms`,
	);
	record(
		"returns nothing when no rate-limit headers are present",
		parseRateLimitHeaders("groq", new Headers({ "content-type": "application/json" })) ===
			undefined,
		"undefined",
	);
	record(
		"attributes a response to a provider by host",
		providerForUrl("https://api.groq.com/openai/v1/chat/completions") === "groq" &&
			providerForUrl("https://generativelanguage.googleapis.com/v1/x") === "gemini",
		"groq + gemini recognised",
	);
}

async function testTracker(): Promise<void> {
	heading("3. Tracker picks the most trustworthy source");
	const dir = await mkdtemp(path.join(tmpdir(), "openprovider-quota2-"));
	try {
		const store = new UsageStore({ dir });
		await store.record({ providerId: "groq", inputTokens: 1000, outputTokens: 240, ok: true });

		// Without headers: local counters against the measured limit.
		const local = new QuotaTracker({ store });
		const localSnapshot = await local.snapshot("groq");
		record(
			"falls back to a local estimate, and says so",
			localSnapshot.source === "local-estimate" &&
				localSnapshot.tokensPerMinute?.limit === 8000 &&
				localSnapshot.tokensPerMinute?.used === 1240,
			formatQuota(localSnapshot),
		);
		record(
			"the estimate states its blind spot",
			(localSnapshot.note ?? "").includes("other tools"),
			"note mentions other tools sharing the key",
		);

		// With headers: the provider's own numbers win.
		const withHeaders = new QuotaTracker({
			store,
			observer: {
				latest: () => ({
					providerId: "groq",
					observedAt: 42,
					tokensLimit: 8000,
					tokensRemaining: 2000,
					resetsInMs: 30_000,
				}),
				uninstall: () => {},
			},
		});
		const headerSnapshot = await withHeaders.snapshot("groq");
		record(
			"provider headers override the local estimate",
			headerSnapshot.source === "provider-headers" &&
				headerSnapshot.tokensPerMinute?.used === 6000 &&
				headerSnapshot.tokensPerMinute?.remaining === 2000,
			formatQuota(headerSnapshot),
		);

		const unknown = await local.snapshot("some-new-provider");
		record(
			"an unknown provider reports usage without inventing a limit",
			unknown.source === "unknown" &&
				unknown.tokensPerMinute?.limit === undefined,
			formatQuota(unknown),
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testLive(): Promise<void> {
	heading("4. A real request, with the header observer installed");

	const provider = resolveProvider();
	console.log(`  provider: ${provider.providerId} / ${provider.modelId}`);

	const usageDir = await mkdtemp(path.join(tmpdir(), "openprovider-quota3-"));
	const projectDir = await mkdtemp(path.join(tmpdir(), "openprovider-proj-"));
	let session: OpenProviderSession | undefined;
	try {
		session = await OpenProviderSession.create({
			projectDir,
			configDir: path.join(import.meta.dirname, ".."),
			disableContext: true,
			observeRateLimitHeaders: true,
			usageDir,
			onEvent: (message) => console.log(`  · ${message}`),
		});

		await session.run("Reply with the single word: ok.", {
			mode: "code",
			verify: false,
		});

		const snapshots = await session.quota([provider.providerId]);
		const snapshot = snapshots[0];
		if (!snapshot) {
			record("quota snapshot returned", false, "none");
			return;
		}

		console.log(`\n  ${formatQuota(snapshot)}\n`);

		record(
			"usage was recorded for the provider that served the run",
			(snapshot.tokensPerMinute?.used ?? 0) > 0 ||
				(snapshot.requestsPerDay?.used ?? 0) > 0,
			`source=${snapshot.source}, tokens=${snapshot.tokensPerMinute?.used}, requests=${snapshot.requestsPerDay?.used}`,
		);

		// The interesting question: does this provider publish headers at all?
		if (snapshot.source === "provider-headers") {
			record(
				"the provider's own numbers were used",
				snapshot.tokensPerMinute?.limit !== undefined,
				`limit=${snapshot.tokensPerMinute?.limit}, remaining=${snapshot.tokensPerMinute?.remaining}`,
			);
		} else {
			console.log(
				`  NOTE  ${provider.providerId} published no x-ratelimit headers on this route; ` +
					"the local estimate stands in.",
			);
		}
	} finally {
		session?.dispose();
		await rm(usageDir, { recursive: true, force: true });
		await rm(projectDir, { recursive: true, force: true });
	}
}

async function main(): Promise<void> {
	await testStore();
	testHeaderParsing();
	await testTracker();

	try {
		await testLive();
	} catch (error) {
		if (error instanceof MissingProviderError) {
			console.log(`\n  (skipping live test: ${error.message})`);
		} else {
			throw error;
		}
	}

	heading("Result");
	const failed = checks.filter((check) => !check.passed);
	console.log(`  ${checks.length - failed.length}/${checks.length} checks passed`);
	console.log(`\n[quota] ${failed.length === 0 ? "PASS" : "FAIL"}`);
	process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
	console.error("[quota] failed:", error);
	process.exit(1);
});
