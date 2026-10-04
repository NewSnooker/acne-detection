# Web App (apps/web)

Next.js 16.2 App Router · React 19 · TypeScript (strict แต่ `noImplicitAny: false`) · Tailwind 4 · shadcn/ui (Radix) · AG Grid · ApexCharts · framer-motion · react-hook-form + zod

alias: `@/*` → `src/*`

## Routes (หน้า)

| Path | ไฟล์ | สิทธิ์ | ทำอะไร |
|---|---|---|---|
| `/` | `app/page.tsx` | ตามโค้ดเป็น landing แต่ `proxy.ts` ไม่ได้ใส่ใน PUBLIC_ROUTES → คนไม่ login ถูกเด้งไป `/login` | Landing |
| `/login` | `app/(auth)/login/page.tsx` → `components/auth/login-form.tsx` | public | Credentials + Google |
| `/register` | `app/(auth)/register/page.tsx` → `register-form.tsx` | public | สมัครสมาชิก |
| `/analyze` | `app/(dashboard)/analyze/page.tsx` → `components/analyze/*` | login | อัปโหลด + ดูผล |
| `/history` | `app/(dashboard)/history/page.tsx` → `components/history/*` | login | ประวัติของตัวเอง (grid/table) |
| `/statistics` | `app/(dashboard)/statistics/page.tsx` → `statistics-dashboard.tsx` | login | ภาพรวมของฉัน |
| `/admin/users` | `admin/users/page.tsx` + `user-table.tsx` | ADMIN | ดู/ค้นหา/ลบผู้ใช้ |
| `/admin/models` | `admin/models/page.tsx` + `model-table.tsx` | ADMIN | อัปโหลด/แก้/ลบ/ค้นหา/ตั้ง active |
| `/admin/statistics` | `admin/statistics/page.tsx` → `admin-statistics-dashboard.tsx` | ADMIN | ภาพรวมระบบ |
| `/admin/history` | `admin/history/page.tsx` | ADMIN | ประวัติทุกคน + ลบ |

Layout: `app/(dashboard)/layout.tsx` (Sidebar + Header, เช็ค session), `app/(auth)/layout.tsx`
เมนู: `components/layout/sidebar.tsx` (`userNav`, `adminNav`)

## ชั้นของโค้ด (ปัจจุบัน)

```
Client component
   └─ src/services/*.ts            fetch wrapper (AnalyzeService, AuthService, ModelService, UserService)
        └─ src/app/api/**/route.ts  Route Handler: auth() → เช็ค role → เรียก logic → NextResponse.json
             └─ src/lib/services/*-logic.ts    เขียน/ลบ (Prisma)
             └─ src/lib/storage/*              ไฟล์รูป/โมเดล

Server component (page.tsx)
   └─ src/lib/services/*-service.ts  อ่านข้อมูล (Prisma)  — บางหน้าเรียก prisma ตรงใน page
```

| ไฟล์ | export | หมายเหตุ |
|---|---|---|
| `lib/services/analyze-logic.ts` | `calculateSeverity`, `callFastApiForPrediction` | เกณฑ์ severity อยู่ที่นี่ |
| `lib/services/auth-logic.ts` | `registerUserLogic` | คนแรก = ADMIN |
| `lib/services/history-service.ts` | `getUserHistory`, `getAllHistory`, `deleteHistoryLogic`, `deleteHistoriesLogic` | ดึงทั้งหมดแล้ว filter ใน memory |
| `lib/services/model-logic.ts` | `uploadModelLogic`, `deleteModelLogic`, `deleteModelsLogic`, `setActiveModelLogic`, `editModelLogic` | |
| `lib/services/model-service.ts` | `getAdminModels` | |
| `lib/services/statistics-service.ts` | `getAdminStatistics` | |
| `lib/services/user-logic.ts` | `deleteUserLogic`, `deleteUsersLogic` | ลบรูป → Image → User |
| `lib/services/user-service.ts` | `getAllUsers` | |
| `lib/storage/image-provider.ts` | `uploadImage`, `deleteImage` | local / vercel-blob |
| `lib/storage/model-provider.ts` | `saveModel`, `deleteModelFile` | คืน Buffer เก็บลง Mongo |
| `lib/auth/guards.ts` | `requireAdminRoute` | ใช้จริงหน้าเดียวคือ admin/models |
| `lib/auth/google.ts` | `isGoogleEnabled` | true เมื่อมี `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET` ใช้ใน `auth.ts`, หน้า login, `loginWithGoogle` |

ชื่อไฟล์ซ้ำกันสองที่ (ระวังสับสน): `src/services/model-service.ts` (client fetch) กับ `src/lib/services/model-service.ts` (server Prisma) และ `user-service.ts` เช่นกัน

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
