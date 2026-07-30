// Cline account API endpoints (login, credits, organizations, remote config)
// have been removed along with the account/billing system this fork does not
// use and has no consumers left. This file now only keeps the auth error
// message string, which several generic error-classification code paths
// still pattern-match against (the string itself can no longer actually be
// produced, since there is no Cline account backend to return it).
export const CLINE_ACCOUNT_AUTH_ERROR_MESSAGE = "Unauthorized: Please sign in to Cline before trying again."
