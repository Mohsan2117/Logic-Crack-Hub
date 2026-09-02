# Logic Crack Studio Backend

Go REST API for the official Logic Crack Studio website.

## Stack

- Go REST API
- Supabase PostgreSQL
- Supabase Storage for uploaded CVs and future media
- JWT-protected admin routes

## Local Setup

```powershell
cd "D:\web-devlopmnt\GoLang\Logic Crack Hub\backend"
Copy-Item .env.example .env
go run .\cmd\api
```

Apply the database files in order:

```text
database/schema.sql
database/seed.sql
```

Local seed admin:

```text
Email: admin@logiccrackstudio.local
Password: password
```

Change the seed password before any shared or production use.

## API

Public base:

```text
/api/v1
```

Important routes:

```text
GET  /api/v1/site
GET  /api/v1/games
GET  /api/v1/team
GET  /api/v1/jobs
POST /api/v1/contact
POST /api/v1/applications

POST /api/v1/admin/login
GET  /api/v1/admin/dashboard
PUT  /api/v1/admin/settings
PUT  /api/v1/admin/sections/{key}
POST /api/v1/admin/games
POST /api/v1/admin/team
POST /api/v1/admin/jobs
PATCH /api/v1/admin/applications/{id}/status
PATCH /api/v1/admin/contact-messages/{id}/status
```

All admin routes except login require:

```text
Authorization: Bearer <token>
```
