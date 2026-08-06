## DataEmpregos

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

The root URL redirects to the Brazilian Portuguese experience. The localized
routes are available in `pt-BR` and `en`.

This repository temporarily uses npm and `package-lock.json`. It will migrate
to the project-standard pnpm workflow in a later maintenance task.

## Query Lambda configuration

The browser communicates with CAGED only through a Server Action. It never
calls the Lambda directly.

For local development, create an ignored `.env.local` file with:

```bash
CAGED_QUERY_LAMBDA_URL=https://your-local-testing-function-url.lambda-url.region.on.aws/
```

The URL is server-only and is accepted only outside production. Production must
set `AWS_REGION` and `CAGED_QUERY_LAMBDA_FUNCTION_NAME`; the Next.js server then
uses its IAM role to invoke the Lambda directly. See `.env.example` for all
available placeholders.
