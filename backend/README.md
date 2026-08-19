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
python -m playwright install chromium
```

Wake-word listening also needs the `portaudio` system library (macOS: `brew install portaudio`) before `pip install` will build `PyAudio` successfully.

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your Anthropic API key for chat, document Q&A, and tool use:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

## Run

```bash
python run.py
```

Server runs at http://localhost:8000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register with email + password |
| `/api/auth/login` | POST | Login with email + password |
| `/api/chat/message` | POST | Chat with JARVIS (Claude), with tool use for system control, files, browser, code, and more — see `app/actions/` |
| `/api/face/analyze` | POST | Analyze image for faces (Live Feed demo, unrelated to login) |
| `/api/face/analyze-base64` | POST | Analyze base64 image |
| `/api/face/register` | POST | Register face with name |
| `/api/face/recognize` | POST | Recognize face in image |
| `/api/documents/upload` | POST | Upload PDF/TXT/DOCX |
| `/api/documents/query` | POST | Q&A over documents |
| `/api/documents/list` | GET | List uploaded documents |
| `/api/system/stats` | GET | Live CPU/memory/disk stats |
| `/api/wake/enable` | POST | Start background wake-word listening (opt-in) |
| `/api/wake/disable` | POST | Stop wake-word listening |
| `/api/wake/status` | GET | Whether wake-word listening is currently on |
| `/ws/wake` | WebSocket | Pushes `{"event": "wake"}` when the wake phrase is heard |

## Frontend

Set `VITE_API_URL=http://localhost:8000` in the frontend `.env` to use this backend.
