import { describe, expect, it } from "vitest"
import { LEGACY_RULES_DIRS, PRIMARY_RULES_DIR, resolveRulesDirName } from "./rule-directory-names"

const join = (...parts: string[]) => parts.join("/")

/** Resolves against a fixed set of paths "on disk". */
function diskWith(...existing: string[]) {
	const set = new Set(existing)
	return async (candidate: string) => set.has(candidate)
}

describe("resolveRulesDirName", () => {
	it("uses the OpenProvider name in a project with no rules directory", async () => {
		const resolved = await resolveRulesDirName("/repo", diskWith(), join)

		expect(resolved).toBe(PRIMARY_RULES_DIR)
	})

	// The whole reason this function exists. A fork user opening a project they
	// built under Cline must not silently lose their rules.
	it("keeps reading a legacy .clinerules directory", async () => {
		const resolved = await resolveRulesDirName("/repo", diskWith("/repo/.clinerules"), join)

		expect(resolved).toBe(".clinerules")
	})

	it("prefers the OpenProvider directory when a project has both", async () => {
		const resolved = await resolveRulesDirName("/repo", diskWith("/repo/.clinerules", `/repo/${PRIMARY_RULES_DIR}`), join)

		expect(resolved).toBe(PRIMARY_RULES_DIR)
	})

	it("looks under the workspace it was given, not the process cwd", async () => {
		const seen: string[] = []
		await resolveRulesDirName(
			"/some/other/workspace",
			async (candidate) => {
				seen.push(candidate)
				return false
			},
			join,
		)

		expect(seen.every((candidate) => candidate.startsWith("/some/other/workspace/"))).toBe(true)
	})

	// Guards the ordering contract: PRIMARY must be probed first, otherwise the
	// "both exist" case above would resolve the other way.
	it("probes the OpenProvider name before any legacy name", async () => {
		const seen: string[] = []
		await resolveRulesDirName(
			"/repo",
			async (candidate) => {
				seen.push(candidate)
				return false
			},
			join,
		)

		expect(seen).toEqual([`/repo/${PRIMARY_RULES_DIR}`, ...LEGACY_RULES_DIRS.map((dir) => `/repo/${dir}`)])
	})
})
