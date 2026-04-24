# Aman Drive

A privacy-focused, open-source cloud storage app — a Google Drive alternative that puts you in control of your data.

Try it out for **15 GB free storage** at [aman-drive.vercel.app](https://aman-drive.vercel.app).

## Features

- **Cloud Storage** — Store files securely in the cloud and access them from anywhere
- **Folders & Organization** — Create folders, upload files and entire folder structures, navigate with breadcrumbs
- **Privacy-First** — No tracking, no ads, open source
- **Fast Uploads** — Direct-to-S3 presigned uploads for speed and reliability
- **15 GB Free** — Generous free tier to get started

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui
- **Auth**: better-auth
- **Storage**: AWS S3 (presigned uploads)
- **Database**: Neon (serverless Postgres) with Drizzle ORM

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Install dependencies

```bash
pnpm install
```

### Environment variables

Copy `.env.example` to `.env` and fill in the values. File uploads use presigned S3 `PUT` URLs — set the same AWS variables as in `lib/s3.ts`, plus the bucket name:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET` — target bucket for objects (keys: `drive/{uuid}`)

The browser calls S3 directly, so the bucket **must** have a CORS rule that allows your app origin. Without it you will see a console error like "blocked by CORS policy" and `Network error during upload` from the XHR helper.

In the AWS console: **S3 → your bucket → Permissions → Cross-origin resource sharing (CORS)**. Use something like this (add your production origin when you deploy):

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

- **`AllowedOrigins`**: must match the browser origin exactly (scheme + host + port), e.g. `http://localhost:3000` for local dev.
- **`PUT`**: required for presigned uploads.
- **`ExposeHeaders` / `ETag`**: useful later for multipart or verifying uploads; harmless for single-part `PUT`.

After saving CORS, hard-refresh the app and try again.

### Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
