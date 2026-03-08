"""FastAPI web app for changing text color in .docx files."""

import io
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app.color_utils import parse_hex_color
from app.docx_processor import process_document_stream

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB

# Resolve static dir relative to this file so it works locally and on Vercel
STATIC_DIR = Path(__file__).parent.parent / "static"

app = FastAPI(title="docx Color Changer")

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/process")
async def process(
    file: UploadFile,
    from_color: str = Form(...),
    to_color: str = Form(...),
    hue_tolerance: float = Form(30.0),
    min_saturation: float = Form(0.15),
):
    if not file.filename.lower().endswith(".docx"):
        raise HTTPException(400, "Only .docx files are supported.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 20 MB).")

    from_rgb = parse_hex_color(from_color)
    to_rgb = parse_hex_color(to_color)

    if not (0.0 <= hue_tolerance <= 180.0):
        raise HTTPException(400, "hue_tolerance must be between 0 and 180.")
    if not (0.0 <= min_saturation <= 1.0):
        raise HTTPException(400, "min_saturation must be between 0.0 and 1.0.")

    input_stream = io.BytesIO(contents)
    output_stream, changes = process_document_stream(
        input_stream, from_rgb, to_rgb, hue_tolerance, min_saturation
    )

    base = file.filename
    if base.lower().endswith(".docx"):
        base = base[:-5]
    safe_name = quote(base + "_modified.docx")

    return StreamingResponse(
        output_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}",
            "X-Changes-Made": str(changes),
        },
    )
