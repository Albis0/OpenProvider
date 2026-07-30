import { UserOrganizationUpdateRequest } from "@shared/proto/cline/account"
import { Empty } from "@shared/proto/cline/common"
import type { Controller } from "../index"

/**
 * Cline account/organization switching and remote config have been removed
 * along with the rest of the Cline account/billing system this fork does not
 * use. This RPC is kept as a no-op so the generated gRPC service surface
 * (protobus-server-setup.ts) still compiles without regenerating protos.
 * @param controller The controller instance
 * @param request UserOrganization to set as active
 * @returns Empty response
 */
export async function setUserOrganization(_controller: Controller, _request: UserOrganizationUpdateRequest): Promise<Empty> {
	return {}
}
