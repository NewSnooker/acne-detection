# Web App (apps/web)

Next.js 16.2 App Router · React 19 · TypeScript (strict แต่ `noImplicitAny: false`) · Tailwind 4 · shadcn/ui (Radix) · AG Grid · ApexCharts · framer-motion · react-hook-form + zod

alias: `@/*` → `src/*`

## Routes (หน้า)

| Path | ไฟล์ | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| `/` | `app/(public)/page.tsx` | public | Landing: hero, สิว 6 ชนิด (ภาพจริง), ค่าประเมินโมเดลหลัก, ความรุนแรง, FAQ, disclaimer |
| `/knowledge` | `app/(public)/knowledge/page.tsx` | public | ความรู้ดูแลผิวแบบองค์รวม (ข้อ 1.3.3.4) สาเหตุ ชนิดสิว เมื่อไรควรพบแพทย์ |
| `/login` | `app/(auth)/login/page.tsx` → `components/auth/login-form.tsx` | public | Credentials + Google |
| `/register` | `app/(auth)/register/page.tsx` → `register-form.tsx` | public | สมัครสมาชิก |
| `/analyze` | `app/(dashboard)/analyze/page.tsx` → `components/analyze/*` | login | อัปโหลด + ดูผล |
| `/history` | `app/(dashboard)/history/page.tsx` → `components/history/*` | login | ประวัติของตัวเอง (grid/table) |
| `/statistics` | `app/(dashboard)/statistics/page.tsx` → `statistics-dashboard.tsx` | login | ภาพรวมของฉัน |
| `/admin/users` | `admin/users/page.tsx` + `user-table.tsx` | ADMIN | ดู/ค้นหา/ลบผู้ใช้ |
| `/admin/models` | `admin/models/page.tsx` + `model-table.tsx` | ADMIN | อัปโหลด/แก้/ลบ/ค้นหา/ตั้ง active |
| `/admin/statistics` | `admin/statistics/page.tsx` → `admin-statistics-dashboard.tsx` | ADMIN | ภาพรวมระบบ |
| `/admin/history` | `admin/history/page.tsx` | ADMIN | ประวัติทุกคน + ลบ |

Layout: `app/(dashboard)/layout.tsx` (Sidebar + Header, เช็ค session), `app/(auth)/layout.tsx`, `app/(public)/layout.tsx` (header/footer หน้าสาธารณะ + เครดิตชุดข้อมูล CC BY 4.0)
หน้าสาธารณะกำหนดใน `PUBLIC_PAGES` (`lib/auth/route-access.ts`) แบบตรงทั้ง path — ห้ามใส่ `/` ใน `PUBLIC_ROUTES` เพราะเช็คด้วย `startsWith`
เนื้อหาความรู้: `components/knowledge/` (`content.ts` ข้อความ, `acne-samples.ts` กรอบของภาพใน `public/landing/` ซึ่ง proxy ไม่กัน)
เมนู: `components/layout/sidebar.tsx` (`userNav`, `adminNav`)

## ชั้นของโค้ด (ปัจจุบัน)

```
Client component
   └─ src/lib/api-client/*-api.ts   fetch wrapper (AnalyzeService, AuthService, ModelService, UserService) ผ่าน apiRequest
        └─ src/app/api/**/route.ts  Route Handler: guard → parseBody(zod) → เรียก server → NextResponse.json
             └─ src/server/<feature>.ts    business logic (Prisma) — มี import "server-only"
             └─ src/lib/storage/*          ไฟล์รูป/โมเดล

Server component (page.tsx)
   └─ src/server/<feature>.ts  อ่านข้อมูล (Prisma) — บางหน้าเรียก prisma ตรงใน page
```

| ไฟล์ | export | หมายเหตุ |
|---|---|---|
| `server/analyze.ts` | `calculateSeverity`, `callFastApiForPrediction` | เกณฑ์ severity อยู่ที่นี่ |
| `server/auth.ts` | `registerUserLogic` | คนแรก = ADMIN, อีเมลซ้ำตอบ 409 |
| `server/history.ts` | `getHistory({ userId? })`, `filterHistory`, `countImagesByType`, `deleteHistories` | ไม่ระบุ `userId` = ของทุกคน (แอดมิน); ดึงทั้งหมดแล้วกรองใน memory เพราะตาราง ag-grid แบ่งหน้าฝั่ง client |
| `server/models.ts` | `uploadModelLogic`, `deleteModelLogic`, `deleteModelsLogic`, `setActiveModelLogic`, `editModelLogic`, `getAdminModels` | ลบโมเดลหลักไม่ได้ (409), ตั้งโมเดลหลักใน `$transaction` |
| `server/statistics.ts` | `getAdminStatistics` | |
| `server/users.ts` | `deleteUserLogic`, `deleteUsersLogic`, `getAllUsers` | `getAllUsers` ใช้ `select` — ห้ามส่ง `password` ไปเบราว์เซอร์ |
| `lib/http-error.ts` | `HttpError`, `errorResponse`, `parseBody`, `readJson` | service โยน `HttpError(status, ข้อความไทย)` แล้ว route แปลงเป็น response; error อื่นตอบ 500 โดยไม่เปิดเผยข้อความภายใน |
| `lib/validation/api-input.ts` | `modelInfoSchema`, `editModelSchema`, `idListSchema` | zod schema ของ body |
| `lib/acne-counts.ts` | `readCounts` | อ่าน `Analysis.counts` (Json) ใช้ได้ทั้ง server และ client |
| `lib/storage/image-provider.ts` | `uploadImage`, `deleteImage` | local / vercel-blob |
| `lib/storage/model-provider.ts` | `saveModel`, `deleteModelFile` | คืน Buffer เก็บลง Mongo |
| `lib/auth/guards.ts` | `requireUserPage`, `requireAdminPage` (หน้าเว็บ: redirect), `requireUserApi`, `requireAdminApi` (API: ตอบ 401/403) | จุดเดียวสำหรับตรวจสิทธิ์ ทุกหน้าและทุก route ใช้ชุดนี้ |
| `lib/auth/credentials.ts` | `authorizeCredentials` | ตรวจอีเมลและรหัสผ่านตอนเข้าสู่ระบบ ใช้ใน `auth.ts` |
| `lib/auth/route-access.ts` | `resolveRedirect`, `PUBLIC_ROUTES`, `ADMIN_ROUTES` | กติกากันหน้าเว็บ ใช้ใน `proxy.ts` |
| `lib/auth/google.ts` | `isGoogleEnabled` | true เมื่อมี `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET` ใช้ใน `auth.ts`, หน้า login, `loginWithGoogle` |
| `hooks/use-mounted.ts` | `useMounted` | true หลัง hydrate (กราฟที่ขึ้นกับธีม) |

กติกา type: เปิด `noImplicitAny` และ lint `no-explicit-any` เป็น error — ใช้ type จาก `@prisma/client`, ตาราง ag-grid ใช้ `ColDef<T>` / `CustomCellRendererProps<T>`

## Components

| โฟลเดอร์ | ไฟล์หลัก |
|---|---|
| `analyze/` | `image-analyzer.tsx` (state หลัก), `image-uploader.tsx` (drag & drop), `image-preview.tsx` (วาดกรอบบน canvas), `analysis-result.tsx` (สรุป + คำแนะนำ — ใช้ซ้ำใน history modal ด้วย `readOnly`) |
| `history/` | `history-gallery.tsx` (filter + pagination ฝั่ง client), `history-grid-view.tsx`, `history-table-view.tsx` (AG Grid, ลบได้เฉพาะ admin), `history-modal.tsx` |
| `statistics/` | `statistics-dashboard.tsx` (user), `admin-statistics-dashboard.tsx`, chart ต่าง ๆ (ApexCharts), `global-filter.tsx` + `global-filter-context.tsx` (ช่วงวันที่ผ่าน query `start`, `end`, `all`) |
| `admin/` | `upload-model-dialog.tsx`, `edit-model-dialog.tsx`, `model-actions.tsx` |
| `auth/` | `login-form.tsx`, `register-form.tsx` |
| `layout/` | `sidebar.tsx`, `header.tsx` (theme toggle, signOut) |
| `ui/` | shadcn + ของเขียนเอง: `data-grid.tsx` (wrapper AG Grid + locale ไทย), `data-grid-toolbar.tsx`, `filter-dropdown.tsx`, `pagination.tsx`, `confirm-delete-dialog.tsx`, `view-toggle.tsx` |

State ของ filter หน้า history/statistics อยู่ใน URL query (`sort, search, date, types` / `start, end, all`) — hook: `hooks/use-history-filters.ts`

## ค่าคงที่ที่ใช้ร่วมกัน — `types/analyze.ts`

`ACNE_COLORS` (สีกรอบ/กราฟต่อชนิด), `ACNE_LABELS` (ชื่อไทย), `ACNE_CARE_ADVICE` (คำแนะนำต่อระดับ), `SEVERITY_LABELS`, `ACCURACY_THRESHOLD`
type: `Detection { type, confidence, bbox{x1,y1,x2,y2} }`, `AnalysisResult`

## proxy.ts (middleware)

- `PUBLIC_ROUTES`: `/login`, `/register`, `/api/auth`, `/api/account`, `/api/models`
- ไม่ login + ไม่ public → redirect `/login`
- path ขึ้นต้น `/admin` + role ไม่ใช่ ADMIN → redirect `/analyze`
- **API ฝั่ง admin ไม่ได้ขึ้นต้น `/admin`** จึงต้องเช็ค role เองใน route handler ทุกตัว
- `/api/models` เป็น public ในชั้น proxy (ให้ FastAPI เข้าได้โดยไม่ต้อง login) แต่ `GET /api/models/[id]` ตรวจ `X-API-Key` หรือ session แอดมินเองใน route

## Environment variables (apps/web/.env)

| ตัวแปร | ใช้ที่ |
|---|---|
| `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_TRUST_HOST` | Auth.js |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `lib/auth.ts` |
| `DATABASE_URL` | Prisma |
| `AI_SERVICE_URL`, `AI_SERVICE_API_KEY` (บังคับ ไม่มีค่าสำรองในโค้ด), `AI_CONFIDENCE_THRESHOLD` (optional, default 0.25) | `analyze-logic.ts`, `api/models/[id]/route.ts` |
| `NEXT_PUBLIC_APP_URL`, `INTERNAL_APP_URL` | URL ที่ FastAPI ใช้โหลดโมเดล |
| `APP_ENV` | `"hosted"` = Vercel Blob |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |
| `STORAGE_PATH` | โฟลเดอร์รูป (absolute) ถ้าไม่ตั้งจะเดาจาก cwd |
