from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, chat, face, documents, system, wake
from app.config import APP_VERSION
from app.services import wake_service

app = FastAPI(
    title="J.A.R.V.I.S. API",
    description="Just A Rather Very Intelligent System",
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(face.router, prefix="/api/face", tags=["face"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(system.router, prefix="/api/system", tags=["system"])
app.include_router(wake.router, prefix="/api/wake", tags=["wake"])


@app.get("/")
async def root():
    return {"message": "J.A.R.V.I.S. API", "status": "online"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/wake")
async def wake_socket(websocket: WebSocket):
    await websocket.accept()
    wake_service.register(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        wake_service.unregister(websocket)
