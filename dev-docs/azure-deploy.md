# ขึ้นระบบบน Azure (คลิกเองใน Portal)

อัปเดตล่าสุด 2026-11-03 — ภาพรวมของแต่ละ environment ดู `environments.md`

```
ผู้ใช้ ─► acne-web (Container App, ลิงก์สาธารณะ HTTPS, port 3000)
            │  POST /predict + X-API-Key   (เครือข่ายภายใน)
            ▼
          acne-ai (Container App, ภายในเท่านั้น, port 8000)

acne-web ─► MongoDB Atlas (database acne_azure)
acne-web ─► Azure Blob: container images (รูป) + models (ไฟล์ .pt) — private ทั้งคู่
acne-ai  ─► Azure Blob: โหลดรูปด้วยลิงก์ SAS อายุ 10 นาที
acne-ai  ─► acne-web GET /api/models/[id]: โหลดโมเดล (cache ในเครื่อง ai จนกว่า ai จะดับ)
```

- image ของเว็บและ ai มาจาก `ghcr.io/newsnooker/acne-web` / `acne-ai` (GitHub Actions `docker-publish.yml` build ให้ทุกครั้งที่ merge เข้า main)
- ทั้งสองแอปตั้ง scale 0–1: ไม่มีคนใช้ ~5 นาที → ดับเอง ไม่เสียค่า CPU เปิดครั้งแรกรอ ~1–2 นาที (ai ต้องโหลดโมเดลใหม่ทุกครั้งที่ตื่น)
- เว็บสร้างตาราง (`prisma db push`), แอดมินเริ่มต้น, และ container `images` / `models` ให้เองตอนเริ่ม

ใช้เวลาทั้งหมด ~45 นาที เตรียมค่าไว้ในไฟล์โน้ตระหว่างทำ:

| ค่า | ได้จาก | ใช้ที่ |
|---|---|---|
| `DATABASE_URL` | ขั้น 1 | web |
| `AZURE_STORAGE_CONNECTION_STRING` | ขั้น 4 | web |
| `AI_SERVICE_API_KEY` | สุ่มเอง (ขั้น 3) | web + ai (ต้องตรงกัน) |
| `AUTH_SECRET` | สุ่มเอง (ขั้น 3) | web |
| ลิงก์เว็บ `https://acne-web.….azurecontainerapps.io` | ขั้น 6 | web, Google OAuth |

---

## 1. MongoDB Atlas — database ใหม่ `acne_azure`

ใช้ cluster เดิมได้ แต่ **ชื่อ database ต้องเป็น `acne_azure`** ห้ามใช้ database ของ Vercel

1. **Database Access → Add New Database User** → Password → ตั้งชื่อ เช่น `acne-azure` + รหัสผ่าน (ไม่มีอักขระพิเศษจะง่ายสุด) → Built-in Role: *Read and write to any database* → Add User
2. **Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm
   (Container Apps ไม่มี IP คงที่ ต้องเปิดแบบนี้ — ป้องกันด้วยรหัสผ่านของ user)
3. **Database → Connect → Drivers** → คัดลอก connection string แล้วแก้ 2 จุด:
   ```
   mongodb+srv://acne-azure:<รหัสผ่าน>@cluster0.xxxx.mongodb.net/acne_azure?retryWrites=true&w=majority
                                                                ^^^^^^^^^^ เติมชื่อ database
   ```

## 2. GitHub — image บน ghcr.io

1. merge PR เข้า `main` → แท็บ **Actions** → workflow **Docker images** ต้องเป็นสีเขียว (~10–15 นาที ครั้งแรก ai นานสุดเพราะ PyTorch)
   ถ้าไม่รันเอง: Actions → Docker images → **Run workflow**
2. หน้าโปรไฟล์ GitHub → แท็บ **Packages** → `acne-web` → **Package settings** → Danger Zone → **Change visibility → Public**
3. ทำซ้ำกับ `acne-ai`

> image เป็น public ได้ เพราะไม่มีรหัสลับอยู่ใน image (รหัสทั้งหมดใส่ตอนตั้งค่า Container App) — Azure จึงดึงได้โดยไม่ต้องตั้ง login

## 3. สุ่มรหัสลับ 2 ตัว

เปิด **Cloud Shell** (ไอคอน `>_` แถบบนของ Azure Portal) เลือก Bash แล้วรัน 2 ครั้ง:
```bash
openssl rand -base64 32
```
ครั้งแรก = `AI_SERVICE_API_KEY`, ครั้งที่สอง = `AUTH_SECRET`

## 4. Resource group + Storage account

1. ค้นหา **Resource groups → Create**
   - Subscription: *Azure for Students* · Resource group: `acne-ai-rg` · Region: **(Asia Pacific) Southeast Asia** → Review + create → Create
2. ค้นหา **Storage accounts → Create**
   - **Basics:** Resource group `acne-ai-rg` · Storage account name: ตัวเล็ก+ตัวเลข ไม่ซ้ำใคร เช่น `acneai2569snk` · Region: Southeast Asia · Primary service: *Azure Blob Storage or Azure Data Lake Storage Gen 2* · Performance: **Standard** · Redundancy: **LRS** (ถูกสุด)
   - **Advanced:** *Allow enabling anonymous access on individual containers* = **ปิด** · *Enable storage account key access* = **เปิด** · Access tier: **Hot**
   - ที่เหลือค่าเริ่มต้น → Review + create → Create
3. เข้า storage account → **Security + networking → Access keys** → key1 → **Connection string → Show → คัดลอก** = `AZURE_STORAGE_CONNECTION_STRING`

ไม่ต้องสร้าง container เอง เว็บสร้าง `images` และ `models` (แบบ private) ให้ตอนอัปโหลดครั้งแรก

## 5. Container App: `acne-ai`

ค้นหา **Container Apps → Create → Container App**

**Basics**
- Resource group `acne-ai-rg` · Container app name: **`acne-ai`** · Deployment source: *Container image* · Region: Southeast Asia
- Container Apps environment → **Create new** → Environment name `acne-env` · Plan: *Consumption only* · Zone redundancy ปิด → Create

**Container**
- เอาติ๊ก *Use quickstart image* ออก
- Image source: **Docker Hub or other registries** · Image type: **Public**
- Registry login server: `ghcr.io` · Image and tag: `newsnooker/acne-ai:latest`
- CPU and Memory: **2 CPU cores, 4 Gi memory** (โมเดล L ต้องใช้)
- Environment variables (Source = *Manual entry*):

| Name | Value |
|---|---|
| `AI_SERVICE_API_KEY` | ค่าจากขั้น 3 |
| `ALLOWED_IMAGE_HOSTS` | `.blob.core.windows.net` |
| `STORAGE_PATH` | `/app/storage` |
| `MODELS_PATH` | `/app/models` |

**Ingress**
- Ingress: **Enabled** · Ingress traffic: **Limited to Container Apps Environment** · Ingress type: HTTP · Target port: **8000**

→ Review + create → Create (2–5 นาที)

หลังสร้างเสร็จ เข้า `acne-ai`:
1. **Networking → Ingress** → *Insecure connections* = ✅ **Allowed** → Save (ให้เว็บเรียก `http://acne-ai` ได้ตรง ๆ ยังเข้าจากภายนอกไม่ได้เหมือนเดิม)
2. **Application → Scale** → Min replicas **0** · Max replicas **1** → Save

## 6. Container App: `acne-web`

**Container Apps → Create → Container App** อีกครั้ง

**Basics:** Resource group `acne-ai-rg` · name **`acne-web`** · Region Southeast Asia · environment: เลือก **`acne-env`** (ตัวเดิม)

**Container:** เอาติ๊ก quickstart ออก · Docker Hub or other registries · Public · `ghcr.io` · `newsnooker/acne-web:latest` · **1 CPU core, 2 Gi memory**

Environment variables:

| Name | Value |
|---|---|
| `DATABASE_URL` | จากขั้น 1 |
| `AUTH_SECRET` | จากขั้น 3 |
| `AUTH_TRUST_HOST` | `true` |
| `AI_SERVICE_URL` | `http://acne-ai` |
| `AI_SERVICE_API_KEY` | ค่าเดียวกับ acne-ai |
| `IMAGE_STORAGE` | `azure-blob` |
| `MODEL_STORAGE` | `azure-blob` |
| `AZURE_STORAGE_CONNECTION_STRING` | จากขั้น 4 |
| `ENV_NAME` | `azure` |
| `SEED_ADMIN_EMAIL` | อีเมลแอดมิน |
| `SEED_ADMIN_PASSWORD` | **รหัสใหม่ที่เดายาก** (ห้ามใช้ Admin1234 บนเว็บจริง) |

**Ingress:** Enabled · **Accepting traffic from anywhere** · HTTP · Target port **3000**

→ Review + create → Create

หลังสร้างเสร็จ เข้า `acne-web`:
1. **Overview → Application Url** คัดลอกไว้ (เช่น `https://acne-web.happyriver-1234.southeastasia.azurecontainerapps.io`)
2. **Application → Containers → Edit and deploy** → เลือก container → Environment variables เพิ่ม 2 ตัว → Save → **Create**

| Name | Value |
|---|---|
| `INTERNAL_APP_URL` | Application Url (ai ใช้โหลดโมเดลจากเว็บ) |
| `NEXT_PUBLIC_APP_URL` | Application Url |

3. **Application → Scale** → Min **0** · Max **1** → Save
4. รอ 1–2 นาที ดู **Monitoring → Log stream** ควรเห็น `[seed] สร้างบัญชีแอดมินเริ่มต้น` แล้ว `Ready`

## 7. ทดสอบ

1. เปิด Application Url → ป้ายบนหัวหน้าแอดมินต้องเป็น **AZURE**
2. login ด้วย `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
3. **จัดการโมเดล → อัปโหลด** โมเดล L (`acne14k_l_960/weights/best.pt` 53 MB) → ตั้งเป็นโมเดลหลัก → แก้ไข → ความมั่นใจขั้นต่ำ **0.15** (หรือ ~0.26 ตามกราฟ F1)
4. **วิเคราะห์** รูป 1 รูป ครั้งแรกรอ 1–2 นาที (ai ตื่น + โหลดโมเดล) ถ้า timeout ให้กดใหม่อีกครั้ง
5. เปิด **ประวัติ** → รูปต้องขึ้น (ดึงจาก Blob ผ่าน `/api/images`)
6. Storage account → **Containers** → ต้องเห็น `images` และ `models` มีไฟล์

## 8. Google login (ไม่บังคับ)

1. Google Cloud Console → APIs & Services → Credentials → OAuth client เดิม → **Authorized redirect URIs** เพิ่ม
   `<Application Url>/api/auth/callback/google`
2. `acne-web` → Containers → Edit and deploy → เพิ่ม `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` → Create

---

## หลังจากนี้

| อยากทำ | วิธี |
|---|---|
| อัปเดตโค้ด | merge เข้า main → รอ Actions เขียว → Container App → **Revisions and replicas → Create new revision** → Create (ดึง `latest` ใหม่) |
| ย้อนกลับรุ่นเก่า | Edit and deploy → เปลี่ยน tag เป็น `sha-<commit>` |
| ดู error | Container App → Monitoring → **Log stream** |
| ดูค่าใช้จ่าย | Cost Management → Cost analysis (ตั้ง Budget แจ้งเตือนไว้ เช่น $10) |
| ปิดทั้งหมด | ลบ resource group `acne-ai-rg` (รูป/โมเดลบน Blob หายด้วย ฐานข้อมูล Atlas ไม่หาย) |

**ค่าใช้จ่ายโดยประมาณ:** Blob ~$0.02/GB/เดือน · Container Apps คิดเฉพาะตอนเปิด และมีโควตาฟรีรายเดือน (180,000 vCPU-วินาที) ai 2 vCPU เปิดรวม ~25 ชม./เดือนยังอยู่ในโควตาฟรี · ห้ามตั้ง Min replicas = 1 ค้างไว้ (~$100/เดือน)

**ข้อควรระวัง**
- เว็บรัน `prisma db push --accept-data-loss` ทุกครั้งที่เริ่ม → `DATABASE_URL` ต้องเป็น `acne_azure` เท่านั้น
- ไม่ตั้ง `AZURE_STORAGE_CONNECTION_STRING` แต่ตั้ง `azure-blob` → เว็บไม่ยอมเริ่ม (ดูข้อความใน Log stream)
- `AI_SERVICE_API_KEY` สองแอปไม่ตรงกัน → วิเคราะห์ไม่ได้ (401)
