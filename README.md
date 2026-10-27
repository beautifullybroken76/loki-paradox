# The Loki Paradox — V10 Cloud Sync Starter

## What is included

- `index.html`, `questions.json`, `question-manager.html`, `config.js` — GitHub Pages frontend.
- `api/` — ASP.NET Core 8 Minimal API project with username/password authentication and JWT sessions.
- `sql/001_create.sql` — SQL Server tables for player accounts and revision-controlled progress.

**This is a deployment-ready source starter, not a deployed service.** JavaScript syntax and question JSON were checked. The .NET API could not be compiled or integration-tested in this environment. Test on a staging URL before using real accounts.

## Prerequisites

1. Verify your SmarterASP.NET plan supports hosting **ASP.NET Core 8** applications, or retarget the project to a currently supported installed runtime.
2. Your API must have a valid **HTTPS certificate** before enabling login. The pending SSL issue on your main SmarterASP.NET site is therefore relevant. `https://loki.pamsprogramming.com` on GitHub Pages does not automatically secure your SmarterASP.NET API.
3. Create a dedicated SQL Server database and run `sql/001_create.sql`.
4. Choose a hostname for the API, e.g. `https://api.pamsprogramming.com` (example only; not created), and configure its DNS, HTTPS binding, and hosting site.

## API configuration (private)

Set the following on your API server, ideally via environment variables or protected server configuration, **not in the GitHub repository**:

- `ConnectionStrings__Loki` — your SQL Server connection string
- `Jwt__SigningKey` — a cryptographically random secret of at least 32 bytes (prefer 64+ bytes)
- `Jwt__Issuer` — `LokiParadox`
- `Jwt__Audience` — `LokiParadoxGame`
- `AllowedOrigins__0` — `https://loki.pamsprogramming.com`

Keep the API's connection string and signing key out of `config.js`, GitHub Pages, browser code, and source control. ASP.NET Core's double-underscore syntax maps environment variables to nested configuration keys. Publish `api/LokiParadox.Api.csproj` using Visual Studio to the SmarterASP.NET ASP.NET Core application, after confirming the hosting runtime.

## Frontend configuration

Set `window.LOKI_API_BASE = 'https://YOUR-API-HOST'` in `config.js` (HTTPS only). Upload the four frontend files to the root of the GitHub Pages repository. **Do not upload the `api` directory, SQL script, or private configuration to the public GitHub Pages site.**

## How syncing works

- Browser localStorage remains the immediate offline save.
- Use **Cloud account** to register or sign in with a nickname and password (12+ characters).
- The JWT token is kept in sessionStorage (re-login may be required in a new tab/browser).
- On sign-in, if both device and cloud contain different progress, the player explicitly chooses which copy to use. This is **replacement, not merge**.
- A new account with no cloud save uploads the current device save.
- During gameplay, progress automatically uploads after a short debounce.
- The API uses a revision counter and responds with HTTP 409 if another device saved a newer revision. The game stops automatic uploads and asks the player to choose the cloud or local version.
- If the API is offline, local saving continues. Keep the tab open and sign in/reconnect to retry.

## Testing checklist

1. Deploy the API to a staging HTTPS host. Confirm `GET /api/health` returns `{ "status": "ok" }`.
2. Create a test player, sign in, finish a puzzle, and verify a row appears in `dbo.LokiProgress`.
3. On a second browser/device, sign in and choose **cloud progress**. Verify name, runes, chapter, difficulty, and attempts.
4. Make a change on both devices and confirm the stale save produces a conflict rather than silently overwriting.
5. Turn off the network and verify browser-local progress still saves. Reconnect and check syncing.
6. Check CORS from `https://loki.pamsprogramming.com`, authentication failures, duplicate usernames, and HTTPS enforcement.
7. Confirm your existing V9 local save imports correctly. Back up the browser save before initial migration if it's valuable.

## Security and privacy notes

- Avoid collecting children's real names, birthdates, emails, or school information. Use pseudonyms.
- Passwords are hashed with ASP.NET Core Identity's password hasher; the database stores no plaintext passwords.
- No password-reset feature exists in this starter. A forgotten password requires an administrator-supported reset workflow; **do not share passwords**.
- The starter has no email verification, moderation, admin console, or abuse monitoring. Keep registrations to your invited testers initially and add stronger controls before any wider public release.
- Use a long, random JWT signing key and protect it like a credential. Changing it invalidates existing sessions.
- For production, consider short-lived access tokens with a safer refresh/session design, server-side logging/monitoring, backups, account deletion, and a privacy notice.
- `question-manager.html` is public and only exports JSON; it does not provide database write access.
