Deploying this Next.js app to Vercel
=================================

Quick steps:

1. Push your frontend folder to a Git provider (GitHub/GitLab/Bitbucket).
2. Go to https://vercel.com and "Import Project" → choose your repo and the `frontend/` path.
3. In Project Settings → Environment Variables, add any public envs used by the app, e.g.:
   - `NEXT_PUBLIC_API_URL` → `https://api.example.com`

4. If your frontend calls backend endpoints under `/api/*`, update `vercel.json` `rewrites[0].destination` with your backend base URL (no trailing slash). Example:

```json
{
  "source": "/api/:path*",
  "destination": "https://auth.example.com/:path*"
}
```

Notes:
- Vercel runs Next.js apps natively — no additional Dockerfile needed.
- Vercel cannot host the Python Streamlit app or arbitrary long-running Python processes; host those (Streamlit / FastAPI) on Render, Fly, Railway, or a VPS and set the backend URL in Vercel envs or `vercel.json` rewrites.
- After import, Vercel will run `npm install` and `npm run build` automatically using `package.json` scripts.
