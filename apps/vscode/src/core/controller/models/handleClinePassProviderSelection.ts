import type { ApiConfiguration } from "@shared/api"
import type { Controller } from "../index"

export const CLINE_PASS_PROVIDER_ID = "cline-pass"

/**
 * ClinePass always used the user's personal Cline account balance. Cline
 * account/billing (including account switching) has been removed along with
 * the rest of that system this fork does not use, so this is now a no-op --
 * the "cline-pass" provider ID itself is left in place elsewhere (provider
 * lists, model catalog, etc.) since untangling a first-class provider ID from
 * the rest of the provider system is out of scope here.
 */
export async function clearOrganizationForClinePassProviderSelection(
	_controller: Controller,
	_apiConfiguration: Pick<ApiConfiguration, "planModeApiProvider" | "actModeApiProvider">,
): Promise<void> {
	// No-op: Cline account/organization switching has been removed.
}
