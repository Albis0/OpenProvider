export enum NEW_USER_TYPE {
	CLINE_PASS = "cline-pass",
	FREE = "free",
	POWER = "power",
	BYOK = "byok",
}

type UserTypeSelection = {
	title: string
	description: string
	type: NEW_USER_TYPE
	learnMoreUrl?: string
}

export const STEP_CONFIG = {
	0: {
		title: "How will you use OpenProvider?",
		description: "Select an option below to get started.",
		// No sign-in button: this fork has no hosted account, so the only path is
		// bringing your own provider API key.
		buttons: [{ text: "Continue", action: "next", variant: "default" }],
	},
	[NEW_USER_TYPE.CLINE_PASS]: {
		title: "Select a ClinePass model",
		buttons: [
			{ text: "Create my Account", action: "signup", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.FREE]: {
		title: "Select a free model",
		buttons: [
			{ text: "Create my Account", action: "signup", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.POWER]: {
		title: "Select your model",
		buttons: [
			{ text: "Create my Account", action: "signup", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	[NEW_USER_TYPE.BYOK]: {
		title: "Configure your provider",
		buttons: [
			{ text: "Continue", action: "done", variant: "default" },
			{ text: "Back", action: "back", variant: "secondary" },
		],
	},
	2: {
		title: "Almost there!",
		description: "Complete account creation in your browser. Then come back here to finish up.",
		buttons: [{ text: "Back", action: "back", variant: "secondary" }],
	},
} as const

// The FREE / POWER / CLINE_PASS options all required a Cline-hosted account to
// sign up for, which this fork does not have. Bringing your own key is the only
// working path, and it is what OpenProvider is built around: free-tier keys from
// NVIDIA Build, Groq, Cerebras, Gemini or OpenRouter.
const BASE_USER_TYPE_SELECTIONS: UserTypeSelection[] = [
	{
		title: "Bring my own API key",
		description: "Use OpenProvider with the provider of your choice",
		type: NEW_USER_TYPE.BYOK,
	},
]

/** Only the bring-your-own-key path remains; the hosted-account options are gone. */
export function getUserTypeSelections(_hasClinePassModels: boolean): UserTypeSelection[] {
	return BASE_USER_TYPE_SELECTIONS
}
