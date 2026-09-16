# CaloVision AI - Backend API Server 🚀

Máy chủ Backend API & Cổng quản trị Admin cho ứng dụng **CaloVision AI**.

---

## 🛠️ Công nghệ sử dụng
- **Runtime**: Node.js & TypeScript
- **Framework**: Express.js
- **ORM & Database**: Prisma (SQLite / PostgreSQL)
- **AI Vision Proxy**: Google Gemini 1.5 Flash Vision API
- **Auth**: JWT & Google OAuth Verification

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu hình biến môi trường
Sao chép `.env.example` thành `.env`:
```bash
cp .env.example .env
```

### 3. Đồng bộ Database (Prisma)
```bash
npm run db:generate
npm run db:push
```

### 4. Khởi chạy Development Server
```bash
npm run dev
```
Server sẽ chạy tại: `http://localhost:5001`
- **Health Check API**: `http://localhost:5001/api/health`
- **Admin Portal Dashboard**: `http://localhost:5001/admin`

---

## 🖥️ Deploy lên Windows + Plesk (Node.js)

### Yêu cầu trên host
- Plesk có **Node.js Toolkit** (Node ≥ 18)
- Domain/subdomain trỏ về host (vd. `api.yourdomain.com`)
- Quyền upload file (Git / File Manager / RDP)

### 1. Upload code
Đưa toàn bộ project vào thư mục app (ví dụ `httpdocs` hoặc `api`):
```
httpdocs/
  package.json
  src/
  prisma/
  public/
  .env
  ...
```

### 2. Tạo file `.env` trên server
Copy từ `.env.example`, điền secret thật:
```env
PORT=5001
NODE_ENV=production
JWT_SECRET=<random-long-secret>
DATABASE_URL="file:./prod.db"
GEMINI_API_KEY=<your-key>
```
> Plesk có thể ghi đè `PORT` — ưu tiên giá trị Plesk inject.

### 3. Bật Node.js trong Plesk
**Domains → [domain] → Node.js**

| Setting | Giá trị |
|--------|---------|
| Node.js version | ≥ 18 |
| Application mode | `production` |
| Application root | thư mục chứa `package.json` (vd. `/httpdocs`) |
| Application startup file | `app.js` |
| Application URL | `/` |

Custom environment variables (nếu không dùng file `.env`): `NODE_ENV`, `JWT_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`.

### 4. Cài & build trên server
Trong Plesk Node.js UI bấm **NPM Install**, rồi mở SSH/RDP vào thư mục app:
```powershell
npm run deploy
```
Hoặc từng bước:
```powershell
npm install
npx prisma db push
npm run build
```

### 5. Enable / Restart app
Trong Plesk Node.js: **Enable Node.js** → **Restart App**.

### 6. Kiểm tra
- `https://api.yourdomain.com/api/health`
- `https://api.yourdomain.com/admin`

### Lưu ý SQLite trên Windows
- DB file: `prisma/prod.db` — backup file này khi migrate server.
- App pool / Node process cần quyền **ghi** vào thư mục `prisma/`.
- Production lớn hơn: đổi `provider` sang PostgreSQL/MySQL trong `prisma/schema.prisma` và tạo DB trong Plesk.