import { ClineMessage } from "@shared/ExtensionMessage"
import React, { memo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { highlightText } from "./Highlights"

interface StickyUserMessageProps {
	readonly lastUserMessage: ClineMessage | null
	readonly onScrollToMessage?: () => void
	readonly isVisible: boolean
}

/**
 * A sticky header component that displays the last user message
 * Shows when user scrolls down, allowing quick navigation back to their message
 */
export const StickyUserMessage: React.FC<StickyUserMessageProps> = memo(
	({ lastUserMessage, onScrollToMessage, isVisible }) => {
		const handleClick = useCallback(() => {
			if (onScrollToMessage) {
				onScrollToMessage()
			}
		}, [onScrollToMessage])

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault()
					if (onScrollToMessage) {
						onScrollToMessage()
					}
				}
			},
			[onScrollToMessage],
		)

		// Don't render if no user message or not visible
		if (!lastUserMessage?.text || !isVisible) {
			return null
		}

		const messageText = lastUserMessage.text.trim()

		return (
			<div
				aria-label={`Scroll to your message: ${messageText}`}
				className={cn(
					"relative flex items-center py-2 pl-3 pr-2.5 cursor-pointer select-none",
					// Same treatment as the message it points at: quiet surface with a
					// left rule marking the speaker, rather than a saturated badge block.
					"bg-surface-raised border-l-2 border-l-turn-user rounded-(--radius-surface)",
					"backdrop-blur-sm transition-colors",
					"hover:bg-surface-hover",
				)}
				onClick={handleClick}
				onKeyDown={handleKeyDown}
				role="button"
				tabIndex={0}
				title="Click to scroll to your message">
				{/* Message text (truncated via CSS text-ellipsis) */}
				<div
					className={cn(
						"flex-1 min-w-0 text-sm text-foreground",
						"overflow-hidden text-ellipsis whitespace-nowrap",
						"ph-no-capture",
					)}>
					{highlightText(messageText, false)}
				</div>
			</div>
		)
	},
	(prevProps, nextProps) => {
		return (
			prevProps.lastUserMessage?.ts === nextProps.lastUserMessage?.ts &&
			prevProps.lastUserMessage?.text === nextProps.lastUserMessage?.text &&
			prevProps.isVisible === nextProps.isVisible
		)
	},
)

StickyUserMessage.displayName = "StickyUserMessage"
