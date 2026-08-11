# Contributing to OpenProvider

OpenProvider is a fork of [Cline](https://github.com/cline/cline) focused on free API providers. Contributions are welcome — bug fixes, provider wiring, or documentation.

All members are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting Bugs or Issues

Before opening a new issue, [search the existing ones](https://github.com/Albis0/OpenProvider/issues) to avoid duplicates, then open one on the [issues page](https://github.com/Albis0/OpenProvider/issues/new).

> 🔐 **Security:** Do not report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md).

Bugs that also reproduce in upstream Cline are usually better reported [there](https://github.com/cline/cline/issues) — this fork only diverges in branding, the removal of Cline's hosted services, and provider work.

## Before Contributing

For anything beyond a small fix (typos, wording, obvious bugs), open an issue first so the approach can be agreed on before you write code. This project is small; a short discussion saves rework.

## Development Setup

This is a Bun workspace monorepo. The VS Code extension lives in `apps/vscode/`, and the shared agent packages in `sdk/packages/`.

1. Clone the repository _(requires [git-lfs](https://git-lfs.com/))_:

    ```bash
    git clone https://github.com/Albis0/OpenProvider.git
    ```

2. Open it in VS Code:

    ```bash
    code OpenProvider
    ```

3. Install [Bun](https://bun.com).

4. Install dependencies and build the SDK packages. The extension resolves
   `@cline/*` from their compiled `dist/`, so this build is required before the
   extension will bundle:

    ```bash
    bun install
    bun run build:sdk
    ```

5. Generate the Protocol Buffer files (required before the first build):

    ```bash
    cd apps/vscode && bun run protos
    ```

6. Copy the environment file the launch configs expect:

    ```bash
    cp apps/vscode/.env.example apps/vscode/.env
    ```

7. Press `F5` (or **Run → Start Debugging**) and pick **Run Extension (production)** to open a new VS Code window with the extension loaded. You may need the [esbuild problem matchers extension](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers).

    Avoid the **Fresh Install Mode** config on Windows — it uses `rm -rf` and `mkdir -p`, which PowerShell does not have.

### Where things live

`docs/fork/REPO-MAP.md` maps the codebase: where providers are defined, what to touch to add one, where the sidebar UI lives, and where error and retry handling sits. Read it before starting on anything non-trivial.

### Building and packaging

```bash
cd apps/vscode
bun run build:webview     # Vite build of the webview UI
bun esbuild.mjs           # extension host bundle -> dist/extension.js
bunx vsce package --no-dependencies --out ../../openprovider.vsix
```

Install a local build with:

```bash
code --install-extension openprovider.vsix --force
```

Reload the window afterwards. If you change `contributes` in `package.json`, bump the version too — VS Code caches the activity bar layout per version and will not pick up new view containers otherwise.

### Windows notes

- Some scripts are POSIX-only (`bash -lc`, `zsh -lc`). They are not on the build path, so you can ignore them.
- If `bun install` fails with `IntegrityCheckFailed`, run `bun pm cache rm` and retry.
- `bun run download-ripgrep` needs `unzip`, which Windows lacks. This is not fatal: the extension resolves ripgrep from VS Code's own installation.

### Linux test dependencies

VS Code extension tests on Linux need these system libraries:

```bash
sudo apt update
sudo apt install -y \
  dbus libasound2 libatk-bridge2.0-0 libatk1.0-0 libdrm2 libgbm1 \
  libgtk-3-0 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 \
  libxfixes3 libxkbfile1 libxrandr2 xvfb
```

## Writing and Submitting Code

1. **Keep pull requests focused.** One feature or fix per PR, split into commits that can be reviewed independently.

2. **Code quality.**

    ```bash
    cd apps/vscode
    bun run lint          # check style
    bun run format:fix    # apply formatting
    bun run check-types   # typecheck both the host and the webview
    ```

    Note that `webview-ui` uses a solution-style `tsconfig.json`, so a bare `tsc --noEmit` there silently does nothing. Use `tsc -b` when checking that project directly.

3. **Testing.**

    ```bash
    bun run test          # unit + integration
    bun run test:e2e      # Playwright, drives a real VS Code instance
    ```

    E2E tests live in `apps/vscode/src/test/e2e/`. Follow the existing patterns in `auth.test.ts`, `chat.test.ts`, and `editor.test.ts`; see the README there for details. Add tests for new behaviour and update existing ones your change affects.

4. **Commits.** Write clear messages explaining *why*, not just *what*. Reference issues with `#issue-number`.

5. **Before submitting.** Rebase on the latest `main`, confirm the branch builds, tests pass, and no debugging code or stray `console.log` remains.

6. **Pull request description.** Say what the change does, why it is needed, and how you verified it.

## Staying in Sync with Upstream

Fork-specific documentation lives under `docs/fork/` so that rebasing onto upstream Cline stays conflict-free. Keep new fork-only docs there rather than editing upstream files where you can.

Deliberately unchanged from upstream, to avoid breaking existing user data: the `.clineignore` filename, the `Documents/Cline/Rules` path, storage and secret keys, provider and model IDs, the `cline` proto namespace, and internal type names such as `ClineMessage`. Do not rename these.

Rules directories are the exception: new ones are created as `.openproviderrules`, while an existing `.clinerules` is still read. Both names resolve through `apps/vscode/src/shared/rule-directory-names.ts` — add any new rules-directory lookup there instead of hardcoding a name, or projects on the legacy layout will silently stop loading their rules.
