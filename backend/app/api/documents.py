from fastapi import APIRouter, Depends, HTTPException, UploadFile
from pydantic import BaseModel

from app.auth.deps import get_current_user
from app.services.doc_service import doc_service

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/upload")
async def upload_document(
    file: UploadFile,
    current_user: dict = Depends(get_current_user),
):
    """Upload a document (PDF, TXT, DOCX) for Q&A."""
    ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if ext not in ("pdf", "txt", "docx"):
        raise HTTPException(
            status_code=400,
            detail="Supported formats: PDF, TXT, DOCX",
        )
    try:
        data = await file.read()
        doc_id = await doc_service.upload(data, file.filename or "document")
        return {"status": "uploaded", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
async def query_documents(
    req: QueryRequest,
    current_user: dict = Depends(get_current_user),
):
    """Ask a question about uploaded documents."""
    try:
        result = await doc_service.query(req.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_documents(
    current_user: dict = Depends(get_current_user),
):
    """List uploaded documents."""
    try:
        docs = await doc_service.list_docs()
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
