# Security policy

## Reporting a vulnerability

Do not publish exploit details in public issues. Contact the project maintainer privately and include reproduction steps, impact, and affected versions. Add a security contact address before making the repository public.

## Current controls

- Supabase Auth; frontend contains only the anon/publishable key.
- Row Level Security on all public user-data tables.
- User-owned article/profile writes and per-user storage folders.
- Moderator permissions are read from server-controlled JWT `app_metadata.mosaic_role`, never editable profile metadata.
- Database-side rolling-window throttles for comments, article creation, reading events and reports.
- Markdown renderer does not enable raw HTML.
- Vercel security response headers and dependency update automation.

## Required before public launch

- Run the SQL in a non-production Supabase project first and test RLS using at least two normal accounts plus a moderator.
- Configure MFA for Supabase/Vercel administrators and rotate keys if exposed.
- Set up alerting, backups/PITR, incident response, data export/deletion and a verified security contact.
- Review third-party dependencies and run `npm audit` in CI; triage advisories rather than blindly applying breaking updates.
- Confirm moderator assignment happens only through trusted server-side Supabase admin tooling.
