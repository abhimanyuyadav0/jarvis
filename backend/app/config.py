import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

APP_VERSION = os.getenv("JARVIS_VERSION", "1.0.0")
CREATOR_NAME = "Abhimanyu Yadav"
CREATOR_ROLE = "software engineer"
CREATOR_LOCATION = "Noida"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
CHROMA_PERSIST_DIR = Path(os.getenv("CHROMA_PERSIST_DIR", "./data/chroma"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
