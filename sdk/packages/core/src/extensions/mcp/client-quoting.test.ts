import { describe, expect, it } from "vitest";
import { quoteForCmd } from "./client";

/**
 * Windows spawns MCP servers through cmd.exe (`shell: true`) so that .cmd
 * shims like `npx` resolve. cmd.exe re-splits the command line on whitespace,
 * so anything containing a space has to be quoted by us — otherwise a command
 * under Program Files dies with "'C:\Program' is not recognized" and the
 * server's tools silently never load.
 */
describe("quoteForCmd", () => {
	it("quotes a path containing spaces", () => {
		expect(quoteForCmd("C:\\Program Files\\nodejs\\node.exe")).toBe(
			'"C:\\Program Files\\nodejs\\node.exe"',
		);
	});

	it("leaves a bare command untouched so PATH lookup still works", () => {
		// `npx`/`bunx` must stay unquoted to resolve through PATH as .cmd shims.
		expect(quoteForCmd("npx")).toBe("npx");
		expect(quoteForCmd("node")).toBe("node");
	});

	it("leaves a space-free absolute path untouched", () => {
		expect(quoteForCmd("C:\\tools\\node.exe")).toBe("C:\\tools\\node.exe");
	});

	it("quotes tokens carrying cmd metacharacters", () => {
		for (const meta of ["a&b", "a|b", "a>b", "a<b", "a^b", "a(b)"]) {
			expect(quoteForCmd(meta)).toBe(`"${meta}"`);
		}
	});

	it("escapes embedded double quotes", () => {
		expect(quoteForCmd('a"b c')).toBe('"a\\"b c"');
	});

	it("represents an empty token as an explicit empty argument", () => {
		// Dropping it would shift every later argument by one position.
		expect(quoteForCmd("")).toBe('""');
	});
});
