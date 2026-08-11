/**
 * On-disk names for the rules/workflows/hooks directories.
 *
 * The project is branded OpenProvider, so new directories are created as
 * `.openproviderrules`. But the extension is a Cline fork, and any project a
 * user already had open has a real `.clinerules` directory sitting in it —
 * renaming the constant alone would make those rules silently stop loading,
 * which is the worst possible failure here: no error, the agent just quietly
 * ignores the user's instructions.
 *
 * So the name is split in two:
 *   - PRIMARY is what we create and what the UI talks about.
 *   - LEGACY is still read when it exists.
 *
 * Resolution is "first one that exists on disk, else PRIMARY", so a project
 * with neither gets the new name, a project with only the old one keeps
 * working, and a project with both prefers the new one.
 */

/** What we create and show to the user. */
export const PRIMARY_RULES_DIR = ".openproviderrules"

/** Read-only compatibility with the upstream Cline layout. */
export const LEGACY_RULES_DIRS = [".clinerules"] as const

/** Every rules directory name we will read, in precedence order. */
export const ALL_RULES_DIRS = [PRIMARY_RULES_DIR, ...LEGACY_RULES_DIRS] as const

/**
 * Picks the rules directory to use for a workspace.
 *
 * `exists` is injected rather than imported so this stays a pure function —
 * the callers already hold an fs helper, and the tests need it without a disk.
 */
export async function resolveRulesDirName(
	workspacePath: string,
	exists: (absolutePath: string) => Promise<boolean>,
	join: (...parts: string[]) => string,
): Promise<string> {
	for (const candidate of ALL_RULES_DIRS) {
		if (await exists(join(workspacePath, candidate))) {
			return candidate
		}
	}
	// Nothing on disk yet: whatever gets created should carry the new name.
	return PRIMARY_RULES_DIR
}
