This is the **OpenProvider** monorepo, a fork of [Cline](https://github.com/cline/cline) focused on free API providers. Toolchain is **Bun** (package manager + task runner) with **Node >=22** as the runtime. Do not use npm/yarn/pnpm.

Start with `docs/fork/REPO-MAP.md`. It maps where providers are defined, what to touch to add one, where the sidebar UI lives, and where error and retry handling sits. It also documents findings that contradict most online Cline guides.

## What this fork changed

- Rebranded to OpenProvider: extension identity, `openprovider.*` commands, view containers, icons, and user-facing text.
- Removed the Cline-hosted account, ClinePass, billing and org remote-config subsystems. They depended on `api.cline.bot` / `app.cline.bot`, which this fork does not operate. `AuthService` was kept but stripped: the OpenRouter, Requesty, Hicap, Codex and OCA OAuth flows still work.
- Removed PostHog telemetry, error reporting and feature flags, which reported to Cline's `data.cline.bot`. Self-hosted OpenTelemetry export is untouched.

**Do not rename these**, or existing installs lose their data: `.clinerules` / `.clineignore` filenames, the `Documents/Cline/Rules` path, storage and secret keys, provider and model IDs, the `cline` proto namespace, and internal type names such as `ClineMessage`.

## Scope

Only the VS Code extension (`apps/vscode/`) and the shared SDK packages (`sdk/packages/`) are maintained here. The CLI, Kanban, desktop app and JetBrains plugin are upstream Cline products; they remain in the tree but are not part of this fork's work.

## Build / lint / test

Run from the repo root unless stated otherwise.

- **SDK first.** `@cline/shared|llms|agents|core|sdk` resolve each other through compiled `dist/` — their `exports` point only at `dist/`, with no source condition. Run `bun run build:sdk` after changing SDK source, or imports fail with missing `@cline/*` errors. Running processes do **not** hot-reload SDK changes; rebuild and restart.
- **Codegen.** From `apps/vscode`, `bun run protos` regenerates `src/generated/*` and the webview gRPC client. The `dev`, `build:webview` and `check-types` scripts already run it; call it manually only after editing `.proto` files without a full build.
- **Build.** From `apps/vscode`: `bun run build:webview` (Vite, ~25s), then `bun esbuild.mjs` (extension bundle → `dist/extension.js`, ~23 MB). `bun run package` does the full production build.
- **Typecheck.** `bun run check-types` covers both projects. Note that `webview-ui/tsconfig.json` is solution-style (`"files": []` + project references), so a bare `bunx tsc --noEmit` there is a **silent no-op that always reports success**. Use `bunx tsc -b` when checking that project directly.
- **Test.** `bun run test:unit` (Bun, no VS Code host). `bun run test:integration` (`@vscode/test-electron`) and `bun run test:e2e` (Playwright) drive a real extension host and are much slower.

## Running the extension

Press `F5` in VS Code and choose **Run Extension (production)**. Requires `apps/vscode/.env` to exist — copy it from `.env.example`.

The chat webview lives in the **secondary (right) side bar**; the activity bar icon is a small placeholder view whose only job is to reveal it. If you change `contributes` in `package.json`, **bump the version too**: VS Code caches the activity bar layout per version in `workbench.activity.pinnedViewlets2`, and reinstalling the same version will not pick up new view containers.

### Driving it headlessly

Playwright can drive a real extension host, which is the only reliable way to verify webview behaviour without a human at the keyboard:

```js
const app = await _electron.launch({
  executablePath: await downloadAndUnzipVSCode("stable"),
  args: ["--no-sandbox", "--disable-extensions", `--user-data-dir=${tmp}`,
         `--extensionDevelopmentPath=${EXT}`, workspace],
})
```

Two traps: strip `ELECTRON_RUN_AS_NODE` and every `VSCODE_*` variable from the inherited env, or VS Code starts as plain Node and rejects its own flags; and the React root lives in a nested `fake.html` iframe inside the outer `vscode-webview://` frame, not the outer one.

## Windows notes

The primary development machine for this fork is Windows.

- Several scripts are POSIX-only (`bash -lc`, `zsh -lc`); none are on the build path.
- The **Fresh Install Mode** launch config uses `rm -rf` / `mkdir -p` and fails in PowerShell. Use the other configs.
- If `bun install` fails with `IntegrityCheckFailed`, run `bun pm cache rm` and retry.
- `bun run download-ripgrep` needs `unzip`, which Windows lacks. Not fatal — the extension resolves ripgrep from VS Code's own installation.
- Commits run a `gitleaks` pre-commit hook. It must be on `PATH`.
