import { describe, expect, it } from "vitest"
import { getUserTypeSelections, NEW_USER_TYPE } from "../data-steps"

describe("getUserTypeSelections", () => {
	// The FREE / POWER / CLINE_PASS options all needed a Cline-hosted account,
	// which this fork does not have. Bring-your-own-key is the only path that
	// works, so it is the only one offered — regardless of what the catalog says
	// about ClinePass model availability.
	it("offers only the bring-your-own-key path", () => {
		expect(getUserTypeSelections(false).map((s) => s.type)).toEqual([NEW_USER_TYPE.BYOK])
	})

	it("still offers only BYOK when ClinePass models are reported as available", () => {
		expect(getUserTypeSelections(true).map((s) => s.type)).toEqual([NEW_USER_TYPE.BYOK])
	})
})
