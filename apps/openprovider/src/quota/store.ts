/**
 * Faz 6, adım 1 — kullanım sayacı.
 *
 * Records what was actually spent per provider, so "how much is left" can be
 * answered before a request fails rather than after.
 *
 * Persistent because the limits are: Gemini's cap is per *day*, so a counter
 * that resets when the process exits would always read zero. Stored as a flat
 * JSON array under the user's home directory, pruned on write.
 *
 * Deliberately not in the repository: usage is per machine and per key, and a
 * counter file in a git tree would be noise in every diff.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export const DEFAULT_USAGE_DIR = path.join(homedir(), ".openprovider");
export const USAGE_FILENAME = "usage.json";

/** Older entries are dropped: nothing here answers questions past a day. */
const RETENTION_MS = 48 * 60 * 60 * 1000;
/** Hard cap so a busy session cannot grow the file without bound. */
const MAX_EVENTS = 5000;

export interface UsageEvent {
	providerId: string;
	/** Epoch milliseconds. */
	at: number;
	inputTokens: number;
	outputTokens: number;
	/** False when the request was rejected — it still counts against some limits. */
	ok: boolean;
}

export interface UsageTotals {
	requests: number;
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
}

function emptyTotals(): UsageTotals {
	return { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

function isUsageEvent(value: unknown): value is UsageEvent {
	if (!value || typeof value !== "object") {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		typeof record.providerId === "string" &&
		typeof record.at === "number" &&
		typeof record.inputTokens === "number" &&
		typeof record.outputTokens === "number"
	);
}

export interface UsageStoreOptions {
	/** Overrides the storage directory. Used by tests. */
	dir?: string;
	/** Fixed clock, for deterministic tests. */
	now?: () => number;
}

export class UsageStore {
	private readonly dir: string;
	private readonly now: () => number;
	private events: UsageEvent[] = [];
	private loaded = false;
	/** Serialises writes so two concurrent records cannot clobber each other. */
	private writeChain: Promise<void> = Promise.resolve();

	constructor(options: UsageStoreOptions = {}) {
		this.dir = options.dir ?? DEFAULT_USAGE_DIR;
		this.now = options.now ?? (() => Date.now());
	}

	private get filePath(): string {
		return path.join(this.dir, USAGE_FILENAME);
	}

	async load(): Promise<void> {
		if (this.loaded) {
			return;
		}
		try {
			const text = await readFile(this.filePath, "utf8");
			const parsed: unknown = JSON.parse(text);
			this.events = Array.isArray(parsed) ? parsed.filter(isUsageEvent) : [];
		} catch {
			// Missing or corrupt file: start empty rather than fail. A usage
			// counter must never be the reason a task cannot run.
			this.events = [];
		}
		this.loaded = true;
	}

	private prune(): void {
		const cutoff = this.now() - RETENTION_MS;
		this.events = this.events.filter((event) => event.at >= cutoff);
		if (this.events.length > MAX_EVENTS) {
			this.events = this.events.slice(-MAX_EVENTS);
		}
	}

	async record(event: Omit<UsageEvent, "at"> & { at?: number }): Promise<void> {
		await this.load();
		this.events.push({ ...event, at: event.at ?? this.now() });
		this.prune();

		this.writeChain = this.writeChain.then(async () => {
			try {
				await mkdir(this.dir, { recursive: true });
				await writeFile(
					this.filePath,
					JSON.stringify(this.events, null, "\t"),
					"utf8",
				);
			} catch {
				// Persisting is best-effort; in-memory numbers stay correct.
			}
		});
		await this.writeChain;
	}

	/** Events for a provider within the last `windowMs`. */
	async since(providerId: string, windowMs: number): Promise<UsageEvent[]> {
		await this.load();
		const cutoff = this.now() - windowMs;
		return this.events.filter(
			(event) => event.providerId === providerId && event.at >= cutoff,
		);
	}

	/** Totals for a provider within the last `windowMs`. */
	async totals(providerId: string, windowMs: number): Promise<UsageTotals> {
		const events = await this.since(providerId, windowMs);
		return events.reduce<UsageTotals>((totals, event) => {
			totals.requests += 1;
			totals.inputTokens += event.inputTokens;
			totals.outputTokens += event.outputTokens;
			totals.totalTokens += event.inputTokens + event.outputTokens;
			return totals;
		}, emptyTotals());
	}

	/**
	 * Totals since local midnight.
	 *
	 * Daily caps reset on the provider's clock, not ours, and Gemini does not
	 * publish which. Local midnight is the honest approximation — it can
	 * under-count near the boundary, which errs toward caution.
	 */
	async today(providerId: string): Promise<UsageTotals> {
		const midnight = new Date(this.now());
		midnight.setHours(0, 0, 0, 0);
		return this.totals(providerId, this.now() - midnight.getTime());
	}

	/** Providers seen in the retained window. */
	async providers(): Promise<string[]> {
		await this.load();
		return [...new Set(this.events.map((event) => event.providerId))];
	}
}
