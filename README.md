# Graphiq Studiox Delivery

Private client project delivery with Supabase, Cloudinary, UploadThing, Paystack, and Next.js App Router.

## What it does

- Creates private `/p/[token]` delivery pages with no client login
- Shows a locked preview before payment
- Unlocks instantly after a verified Paystack webhook
- Generates secure backend-only download URLs for the final file
- Protects `/admin` with a simple password-based session

## Stack

- Next.js 16 App Router
- Supabase Postgres
- Cloudinary for preview uploads
- UploadThing for private final-file delivery
- Paystack inline payments + webhook verification
- Tailwind CSS 4

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
APP_URL=http://localhost:3000
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=

UPLOADTHING_TOKEN=
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
UPLOADTHING_FILE_ACL=public-read

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is required because all project/payment writes happen server-side.
- The current UploadThing SDK expects `UPLOADTHING_TOKEN`. If you only have the legacy `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID`, generate a v7 token in the UploadThing dashboard.
- Free UploadThing apps do not allow `private` ACL uploads. This app defaults `UPLOADTHING_FILE_ACL` to `public-read` so uploads work immediately. If you upgrade UploadThing later, set `UPLOADTHING_FILE_ACL=private`.
- `ADMIN_SESSION_SECRET` is optional. If omitted, the app falls back to `ADMIN_PASSWORD` as the cookie-signing secret.

## Database Setup

Run the SQL in [supabase/schema.sql](C:/Users/ampon/Desktop/graphiq%20Studiox%20delievery%20site/supabase/schema.sql) inside Supabase SQL Editor.

This creates:

- `projects`
- `payments`
- indexes and constraints for token uniqueness and payment reference idempotency

## Upload Providers

### Cloudinary

Preview files are uploaded server-side to Cloudinary using the Node SDK.

### UploadThing

Final delivery files are uploaded privately through the server using `UTApi.uploadFiles`.

For download handling:

- the app stores a serialized UploadThing reference in `projects.file_url`
- `/api/download` checks payment + quota before returning a URL
- with `UPLOADTHING_FILE_ACL=private`, the backend generates a signed URL
- with `UPLOADTHING_FILE_ACL=public-read`, the backend returns the UploadThing URL only after payment/quota checks

## Paystack Setup

1. Add your public and secret keys to env vars.
2. Set your webhook URL to:

```text
https://your-domain.com/api/paystack/webhook
```

3. Make sure your Paystack inline payment metadata includes the project token. The app already does this.

## Local Development

```bash
npm install
npm run dev
```

Open:

- `/admin` for the dashboard
- `/p/[token]` for the client experience

## Deployment

Deploy to Vercel and add the same environment variables there. Make sure `APP_URL` matches your production URL so share links and payment return URLs are correct.
