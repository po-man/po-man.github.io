# Contact form endpoint

The public page posts a JSON string to a Google Apps Script web app. The script validates the payload, writes it to a private Sheet, and sends a notification email.

The endpoint is not a secret. It is visible in the deployed JavaScript. Keep it out of the repository with a GitHub Actions variable, and use the spam controls in the script.

## 1. Create the Apps Script project

1. Open <https://script.google.com> and create a new project.
2. Replace `Code.gs` with `appsscript/Code.gs`.
3. Replace the project manifest with `appsscript/appsscript.json`. In the editor, enable **Show `appsscript.json` manifest file** first.
4. Run `setup()` once. Authorize the script when prompted. It creates a spreadsheet named **Field Notes contact** and stores its ID in `SHEET_ID`.
5. Open **Project Settings > Script properties** and add:
   - `NOTIFY_EMAIL`: the private address that receives notifications.
   - `SITE_ORIGIN`: `https://po-man.github.io`.
6. The `SHEET_ID` property is set by `setup()`. Check it if you created the Sheet yourself.

## 2. Deploy the web app

1. Choose **Deploy > New deployment**.
2. Select **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone**.
5. Deploy, authorize, and copy the URL ending in `/exec`.
6. For later code changes, use **Manage deployments** and edit the existing deployment. That keeps the URL stable.

The `appsscript.json` file already sets `executeAs` to `USER_DEPLOYING` and `access` to `ANYONE_ANONYMOUS`.

## 3. Add the URL to GitHub Actions

In the repository, open **Settings > Secrets and variables > Actions > Variables** and add:

```text
CONTACT_FORM_ENDPOINT=https://script.google.com/macros/s/.../exec
```

The Pages workflow passes this variable to `npm run build`, where Astro injects it into the inline site config. It fails the build if the variable is missing. The source tree has no endpoint.

## 4. Test the endpoint

Use a JSON string with no custom `Content-Type` header:

```bash
curl -L -X POST \
  --data '{"name":"Test","email":"test@example.com","topic":"project","message":"This is a test message.","website":"","started_at":0,"origin":"https://po-man.github.io","page":"/"}' \
  "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

The time trap rejects a `started_at` in the future or less than 2.5 seconds ago, so use a timestamp from a few seconds ago when testing:

```bash
node -e 'console.log(Date.now() - 5000)'
```

Then substitute the value for `started_at`.

Expected responses:

- `ok`: stored and notified.
- `error: invalid`: a field failed validation or the origin did not match.
- `error: wait`: the email or message was submitted recently, or the per-minute cap was reached.
- `error: server`: an unexpected error. Check **Executions** in the Apps Script editor.

## Notes

- The browser sends `fetch(endpoint, { method: "POST", body: JSON.stringify(payload) })`. No `Content-Type` header is set, so the browser uses `text/plain;charset=UTF-8`, which is safelisted. Setting `application/json` would trigger a preflight request that Apps Script does not handle reliably.
- The script prefixes cell values that start with `=`, `+`, `-`, or `@` to avoid formula injection in Sheets.
- `MailApp` has a daily recipient quota. Check the current Google Apps Script quotas if the form gets busy.
- The rate limit uses `CacheService`, so it is best effort. It reduces casual spam, not a determined attacker.
- The notification email uses the visitor's address as `replyTo`. The visitor never sees the owner's address.
- Do not log message contents. The script only logs unexpected errors.
