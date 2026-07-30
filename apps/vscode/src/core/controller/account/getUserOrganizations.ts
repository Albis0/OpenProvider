import { UserOrganizationsResponse } from "@shared/proto/cline/account"
import type { EmptyRequest } from "@shared/proto/cline/common"
import type { Controller } from "../index"

/**
 * Cline account organizations have been removed along with the account
 * system this fork does not use -- there is no backend to fetch this data
 * from. Always returns an empty list so the generated gRPC service surface
 * still compiles and resolves without regenerating protos.
 * @param controller The controller instance
 * @param request Empty request
 * @returns An empty organizations list
 */
export async function getUserOrganizations(_controller: Controller, _request: EmptyRequest): Promise<UserOrganizationsResponse> {
	return UserOrganizationsResponse.create({ organizations: [] })
}
