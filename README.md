This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment (file uploads)

File uploads use presigned S3 `PUT` URLs. Set the same AWS variables as in `lib/s3.ts`, plus the bucket name:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET` — target bucket for objects (keys: `drive/{uuid}`)

The browser calls S3 directly, so the bucket **must** have a CORS rule that allows your app origin. Without it you will see a console error like “blocked by CORS policy” and `Network error during upload` from the XHR helper.

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

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
