import { readFile } from "fs/promises"
import { after, describe, it } from "mocha"
import path from "path"
import "should"
import * as vscode from "vscode"

const packagePath = path.join(__dirname, "..", "..", "package.json")

describe("OpenProvider Extension", () => {
	after(() => {
		vscode.window.showInformationMessage("All tests done!")
	})

	it("should verify extension ID matches package.json", async () => {
		const packageJSON = JSON.parse(await readFile(packagePath, "utf8"))
		const id = packageJSON.publisher + "." + packageJSON.name
		const clineExtensionApi = vscode.extensions.getExtension(id)

		clineExtensionApi?.id.should.equal(id)
	})

	it("should successfully execute the plus button command", async () => {
		// The extension activates on `onStartupFinished`, so its commands are not
		// registered the moment the test host is ready. Waiting a fixed 400ms
		// raced that and failed with "command not found"; await the activation
		// itself instead.
		const packageJSON = JSON.parse(await readFile(packagePath, "utf8"))
		const extension = vscode.extensions.getExtension(packageJSON.publisher + "." + packageJSON.name)
		await extension?.activate()

		await vscode.commands.executeCommand(`${packageJSON.name}.plusButtonClicked`)
	})

	// New test to verify xvfb and webview functionality
	it("should create and display a webview panel", async () => {
		// Create a webview panel
		const panel = vscode.window.createWebviewPanel("testWebview", "CI/CD Test", vscode.ViewColumn.One, {
			enableScripts: true,
		})

		// Set some HTML content
		panel.webview.html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="UTF-8">
					<title>xvfb Test</title>
				</head>
				<body>
					<div id="test">Testing xvfb display server</div>
				</body>
			</html>
		`

		// Verify panel exists
		should.exist(panel)
		panel.visible.should.be.true()

		// Clean up
		panel.dispose()
	})

	// Test webview message passing
	it("should handle webview messages", async () => {
		const panel = vscode.window.createWebviewPanel("testWebview", "Message Test", vscode.ViewColumn.One, {
			enableScripts: true,
		})

		// Set up message handling
		const messagePromise = new Promise<string>((resolve) => {
			panel.webview.onDidReceiveMessage((message) => resolve(message.text), undefined)
		})

		// Add message sending script
		panel.webview.html = `
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="UTF-8">
					<title>Message Test</title>
				</head>
				<body>
					<script>
						const vscode = acquireVsCodeApi();
						vscode.postMessage({ text: 'test-message' });
					</script>
				</body>
			</html>
		`

		// Wait for message
		const message = await messagePromise
		message.should.equal("test-message")

		// Clean up
		panel.dispose()
	})
})
