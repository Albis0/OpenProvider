// Replaces classic src/services/auth/AuthService.ts (see origin/main)
//
// The AuthService class is now provided by the SDK adapter layer.
// All modules that import AuthService from this path continue to work
// because the SDK AuthService exposes the same interface.
//
// Cline-account auth (login/credits/organizations) has been removed along
// with the account/billing system this fork does not use. AuthService now
// only carries OAuth infra for OpenRouter/Requesty/Hicap/OpenAI Codex.
// ClineAccountUserInfo is kept here as a minimal local type since a couple of
// telemetry interfaces still reference a "user info" shape for identify calls.

export { AuthService } from "@/sdk/auth-service"

export interface ClineAccountUserInfo {
	createdAt?: string
	displayName: string
	email: string
	id: string
	organizations: { active: boolean; memberId: string; name: string; organizationId: string; roles: string[] }[]
	appBaseUrl?: string
	subject?: string
}
