import { SubmitLimitIncreaseResponse } from "@shared/proto/cline/account"
import type { EmptyRequest } from "@shared/proto/cline/common"
import type { Controller } from "../index"

/**
 * Cline account spend-limit-increase requests have been removed along with
 * the account/billing system this fork does not use -- there is no backend
 * to submit this request to. Kept as a throwing no-op so the generated gRPC
 * service surface still compiles without regenerating protos.
 * @param controller The controller instance
 * @param _request Empty request
 * @returns Never resolves -- always throws
 */
export async function submitLimitIncreaseRequest(
	_controller: Controller,
	_request: EmptyRequest,
): Promise<SubmitLimitIncreaseResponse> {
	throw new Error("Account service not available")
}
