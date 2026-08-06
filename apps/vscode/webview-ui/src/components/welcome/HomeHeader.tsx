import { EmptyRequest } from "@shared/proto/cline/common"
import ClineLogoVariable from "@/assets/ClineLogoVariable"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { UiServiceClient } from "@/services/grpc-client"

interface HomeHeaderProps {
	shouldShowQuickWins?: boolean
}

const HomeHeader = ({ shouldShowQuickWins = false }: HomeHeaderProps) => {
	const { environment } = useExtensionState()

	const handleTakeATour = async () => {
		try {
			await UiServiceClient.openWalkthrough(EmptyRequest.create())
		} catch (error) {
			console.error("Error opening walkthrough:", error)
		}
	}

	const LogoComponent = ClineLogoVariable
	const headingText = "What can I do for you?"

	return (
		<div className="flex flex-col items-center mb-4">
			<div className="mt-8 mb-5">
				<LogoComponent className="size-12 opacity-90" environment={environment} />
			</div>
			<div className="text-center flex items-center justify-center px-4">
				<h1 className="m-0 text-md font-medium tracking-tight">{headingText}</h1>
			</div>
			{shouldShowQuickWins && (
				<div className="mt-4">
					<button
						className="flex items-center gap-2 px-3 py-1.5 rounded-(--radius-surface) border border-hairline bg-transparent hover:bg-surface-hover transition-colors duration-150 ease-in-out text-description hover:text-foreground text-xs cursor-pointer"
						onClick={handleTakeATour}
						type="button">
						Take a tour
						<span className="codicon codicon-play scale-75" />
					</button>
				</div>
			)}
		</div>
	)
}

export default HomeHeader
