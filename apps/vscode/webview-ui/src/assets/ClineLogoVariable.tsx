import { SVGProps } from "react"
import type { Environment } from "../../../src/shared/config-types"
import { getEnvironmentColor } from "../utils/environmentColors"

/**
 * ClineLogoVariable component renders the Cline logo with automatic theme adaptation
 * and environment-based color indicators.
 *
 * This component uses VS Code theme variables for the fill color, with environment-specific colors:
 * - Local: yellow/orange (development/experimental)
 * - Staging: blue (stable testing)
 * - Production: gray/white (default icon color)
 *
 * @param {SVGProps<SVGSVGElement> & { environment?: Environment }} props - Standard SVG props plus optional environment
 * @returns {JSX.Element} SVG Cline logo that adapts to VS Code themes and environment
 */
const ClineLogoVariable = (props: SVGProps<SVGSVGElement> & { environment?: Environment }) => {
	const { environment, ...svgProps } = props

	// Determine fill color based on environment
	const fillColor = environment ? getEnvironmentColor(environment) : "var(--vscode-icon-foreground)"

	return (
		<svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg" {...svgProps}>
			<title>OpenProvider</title>
			<path
				d="M24 4.5c1.3 0 2.57.14 3.79.4l-1.5 5.55A13.5 13.5 0 1 0 37.55 21.7l5.55-1.49c.26 1.22.4 2.49.4 3.79 0 10.77-8.73 19.5-19.5 19.5S4.5 34.77 4.5 24 13.23 4.5 24 4.5Z"
				fill={fillColor}
			/>
			<path d="m35.1 6.6 6.3 6.3-6.3 6.3-6.3-6.3z" fill="#3ddc84" />
		</svg>
	)
}
export default ClineLogoVariable
