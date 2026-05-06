# AI Context Platform

AI Coding Context Management Platform

## Project Structure

```
ai-context-platform/
├── ai-context-service/   # Backend - FastAPI + SQLAlchemy + MySQL
└── ai-context-web/       # Frontend - React + TypeScript + Vite + TailwindCSS
```

## Tech Stack

### Backend
- FastAPI + Uvicorn
- SQLAlchemy + Alembic (MySQL)
- Redis (Cache / Lock / Rate Limit)
- S3 / MinIO (File Storage)
- JWT Dual Token Auth (Access + Refresh)

### Frontend
- React 19 + TypeScript
- Vite 8 + TailwindCSS v4
- React Router v7
- Axios

## Quick Start

### Backend
```bash
cd ai-context-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Configure .env, then run Alembic migration
uvicorn app.main:app --reload
```

### Frontend
```bash
cd ai-context-web
npm install
npm run dev
```
