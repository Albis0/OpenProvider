import { SVGProps } from "react"

/**
 * The OpenProvider mark: an open ring with a diamond sitting in the gap.
 * The file and component keep their original names so the many import sites
 * elsewhere in the webview stay untouched.
 */
const ClineLogoWhite = (props: SVGProps<SVGSVGElement>) => (
	<svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg" {...props}>
		<title>OpenProvider</title>
		<path
			d="M24 4.5c1.3 0 2.57.14 3.79.4l-1.5 5.55A13.5 13.5 0 1 0 37.55 21.7l5.55-1.49c.26 1.22.4 2.49.4 3.79 0 10.77-8.73 19.5-19.5 19.5S4.5 34.77 4.5 24 13.23 4.5 24 4.5Z"
			fill="white"
		/>
		<path d="m35.1 6.6 6.3 6.3-6.3 6.3-6.3-6.3z" fill="#3ddc84" />
	</svg>
)
export default ClineLogoWhite
