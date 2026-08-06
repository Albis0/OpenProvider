import type { ApiProvider } from "@shared/api"
import { UpdateSettingsRequest } from "@shared/proto/cline/state"
import { VSCodeRadio, VSCodeRadioGroup } from "@vscode/webview-ui-toolkit/react"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import React, { useMemo, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useProviderListings } from "@/hooks/useProviderListings"
import { StateServiceClient } from "@/services/grpc-client"
import Section from "../Section"

interface ProviderPrioritySectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

type FailoverMode = "ask" | "auto" | "stop"

/**
 * Free-tier-first starting order, used until the user reorders anything.
 * Mirrors the preference order in `apps/openprovider/src/routing/config.ts`
 * (`suggestConfig`), but is deliberately duplicated rather than imported: that
 * app is a Node CLI with its own bundler, and this is a five-element list.
 *
 * Capped at five because that is the free allotment; see the note rendered
 * under the list.
 */
const DEFAULT_FAILOVER_ORDER: ApiProvider[] = ["gemini", "cerebras", "groq", "openrouter", "nvidia"]

const FREE_PROVIDER_SLOTS = 5

const MODE_OPTIONS: Array<{ value: FailoverMode; label: string; description: string }> = [
	{
		value: "ask",
		label: "Ask first",
		description: "Show a prompt when a provider is rate limited, and wait for your choice.",
	},
	{
		value: "auto",
		label: "Switch silently",
		description: "Move to the next provider in the list without interrupting the task.",
	},
	{
		value: "stop",
		label: "Never switch",
		description: "Stay on the selected provider and surface the error as it is today.",
	},
]

/**
 * The order is sent as a repeated field plus an explicit "set" flag, because a
 * repeated proto3 field cannot be `optional`: without the flag, clearing the
 * list would be indistinguishable from omitting it from the patch.
 */
function persistOrder(order: ApiProvider[]): void {
	StateServiceClient.updateSettings(
		UpdateSettingsRequest.create({
			providerFailoverOrder: order,
			providerFailoverOrderSet: true,
		}),
	).catch((error) => {
		console.error("Failed to update provider failover order:", error)
	})
}

function persistMode(mode: FailoverMode): void {
	StateServiceClient.updateSettings(UpdateSettingsRequest.create({ providerFailoverMode: mode })).catch((error) => {
		console.error("Failed to update provider failover mode:", error)
	})
}

const ProviderPrioritySection: React.FC<ProviderPrioritySectionProps> = ({ renderSectionHeader }) => {
	const { providerFailoverMode, providerFailoverOrder } = useExtensionState()
	const { providers } = useProviderListings()
	const [addSelection, setAddSelection] = useState("")

	const mode: FailoverMode = providerFailoverMode ?? "ask"

	// A stored empty list is ambiguous: it is the value both before the user has
	// ever touched this screen and after they deliberately remove every entry.
	// Once anything is persisted from here, treat empty as the real answer —
	// otherwise removing the last row would silently restore all five defaults.
	const [hasEdited, setHasEdited] = useState(false)

	const order = useMemo<ApiProvider[]>(() => {
		if (providerFailoverOrder?.length) {
			return providerFailoverOrder
		}
		return hasEdited ? [] : DEFAULT_FAILOVER_ORDER
	}, [providerFailoverOrder, hasEdited])

	// The catalog is the source of display names; ids the catalog does not know
	// still render (by id) rather than silently disappearing from the user's list.
	const displayNameById = useMemo(() => {
		const map = new Map<string, string>()
		for (const provider of providers) {
			map.set(provider.id, provider.name)
		}
		return map
	}, [providers])

	// Everything in the catalog that is not already in the list, so the add
	// dropdown never offers a duplicate.
	const addableProviders = useMemo(() => {
		const inOrder = new Set<string>(order)
		return providers.filter((provider) => !inOrder.has(provider.id)).sort((a, b) => a.name.localeCompare(b.name))
	}, [providers, order])

	const atFreeLimit = order.length >= FREE_PROVIDER_SLOTS

	// Single mutation path, so the "user has touched this" flag is set in exactly
	// one place.
	const commit = (next: ApiProvider[]) => {
		setHasEdited(true)
		persistOrder(next)
	}

	const move = (index: number, direction: -1 | 1) => {
		const target = index + direction
		if (target < 0 || target >= order.length) {
			return
		}
		const next = [...order]
		;[next[index], next[target]] = [next[target], next[index]]
		commit(next)
	}

	const remove = (index: number) => {
		commit(order.filter((_, i) => i !== index))
	}

	const add = (providerId: string) => {
		if (order.includes(providerId as ApiProvider) || atFreeLimit) {
			return
		}
		commit([...order, providerId as ApiProvider])
		// Reset the trigger back to its placeholder; the list itself is the
		// record of what was chosen, so the select should not stay "stuck" on
		// the last pick.
		setAddSelection("")
	}

	return (
		<div>
			{renderSectionHeader("provider-priority")}
			<Section>
				<div className="mb-5">
					<label className="block font-medium mb-1" htmlFor="provider-failover-mode">
						When a provider hits its rate limit
					</label>
					<VSCodeRadioGroup
						id="provider-failover-mode"
						onChange={(event) => {
							const value = (event.target as HTMLInputElement | null)?.value
							if (value === "ask" || value === "auto" || value === "stop") {
								persistMode(value)
							}
						}}
						orientation="vertical"
						value={mode}>
						{MODE_OPTIONS.map((option) => (
							<VSCodeRadio key={option.value} value={option.value}>
								{option.label}
								<p className="text-xs mt-0 mb-0 text-description">{option.description}</p>
							</VSCodeRadio>
						))}
					</VSCodeRadioGroup>
				</div>

				<div className="mb-3">
					<label className="block font-medium mb-1" htmlFor="provider-failover-order">
						Fallback order
					</label>
					<p className="text-xs mt-0 mb-2 text-description">
						Providers are tried top to bottom. A provider is skipped if you have not saved an API key for it.
					</p>

					<ul className="list-none p-0 m-0 flex flex-col gap-1" id="provider-failover-order">
						{order.map((providerId, index) => (
							<li
								className="flex items-center gap-2 py-1.5 px-2 rounded-(--radius-surface) border border-hairline hover:bg-surface-hover transition-colors"
								key={providerId}>
								<span className="text-xs w-4 text-description">{index + 1}</span>
								<span className="flex-1 truncate">{displayNameById.get(providerId) ?? providerId}</span>
								<button
									aria-label={`Move ${providerId} up`}
									className="bg-transparent border-none cursor-pointer text-foreground disabled:opacity-30 disabled:cursor-default p-1"
									disabled={index === 0}
									onClick={() => move(index, -1)}
									type="button">
									<ChevronUp className="w-4 h-4" />
								</button>
								<button
									aria-label={`Move ${providerId} down`}
									className="bg-transparent border-none cursor-pointer text-foreground disabled:opacity-30 disabled:cursor-default p-1"
									disabled={index === order.length - 1}
									onClick={() => move(index, 1)}
									type="button">
									<ChevronDown className="w-4 h-4" />
								</button>
								<button
									aria-label={`Remove ${providerId}`}
									className="bg-transparent border-none cursor-pointer text-foreground p-1"
									onClick={() => remove(index)}
									type="button">
									<X className="w-4 h-4" />
								</button>
							</li>
						))}
					</ul>

					{order.length === 0 && (
						<p className="text-xs mt-0 mb-0 text-description">
							The list is empty — nothing will be tried after the active provider.
						</p>
					)}

					<div className="mt-2 flex items-center gap-2">
						<Select disabled={atFreeLimit || addableProviders.length === 0} onValueChange={add} value={addSelection}>
							<SelectTrigger className="w-full" size="sm">
								<SelectValue placeholder={atFreeLimit ? "All free slots used" : "Add a provider…"} />
							</SelectTrigger>
							<SelectContent>
								{addableProviders.map((provider) => (
									<SelectItem key={provider.id} value={provider.id}>
										{provider.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<p className="text-xs mt-2 mb-0 opacity-60">
						{order.length} of {FREE_PROVIDER_SLOTS} free slots used. More slots — coming soon.
					</p>
				</div>

				<p className="text-xs mt-4 mb-0 text-description">
					Switching happens mid-task: the interrupted turn resumes on the new provider and keeps the conversation. Each
					provider is tried at most once per turn.
				</p>
			</Section>
		</div>
	)
}

export default ProviderPrioritySection
