import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
		exclude: ["src/**/*.e2e.test.ts"],
		// Many suites here `await import(...)` the module under test so that
		// per-test `vi.mock` factories apply. That first import pulls a large
		// graph, and on a cold cache it alone can exceed vitest's 5s default —
		// the work is module loading, not the assertions. Windows runners hit
		// this routinely; the failures look like product bugs but are not.
		testTimeout: 60_000,
		hookTimeout: 60_000,
	},
});
