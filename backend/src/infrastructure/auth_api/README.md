Auth microservice (PoC)
=======================

Endpoints:

- POST `/login`  — body: `{ "username": "...", "password": "..." }` → returns JWT token and user info.
- GET `/healthz` — returns `{ "status": "ok" }`.

Run locally (no container):

```bash
python -m pip install -r ../../../../backend/requirements.txt
uvicorn auth_api.main:app --reload --port 8001
```

Notes:
- This is a minimal PoC to start extracting `auth` como serviço. It reuses `database.user_repositories.user_repo` and `config.settings` from the monorepo.
- For production, add TLS, rate-limiting, proper session/token management and secrets handling.
