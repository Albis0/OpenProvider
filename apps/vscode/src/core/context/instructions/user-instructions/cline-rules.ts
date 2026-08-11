import { synchronizeRuleToggles } from "@core/context/instructions/user-instructions/rule-helpers"
import { ensureRulesDirectoryExists } from "@core/storage/disk"
import { ClineRulesToggles } from "@shared/cline-rules"
import { resolveRulesDirName } from "@shared/rule-directory-names"
import { fileExistsAtPath } from "@utils/fs"
import path from "path"
import { Controller } from "@/core/controller"

export async function refreshClineRulesToggles(
	controller: Controller,
	workingDirectory: string,
): Promise<{
	globalToggles: ClineRulesToggles
	localToggles: ClineRulesToggles
}> {
	// Global toggles
	const globalClineRulesToggles = controller.stateManager.getGlobalSettingsKey("globalClineRulesToggles")
	const globalClineRulesFilePath = await ensureRulesDirectoryExists()
	const updatedGlobalToggles = await synchronizeRuleToggles(globalClineRulesFilePath, globalClineRulesToggles)
	controller.stateManager.setGlobalState("globalClineRulesToggles", updatedGlobalToggles)

	// Local toggles
	const localClineRulesToggles = controller.stateManager.getWorkspaceStateKey("localClineRulesToggles")
	// Prefers `.openproviderrules`, falls back to a `.clinerules` the user
	// already had. The excluded paths below are derived from whichever name won
	// — hardcoding `.clinerules` here would stop excluding the workflows/hooks
	// subdirectories the moment a project used the new name, and those files
	// would start showing up as if they were ordinary rules.
	const rulesDirName = await resolveRulesDirName(workingDirectory, fileExistsAtPath, path.join)
	const localClineRulesFilePath = path.resolve(workingDirectory, rulesDirName)
	const updatedLocalToggles = await synchronizeRuleToggles(localClineRulesFilePath, localClineRulesToggles, "", [
		[rulesDirName, "workflows"],
		[rulesDirName, "hooks"],
		[rulesDirName, "skills"],
	])
	controller.stateManager.setWorkspaceState("localClineRulesToggles", updatedLocalToggles)

	return {
		globalToggles: updatedGlobalToggles,
		localToggles: updatedLocalToggles,
	}
}
