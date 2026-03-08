import sys
import os

# Make the project root importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app  # noqa: F401 — Vercel looks for `app`
