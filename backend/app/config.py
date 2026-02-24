import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CHROMA_PERSIST_DIR = Path(os.getenv("CHROMA_PERSIST_DIR", "./data/chroma"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
