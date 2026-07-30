import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import Section from "../Section"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}
const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-2">
					<h2 className="text-lg font-semibold">OpenProvider v{version}</h2>
					<p>
						One agent. Every provider. Free. A coding agent built around free API providers, with tools that let it
						create & edit files, explore large projects, use the browser, and execute terminal commands (after you
						grant permission).
					</p>

					<h3 className="text-md font-semibold">Development</h3>
					<p>
						<VSCodeLink href="https://github.com/Albis0/OpenProvider">GitHub</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/Albis0/OpenProvider/issues"> Issues</VSCodeLink>
					</p>

					<p className="text-xs opacity-70">
						Derived from <VSCodeLink href="https://github.com/cline/cline">Cline</VSCodeLink> (Apache-2.0), modified.
					</p>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
