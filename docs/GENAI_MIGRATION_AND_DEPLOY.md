Deployment notes — GenAI migration

Overview

This project now uses `google-genai` (the new Gemini SDK). The codebase was migrated and tested locally. Keep the following deployment steps to ensure AI and Google Docs features work in Render/Vercel.

Required environment variables

- `GOOGLE_API_KEY` or `GEMINI_API_KEY`: Your Gemini Developer API key (set either; code prefers `GOOGLE_API_KEY`).
- `GOOGLE_SERVICE_ACCOUNT_JSON_B64` (recommended) OR a file `credentials.json` uploaded to the server path:
  - For Render / Vercel, set `GOOGLE_SERVICE_ACCOUNT_JSON_B64` to the base64 of your service account JSON: `cat credentials.json | base64 -w 0` and paste value in the env var.
  - Scope of the service account: Drive+Docs API with permission to copy templates and export PDFs.
- `GOOGLE_DOCS_TEMPLATE_ID`: The Google Docs template document id used by Laudos. Can be set in project settings or in `Config > Integrações` in the app.

Optional

- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` — if you need Vertex AI (enterprise) endpoints.
- `ALLOWED_ORIGINS` — CORS for frontend.

Render (backend Docker) steps

1. In Render dashboard, open your service > Environment > Add the variables above.
2. If you use base64 JSON, set `GOOGLE_SERVICE_ACCOUNT_JSON_B64` to the base64 content.
3. Add `GOOGLE_API_KEY` (or `GEMINI_API_KEY`) to the env.
4. Redeploy (or trigger a manual deploy / restart). The app reads env on startup.

Vercel (frontend)

- Set `NEXT_PUBLIC_API_BASE` or similar (if used) to point at your backend URL.
- Add any frontend-only env vars in Vercel project settings.

Post-deploy checks

1. Call `/api/ia/diagnostics` (auth required) to ensure `has_ai` is true and `gemini_key_set` is true.
2. Call `/api/laudos/template-status` to ensure template and Docs API access works.
3. Generate a laudo with `/api/laudos/gerar` and export PDF `/api/laudos/{id}/pdf`.

Troubleshooting

- `IA not configured` / DefaultCredentialsError: ensure `GOOGLE_API_KEY` is set or ADC configured via `GOOGLE_SERVICE_ACCOUNT_JSON_B64` or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a JSON file.
- `Template do Google Docs não configurado`: set `GOOGLE_DOCS_TEMPLATE_ID` or configure via the app admin.

Security

- Do NOT commit `credentials.json` into the repo. Use base64 env var or secret manager.
- Use least-privilege service account (Drive/Docs only), restrict file sharing to service account.

Notes

- If you need me to create a Render-ready `render.yaml` snippet or to add CI steps to validate env vars, tell me and I will add it.
