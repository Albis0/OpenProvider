import { UserCreditsData } from "@shared/proto/cline/account"
import type { EmptyRequest } from "@shared/proto/cline/common"
import type { Controller } from "../index"

/**
 * Cline account credits/billing has been removed along with the account
 * system this fork does not use -- there is no backend to fetch this data
 * from. Kept as a throwing no-op so the generated gRPC service surface still
 * compiles without regenerating protos.
 * @param controller The controller instance
 * @param request Empty request
 * @returns Never resolves -- always throws
 */
export async function getUserCredits(_controller: Controller, _request: EmptyRequest): Promise<UserCreditsData> {
	throw new Error("Account service not available")
}
