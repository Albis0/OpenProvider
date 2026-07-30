import { AuthState, EmptyRequest } from "@/shared/proto/index.cline"
import { Controller } from ".."
import { StreamingResponseHandler } from "../grpc-handler"

/**
 * Cline-account auth state (login/credits/organizations) has been removed
 * along with the account/billing system this fork does not use. Push a
 * single "unauthenticated" state and never update it, so the webview's
 * subscription resolves without regenerating protos.
 */
export async function subscribeToAuthStatusUpdate(
	_controller: Controller,
	_request: EmptyRequest,
	responseStream: StreamingResponseHandler<AuthState>,
	_requestId?: string,
): Promise<void> {
	await responseStream(AuthState.create({}), false)
}
