import React from "react"
import MarkdownBlock from "../common/MarkdownBlock"

interface NewTaskPreviewProps {
	context: string
}

const NewTaskPreview: React.FC<NewTaskPreviewProps> = ({ context }) => {
	return (
		<div className="bg-surface-raised text-foreground border-l-2 border-l-turn-user rounded-(--radius-surface) py-3 px-3 pb-1.5">
			<span style={{ fontWeight: "bold" }}>Task</span>
			<MarkdownBlock markdown={context} />
		</div>
	)
}

export default NewTaskPreview
