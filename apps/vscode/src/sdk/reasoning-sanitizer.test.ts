import type { AgentMessage } from "@cline/agents"
import { describe, expect, it } from "vitest"
import { providerRejectsReasoningHistory, stripReasoningParts } from "./reasoning-sanitizer"

const assistant = (...content: Array<{ type: string; text?: string }>): AgentMessage =>
	({ role: "assistant", content }) as unknown as AgentMessage

const user = (text: string): AgentMessage => ({ role: "user", content: [{ type: "text", text }] }) as unknown as AgentMessage

describe("providerRejectsReasoningHistory", () => {
	it("flags Groq, which rejects the reasoning its own model emits", () => {
		expect(providerRejectsReasoningHistory("groq")).toBe(true)
	})

	// Stripping everywhere would throw away context the model can legitimately
	// use on providers that accept it.
	it("leaves other providers alone", () => {
		expect(providerRejectsReasoningHistory("gemini")).toBe(false)
		expect(providerRejectsReasoningHistory("nvidia")).toBe(false)
		expect(providerRejectsReasoningHistory(undefined)).toBe(false)
	})
})

describe("stripReasoningParts", () => {
	it("removes reasoning while keeping the assistant's actual answer", () => {
		const { messages, removed } = stripReasoningParts([
			user("hi"),
			assistant({ type: "reasoning", text: "thinking..." }, { type: "text", text: "hello" }),
		])

		expect(removed).toBe(1)
		expect(messages[1].content).toEqual([{ type: "text", text: "hello" }])
	})

	// An assistant turn can be reasoning and nothing else. Removing its content
	// outright leaves an empty message, which providers reject just as firmly as
	// the reasoning field did.
	it("leaves a placeholder when a message was only reasoning", () => {
		const { messages, removed } = stripReasoningParts([assistant({ type: "reasoning", text: "thinking..." })])

		expect(removed).toBe(1)
		expect(messages[0].content).toEqual([{ type: "text", text: "" }])
	})

	it("does not touch user or tool messages", () => {
		const input = [user("hi"), { role: "tool", content: [{ type: "reasoning", text: "x" }] } as unknown as AgentMessage]

		const { messages, removed } = stripReasoningParts(input)

		expect(removed).toBe(0)
		expect(messages).toEqual(input)
	})

	it("reports nothing removed when there is no reasoning to strip", () => {
		const { messages, removed } = stripReasoningParts([user("hi"), assistant({ type: "text", text: "hello" })])

		expect(removed).toBe(0)
		expect(messages[1].content).toEqual([{ type: "text", text: "hello" }])
	})

	it("strips across a multi-turn history, not just the last message", () => {
		const { removed } = stripReasoningParts([
			user("one"),
			assistant({ type: "reasoning", text: "a" }, { type: "text", text: "first" }),
			user("two"),
			assistant({ type: "reasoning", text: "b" }, { type: "text", text: "second" }),
		])

		expect(removed).toBe(2)
	})

	it("does not mutate the messages it was given", () => {
		const original = assistant({ type: "reasoning", text: "thinking..." }, { type: "text", text: "hello" })
		const input = [original]

		stripReasoningParts(input)

		expect(original.content).toHaveLength(2)
	})
})
