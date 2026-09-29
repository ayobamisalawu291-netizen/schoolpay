# SchoolPay

SchoolPay is a parent portal foundation for a U.S. launch beginning in Virginia. Phase 2 adds parent onboarding, child profiles, participating-school discovery and requests, controlled child-school connection requests, private tuition invoice uploads, documents, and resumable application drafts. Financing decisions, offers, agreements, payments, and repayments are not implemented.

## Local setup

1. Use Node.js 22 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from a dedicated SchoolPay Supabase project.
4. Apply the migrations in `supabase/migrations` in timestamp order. The dedicated SchoolPay staging project already has Phases 1–3 and the email OTP challenge migration applied.
5. In Supabase Auth, enable email confirmation, set the local and production Site URLs, and allow `/auth/callback` as a redirect URL for verification and password recovery.
6. Configure Resend as described below before testing signup or sign-in.
7. Start the development server with `npm run dev`.

Without Supabase configuration, public pages are available and account pages explain that SchoolPay is not configured. The application creates no local mock identity, school, child, invoice, or financial state.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`: dedicated SchoolPay Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: public/publishable key for that project.
- `NEXT_PUBLIC_SITE_URL`: canonical site URL. Set this before production so canonical metadata, robots, and sitemap point to the deployed domain.
- `SUPABASE_SECRET_KEY`: Supabase server-only secret key used to manage OTP challenges and encrypt the pending sign-in cookie. The legacy `SUPABASE_SERVICE_ROLE_KEY` name also works. Never expose either through a `NEXT_PUBLIC_` variable.
- `RESEND_API_KEY`: Resend sending key used by the server to deliver sign-in codes. Restrict the key to sending from SchoolPay's verified domain.
- `AUTH_EMAIL_FROM`: verified sender, such as `SchoolPay <auth@your-domain.com>`.

The same Resend account must also be configured as Supabase Auth's custom SMTP sender so it can deliver signup confirmation and password reset emails. In **Supabase → Authentication → Emails → SMTP Settings**, use `smtp.resend.com`, port `465`, username `resend`, the Resend API key as the password, and a sender on your verified domain. Keep email confirmation enabled and allow `http://localhost:3000/auth/callback` during local development plus the production callback URL before deployment. Without these provider settings, signup mail and the second sign-in step cannot be delivered.

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
