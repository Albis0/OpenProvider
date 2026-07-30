import { EmptyRequest, String } from "@shared/proto/cline/common"
import { Controller } from "../index"

/**
 * Cline-account login (OAuth to app.cline.bot/api.cline.bot) has been removed
 * along with the account/billing system this fork does not use. Kept as a
 * no-op so the generated gRPC service surface still compiles without
 * regenerating protos.
 *
 * @param controller The controller instance.
 * @returns An empty string (no login URL — there is no Cline account backend).
 */
export async function accountLoginClicked(_controller: Controller, _: EmptyRequest): Promise<String> {
	return { value: "" }
}
