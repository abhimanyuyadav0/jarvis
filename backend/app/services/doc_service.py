import hashlib
import io
import os
from pathlib import Path

from pypdf import PdfReader

from app.config import CHROMA_PERSIST_DIR, UPLOAD_DIR

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)

# Lazy import chromadb - can fail if deps not installed
_chroma_client = None


def _get_chroma():
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        _chroma_client = chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))
    return _chroma_client


def _get_embeddings():
    from langchain_community.embeddings import HuggingFaceEmbeddings
    return HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
    )


def _extract_text(data: bytes, filename: str) -> str:
    ext = filename.split(".")[-1].lower()
    if ext == "pdf":
        reader = PdfReader(io.BytesIO(data))
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    if ext == "txt":
        return data.decode("utf-8", errors="replace")
    if ext == "docx":
        from docx import Document
        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs)
    return ""


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap
    return chunks


class DocService:
    def __init__(self):
        self.collection_name = "jarvis_docs"

    async def upload(self, data: bytes, filename: str) -> str:
        text = _extract_text(data, filename)
        if not text.strip():
            raise ValueError("No text extracted from document")

        doc_id = hashlib.md5(data).hexdigest()[:12]
        path = UPLOAD_DIR / f"{doc_id}_{filename}"
        path.write_bytes(data)

        try:
            embeddings = _get_embeddings()
            client = _get_chroma()
            collection = client.get_or_create_collection(
                self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )

            chunks = _chunk_text(text)
            ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
            vectors = embeddings.embed_documents(chunks)
            collection.add(
                ids=ids,
                embeddings=vectors,
                documents=chunks,
                metadatas=[{"doc_id": doc_id, "filename": filename}] * len(chunks),
            )
        except Exception as e:
            path.unlink(missing_ok=True)
            raise e

        return doc_id

    async def query(self, question: str) -> dict:
        try:
            embeddings = _get_embeddings()
            client = _get_chroma()
            try:
                collection = client.get_collection(self.collection_name)
            except Exception:
                return {
                    "answer": "No documents uploaded yet. Upload documents first to ask questions.",
                    "sources": [],
                }
        except Exception:
            return {
                "answer": "No documents uploaded yet. Upload documents first to ask questions.",
                "sources": [],
            }

        query_embedding = embeddings.embed_query(question)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5,
            include=["documents", "metadatas"],
        )

        if not results["documents"] or not results["documents"][0]:
            return {
                "answer": "No relevant content found in documents.",
                "sources": [],
            }

        context = "\n\n".join(results["documents"][0])
        answer = await self._generate_answer(question, context)
        sources = list({m.get("filename", "") for m in (results["metadatas"] or [[]])[0]})

        return {"answer": answer, "sources": sources, "context": context[:500]}

    async def _generate_answer(self, question: str, context: str) -> str:
        if os.getenv("OPENAI_API_KEY"):
            try:
                from langchain_openai import ChatOpenAI
                from langchain_core.messages import HumanMessage, SystemMessage

                llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
                msgs = [
                    SystemMessage(content="Answer based only on the context. Say 'I don't know' if not found."),
                    HumanMessage(content=f"Context:\n{context}\n\nQuestion: {question}"),
                ]
                resp = await llm.ainvoke(msgs)
                return resp.content
            except Exception:
                pass
        return f"Relevant excerpt from documents:\n\n{context[:400]}..."

    async def list_docs(self) -> list:
        try:
            client = _get_chroma()
            try:
                collection = client.get_collection(self.collection_name)
            except Exception:
                return []
            data = collection.get(include=["metadatas"])
            seen = set()
            docs = []
            for m in (data.get("metadatas") or []):
                fid = m.get("doc_id", "")
                fname = m.get("filename", "")
                if fid and (fid, fname) not in seen:
                    seen.add((fid, fname))
                    docs.append({"id": fid, "filename": fname})
            return docs
        except Exception:
            return []


doc_service = DocService()
