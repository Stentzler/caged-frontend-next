# AGENTS.md — CAGED Frontend Contributor Rules

## 1. Purpose and authority

This file defines how humans and coding agents must work in the
`caged-frontend-next` repository.

Read `SPEC.md` completely before planning or editing. `SPEC.md` is authoritative
for product scope, architecture, backend contracts, security, UX, testing, and
acceptance criteria. This file turns that specification into day-to-day
implementation rules.

If an implementation request conflicts with `SPEC.md`, call out the conflict and
ask for a deliberate decision. Do not quietly reinterpret a locked decision.
Direct user instructions for the current task take precedence, but document any
resulting contract change in `SPEC.md` when the request includes that scope.

## 2. Repository boundary

This repository owns:

- Next.js application code.
- Localized UI and message catalogs.
- Server Actions.
- Server-only Lambda adapters.
- Frontend domain types and schemas.
- Tests, Dockerfile, and frontend CI workflow.
- Application documentation.

This repository does not own:

- Terraform, CloudFront, WAF, Nginx host configuration, EC2, ECR, IAM, or SSM
  infrastructure.
- Query Lambda code or its DynamoDB data model.
- The future CBO Lambda implementation.
- API Gateway configuration.
- CAGED ingestion or aggregation jobs.

Do not edit a neighboring repository unless the user explicitly asks. When a
frontend change requires infrastructure or Lambda work, describe the dependency
and keep the frontend boundary ready for it.

## 3. Locked technical choices

Unless the task explicitly changes the specification:

- Use Next.js 16 App Router and TypeScript.
- Use React Server Components by default.
- Use Server Actions for analytics submissions.
- Use Tailwind CSS v4.
- Use `next-intl` for `pt-BR` and `en`.
- Use Recharts for the MVP charts.
- Use Zod at untrusted boundaries.
- Use AWS SDK v3 `@aws-sdk/client-lambda` only in server-only code.
- Use Next.js `use cache` with a 24-hour lifetime for CBO families.
- Use `pnpm` and commit its lockfile.
- Use Vitest, React Testing Library, and Playwright.
- Produce a Next.js standalone Docker image that runs as non-root.

Do not add Redux, Zustand, TanStack Query, Axios, a form framework, a date
library, or another design system merely for convenience. Add a dependency only
when platform APIs and existing packages cannot meet a concrete requirement.

## 4. Start-of-task workflow

Before editing:

1. Read the relevant sections of `SPEC.md` and any more specific `AGENTS.md` in
   the target subtree.
2. Inspect the current worktree and preserve unrelated user changes.
3. Identify whether the task touches UI, domain, adapter, cache, i18n, Docker, or
   CI boundaries.
4. Inspect existing patterns before creating new abstractions.
5. State any contract ambiguity that could materially change behavior.
6. Plan the smallest complete change and the verification it requires.

Do not begin by upgrading dependencies, reformatting unrelated files, or moving
directories unless that work is requested or essential.

## 5. Source organization and dependency direction

Maintain this dependency direction:

1. Domain types and pure helpers depend on no React or AWS code.
2. Server adapters depend on domain schemas and the AWS SDK.
3. Server Actions depend on domain services/adapters.
4. Server Components depend on domain data and presentation components.
5. Client Components depend on serializable domain data and UI primitives.

Dependencies must not point backward. In particular:

- Domain modules must not import from `src/app`, React, or AWS packages.
- Components must not parse raw Lambda envelopes.
- Client Components must not import server actions through arbitrary utility
  barrels that also export server-only code.
- Generic UI primitives must not know about Lambda or CAGED transport fields.
- Route files should compose features, not become large service modules.

Avoid broad barrel files where they blur the client/server boundary or create
circular dependencies.

## 6. Server-only AWS boundary

Every module that reads private AWS configuration, constructs an AWS client, or
invokes Lambda must import `server-only` at its top-level boundary.

Rules:

- Use one shared Lambda client factory per process configuration.
- Obtain credentials from the EC2 instance role in production.
- Never create access keys in code or expose credential inputs in a form.
- Read region and function identifiers only from validated server environment.
- Never accept a function name, ARN, region, qualifier, or arbitrary invocation
  payload from the browser.
- Invoke synchronously and handle SDK exceptions plus `FunctionError`.
- Decode binary payloads explicitly as UTF-8.
- Apply a reasonable SDK request timeout/abort strategy rather than allowing an
  indefinitely hanging action.
- Do not retry invalid requests. Keep automatic retries conservative for a user
  submission because edge rate limits count POST requests.

No AWS identifier may appear in rendered HTML, browser JavaScript, source maps
served publicly, client logs, or action return values.

## 7. Query Lambda contract rules

The existing query Lambda is unchanged. Its repository README and observed
deployed behavior are the external source of truth.

### 7.1 Input

Build exactly one API-Gateway-shaped event containing
`queryStringParameters`. Use the existing camelCase parameter names:

- `locationType`.
- `locationCode`.
- `professionCode`.
- `from`.
- `to`.

For MVP, emit only `COUNTRY` or `STATE`. Omit `locationCode` for country. Omit
`professionCode` to represent all families. Omit both date keys to request the
Lambda's latest available month.

Do not change names, add an artificial HTTP path, wrap the event in another
body, or call API Gateway from this application.

### 7.2 Validation ownership

Next.js validates structural safety and MVP capabilities:

- Expected primitive types.
- Supported UI location choice.
- Known two-digit state-code shape.
- Occupational-family code shape.
- `YYYYMM` shape.
- Both dates present or both absent.

The Lambda owns dataset business policy:

- Current latest available month.
- Available catalog months.
- Maximum inclusive range length.
- Whether a requested date is in the future.
- Date ordering and data availability.

Do not duplicate Lambda-owned policy in action code or shared constants. Map its
400 response to `invalid_query` and render translated guidance.

### 7.3 Output

Direct invocation returns a JSON outer envelope with `statusCode`, `headers`, and
a JSON-string `body`. The successful body is snake_case because API Gateway
mapping is bypassed.

The adapter must:

1. Validate the SDK response and `FunctionError`.
2. Parse and validate the outer envelope.
3. Parse and validate the body according to the status.
4. Map snake_case fields to the camelCase domain model exactly once.
5. Convert backend statuses to stable application errors.

Never let a React component, Server Action result, chart helper, or test fixture
for UI code depend on `catalog_version`, `net_balance`, `avg_salary`, or another
raw transport field. Contract-focused adapter tests may and should use the raw
shape.

Do not use a blanket recursive snake-case converter. Write an explicit mapping
so contract changes are reviewable and extra/missing fields can be reasoned
about.

## 8. CBO occupational-family rules

The product groups by CBO family, not by individual occupation.

- The selector and list use only `familyCode` and `familyTitle`.
- A family code such as `5172` is valid; an occupation code such as `517210` is
  not a selectable analytics dimension.
- Do not display or query using `ocupation_title`.
- Preserve the official Portuguese `familyTitle`, including in English UI.
- Do not fetch individual DynamoDB rows from the browser or Next.js.
- Expect the future CBO Lambda to return unique families.
- If its contract differs, adapt it once in `cbo-lambda-adapter.ts` and update
  `SPEC.md` plus contract tests.

Cache the successfully normalized family list for 24 hours using `use cache`.
Home and the Occupational Families page must call the same cached server
function. Do not cache thrown errors intentionally, and do not use
`unstable_cache` for new work.

If CBO retrieval fails, keep an “all occupational families” analytics request
possible. Never substitute invented production fixture data.

## 9. Server Actions

Keep Server Actions thin. An action is responsible for:

- Parsing its serializable input.
- Performing structural validation.
- Calling a server service/adapter.
- Mapping domain errors to a stable serializable result union.

An action is not responsible for AWS SDK setup, transport decoding, business
chart transformation, or localized copy.

Use an explicit result union such as success versus stable error code. Do not
return `Error`, AWS SDK objects, functions, class instances, raw exceptions, or
environment values. Never use an action as an open proxy for arbitrary Lambda
payloads.

Remember that every action submission is POST and is subject to CloudFront/WAF
and Nginx rate limiting. Prevent accidental duplicate submission in the client
and make 429 handling part of the user experience.

## 10. React and Next.js conventions

- Prefer Server Components and server data loading.
- Add `'use client'` only at the smallest interactive boundary.
- Keep page and layout metadata localized.
- Use framework navigation and image/font facilities where appropriate.
- Use semantic HTML before adding ARIA.
- Do not read server environment variables during client render.
- Do not use effects for data that can be loaded on the server.
- Do not mirror props into state without a clear interaction reason.
- Do not silence hydration warnings to hide deterministic rendering bugs.
- Keep loading and error boundaries close enough to provide useful context.
- The health route must not invoke Lambda or disclose configuration.

When adding a component, decide whether it is domain presentation, feature
interaction, or generic UI. Place it accordingly rather than collecting all
components in one directory.

## 11. State management

Use the narrowest state mechanism:

- URL and route state for locale/navigation.
- Server data in Server Components.
- Server Action state for submission outcomes.
- Local React state for transient combobox, disclosure, chart, or menu behavior.

Do not add a global state library for the MVP. If shareable analytics URLs are
later approved, update the specification before treating URL query parameters as
the report source of truth.

## 12. Internationalization rules

All user-visible interface text belongs in `messages/pt-BR.json` and
`messages/en.json`, including:

- Page metadata and headings.
- Navigation and button labels.
- Form labels, descriptions, placeholders, and validation messages.
- Loading, empty, error, and throttling states.
- Chart titles, legends, tooltip labels, and table captions.
- Screen-reader-only text.
- About and disclaimer content.

Both catalogs must contain the same key structure. Add or remove matching keys
in the same change. Tests should fail on key drift.

Do not translate official CBO family titles. Do not use flags as the only locale
label. Format months, numbers, and BRL values with the active locale and test
negative, zero, and large values.

## 13. Data visualization rules

- Charts consume normalized domain data only.
- Sort `YYYYMM` keys ascending before producing chart series.
- Preserve zero-value returned months.
- Label salary as average admission salary.
- Do not calculate an arithmetic mean of monthly `avgSalary` values.
- If a range summary needs salary, compute a weighted value from total
  `salarySum / salaryCount`, guarding zero count, or label a single selected
  month explicitly.
- Do not label `totalTurnover` as a rate; the backend value is the total movement
  count unless the backend contract changes.
- Use more than color to distinguish admissions, dismissals, and balance.
- Respect reduced motion.
- Provide the semantic table with the same underlying values.

Avoid misleading interpolation, smoothed curves that imply unavailable values,
truncated axes that exaggerate differences, and decorative 3D effects.

## 14. Styling and responsive behavior

Use Tailwind tokens and repository-owned primitives. Reuse established spacing,
typography, focus, surface, border, and data-color tokens.

- Begin at 320 pixels.
- Avoid arbitrary breakpoint-specific fixes when grid/flex behavior can express
  the layout.
- Prevent page-level horizontal overflow.
- Give dense result tables an intentional mobile treatment.
- Keep long-form copy at a readable width.
- Test desktop, tablet, and phone layouts for every user-facing change.
- Do not imitate official government branding, seals, or portal chrome.

When using shadcn/ui code, treat it as local source: understand it, simplify it
where helpful, and keep it accessible. Do not add the entire catalog.

## 15. Accessibility requirements

Accessibility is part of definition of done, not a later audit.

- Associate labels, descriptions, and errors with controls.
- Preserve logical focus order and visible focus indication.
- Make interactive targets keyboard operable.
- Use buttons for actions and links for navigation.
- Mark current navigation state.
- Announce pending and updated result states appropriately.
- Provide a text summary and data table for charts.
- Meet WCAG AA contrast.
- Never encode meaning with color alone.
- Honor reduced-motion preferences.
- Test at 200% zoom and with keyboard-only navigation for affected journeys.

Use ARIA only to fill a semantic gap. Do not add redundant or conflicting roles.

## 16. TypeScript and schema rules

- Keep `strict` enabled.
- Do not use `any`. Start from `unknown` at untrusted boundaries.
- Parse form input, environment, and Lambda payloads with explicit schemas.
- Infer transport types from their schemas where practical.
- Define normalized domain types separately.
- Prefer discriminated unions and exhaustive switches for action/error states.
- Do not use non-null assertions to bypass a state the type system identified.
- Avoid type assertions. A boundary assertion requires an accompanying runtime
  guarantee and comment if it cannot be removed.
- Prefer pure transformation functions that are easy to test.

Reject malformed upstream success responses rather than filling absent required
fields with plausible zeros. Zeros returned explicitly by the Lambda are valid.

## 17. Error handling and logging

Use the application error taxonomy from `SPEC.md`. Preserve causes server-side
where useful, but expose only stable codes and safe details.

- Expected invalid requests are not generic 500 errors.
- A 503 is retryable/unavailable, not “no data”.
- A malformed 200 response is a contract error, not an empty result.
- An SDK failure and a Lambda `FunctionError` are invocation failures.
- Unknown non-2xx statuses map safely to upstream error.
- WAF/Nginx 429 must receive explicit localized UI.

Structured logs may contain correlation ID, operation, duration, outcome,
location type, and month count. They must not contain credentials, origin
secrets, complete payloads, raw SDK errors, public contact configuration, or IP
addresses from application code.

Never show stack traces, ARNs, function names, or raw backend messages to users.

## 18. Testing rules

Every behavior change needs the lowest-cost test that proves it, plus a higher
level test when boundaries interact.

### 18.1 Required adapter coverage

Test at least:

- Exact `queryStringParameters` construction for default, state, family, and
  date-range inputs.
- Omission of absent optional keys.
- UTF-8 payload decode.
- Lambda `FunctionError`.
- Empty and malformed payload.
- Invalid outer envelope.
- Invalid body JSON.
- 200 snake_case normalization.
- 400, 503, 500, and unknown status mapping.
- Malformed success schema.
- Unicode Portuguese location and family titles.

### 18.2 UI coverage

Test:

- Default Brazil query.
- State and family selection.
- Paired-date completeness.
- Pending/duplicate-submit behavior.
- Result summaries, charts, and equivalent table.
- Empty, 429, invalid-query, unavailable, and unexpected-error states.
- CBO-unavailable fallback.
- Both locales and catalog-key parity.
- Keyboard navigation and core automated accessibility checks.
- Responsive critical journeys in Playwright.

Tests must not invoke production Lambdas or require real AWS credentials. Mock at
the adapter boundary, and keep raw contract fixtures confined to adapter tests.

## 19. Verification commands

Before declaring work complete, run the applicable commands from repository
root:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e` for affected user journeys or release-level verification

If the repository defines a formatting check, run it as well. Do not claim a
command passed unless it was run successfully. If a command cannot run, report
the exact reason and what remains unverified.

For narrow changes, focused tests may be used during iteration, but the final
verification should include the relevant full gate when practical.

## 20. Security review checklist

For changes touching forms, actions, environment, adapters, logging, deployment,
or dependencies, verify:

- No server value moved into `NEXT_PUBLIC_*` unintentionally.
- No server-only module entered a client import graph.
- No client-controlled AWS target or payload escape hatch was added.
- All new untrusted data has runtime validation.
- Errors and logs are redacted.
- No credentials or `.env` values are committed.
- The browser still contacts only the site origin for app behavior.
- No unsafe HTML rendering was introduced.
- Dependency additions are maintained, necessary, and lockfile-reviewed.

Do not weaken checks merely because WAF and Nginx exist upstream.

## 21. Dependency and lockfile policy

- Use `pnpm` consistently.
- Commit `pnpm-lock.yaml`.
- Use frozen lockfile installation in CI and Docker builds.
- Add one dependency only after confirming its license, maintenance status, and
  concrete use.
- Avoid packages for functions readily handled by `Intl`, native form controls,
  React, or small local helpers.
- Never run a broad dependency upgrade as part of an unrelated feature.
- Explain material dependency changes in the pull request or handoff.

Generated UI component code is reviewed like any other application code.

## 22. Docker and CI rules

- Keep `output: 'standalone'` enabled.
- Use a multi-stage build and a non-root runtime user.
- Never copy `.env`, local AWS config, tests, or unnecessary build tooling into
  the runtime image.
- Bind the app to container port 3000. Host binding to `127.0.0.1:3000` belongs
  to deployment infrastructure.
- Keep `/health` lightweight and independent of AWS.
- Pin the package manager and use the lockfile.
- Use commit-SHA image tags for deployment and rollback.
- Authenticate deployment through GitHub OIDC; do not create repository secrets
  containing static AWS keys.
- Pull-request workflows run checks and builds but do not deploy unless an
  explicitly reviewed workflow says otherwise.

Do not modify the infrastructure contract from frontend scripts. Coordinate any
new port, health path, environment variable, or runtime permission with
`caged-frontend-terraform` documentation.

## 23. Documentation maintenance

Update `SPEC.md` in the same change when modifying:

- Product scope or page behavior.
- A locked framework or architecture decision.
- Query or CBO Lambda contract assumptions.
- Environment variables.
- Cache policy.
- Deployment/health contract.
- Acceptance criteria.

Keep `.env.example`, README setup instructions, tests, and implementation in
sync. Comments should explain why a non-obvious decision exists, especially at
the direct-Lambda boundary; do not narrate obvious syntax.

## 24. Git and worktree safety

- Preserve unrelated user changes in a dirty worktree.
- Do not use destructive reset, checkout, or clean commands.
- Do not rewrite history unless explicitly requested.
- Keep commits and diffs scoped to the task.
- Do not commit generated build output, coverage output, Playwright artifacts,
  local environment files, or credentials.
- Inspect the final diff for accidental formatting churn and secret exposure.

Do not push, deploy, create releases, or mutate external systems unless the user
explicitly asks and the current task grants that authority.

## 25. Definition of done

A change is complete only when:

1. It satisfies the relevant `SPEC.md` behavior and repository boundaries.
2. TypeScript remains strict and all untrusted boundaries are validated.
3. The Lambda contract is preserved and transport mapping stays isolated.
4. Server-only values remain absent from the browser bundle and action results.
5. Portuguese and English experiences are updated together.
6. Responsive and accessibility behavior is verified for affected UI.
7. Appropriate unit, integration, and end-to-end tests are added or updated.
8. Applicable lint, type-check, test, and build commands pass.
9. Documentation and environment examples match the implementation.
10. The final diff contains no unrelated changes, credentials, raw build output,
    or debugging artifacts.

When handing off, lead with what changed, then list verification performed and
any genuine remaining dependency—especially the future CBO Lambda contract.
