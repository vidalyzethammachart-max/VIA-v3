# VIA

Video Intelligence & Analytics web application for evaluation form submission, role-based access, document generation, and admin user management.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Supabase
  - Auth
  - Postgres
  - Storage
  - Edge Functions
- n8n
- Google Apps Script

## Main Features

- Authentication with login, register, forgot password, and reset password
- Role-based routing for `user`, `editor`, and `admin`
- Evaluation form submission flow
- Dashboard with bar chart and donut chart summaries
- My Forms page with generated document tracking
- Document preview with PDF/DOCX download
- Profile management
  - full name
  - employee number
  - gender
  - avatar upload
- Video file upload to n8n webhook
- Admin dashboard
  - user search/filter
  - role update
  - account deletion
- Light mode / dark mode

## App Routes

- `/` login
- `/register`
- `/forgot-password`
- `/reset-password`
- `/dashboard`
- `/form-submit`
- `/my-forms`
- `/preview/:docId`
- `/upload-video`
- `/profile`
- `/role-requests`
- `/admin`

## Environment Variables

Create a `.env` file:

```env
VITE_N8N_WEBHOOK_URL=YOUR_N8N_WEBHOOK_URL
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
N8N_WEBHOOK_URL=YOUR_N8N_WEBHOOK_URL
```

`POST /api/upload-video` accepts a `multipart/form-data` request with a `video` file field and optional `subject_name` and `order_number` fields. The API validates the file and forwards the same multipart payload to `N8N_WEBHOOK_URL`, so n8n receives a binary field named `video`.

For 100MB uploads, deploy the upload backend to Cloud Run. Vercel Functions cannot receive large video request bodies.

Local Cloud Run-compatible backend:

```bash
npm run start:upload-api
```

Set the frontend upload target when using Cloud Run:

```env
VITE_UPLOAD_VIDEO_API_URL=https://YOUR_CLOUD_RUN_URL/api/upload-video
```

Build the Cloud Run container with:

```bash
docker build -f Dockerfile.cloudrun -t via-upload-api .
```

The Cloud Run backend also exposes `POST /api/analyze-video` for n8n. It accepts:

```json
{
  "fileUrl": "https://example.com/video.mp4",
  "fileName": "video.mp4"
}
```

It downloads the video, extracts sample frames with ffmpeg, sends those frames to Gemini vision, and returns a structured analysis. Set:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-1.5-flash
```

## Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

## Supabase

Supabase logic in this project includes:

- database migrations in [`supabase/migrations`](./supabase/migrations)
- edge functions in [`supabase/functions`](./supabase/functions)

Current edge functions:

- `forward-to-n8n`
- `document-generation-callback`
- `document-artifact-url`
- `admin-user-management`
- `generate-doc`

## Database Migrations

Important migrations already included:

- `20260403195000_accounting_layer.sql`
- `20260403223000_role_requests.sql`
- `20260404001000_cancel_role_requests.sql`
- `20260404013000_evaluations_user_doc_columns.sql`
- `20260404030000_secure_evaluations_document_flow.sql`
- `20260404110000_document_artifacts_storage.sql`
- `20260404123000_expand_user_profile_fields.sql`
- `20260405110000_profile_avatar_storage.sql`

## Document Generation Flow

The document pipeline is split across the app, Supabase, n8n, and Google Apps Script.

High-level flow:

1. User submits an evaluation.
2. Supabase forwards the request to n8n.
3. n8n prepares payload data for Google Apps Script.
4. Apps Script creates a Google Doc from a template.
5. Apps Script exports PDF and DOCX.
6. Apps Script uploads files to Supabase Storage.
7. Apps Script calls `document-generation-callback`.
8. The app reads generated artifacts from Supabase Storage for preview/download.

Generated document artifacts are stored in:

- bucket: `evaluation-documents`
- path pattern:
  - `evaluations/<evaluation_id>/result.pdf`
  - `evaluations/<evaluation_id>/result.docx`

Profile avatars are stored in:

- bucket: `profile-avatars`

## Project Structure

```text
src/
  assets/
  components/
  config/
  hooks/
  lib/
  page/
  services/
  theme/
supabase/
  functions/
  migrations/
```

## Notable Pages

- [`src/page/Dashboard.tsx`](./src/page/Dashboard.tsx)
- [`src/page/FormSubmit.tsx`](./src/page/FormSubmit.tsx)
- [`src/page/MyFormsDashboard.tsx`](./src/page/MyFormsDashboard.tsx)
- [`src/page/PreviewPage.tsx`](./src/page/PreviewPage.tsx)
- [`src/page/Profile.tsx`](./src/page/Profile.tsx)
- [`src/page/AdminDashboard.tsx`](./src/page/AdminDashboard.tsx)

## Notes

- This project expects Supabase policies, buckets, and edge functions to be deployed before all features work correctly.
- Google Apps Script is part of the production document pipeline and is managed outside this repository.
- n8n is also external to this repository and must be configured separately.
