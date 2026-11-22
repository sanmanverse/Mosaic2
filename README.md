# Mosaic 3.0 — social article discovery

Mosaic is a React + Supabase publishing and reading product. Writers define each story's five-category composition; readers set a reading profile and receive recommendations informed by their interests, reading signals, followed writers, topic overlap and recency.

## Product capabilities

### Reader experience
- Responsive discovery feed, five composition filters, saved and following feeds.
- Search across the complete published catalogue using PostgreSQL full-text search; writer search by display name and username.
- Paginated search results and feed loading.
- Article reading view with safe Markdown rendering (raw HTML is not enabled), reading completion, likes, bookmarks and comments.
- Personal reading DNA, with private preference storage and activity-based recommendations.

### Writer experience
- Email/password authentication and auto-provisioned public profile.
- Public writer profiles with biography, website, avatar and all published stories.
- Profile editing and avatar uploads.
- Article creation, editing, private drafts, publishing, deletion and cover image upload.
- Exactly five composition percentages, each 0–100 and totalling exactly 100; checked in the browser and database.
- Creator studio for published stories and drafts.

### Safety and operations
- Row Level Security for all user-owned records.
- Private reader preferences in a separate table; public profile queries cannot read them.
- Moderator-only report queue with an audit trail, server-controlled JWT `app_metadata.mosaic_role` and narrow moderation RPCs.
- Database throttles for comment, article, reading-event and report creation.
- User data JSON export and an account-deletion Edge Function.
- Basic React error boundary, security response headers, GitHub CI and Dependabot.

## Stack

| Layer | Technology |
|---|---|
| UI | React 18, Vite, responsive CSS, Lucide |
| Content | ReactMarkdown + remark-gfm; raw HTML disabled |
| Auth/API | Supabase Auth + `@supabase/supabase-js` |
| Database | Supabase Postgres, RLS, full-text search, RPCs and triggers |
| Media | Supabase Storage (`article-covers`) |
| Hosting | Vercel (or any static Vite host) |
| Tests | Node built-in test runner for pure logic; CI also runs Vite build |

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
# Add Supabase URL and anon/publishable key to .env
npm run dev
```

Without valid Supabase environment variables, Mosaic shows its sample preview. Authentication, shared data, media uploads, publishing, search, and account tools require a configured Supabase project.

Run automated unit tests:

```bash
npm test
```

Build the production bundle:

```bash
npm run build
```

## Supabase database setup

1. Create a Supabase project.
2. Open the SQL Editor and run the complete `supabase/schema.sql` script.
3. In Project Settings → API, copy the Project URL and anon/publishable key.
4. Set these in `.env` (never put a service-role key in the frontend):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

5. Configure Authentication → URL Configuration. Set the local Site URL to `http://localhost:5173` and add production and preview redirect URLs.
6. Configure a production SMTP provider in Authentication → SMTP Settings. Set sender identity, SPF, DKIM and DMARC for your domain; test confirmation, password reset and rate limits.
7. Run the SQL against a staging project first. Test anonymous, normal-user and moderator permissions with separate accounts before applying to production.

The SQL is designed to be rerunnable. It creates tables, indexes, policies, triggers, search RPC, storage bucket and rate-limit triggers. It also migrates reader preferences out of the publicly readable profile table into `profile_preferences`.

### Moderator setup

Moderator status must be set only in server-controlled `app_metadata`; never accept a role from a profile form or `user_metadata`. Using a trusted server-side Supabase Admin client (never browser code), assign:

```js
await supabase.auth.admin.updateUserById(USER_UUID, {
  app_metadata: { mosaic_role: 'admin' }
});
```

The user should refresh/sign in again to receive the updated JWT claim. Normal accounts cannot grant themselves moderator access. Review `SECURITY.md` before assigning moderators.

### Account deletion Edge Function

Deploy the included function:

```bash
supabase functions deploy delete-account
supabase secrets set APP_ORIGIN=https://YOUR_DOMAIN
```

The Supabase Edge Function runtime provides the project URL and service-role secret. Verify those secrets are present in the function environment. The function verifies the caller's JWT, requires a sign-in within the last 15 minutes, removes their files from `article-covers`, then deletes the Auth user; foreign-key cascades remove profile and related records. Test deletion in staging before launch. If you change the storage bucket name, update the function too.

## Recommendation model

The current baseline score is:

```text
70% × cosine similarity of five-category composition
15% × topic Jaccard overlap
10% × followed-writer affinity
 5% × freshness (30-day decay)
```

Previously read/completed articles and low composition matches are excluded from the primary personalized set. When both sources exist, explicit preferences contribute 65% and behavioural reading signals 35%. Taste signals currently use view 0.35, read 1.0, like 1.3, save 1.6 and complete 2.0. These are configurable starting weights, not empirically proven universal values. Add minimum dwell time, time decay, explicit negative feedback, exploration/diversity and offline ranking evaluation (precision@k, recall@k, saves/reads per impression) before relying on recommendations at scale.

## Search and pagination

The UI calls `public.search_articles(search_query, result_limit, result_offset)` for article search. The function uses `websearch_to_tsquery`, topic matching and a GIN-indexed generated search vector. Search results are fetched in pages of 30. The regular feed loads an initial batch and offers a load-more action. Tune limits and indexes using real query plans and load tests.

Writer search uses public profile fields only. Reader preferences are stored separately and protected by RLS; do not move them back into the public profile row.

## Deployment

### Vercel
1. Push this repository to GitHub.
2. Import it into Vercel with Framework Preset **Vite**.
3. Build command: `npm run build`; output directory: `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Production, Preview and Development as appropriate.
5. Replace `YOUR_DOMAIN` in `public/robots.txt` and `public/sitemap.xml` with the canonical domain. The current SPA sitemap covers the home page only; individual article pages need server rendering or pre-rendering and stable article URLs for reliable crawler indexing.
6. Add the production domain to Supabase Auth redirect URLs and test all flows.

`vercel.json` adds basic security headers and immutable caching for built assets. Review these headers against any custom integrations before deployment. Do not enable a strict CSP until you have listed all required script, image, connect and font origins.

### GitHub

```bash
git init
git add .
git commit -m "Build Mosaic social article platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mosaic-social-discovery.git
git push -u origin main
```

GitHub Actions runs `npm test` and `npm run build` on pushes and pull requests. Dependabot checks npm packages and GitHub Actions weekly. Keep `.env` out of Git.

## Production operations checklist

Some tasks cannot be completed from source code alone; they require ownership of the real provider accounts and environment. Complete these before inviting the public:

- [ ] Set production SMTP, SPF, DKIM, DMARC, email templates and password reset redirects.
- [ ] Configure Supabase automated backups/PITR appropriate to the plan, and perform a restore drill.
- [ ] Configure Vercel domain, TLS, environment variables and deployment protection for previews.
- [ ] Configure uptime/error monitoring (e.g. Sentry) and alert routing; this repository currently logs uncaught React render errors to the browser console and does not ship a paid monitoring DSN.
- [ ] Configure privacy-conscious product analytics and consent/retention policy. Reading events are currently the first-party recommendation signal; they are not a complete analytics warehouse.
- [ ] Replace the privacy and terms templates with reviewed policies, add support/security contacts and publish community guidelines.
- [ ] Review legal age requirements, user-generated content procedures, copyright/takedown process, data retention, export/deletion and breach response for target jurisdictions.
- [ ] Test RLS and moderator controls with multiple real accounts; run `npm audit` and remediate advisories.
- [ ] Run accessibility checks, cross-browser/mobile checks, upload validation and load tests.
- [ ] Add SSR/pre-rendered article routes and a dynamic sitemap before expecting article-level SEO/social crawler previews.
- [ ] Add blocked-user controls, an appeal workflow, stronger spam detection and moderation analytics as community volume grows. Comment pagination and owner edit/delete controls are included.

## Repository layout

```text
mosaic-production/
├── .github/workflows/ci.yml
├── .github/dependabot.yml
├── public/                 # favicon, social card, manifest, robots and sitemap
├── vite.config.js          # React plugin and build config
├── src/App.jsx             # product UI and workflows
├── src/lib/                # Supabase client, ranking and validation
├── supabase/schema.sql     # schema, RLS, search, throttles, moderation
├── supabase/functions/     # account deletion edge function
├── test-recommendation.js  # unit tests
├── SECURITY.md
├── PRIVACY-POLICY-TEMPLATE.md
└── TERMS-TEMPLATE.md
```

## Important verification note

The pure JavaScript unit tests and JSX/JavaScript syntax transpilation have been run in this workspace. Dependency installation timed out due to the package registry/network environment, so the full Vite production build and GitHub CI were not executed here. The SQL has not been applied to a live Supabase project, and the Edge Function has not been deployed. Complete those provider-side steps in staging before production use.


## Editorial themes, photo galleries and sign-in methods

Writers can choose one of five story themes in the editor: The Journal (classic), Modern, Atelier, Field Notes, and Noir. Add a cover plus up to eight inline gallery photos (JPG, PNG or WebP, max 5 MB each). Apply the latest `supabase/schema.sql` so `articles.image_urls` and `articles.theme_key` exist.

Authentication supports email/password, Google OAuth, and phone/SMS one-time codes through Supabase Auth. In Supabase Dashboard:

1. Authentication → Providers: enable Google and configure the Google OAuth client ID/secret and callback URL shown by Supabase.
2. Enable Phone provider and configure an SMS provider (Twilio or another supported provider), templates, and rate limits.
3. Authentication → URL Configuration: add your local and production app URLs to the redirect allow-list.
4. Keep OAuth client secrets, SMS provider tokens, database passwords, and Supabase `service_role` keys in provider/server secret settings only. Never add them to `VITE_*`, frontend code, or Git.

## Admin / moderator access — no hard-coded credentials

There is intentionally no default admin username or password in this repository. Create a normal account through the sign-up flow first. Then assign the moderator claim to that exact account from the trusted Supabase SQL Editor (replace the email):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"mosaic_role":"admin"}'::jsonb
where lower(email) = lower('YOUR_ADMIN_EMAIL');
```

Sign out and back in to refresh the JWT. The moderator identity is the account's Supabase Auth user UUID; the login is its chosen email/Google/phone identity. Do not set this claim from `user_metadata`, client code, or an ordinary profile update. Remove moderator access with:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'mosaic_role'
where lower(email) = lower('YOUR_ADMIN_EMAIL');
```

There are no admin passwords to disclose or recover. This package contains only `.env.example` placeholders, not project credentials. Configure secrets directly in Supabase/Vercel. If any real credential was previously committed to a public repository, rotate it at the provider; deleting it from the latest source does not invalidate leaked credentials or remove old Git history.


## Validation status for this package

The included Node test suite checks recommendation behaviour, editorial theme/photo fields, sign-in wiring, and common hard-coded credential patterns. Run `npm test` after installing dependencies. The React/Vite production build still needs to be run in your own environment with dependencies installed (`npm run build`); the authoring environment's dependency installation timed out, so no successful production build is claimed here.
