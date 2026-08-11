import { describe, expect, it, vi } from "vitest"
import { SdkSessionConfigBuilder } from "./sdk-session-config-builder"

const mocks = vi.hoisted(() => ({
	buildSessionConfig: vi.fn(),
	buildAgentHooks: vi.fn(() => ({})),
}))

vi.mock("./cline-session-factory", () => ({
	buildSessionConfig: mocks.buildSessionConfig,
}))

vi.mock("./hooks-adapter", () => ({
	buildAgentHooks: mocks.buildAgentHooks,
}))

describe("SdkSessionConfigBuilder", () => {
	it("adds the CLI plan-mode switch_to_act_mode tool only in plan mode", async () => {
		const stateManager = {
			getGlobalSettingsKey: vi.fn(() => "plan"),
		}
		const onSwitchToActMode = vi.fn()
		const builder = new SdkSessionConfigBuilder({
			stateManager: stateManager as never,
			emitHookMessage: vi.fn(),
			onSwitchToActMode,
		})

		mocks.buildSessionConfig.mockResolvedValueOnce({
			extraTools: [],
			hooks: {},
		})
		const planConfig = await builder.build({ cwd: "/workspace", mode: "plan" })
		const switchTool = planConfig.extraTools?.find((tool) => tool.name === "switch_to_act_mode")
		expect(switchTool).toBeDefined()
		// Ends the run cleanly after the tool result so the loop never starts an
		// iteration that the stop hook would abort (which surfaced in the webview
		// as "API Request Cancelled").
		expect(switchTool?.lifecycle?.completesRun).toBe(true)
		expect(await switchTool?.execute({}, {} as never)).toBe(
			"You successfully switched to act mode, proceed with the plan. You now have access to editing files and running commands. (The switch_to_act_mode tool is only available in plan mode.)",
		)
		expect(onSwitchToActMode).toHaveBeenCalledOnce()

		mocks.buildSessionConfig.mockResolvedValueOnce({
			extraTools: [switchTool],
			hooks: {},
		})
		const actConfig = await builder.build({ cwd: "/workspace", mode: "act" })
		expect(actConfig.extraTools?.some((tool) => tool.name === "switch_to_act_mode")).toBe(false)
	})

	it("stops before the next model call after switch_to_act_mode queues a mode change", async () => {
		const baseBeforeModel = vi.fn(async () => ({ metadata: "base" }))
		mocks.buildAgentHooks.mockReturnValueOnce({ beforeModel: baseBeforeModel })
		mocks.buildSessionConfig.mockResolvedValueOnce({ hooks: {} })

		const builder = new SdkSessionConfigBuilder({
			stateManager: {} as never,
			emitHookMessage: vi.fn(),
			onSwitchToActMode: vi.fn(),
			shouldStopAfterModeSwitch: () => true,
		})

		const config = await builder.build({ cwd: "/workspace", mode: "act" })

		await expect(config.hooks?.beforeModel?.({} as never)).resolves.toEqual({
			metadata: "base",
			stop: true,
		})
		expect(baseBeforeModel).toHaveBeenCalledOnce()
	})

	// Groq emits reasoning and then refuses to accept it back, so a tool loop
	// dies on its second request with "property 'reasoning_content' is
	// unsupported" while single-turn chat looks fine.
	it("strips reasoning from history on a provider that rejects it", async () => {
		mocks.buildAgentHooks.mockReturnValueOnce({})
		mocks.buildSessionConfig.mockResolvedValueOnce({ hooks: {}, providerId: "groq" })

		const builder = new SdkSessionConfigBuilder({
			stateManager: {} as never,
			emitHookMessage: vi.fn(),
			onSwitchToActMode: vi.fn(),
		})

		const config = await builder.build({ cwd: "/workspace", mode: "act" })
		const result = await config.hooks?.beforeModel?.({
			request: {
				messages: [
					{ role: "user", content: [{ type: "text", text: "hi" }] },
					{
						role: "assistant",
						content: [
							{ type: "reasoning", text: "thinking..." },
							{ type: "text", text: "hello" },
						],
					},
				],
			},
		} as never)

		expect(result?.messages?.[1].content).toEqual([{ type: "text", text: "hello" }])
	})

	it("leaves history untouched on a provider that accepts reasoning", async () => {
		mocks.buildAgentHooks.mockReturnValueOnce({})
		mocks.buildSessionConfig.mockResolvedValueOnce({ hooks: {}, providerId: "gemini" })

		const builder = new SdkSessionConfigBuilder({
			stateManager: {} as never,
			emitHookMessage: vi.fn(),
			onSwitchToActMode: vi.fn(),
		})

		const config = await builder.build({ cwd: "/workspace", mode: "act" })
		const result = await config.hooks?.beforeModel?.({
			request: {
				messages: [{ role: "assistant", content: [{ type: "reasoning", text: "thinking..." }] }],
			},
		} as never)

		// No messages override at all, so the SDK keeps its own list.
		expect(result?.messages).toBeUndefined()
	})

	// The sanitizer runs last, so it must clean what an earlier hook returned
	// rather than the original request, or those messages go out unsanitized.
	it("sanitizes messages a base hook returned, keeping its other fields", async () => {
		mocks.buildAgentHooks.mockReturnValueOnce({
			beforeModel: async () => ({
				metadata: "base",
				messages: [
					{
						role: "assistant",
						content: [
							{ type: "reasoning", text: "from base hook" },
							{ type: "text", text: "kept" },
						],
					},
				],
			}),
		})
		mocks.buildSessionConfig.mockResolvedValueOnce({ hooks: {}, providerId: "groq" })

		const builder = new SdkSessionConfigBuilder({
			stateManager: {} as never,
			emitHookMessage: vi.fn(),
			onSwitchToActMode: vi.fn(),
		})

		const config = await builder.build({ cwd: "/workspace", mode: "act" })
		const result = await config.hooks?.beforeModel?.({ request: { messages: [] } } as never)

		expect(result?.messages?.[0].content).toEqual([{ type: "text", text: "kept" }])
		expect((result as { metadata?: string })?.metadata).toBe("base")
	})

	it("passes the mistake-limit callback into the SDK config without overriding SDK execution defaults", async () => {
		const onConsecutiveMistakeLimitReached = vi.fn()
		mocks.buildSessionConfig.mockResolvedValueOnce({ hooks: {}, execution: { maxRetries: 1 } })

		const builder = new SdkSessionConfigBuilder({
			stateManager: { getGlobalSettingsKey: vi.fn(() => 3) } as never,
			emitHookMessage: vi.fn(),
			onSwitchToActMode: vi.fn(),
			onConsecutiveMistakeLimitReached,
		})

		const config = await builder.build({ cwd: "/workspace", mode: "act" })

		expect(config.execution).toEqual({ maxRetries: 1 })
		expect(config.onConsecutiveMistakeLimitReached).toBe(onConsecutiveMistakeLimitReached)
	})
})
