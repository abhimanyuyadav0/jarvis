# J.A.R.V.I.S. Backend

Python FastAPI backend for the Jarvis platform.

## Setup

```bash
cd jarvis/backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your OpenAI API key for chat and document Q&A:

```
OPENAI_API_KEY=sk-your-key-here
```

## Run

```bash
python run.py
```

Server runs at http://localhost:8000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/validate` | POST | Validate face (shape, human, quality) before register |
| `/api/auth/register-face` | POST | Store face after validation |
| `/api/auth/register-complete` | POST | Complete registration with name |
| `/api/auth/register` | POST | One-shot register (legacy) |
| `/api/auth/login` | POST | Login with face (required) |
| `/api/chat/message` | POST | Chat with JARVIS (OpenAI) |
| `/api/face/analyze` | POST | Analyze image for faces |
| `/api/face/analyze-base64` | POST | Analyze base64 image |
| `/api/face/register` | POST | Register face with name |
| `/api/face/recognize` | POST | Recognize face in image |
| `/api/documents/upload` | POST | Upload PDF/TXT/DOCX |
| `/api/documents/query` | POST | Q&A over documents |
| `/api/documents/list` | GET | List uploaded documents |

## Frontend

Set `VITE_API_URL=http://localhost:8000` in the frontend `.env` to use this backend.
