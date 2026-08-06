import { AskResponseRequest } from "@shared/proto/cline/task"
import { useState } from "react"
import styled from "styled-components"
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { TaskServiceClient } from "@/services/grpc-client"

/*
 * Selected/hover previously hardcoded `white` text on --vscode-focusBorder,
 * which is unreadable on light themes where that border is a pale blue. The
 * button colors now come from the theme's own button roles, which are
 * guaranteed to be a legible pair in every theme.
 */
const OptionButton = styled.button<{ $isSelected?: boolean; $isNotSelectable?: boolean }>`
	padding: 6px 10px;
	background: ${(props) => (props.$isSelected ? "var(--vscode-button-background)" : CODE_BLOCK_BG_COLOR)};
	color: ${(props) => (props.$isSelected ? "var(--vscode-button-foreground)" : "var(--vscode-input-foreground)")};
	border: 1px solid ${(props) => (props.$isSelected ? "transparent" : "var(--vscode-editorGroup-border)")};
	border-radius: 4px;
	cursor: ${(props) => (props.$isNotSelectable ? "default" : "pointer")};
	text-align: left;
	font-size: 12px;
	transition: background 120ms ease, color 120ms ease, border-color 120ms ease;

	${(props) =>
		!props.$isNotSelectable &&
		`
		&:hover {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border-color: transparent;
		}
	`}
`

export const OptionsButtons = ({
	options,
	selected,
	isActive,
	inputValue,
}: {
	options?: string[]
	selected?: string
	isActive?: boolean
	inputValue?: string
}) => {
	const optionItems = options ?? []
	const optionsKey = optionItems.join("\u0000")
	const optimisticSelectionKey = `${selected ?? ""}\u0001${optionsKey}`
	const [optimisticSelection, setOptimisticSelection] = useState<{ key: string; option: string }>()

	if (!optionItems.length) {
		return null
	}

	const selectedOption =
		selected !== undefined && optionItems.includes(selected)
			? selected
			: optimisticSelection?.key === optimisticSelectionKey
				? optimisticSelection.option
				: undefined
	const hasSelected = selectedOption !== undefined && optionItems.includes(selectedOption)

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "8px",
			}}>
			{/* <div style={{ color: "var(--vscode-descriptionForeground)", fontSize: "11px", textTransform: "uppercase" }}>
				SELECT ONE:
			</div> */}
			{optionItems.map((option, index) => (
				<OptionButton
					$isNotSelectable={hasSelected || !isActive}
					$isSelected={option === selectedOption}
					className="options-button"
					disabled={hasSelected || !isActive}
					id={`options-button-${index}`}
					key={option}
					onClick={async () => {
						if (hasSelected || !isActive) {
							return
						}
						setOptimisticSelection({ key: optimisticSelectionKey, option })
						try {
							await TaskServiceClient.askResponse(
								AskResponseRequest.create({
									responseType: "messageResponse",
									text: option + (inputValue ? `: ${inputValue?.trim()}` : ""),
									images: [],
								}),
							)
						} catch (error) {
							setOptimisticSelection(undefined)
							console.error("Error sending option response:", error)
						}
					}}>
					<span className="ph-no-capture">{option}</span>
				</OptionButton>
			))}
		</div>
	)
}
