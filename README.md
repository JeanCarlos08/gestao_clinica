This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy (Render + Vercel)

- Backend (Render): usa `backend/Dockerfile` e expõe `/api/*`. Configure no serviço as envs obrigatórias: `DATABASE_URL`, `APP_SECRET_KEY`, `JWT_SECRET_KEY`, `APP_ADMIN_USER`, `APP_ADMIN_PASS`, `ALLOWED_ORIGINS`.
- Backend (Render) para IA/laudos: configure também `GOOGLE_API_KEY`, `GOOGLE_DOCS_TEMPLATE_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON_B64` e `CREDENTIALS_SOURCE=env`.
- Frontend (Vercel): configure o projeto com Root Directory = `frontend`.
- Frontend (Vercel): configure `BACKEND_API_URL=https://SEU-BACKEND-RENDER` (sem `/api` no final). O rewrite de `/api/*` é feito por `frontend/next.config.mjs`.
- Frontend (Vercel): `NEXT_PUBLIC_API_URL` é opcional. Deixe sem valor para usar `/api` local ao domínio da Vercel.
- Docker local: `docker-compose.yml` mapeia `8000:8000` e healthcheck em `/api/health`.

## Usage

 - Subir a API e frontend localmente.
 - Upload de fotos

	- Foto da clínica / usuário (configurações): acesse **Configurações** → aba **Perfil** ou **Clínica**, escolha a imagem e clique em **Salvar**. O frontend envia para `POST /api/configuracoes/photo` (form-data `field=user_photo|clinic_logo`, `file=@...`).

	- Foto por paciente: na lista de pacientes ou ao visualizar um atendimento, é possível associar uma foto ao paciente. O endpoint disponível é `POST /api/pacientes/{slug}/photo` (form-data `file=@...`). O backend armazena a imagem como data-URI nas preferências (`patient_photo:{slug}`) e o frontend exibe automaticamente quando disponível.

	- Exemplo via `curl`:

		```bash
		# Upload foto de paciente (slug gerado a partir do nome, ex: joao_silva)
		curl -H "Authorization: Bearer $TOKEN" -F "file=@./foto.jpg" \
			https://seu-backend/api/pacientes/joao_silva/photo
		```
