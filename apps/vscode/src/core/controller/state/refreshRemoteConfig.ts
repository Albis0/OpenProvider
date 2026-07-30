import { Empty, EmptyRequest } from "@shared/proto/cline/common"
import { Controller } from ".."

/**
 * Remote config (organization-level config pushed from Cline's backend) has
 * been removed along with the Cline account/billing system this fork does
 * not use. This RPC is kept as a no-op so the generated gRPC service surface
 * (protobus-server-setup.ts) still compiles without regenerating protos.
 * @param controller The controller instance
 * @param request Empty request
 * @returns Empty response
 */
export async function refreshRemoteConfig(_controller: Controller, _request: EmptyRequest): Promise<Empty> {
	return Empty.create()
}
