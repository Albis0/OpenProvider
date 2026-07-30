import { GetOrganizationCreditsRequest, OrganizationCreditsData } from "@shared/proto/cline/account"
import type { Controller } from "../index"

/**
 * Cline account credits/billing has been removed along with the account
 * system this fork does not use -- there is no backend to fetch this data
 * from. Kept as a throwing no-op so the generated gRPC service surface still
 * compiles without regenerating protos.
 * @param controller The controller instance
 * @param request Organization credits request
 * @returns Never resolves -- always throws
 */
export async function getOrganizationCredits(
	_controller: Controller,
	_request: GetOrganizationCreditsRequest,
): Promise<OrganizationCreditsData> {
	throw new Error("Account service not available")
}
