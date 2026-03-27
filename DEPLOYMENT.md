# Deployment Guide — GIFT Quiz Editor Plus

How to upload and deploy this project as a new Google Forms Add-on from scratch.

---

## Prerequisites

```bash
# Install clasp globally
npm install -g @google/clasp

# Log in to your Google account
clasp login
```

---

## Step 1 — Create a New Apps Script Project

Go to [script.google.com](https://script.google.com) → **New project**, give it a name (e.g. `GIFT Quiz Editor Plus`).

Copy the **Script ID** from the URL:
`https://script.google.com/home/projects/YOUR_SCRIPT_ID/edit`

---

## Step 2 — Update `.clasp.json`

Edit `.clasp.json` and replace the existing `scriptId` with your new one:

```json
{"scriptId":"YOUR_NEW_SCRIPT_ID"}
```

---

## Step 3 — Verify `appsscript.json`

The `appsscript.json` file already ships with the correct manifest, including `oauthScopes`. Verify that it looks correct. (Note: Editor Add-ons do not use the `addOns` block, which is exclusively for Workspace Add-ons).

---

## Step 4 — Push the Code

```bash
clasp push
```

Confirm with `y` if prompted about `.html` files.

---

## Step 5 — Create a Test Deployment

In the Apps Script editor (script.google.com):

1. Click **Deploy** → **Test deployments**
2. Select **Editor Add-on**
3. Click **Install** — installs it for your account only

---

## Step 6 — Test It in Google Forms

1. Open (or create) a **Google Form**
2. In the top menu: **Extensions** → **GIFT Quiz Editor Plus** → **Open editor**
3. The sidebar should appear

---

## Step 7 (Optional) — Publish to All Users

To share via the Google Workspace Marketplace:

1. Apps Script editor → **Deploy** → **New deployment**
2. Type: **Add-on** → fill in description → **Deploy**
3. Go to **Google Cloud Console** → link the project → configure the **OAuth consent screen**
4. Submit to the **Google Workspace Marketplace** for review

> For personal or team use, Step 5 (Test deployment) is sufficient — no marketplace submission needed.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `clasp push` fails with auth error | Run `clasp login` again |
| Add-on doesn't appear in Extensions menu | Refresh the Google Form after installing the test deployment |
| `appsscript.json` rejected | Ensure `oauthScopes` match what the code actually uses |
| Script quota exceeded | Wait 24h or use a different Google account |
