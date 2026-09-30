# SchoolPay

SchoolPay is a parent portal foundation for a U.S. launch beginning in Virginia. Phase 2 adds parent onboarding, child profiles, participating-school discovery and requests, controlled child-school connection requests, private tuition invoice uploads, documents, and resumable application drafts. Financing decisions, offers, agreements, payments, and repayments are not implemented.

## Local setup

1. Use Node.js 22 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from a dedicated SchoolPay Supabase project.
4. Apply the migrations in `supabase/migrations` in timestamp order. The dedicated SchoolPay staging project already has Phases 1–3 and the email OTP challenge migration applied.
5. In Supabase Auth, enable email confirmation, set the local and production Site URLs, and allow `/auth/callback` as a redirect URL for verification and password recovery.
6. Configure a mail sender for both Supabase Auth and sign-in OTP as described below before testing signup or sign-in.
7. Start the development server with `npm run dev`.

Without Supabase configuration, public pages are available and account pages explain that SchoolPay is not configured. The application creates no local mock identity, school, child, invoice, or financial state.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: dedicated SchoolPay Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public/publishable key for that project.
- `NEXT_PUBLIC_SITE_URL`: canonical site URL. Set this before production so canonical metadata, robots, and sitemap point to the deployed domain.
- `SUPABASE_SECRET_KEY`: Supabase server-only secret key used to manage OTP challenges and encrypt the pending sign-in cookie. The legacy `SUPABASE_SERVICE_ROLE_KEY` name also works. Never expose either through a `NEXT_PUBLIC_` variable.
- `AUTH_SMTP_HOST`, `AUTH_SMTP_PORT`, `AUTH_SMTP_USER`, `AUTH_SMTP_PASS`: SMTP server, port (`465` or `587`), account, and password used for sign-in codes. For a temporary Gmail sender, use `smtp.gmail.com`, port `465`, the full Gmail address, and a Google App Password. Keep the password server-only.
- `AUTH_EMAIL_FROM`: sender address matching the SMTP account, such as `SchoolPay <your-address@gmail.com>`.
- `RESEND_API_KEY`: optional alternative to SMTP for sign-in codes. Resend requires a verified sending domain to reach other users; restrict its key to that domain.

Configure the same sender in **Supabase → Authentication → Emails → SMTP Settings** so Supabase can deliver signup confirmation and password reset emails. For Gmail, use `smtp.gmail.com`, port `465`, the full Gmail address as username, its Google App Password, and the matching sender address. Google App Passwords require two-step verification and must be created by the account owner. Keep email confirmation enabled, set the Supabase Site URL to the production site, and allow `https://schoolpay-ten.vercel.app/auth/callback` plus `http://localhost:3000/auth/callback` for local development. Without Supabase custom SMTP and the app's OTP mail settings, new users cannot reliably confirm accounts or finish signing in.

Gmail SMTP is a temporary sender and has provider rate limits. Before opening registration to a larger audience, use a dedicated domain and transactional mail provider with verified DNS records and delivery monitoring.

Sign-in checks the password first, sends a six-digit code to the registered email, and creates the app session only after the code is verified. Codes expire after ten minutes, allow up to five attempts, and are rate limited per user. OTP rows are stored in the private schema and are not directly accessible to browser roles.

All financial execution switches default to off. The local server parser recognizes `SCHOOLPAY_ENABLED`, `APPLICATIONS_ENABLED`, `IDENTITY_VERIFICATION_ENABLED`, `UNDERWRITING_ENABLED`, `OFFERS_ENABLED`, `AGREEMENTS_ENABLED`, `DISBURSEMENT_ENABLED`, `REPAYMENTS_ENABLED`, and `REFUNDS_ENABLED`. Production authorization must use database-controlled flags, not client-supplied environment values.

## Phase 2 parent routes

- `/parent/onboarding` and `/parent/profile`: parent identity/contact and U.S. address setup.
- `/parent/children`: add, view, and edit child profiles.
- `/parent/schools` and `/parent/schools/request`: browse directory-visible schools and request contact about an unlisted school.
- `/parent/school-requests`: review or cancel an unprocessed request.
- `/parent/school-fees`: list invoices; `/parent/school-fees/upload` accepts PDF, JPG, JPEG, or PNG files up to 4 MB.
- `/parent/documents`: review private invoice documents.
- `/parent/applications`: start, view, and resume drafts linked to an invoice.

Parents can request a school connection, but that request never confirms attendance. Parent-entered invoice amounts remain unverified until school review. An application draft is a saved record only.

## Database and private documents

For a new SchoolPay Supabase project, apply every file in `supabase/migrations` in timestamp order. The confirmed staging project has these migrations applied.

The Phase 2 migration adds row-level policies and explicit column/table grants, private invoice storage, owner-scoped temporary downloads, invoice revisions, and status/audit history. Phase 3 adds school operations and confirmation workflows. The email OTP migration adds a private challenge table and server-only rate-limited RPCs. Keep secret keys out of the browser and review the policies against the actual school-staff workflow before launch.

## Verification and future work

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before release. U.S. privacy and service terms need qualified review. Identity verification, underwriting, offers, agreements, disbursement, repayments, refunds, school portals, and operational review workflows remain future work.
