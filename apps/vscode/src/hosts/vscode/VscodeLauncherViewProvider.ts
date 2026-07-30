import * as vscode from "vscode"
import { ExtensionRegistryInfo } from "@/registry"
import { Logger } from "@/shared/services/Logger"

/**
 * Backs the activity bar icon.
 *
 * The chat webview itself lives in the secondary (right) side bar, and VS Code
 * cannot show one view in two containers. So the activity bar gets its own tiny
 * view whose only job is to reveal the real one: when VS Code resolves it (i.e.
 * the user clicked the icon), it focuses the secondary side bar view and then
 * switches the primary side bar back to whatever was there before, so the click
 * reads as "open OpenProvider on the right" rather than "replace my explorer".
 */
export class VscodeLauncherViewProvider implements vscode.WebviewViewProvider {
	public static readonly VIEW_ID = ExtensionRegistryInfo.views.Launcher

	resolveWebviewView(webviewView: vscode.WebviewView): void {
		webviewView.webview.options = { enableScripts: false }
		// Shown only for the instant before the primary side bar is closed again.
		webviewView.webview.html = /*html*/ `
			<!DOCTYPE html>
			<html lang="en">
				<body style="font-family: var(--vscode-font-family); color: var(--vscode-descriptionForeground); padding: 12px;">
					<p>OpenProvider opens in the secondary side bar.</p>
				</body>
			</html>`

		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				void this.revealSecondarySidebar()
			}
		})

		if (webviewView.visible) {
			void this.revealSecondarySidebar()
		}
	}

	private async revealSecondarySidebar(): Promise<void> {
		try {
			// Focusing the view opens the secondary side bar and selects OpenProvider
			// in it. VS Code registers `<viewId>.focus` for every contributed view.
			await vscode.commands.executeCommand(`${ExtensionRegistryInfo.views.Sidebar}.focus`)
			// Hide the placeholder so the primary side bar does not sit on this empty
			// view; VS Code restores the previously active container.
			await vscode.commands.executeCommand("workbench.action.closeSidebar")
		} catch (error) {
			Logger.error("[Launcher] Failed to reveal the secondary side bar", error)
		}
	}
}
