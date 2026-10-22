# Tenslant Click Lab — Fixed Cloudflare-ready build

Standalone static incremental game. It has no server-side game runtime and does not need a separate Worker of its own. It can be hosted on Cloudflare Pages or another static host. It connects to your deployed Tenslant ID Worker for OAuth, cloud saves, stats, and achievements.

## What's fixed

- `config.js` now points to your deployed Tenslant ID Worker: `https://tenslant-id.tenslant44.workers.dev`.
- Fixed the cloud autosave timer: passive Auto Tapper earnings previously reset the debounce timer every second, preventing a save from firing continuously. It now schedules an upload at most once per 3 seconds while connected.
- Kept the project static and lightweight: no `node_modules`, build output, local database, or secrets are included.
- Added `register-click-lab.ps1` to register the game using the exact URL you host it at. It asks for your admin secret at runtime and does not save it to the project.

## Deploy to Cloudflare Pages

1. Extract this ZIP.
2. Create a Cloudflare Pages project and upload/deploy these files as a static site, or put the contents in a repository connected to Pages.
3. Copy the final public URL of the game. For example, if it opens at `https://click-lab.pages.dev/`, use that exact URL.
4. From PowerShell, run `./register-click-lab.ps1` in this folder. If PowerShell blocks scripts, use `powershell.exe -ExecutionPolicy Bypass -File .\register-click-lab.ps1`.
5. Enter the exact public game URL and the `ADMIN_BOOTSTRAP_SECRET` configured on the Tenslant ID Worker when prompted. The secret is only sent from your computer to your Worker and is not stored in this folder.
6. If registration succeeds, reload the hosted game and click **Connect Tenslant ID**.

The registration helper creates OAuth client ID `click-lab-standalone`, registers the site's origin for CORS, and registers the exact redirect URI. The redirect URI must be the same full URL shown in your browser, including a trailing slash or `/index.html` if applicable. If you change the public URL later, register that new URL too (or update the existing game's allowed origin/redirect in your admin workflow).

## Test the cloud features

- Click **Connect Tenslant ID** and approve the requested permissions.
- Earn some energy and buy an upgrade.
- Click **Sync cloud save**.
- Reload the page and use **Sync cloud save** again to check that the progress returns.
- Keep the game open with Auto Tapper active for a few seconds and confirm that cloud saves continue to update.

## Local-only play

You can open `index.html` for local-only gameplay. Browser OAuth and cloud features require hosting over HTTP(S), an exact registered redirect URI, and a registered game in Tenslant ID. If the app is not registered yet, local gameplay and browser-local saves still work.

## Limits and trust

This is a lightweight static game. Its save data and client-reported achievements are controlled by the browser, so do not use these achievements as proof for valuable rewards or competitive rankings. Never put your admin secret in `config.js`, `assets/`, or any public source repository.
