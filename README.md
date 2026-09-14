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
