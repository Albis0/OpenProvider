import React from "react"
import { QuickWinTask } from "./quickWinTasks"

interface QuickWinCardProps {
	task: QuickWinTask
	onExecute: () => void
}

const renderIcon = (iconName?: string) => {
	if (!iconName) {
		return <span className="codicon codicon-rocket text-base! leading-none!" />
	}

	let iconClass = "codicon-rocket"
	switch (iconName) {
		case "WebAppIcon":
			iconClass = "codicon-dashboard"
			break
		case "TerminalIcon":
			iconClass = "codicon-terminal"
			break
		case "GameIcon":
			iconClass = "codicon-game"
			break
		default:
			break
	}
	return <span className={`codicon ${iconClass} text-base! leading-none!`} />
}

const QuickWinCard: React.FC<QuickWinCardProps> = ({ task, onExecute }) => {
	return (
		<button
			className="w-full text-left flex items-center gap-3 py-2 px-3 rounded-(--radius-surface) cursor-pointer group transition-colors duration-150 ease-in-out bg-transparent border border-hairline hover:bg-surface-hover"
			onClick={() => onExecute()}
			type="button">
			<div className="shrink-0 flex items-center justify-center w-5 h-5 text-description group-hover:text-foreground transition-colors">
				{renderIcon(task.icon)}
			</div>

			<div className="grow min-w-0">
				<h3 className="text-xs font-medium truncate text-foreground leading-snug m-0">{task.title}</h3>
				<p className="text-xs truncate text-description leading-snug m-0">{task.description}</p>
			</div>
		</button>
	)
}

export default QuickWinCard
