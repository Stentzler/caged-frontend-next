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

## Production container

The multi-stage Docker build produces a standalone, non-root Next.js image that
listens on port 3000 and exposes `GET /health`. At runtime, production must also
provide the public links used in the footer, About, and Professions pages:

```bash
SITE_OFFICIAL_SOURCE_URL=https://pdet.mte.gov.br/novo-caged
SITE_CBO_SOURCE_URL=https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo
SITE_GITHUB_URL=https://github.com/Stentzler
SITE_CONTACT_EMAIL=you@example.com
```

Build the image with:

```bash
docker build --tag dataempregos:local .
```

Create a local runtime file once, then fill the public URLs it requires:

```bash
cp .env.example .env.local
```

Run the container and publish its internal port 3000 on your local port 3000:

```bash
docker run --rm \
  --name dataempregos-local \
  --publish 3000:3000 \
  --env-file .env.local \
  dataempregos:local
```

Open <http://localhost:3000/pt-BR>. In a second terminal, verify the container
health endpoint with:

```bash
curl http://localhost:3000/health
```

Press `Ctrl+C` in the terminal running Docker to stop and remove the local
container. The production image accepts Lambda configuration through direct IAM
invocation; a local Lambda Function URL remains a development-server-only
option and is intentionally rejected by the production container.

## Development deployment

Pushes to `develop` deploy the immutable commit-SHA image to the development
EC2 host through GitHub OIDC, ECR, and Systems Manager. The complete GitHub
environment configuration and first-deployment checklist are in
[CICD_SETUP_GUIDE.md](CICD_SETUP_GUIDE.md). If a previous run has already
pushed the same commit-SHA image, a retry reuses that immutable image and
continues with deployment instead of attempting to overwrite its ECR tag.
Terraform keeps the current EC2 ID in Parameter Store, so the GitHub workflow
does not need a manually updated instance-ID environment variable.
