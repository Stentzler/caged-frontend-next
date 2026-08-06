# CAGED Frontend — Product and Technical Specification

## 1. Document status

| Field | Value |
| --- | --- |
| Repository | `caged-frontend-next` |
| Product | CAGED labor-market explorer |
| Phase | MVP |
| Primary framework | Next.js 16 App Router with TypeScript |
| Deployment target | Docker container on EC2 behind Nginx, CloudFront, and AWS WAF |
| Infrastructure repository | `caged-frontend-terraform` |
| Query backend | Existing `caged-query-lambda`, invoked directly by the Next.js server |
| CBO backend | A future read-only CBO Lambda, invoked directly by the Next.js server |
| Primary locales | Brazilian Portuguese and English |

This document defines the frontend product, application architecture, backend
contracts, security boundaries, quality requirements, and MVP acceptance
criteria. `AGENTS.md` contains the implementation rules for contributors and
coding agents.

## 2. Product purpose

The application helps people explore monthly Brazilian formal-employment
movements published through Novo CAGED. A visitor can select a geography, an
optional CBO occupational family, and an optional month range, then view the
returned admissions, dismissals, net employment balance, turnover, and average
admission salary.

The product is an independent experimental visualization. It is not an official
government service, is not endorsed by the Brazilian federal government or any
state government, and may contain omissions, delayed updates, transformations,
or errors. The UI must make that status clear without using alarmist language.

## 3. Product principles

1. Make the first useful query simple. Brazil, all occupational families, and
   the Lambda's latest-month default form a valid request.
2. Use precise terminology. The grouping is a CBO occupational family
   (`family_code` and `family_title`), not an individual occupation.
3. Keep AWS implementation details out of the browser. Lambda names, ARNs,
   invocation payloads, credentials, and DynamoDB details are server-only.
4. Treat the existing query Lambda as an unchanged external contract.
5. Let the query Lambda own dataset and date-range business validation.
6. Design mobile-first while using the additional space of desktop screens well.
7. Make charts understandable without color alone and provide an accessible
   tabular representation of the same data.
8. Prefer a small, maintainable MVP over speculative framework layers.

## 4. Locked architecture decisions

The following decisions are part of the MVP and must not be changed casually:

- Next.js uses the App Router, TypeScript, React Server Components, Server
  Actions, and a standalone production build.
- Tailwind CSS v4 provides styling. A small set of shadcn/ui primitives may be
  used for accessible controls, but generated components remain owned by this
  repository.
- `next-intl` provides localized routes and messages for `pt-BR` and `en`.
- Recharts provides responsive data visualizations.
- Zod validates untrusted values at process and service boundaries.
- AWS SDK v3 `@aws-sdk/client-lambda` invokes Lambdas from server-only modules.
- The existing query Lambda remains unchanged. A Next.js adapter sends an event
  containing `queryStringParameters` and parses the Lambda response envelope.
- Temporary local-development exception: when a server-only Function URL is
  configured outside production, the adapter calls it through HTTP and validates
  its direct JSON response. Production rejects that URL configuration and uses
  direct IAM invocation.
- The browser never calls Lambda, DynamoDB, API Gateway, or an AWS service.
- Analytics submissions use a Server Action and therefore reach the public
  stack as POST requests.
- CBO occupational-family data is cached on the Next.js server for 24 hours.
- Query results are not application-cached in the MVP.
- The UI exposes country and state queries. City queries are outside MVP even
  though the query Lambda supports them.
- If both dates are omitted, Next.js sends neither date and accepts the Lambda's
  default: the latest available dataset month only.
- CloudFront and AWS WAF are the public edge. Nginx on EC2 proxies to the Next.js
  container at `127.0.0.1:3000`.
- WAF approximately limits POST requests to 10 per source IP per 60 seconds;
  Nginx provides the stricter origin-level limiter. The frontend must handle
  HTTP 429 gracefully.
- The deployment is managed by the separate `caged-frontend-terraform`
  repository and its GitHub OIDC, ECR, and SSM workflow.

## 5. Scope

### 5.1 MVP scope

- Responsive Home, Occupational Families, and About pages.
- Header navigation, locale switcher, and footer.
- Brazil-wide and state-level analytics queries.
- Optional occupational-family selector.
- Optional paired start and end month controls.
- Monthly charts, summary values, and accessible data table.
- Direct server-side invocation of the existing query Lambda.
- Direct server-side invocation of a future CBO-list Lambda.
- Shared 24-hour server cache for the CBO family list.
- Brazilian Portuguese and English interface text.
- Loading, empty, validation, throttling, backend-unavailable, and unexpected
  error states.
- Production Docker image and CI checks expected by the infrastructure repo.
- Basic privacy-conscious observability and health endpoint.

### 5.2 Out of scope

- City-level selection or display.
- User accounts, authentication, saved searches, favorites, or personalization.
- Data mutation, uploads, administrative screens, or DynamoDB access.
- Changing either Lambda, its DynamoDB tables, or its IAM policy from this repo.
- API Gateway as part of the frontend request path.
- Client-side AWS SDK usage or browser-visible AWS endpoints.
- Real-time data, forecasts, causal claims, or recommendations.
- Inflation-adjusted salary calculations.
- Comparing multiple locations or occupational families in one query.
- Export to CSV, PDF, or image.
- A CMS for About content.
- Redux, Zustand, TanStack Query, or another global data layer without a proven
  requirement.
- Full browser analytics, advertising trackers, or collection of personal data.

## 6. User-facing information architecture

Localized routes use a locale segment:

| Route | Purpose |
| --- | --- |
| `/pt-BR` and `/en` | Home and analytics query |
| `/pt-BR/ocupacoes` and `/en/occupations` | Searchable occupational-family list |
| `/pt-BR/sobre` and `/en/about` | Dataset, methodology, and disclaimer |

Route slugs may be translated as shown, provided locale switching maps a page
to its equivalent rather than sending the user to Home. A redirect from `/`
selects `pt-BR` by default unless a supported locale preference is already
available. Locale detection must remain deterministic and must not create a
redirect loop through CloudFront.

The primary header contains:

- Product wordmark/name.
- Home link.
- Occupational Families link.
- About link.
- Portuguese/English locale switcher with an accessible label.
- A compact mobile navigation control.

The footer contains:

- A short independent-project disclaimer.
- Link to the official Novo CAGED source or documentation.
- Maintainer GitHub link.
- Maintainer email link.
- Current year and project name.

GitHub URL and email are deployment configuration, not hard-coded in multiple
components.

## 7. Application architecture

### 7.1 Runtime request path

1. The browser connects to CloudFront over HTTPS.
2. AWS WAF evaluates the request and may return 429 for excessive POST traffic.
3. CloudFront forwards dynamic traffic to Nginx with the configured origin
   verification header.
4. Nginx validates the origin header, applies its POST limit, and proxies the
   request to Next.js on `127.0.0.1:3000`.
5. A Server Action validates the submitted structural shape.
6. The server-only service invokes the appropriate Lambda using the EC2 instance
   role and AWS SDK v3.
7. The adapter decodes and validates the Lambda envelope, maps snake_case fields
   to the frontend domain model, and returns a typed result.
8. The UI renders data or a safe localized error. No AWS target is exposed to
   the browser.

### 7.2 Server and client boundaries

Server Components are the default. Client Components are limited to features
that require browser state or browser APIs, including:

- Filter form interactions and submission state.
- Select/combobox interaction.
- Locale switcher interaction when navigation APIs are required.
- Recharts visualizations.
- Mobile navigation state.

AWS clients, environment validation, Lambda adapters, logging, and cached CBO
reads must live in modules guarded by `server-only`. A Client Component must
never import those modules, directly or transitively.

The Server Action returns a serializable discriminated union rather than
throwing raw infrastructure errors into the React tree.

## 8. Recommended repository structure

The exact names may evolve, but boundaries should remain recognizable:

| Path | Responsibility |
| --- | --- |
| `src/app/[locale]/layout.tsx` | Localized root layout and shared shell |
| `src/app/[locale]/page.tsx` | Home page |
| `src/app/[locale]/occupations/page.tsx` | Occupational-family list page |
| `src/app/[locale]/about/page.tsx` | About and disclaimer page |
| `src/app/[locale]/loading.tsx` | Route-level loading UI |
| `src/app/[locale]/error.tsx` | Safe route-level error boundary |
| `src/app/health/route.ts` | Lightweight container health endpoint |
| `src/actions/query-caged.ts` | Analytics Server Action boundary |
| `src/server/aws/lambda-client.ts` | Shared AWS Lambda client factory |
| `src/server/aws/query-lambda-adapter.ts` | Existing query Lambda adapter |
| `src/server/aws/cbo-lambda-adapter.ts` | Future CBO Lambda adapter |
| `src/server/cache/get-occupational-families.ts` | Shared 24-hour CBO cache |
| `src/domain/caged/types.ts` | Normalized analytics domain types |
| `src/domain/caged/schemas.ts` | Boundary schemas and mapping helpers |
| `src/domain/caged/errors.ts` | Stable application error taxonomy |
| `src/domain/occupations/*` | Occupational-family types and schemas |
| `src/components/layout/*` | Header, footer, navigation, locale switcher |
| `src/components/filters/*` | Analytics filter form controls |
| `src/components/charts/*` | Chart and table representations |
| `src/components/ui/*` | Repository-owned UI primitives |
| `src/i18n/*` | Locale routing and request configuration |
| `messages/pt-BR.json` | Brazilian Portuguese messages |
| `messages/en.json` | English messages |
| `src/config/env.ts` | Typed server/client environment parsing |
| `tests/unit/*` | Pure functions, schemas, and adapters |
| `tests/integration/*` | Server Action and component integration |
| `tests/e2e/*` | Critical browser journeys |
| `Dockerfile` | Multi-stage standalone production image |

Keep domain types independent of React and the AWS SDK. Keep AWS response
shapes separate from normalized UI types.

## 9. Home page

### 9.1 Page intent

Home is the principal product experience. It introduces the dataset briefly,
provides the query controls, and renders the selected result without requiring
the visitor to understand CAGED storage or AWS architecture.

Suggested Portuguese headline: “Explore a movimentação do emprego formal no
Brasil.” The English message should express the same meaning, not translate
official dataset or CBO titles unnecessarily.

### 9.2 Filter form

The form contains:

| Field | UI behavior | Lambda mapping |
| --- | --- | --- |
| Geography | Country or state selector; defaults to Brazil | `locationType`, `locationCode` |
| Occupational family | Optional searchable combobox; defaults to all families | `professionCode`, omitted for all |
| Start month | Optional month selector | `from` as `YYYYMM` |
| End month | Optional month selector | `to` as `YYYYMM` |

The state selector uses official two-digit IBGE state codes. It exposes all 26
states and the Federal District. State labels are localized where appropriate,
but proper names keep their standard Portuguese spelling.

The occupational-family control displays the official Portuguese family title,
including in the English interface. It may add localized helper text, but must
not invent translated official classifications. Search should match code and
title, be accent-insensitive where practical, and support keyboard navigation.

Date controls have three structural states:

1. Both absent: omit both `from` and `to` and let the Lambda select its latest
   available month.
2. Both present: send both values as `YYYYMM`.
3. Only one present: prevent submission and ask the user to complete or clear
   the pair.

The third rule checks request completeness, not dataset policy. Next.js must not
duplicate the Lambda's maximum-range, latest-month, catalog-availability, or
chronological business rules. The Lambda response is authoritative for those
rules. Native control constraints may improve input shape but must not drift
into a second copy of backend policy.

### 9.3 Submission behavior

- Submit through a Server Action.
- Disable duplicate submission while a request is pending.
- Keep the current selections visible during loading and after an error.
- Give assistive technology a polite loading announcement.
- Do not optimistically fabricate metrics.
- Do not place Lambda identifiers or request envelopes in HTML, client bundles,
  page metadata, or browser logs.
- A successful response replaces the result region and moves focus or announces
  the update without unexpectedly scrolling keyboard users.

### 9.4 Result summary

The result heading identifies:

- Brazil or selected state.
- All occupational families or the returned family code and official title.
- Returned month or inclusive returned range.
- Dataset/catalog update metadata when useful and understandable.

Summary cards may show admissions, dismissals, net balance, and average
admission salary for a single returned month. For multi-month results, avoid
presenting a naive average of monthly averages. Either show the latest returned
month in summary cards with a clear label or compute only mathematically valid
aggregates from `salarySum` and `salaryCount`. The charts remain the primary
multi-month view.

### 9.5 Charts

The MVP result includes:

1. Admissions and dismissals by month, presented together for comparison.
2. Net balance by month, with positive, zero, and negative values distinguishable
   by position, labels, and pattern or icon—not color alone.
3. Average admission salary by month in nominal Brazilian reais.

`totalTurnover`, `salarySum`, and `salaryCount` remain available in the domain
model. Turnover may appear in a tooltip or table, but adding another chart is
optional for MVP. `salarySum` and `salaryCount` are primarily supporting values
and should not be promoted without explanatory copy.

Chart requirements:

- Responsive width without horizontal page overflow.
- Month labels formatted for locale, while preserving the underlying `YYYYMM`
  key for sorting.
- Brazilian-real currency formatting with the active UI locale.
- Tooltips usable by pointer and keyboard where the chart library permits.
- Visible axis labels or adjacent explanatory labels.
- A stable visual palette such as blue and orange; red/green must not be the sole
  distinction.
- Respect `prefers-reduced-motion` and avoid decorative chart animation.
- Do not silently omit zero-valued months returned by the Lambda.

### 9.6 Accessible data table

Every chart result has an equivalent semantic table containing:

- Month.
- Admissions.
- Dismissals.
- Net balance.
- Total turnover.
- Average admission salary.
- Salary observation count when it helps explain a zero or unavailable salary.

The table may be collapsed visually behind a “View data table” control, but it
must remain keyboard accessible and must use proper headers and captions. On
small screens, use a deliberate scroll container or stacked row treatment; do
not compress columns into illegible text.

### 9.7 Empty and error states

| Condition | Required response |
| --- | --- |
| No returned months | Explain that no data is available for the selection and keep filters editable |
| Structural form issue | Inline localized message associated with the relevant control |
| Lambda 400 | Localized invalid-query message; a safe backend message may be mapped, never blindly injected as HTML |
| WAF/Nginx 429 | Explain the request limit and ask the visitor to wait before trying again |
| Lambda 503 | Explain that dataset data is temporarily unavailable and offer retry |
| Lambda 500 or invocation failure | Generic temporary-error message and stable incident identifier if available |
| Invalid Lambda envelope/body | Generic temporary-error message; log the schema failure server-side |
| CBO list unavailable | Keep country/state and date query usable; show all families as the fallback and explain the selector limitation |

The UI must not show stack traces, AWS request IDs as the sole explanation,
Lambda ARNs, SDK error objects, or raw backend payloads.

## 10. Occupational Families page

This page lists the same cached family options used by the Home selector. It is
an explanatory index, not a list of every individual CBO occupation.

Each item displays the official `familyTitle`, such as “Policiais,
guardas-civis municipais e agentes de trânsito”. The corresponding
`familyCode` remains an internal value for the Home selector and is not shown
in this reference list.

Requirements:

- Sort consistently by code unless product testing supports another order.
- Provide client-side search by family title after the server supplies the
  cached list.
- Preserve diacritics in display.
- Explain that analytics are aggregated by family.
- Use a semantic list or table that works on desktop and mobile.
- Show a retryable failure state when no family data is available.
- Share one server cache with the Home selector; do not implement page-specific
  copies of the same fetch.

## 11. About page and public disclaimer

The About page must explain, in both locales:

- The site visualizes monthly formal-employment movements from Novo CAGED.
- The data originates from Brazil's Ministry of Labor and Employment/PDET or the
  currently authoritative official source documented by the data pipeline.
- Results are grouped by CBO occupational family and geography.
- Admissions and dismissals are movements, not a complete count of all employed
  people.
- “Average admission salary” refers to the salary field represented by the
  dataset for admissions; it is not the average salary of everyone in a family.
- Currency values are nominal BRL unless the upstream dataset later documents
  an adjustment.
- Official data can be revised and this project's processing or presentation may
  contain mistakes.
- The site is independent, experimental, and neither supported nor endorsed by
  a government body.
- Visitors should consult the linked official source for authoritative use.

Avoid promises that a disclaimer alone eliminates legal risk. Avoid government
seals, visual impersonation, or a domain treatment that implies official status.

## 12. Existing query Lambda contract

The source of truth is the `caged-query-lambda` repository README and deployed
function behavior. The frontend does not change this Lambda.

### 12.1 Invocation input

Invoke the Lambda synchronously with an object whose relevant shape is:

| Field | Type | MVP behavior |
| --- | --- | --- |
| `queryStringParameters.locationType` | string | `COUNTRY` or `STATE` |
| `queryStringParameters.locationCode` | string, optional | Required by Lambda for `STATE`; omitted for `COUNTRY` |
| `queryStringParameters.professionCode` | string, optional | CBO family code; omit to accept Lambda default `ALL` |
| `queryStringParameters.from` | string, optional | `YYYYMM`; omit together with `to` |
| `queryStringParameters.to` | string, optional | `YYYYMM`; omit together with `from` |

Do not send `CITY` from the MVP interface. Do not rename these camelCase input
keys: the Lambda reads them directly from `queryStringParameters`.

### 12.2 Invocation output envelope

AWS SDK invocation returns an SDK result with a binary `Payload` and may include
`FunctionError`. Decode the payload as UTF-8 JSON. The decoded outer Lambda
response contains:

| Field | Meaning |
| --- | --- |
| `statusCode` | HTTP-style status chosen by the Lambda |
| `headers` | API-response headers; not authoritative frontend configuration |
| `body` | JSON encoded as a string |

The adapter must handle these layers independently:

1. SDK/network/permission invocation failure.
2. `FunctionError` reported by AWS Lambda.
3. Missing or empty payload.
4. Invalid outer JSON or envelope shape.
5. Invalid JSON in `body`.
6. A non-2xx `statusCode`.
7. A 2xx body that fails the expected success schema.

### 12.3 Direct body shape

Because direct invocation bypasses API Gateway response mapping, the successful
`body` uses the Lambda's internal snake_case fields:

| Lambda field | Frontend domain field |
| --- | --- |
| `catalog_version` | `catalogVersion` |
| `query.location_type` | `query.locationType` |
| `query.location_code` | `query.locationCode` |
| `query.profession_code` | `query.professionCode` |
| `months.*.net_balance` | `months.*.netBalance` |
| `months.*.total_turnover` | `months.*.totalTurnover` |
| `months.*.avg_salary` | `months.*.avgSalary` |
| `months.*.salary_sum` | `months.*.salarySum` |
| `months.*.salary_count` | `months.*.salaryCount` |

Unchanged names include `dataset`, `location`, `profession`, `months`,
`admissions`, `dismissals`, `from`, `to`, `type`, `code`, `name`, and `title`.

Normalize the response exactly once inside the adapter. Components, actions,
and domain services must not depend on the outer envelope or snake_case AWS
shape.

The normalized success model contains:

- Dataset identifier and catalog version.
- Effective query, including the effective range chosen by the Lambda.
- Returned location descriptor.
- Returned occupational-family descriptor.
- A record of month keys in `YYYYMM` format.
- For each month: admissions, dismissals, net balance, total turnover, average
  admission salary, salary sum, and salary count.

Month ordering in the UI must be derived by sorting valid `YYYYMM` keys ascending;
do not rely on JSON object insertion order as the domain guarantee.

### 12.4 Backend statuses

| Status | Meaning | Application category |
| --- | --- | --- |
| 200 | Successful query | `success` |
| 400 | Query rejected by Lambda business validation | `invalid_query` |
| 503 | Catalog or metrics data temporarily unavailable | `unavailable` |
| 500 | Unexpected Lambda failure | `upstream_error` |
| Other non-2xx | Unrecognized upstream response | `upstream_error` |

Backend `message` strings are diagnostic contract data, not localized UI copy.
Map known categories to translated messages. A safe message may be retained in
server logs after redaction.

## 13. Future CBO Lambda contract

The CBO Lambda does not exist yet. The frontend adapter boundary must isolate
that uncertainty. The preferred successful application-level contract is a list
of unique records:

| Field | Type | Meaning |
| --- | --- | --- |
| `familyCode` | string | CBO family code, for example `5172` |
| `familyTitle` | string | Official family title in Portuguese |

The underlying DynamoDB source currently contains individual occupation rows
such as `code`, `family_code`, `family_title`, and `ocupation_title`. The product
must aggregate and select by `family_code` and `family_title` only. The future
Lambda should return unique family records. The frontend must not fetch every
individual occupation and silently deduplicate a large raw table as its normal
production design.

When the Lambda is implemented, document its exact invocation event and response
envelope, then update the adapter schema and contract tests without leaking its
raw shape into components.

### 13.1 CBO caching

Use Next.js cache utilities based on `use cache` with a 24-hour lifetime. The
cached function is shared by Home and the Occupational Families page.

Caching rules:

- Cache only successfully parsed, non-empty family lists.
- Do not intentionally cache invocation errors or schema failures.
- Normalize and sort before returning the cached domain list.
- A process restart may cause a cache miss; correctness must not depend on cache
  persistence.
- Do not use deprecated `unstable_cache` for new implementation.
- If a future deployment supports cache tags, a manual revalidation tag may be
  added without shortening the 24-hour default.

## 14. Server Action contract

The analytics Server Action accepts a small serializable input model and returns
a serializable result union.

Input contains:

- Locale.
- Geography selection.
- Optional occupational-family code.
- Optional paired `from` and `to` months.

The action must:

1. Validate types, allowed MVP location choices, state-code shape, family-code
   shape, and the completeness/format of the date pair.
2. Build the exact query Lambda event through the adapter.
3. Invoke the service without accepting a Lambda name or AWS region from the
   submitted form.
4. Return normalized data on success.
5. Return stable error codes for localized rendering.
6. Avoid returning SDK errors, raw payloads, stack traces, environment values,
   or sensitive configuration.

The action must not attempt to enforce the Lambda's current catalog month,
maximum query span, or date ordering policy. Those policies can change with the
backend and are reported through the Lambda's 400 response.

## 15. Internationalization

- Supported locale identifiers are exactly `pt-BR` and `en` for MVP.
- `pt-BR` is the product default.
- All visible interface text, labels, validation copy, metadata, empty states,
  accessibility labels, and error messages use message catalogs.
- No user-visible string is assembled by concatenating translated fragments.
- Use locale-aware `Intl.NumberFormat` and `Intl.DateTimeFormat` where possible.
- Currency is BRL, displayed as nominal Brazilian reais.
- Official dataset names, CBO family titles, codes, and proper nouns remain as
  supplied by the authoritative data source unless an official translation is
  available.
- Locale switching preserves the equivalent route. Preserving unsubmitted local
  form state is desirable but not required; never submit analytics merely to
  change locale.
- Both message catalogs must gain the same keys in the same change.

## 16. Visual design and responsiveness

The UI should feel trustworthy, modern, and clearly independent. Use a restrained
palette, strong typography, generous spacing, and data-first layouts. Avoid
visual treatment that resembles an official government portal.

### 16.1 Breakpoint behavior

- Start from a 320-pixel-wide viewport without horizontal page overflow.
- Stack form controls and summary cards on small screens.
- Use a compact navigation menu on small screens with an obvious close action.
- On larger screens, place compatible filters in a grid and let results use the
  available width.
- Cap long-form About content at a readable line length.
- Test common phone widths, tablet layout, and at least 1440-pixel desktop width.

### 16.2 Design tokens

Define theme values for background, surface, foreground, muted foreground,
border, focus ring, primary, comparison series, positive/negative/neutral data,
and chart grid. Use CSS variables through Tailwind so light/dark evolution does
not require rewriting components. Dark mode is optional and outside MVP unless
implemented completely.

## 17. Accessibility

Target WCAG 2.2 AA for the implemented experience.

- Every form control has a programmatic label and associated error/help text.
- All actions are keyboard operable with visible focus.
- Touch targets are comfortably sized.
- Heading levels and landmarks follow page structure.
- Navigation exposes current-page state.
- The locale selector announces the language names rather than only flags.
- Color contrast meets AA requirements.
- Charts have concise text summaries and the equivalent table.
- Dynamic submission status uses an appropriate live region without excessive
  announcements.
- Errors identify the affected field or result region and do not rely on color.
- Reduced-motion preferences are respected.
- Automated accessibility checks supplement, but do not replace, keyboard and
  screen-reader-oriented review.

## 18. Security and privacy

### 18.1 Secrets and AWS access

- Use the EC2 instance role. Do not ship long-lived AWS access keys.
- Lambda identifiers and AWS region are server-only environment values.
- Never prefix secrets, Lambda names, ARNs, origin headers, or internal URLs with
  `NEXT_PUBLIC_`.
- Import `server-only` in AWS and environment modules that must never enter a
  browser bundle.
- Use least-privilege Lambda invoke permissions provisioned by Terraform.

### 18.2 Input and output safety

- Treat all form input and all Lambda output as untrusted.
- Validate at boundaries with explicit schemas.
- React escapes displayed text by default; do not use `dangerouslySetInnerHTML`
  for Lambda or translation data.
- Do not accept arbitrary Lambda function names, qualifiers, regions, or payload
  fragments from the client.
- Do not reflect raw upstream error content into markup.
- Security headers and edge controls are shared concerns with the infrastructure
  repo; frontend changes must not assume the edge makes application validation
  unnecessary.

### 18.3 Privacy

The MVP does not need names, email addresses, user accounts, precise device
fingerprints, or free-form personal input. Avoid storing query selections beyond
normal browser/server operation unless a later feature explicitly requires it.
Do not place full request payloads in logs by default.

## 19. Error taxonomy and observability

Define stable application errors such as:

- `InvalidQueryError`.
- `RateLimitedError`.
- `UpstreamUnavailableError`.
- `UpstreamInvocationError`.
- `UpstreamContractError`.
- `ConfigurationError`.

Server logs should be structured and include a generated correlation identifier,
operation name, duration, outcome, and safe dimensions such as `locationType`
and returned month count. Do not log AWS credentials, origin secrets, full
Lambda payloads, complete SDK objects, or visitor IP addresses from application
code.

Expected error states may be logged at warning level. Contract violations,
configuration failures, and unexpected exceptions use error level. A successful
health check should not generate noisy application logs.

## 20. Environment configuration

The application validates environment values at startup or first server use.

| Variable | Visibility | Required | Purpose |
| --- | --- | --- | --- |
| `AWS_REGION` | Server | Yes outside fully mocked tests | Lambda client region |
| `CAGED_QUERY_LAMBDA_FUNCTION_NAME` | Server | Yes | Existing query Lambda name or ARN |
| `CAGED_QUERY_LAMBDA_URL` | Server | Local development only | Function URL used only outside production |
| `CAGED_CBO_LAMBDA_FUNCTION_NAME` | Server | Required when CBO integration is enabled | Future CBO Lambda name or ARN |
| `CBO_CACHE_TTL_SECONDS` | Server | No; default `86400` | CBO cache lifetime |
| `NEXT_PUBLIC_SITE_URL` | Browser-safe | Deployment-dependent | Canonical public site URL |
| `NEXT_PUBLIC_GITHUB_URL` | Browser-safe | Yes for footer | Maintainer/project link |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Browser-safe | Yes for footer | Public contact address |

Prefer a feature/config switch for the not-yet-existing CBO Lambda if the first
frontend deployment must precede it. The disabled state must degrade explicitly
to “all occupational families” rather than inventing fixture data in production.

The local Function URL is not browser configuration and must remain in ignored
local environment files. It is never accepted in production, where direct IAM
invocation remains mandatory.

Provide `.env.example` with placeholders only. Never commit production values,
AWS account numbers when avoidable, or credentials.

## 21. Performance and caching

- Use Server Components to minimize browser JavaScript.
- Load chart code only where results require it when practical.
- Keep fonts and icons optimized and self-hosted or framework-managed.
- Use CloudFront caching for immutable Next static assets as defined by the
  infrastructure repo.
- Do not assume CloudFront caches Server Actions or analytics results.
- Do not application-cache analytics responses in MVP; the query Lambda already
  performs read-only retrieval from processed DynamoDB records.
- Cache the CBO family list for 24 hours on the server.
- Avoid layout shift by reserving sensible loading/result space.
- Keep the initial Home shell useful before chart JavaScript loads.

Performance targets for a production-like connection are goals, not guarantees:

- No avoidable horizontal layout shift.
- A Lighthouse accessibility score of at least 90 on the three primary pages.
- Core Web Vitals in the “good” range for the static shell under normal load.
- No single dependency added solely for trivial formatting or state handling.

## 22. Health endpoint

`GET /health` returns a small non-sensitive success payload when the Next.js
process is ready to accept requests. It must not invoke Lambda or expose config.
Nginx/container deployment health checks use this endpoint locally.

The health endpoint verifies process readiness, not end-to-end dataset health.
Upstream failures belong in application behavior and monitoring, not in a check
that would cause a healthy web process to restart repeatedly.

## 23. Docker and deployment contract

- Set `output: 'standalone'` in Next.js configuration.
- Use a multi-stage Docker build.
- Install dependencies from a committed lockfile with a frozen install.
- Run the production process as a non-root user.
- Copy only standalone runtime output, static assets, and required public files
  into the final image.
- Listen on port 3000 inside the container; the host publishes it only to
  `127.0.0.1:3000` as controlled by the infrastructure deployment.
- Handle termination signals cleanly.
- Do not bake `.env` files, AWS credentials, or deployment secrets into layers.
- Tag images immutably with the commit SHA; a convenience tag may accompany it
  but must not be the rollback identity.

The frontend CI workflow should:

1. Install with the pinned package manager and lockfile.
2. Run formatting verification, linting, type checking, unit/integration tests,
   and production build.
3. Build the image.
4. Authenticate to AWS through GitHub OIDC only for authorized deployment refs.
5. Push to the ECR repository provisioned by Terraform.
6. Deploy through the SSM mechanism defined by the infrastructure repository.
7. Verify local and public health according to the deployment workflow.
8. Preserve the previous immutable image reference for rollback.

Pull requests must not deploy production infrastructure or mutate Lambdas.

## 24. Testing strategy

Use Vitest, React Testing Library, and Playwright unless the repository adopts an
equivalent tool before implementation begins.

### 24.1 Unit tests

- Query form structural schema.
- State-code and month-shape helpers.
- Query event construction, including omitted optional fields.
- Outer Lambda envelope decoding.
- Snake_case-to-camelCase normalization.
- All known status/error mappings.
- Month sorting and locale formatting.
- CBO response normalization and cache wrapper behavior.
- Salary aggregation helper if summary aggregation is implemented.

### 24.2 Integration tests

- Server Action success with a mocked adapter.
- Server Action 400, 503, invocation, contract, and unknown error paths.
- Home form retains selections through failures.
- CBO failure leaves an all-families query path available.
- Both locales have the same message keys and render core pages.
- Charts and accessible table receive identical normalized data.

### 24.3 End-to-end tests

- Load Portuguese Home, submit default Brazil query, and render latest-month
  results from a deterministic test double.
- Submit a state plus occupational family plus paired range.
- Reject a single-ended date pair before invocation.
- Switch locale and reach the equivalent page.
- Navigate Home, Occupational Families, and About on desktop and mobile.
- Display a user-friendly 429 state.
- Use the critical flow by keyboard.
- Confirm no Lambda ARN or AWS endpoint appears in rendered HTML or browser
  network destinations.

Do not run end-to-end tests against production Lambda data in normal CI. Use
fixtures at the adapter boundary that reflect the real contract.

## 25. Code quality gates

The package scripts must expose stable commands for at least:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`

Use the package-manager version recorded by the repository. CI runs frozen
lockfile installation. Strict TypeScript is required. New lint suppressions,
unchecked type assertions, and boundary schema bypasses require a documented
reason.

> Temporary implementation note: the initial localized shell uses npm and
> `package-lock.json` because pnpm is not yet available in this repository. A
> dedicated maintenance task will migrate to the project-standard pnpm workflow.

## 26. MVP acceptance criteria

The MVP is complete when all of the following are true:

1. Home, Occupational Families, and About are reachable in `pt-BR` and `en`.
2. Navigation and locale switching work at mobile and desktop widths.
3. A default Home submission invokes the existing query Lambda with
   `locationType=COUNTRY` and omits profession and dates.
4. A state submission sends the correct two-digit IBGE `locationCode`.
5. Selecting a family sends its `familyCode`, never an individual occupation
   code.
6. Omitting both dates lets the Lambda return only its latest available month.
7. Providing both dates passes them unchanged as `YYYYMM`.
8. Next.js does not duplicate Lambda-owned maximum-range or catalog-date rules.
9. The direct-invocation envelope and snake_case body are validated and mapped
   once in a server-only adapter.
10. No Lambda endpoint, ARN, function name, AWS credential, or raw payload is
    exposed to the browser.
11. Success renders admissions, dismissals, net balance, and average admission
    salary by month.
12. The same data is available through an accessible semantic table.
13. Query 400, 503, 500/invocation, malformed response, and edge 429 states have
    localized safe UI.
14. The CBO list is shared and cached server-side for 24 hours when its Lambda is
    available.
15. A CBO outage does not make the all-families analytics path unusable.
16. About accurately describes Novo CAGED, occupational-family grouping,
    limitations, independent status, and official-source link.
17. The app passes lint, strict type checking, tests, and production build.
18. The production image runs as non-root using Next.js standalone output and
    answers `/health` without contacting AWS services.
19. The application works at 320-pixel phone width without page overflow and at
    desktop width without an excessively stretched content layout.
20. Keyboard navigation, focus visibility, form labels, result announcements,
    contrast, reduced motion, and chart alternatives meet the accessibility
    requirements in this specification.

## 27. Deferred decisions

The following require a later product or architecture decision:

- Exact CBO Lambda event and response envelope.
- Whether result filters become shareable URL query parameters.
- Whether analytics responses receive a short server cache.
- City-level querying.
- Dark mode.
- Data export and saved comparisons.
- Full observability vendor integration.
- HTTPS or private connectivity between CloudFront and the origin, as tracked by
  the infrastructure specification.

Deferred work must not be partially exposed in the UI as a nonfunctional
control.

## 28. External references

- Query Lambda contract: <https://github.com/Stentzler/caged-query-lambda/blob/main/README.md>
- Next.js App Router: <https://nextjs.org/docs/app>
- Next.js caching: <https://nextjs.org/docs/app/getting-started/caching-and-revalidating>
- AWS SDK for JavaScript Lambda client: <https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/lambda/>
- CBO information: <https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo>
- PDET/Novo CAGED: <https://pdet.mte.gov.br/novo-caged>

When a reference and deployed behavior disagree, stop and verify the current
backend contract before changing the adapter. Do not guess around a contract
mismatch in presentation code.
