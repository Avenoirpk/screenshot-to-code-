````python
import json
import os
from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

router = APIRouter(prefix="/api/script-studio", tags=["script-studio"])


# ============================================================
# FIXED VIDEO MODEL
# ============================================================
#
# User/frontend se video model nahi manga jayega.
#
# Model backend environment variable se liya jayega:
#
# VIDEO_MODEL=owner/model
#
# Example:
# VIDEO_MODEL=minimax/video-01
#
# IMPORTANT:
# Apne Replicate account mein jo video model use karna hai,
# uska exact owner/model backend ke ENV mein set karein.
# ============================================================

VIDEO_MODEL = os.getenv("VIDEO_MODEL", "").strip()


SYSTEM_PROMPT = """
You are a professional film/storyboard prompt planner. Convert a user's script into a
production-ready scene plan. Be faithful to the story. Do not invent important plot
events. Break the script into coherent scenes based on action, location, character
changes and pacing. Calculate an approximate total video duration from the selected
per-scene duration. Return ONLY valid JSON matching the requested schema.

Every scene needs a concise image prompt and a video prompt. Prompts must be standalone
and describe subject, action, environment, camera, lighting, mood, composition and
continuity. Include character appearance continuity in every scene where relevant.
"""


class Scene(BaseModel):
    number: int
    title: str
    duration_seconds: int
    script_excerpt: str
    image_prompt: str
    video_prompt: str


class AnalyzeRequest(BaseModel):
    script: str = Field(min_length=1)
    output_type: str = "video"
    duration_seconds: int = Field(default=5, ge=2, le=30)
    prompt_theme: str = "Cinematic realistic"
    aspect_ratio: str = "16:9"
    gemini_api_key: str | None = None


class AnalyzeResponse(BaseModel):
    video_minutes: float
    video_seconds: int
    scene_count: int
    scenes: List[Scene]
    summary: str


class GenerateVideoRequest(BaseModel):
    prompt: str = Field(min_length=1)
    duration_seconds: int = Field(default=5, ge=2, le=30)
    aspect_ratio: str = "16:9"
    replicate_api_key: str | None = None


def _json_text(response: Any) -> str:
    text = getattr(response, "text", None) or ""
    text = text.strip()

    if text.startswith("```"):
        text = text.strip("`")

        if text.startswith("json"):
            text = text[4:]

    return text.strip()


# ============================================================
# ANALYZE SCRIPT
# ============================================================

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_script(req: AnalyzeRequest):
    api_key = req.gemini_api_key or os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise HTTPException(
            400,
            "Gemini API key is required. Add GEMINI_API_KEY to backend environment."
        )

    client = genai.Client(api_key=api_key)

    user = f"""
SCRIPT:
{req.script}

OUTPUT TYPE: {req.output_type}
TARGET CLIP DURATION: {req.duration_seconds} seconds
PROMPT THEME: {req.prompt_theme}
ASPECT RATIO: {req.aspect_ratio}

Return JSON:

{{
  "summary": "one short summary",
  "scenes": [
    {{
      "number": 1,
      "title": "short scene title",
      "duration_seconds": {req.duration_seconds},
      "script_excerpt": "the part of the script represented by this scene",
      "image_prompt": "standalone image-generation prompt",
      "video_prompt": "standalone image-to-video/text-to-video prompt"
    }}
  ]
}}

Choose the number of scenes from the script; don't force a fixed count.
"""

    try:
        response = await client.aio.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part(text=user)]
                )
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.35,
            ),
        )

        data = json.loads(_json_text(response))

        scenes = [
            Scene(**scene)
            for scene in data.get("scenes", [])
        ]

        if not scenes:
            raise ValueError("No scenes were returned by the model.")

        total = sum(
            scene.duration_seconds
            for scene in scenes
        )

        return AnalyzeResponse(
            video_minutes=round(total / 60, 2),
            video_seconds=total,
            scene_count=len(scenes),
            scenes=scenes,
            summary=data.get("summary", ""),
        )

    except Exception as exc:
        raise HTTPException(
            502,
            f"Script analysis failed: {exc}"
        ) from exc


# ============================================================
# GENERATE VIDEO
# ============================================================

@router.post("/generate-video")
async def generate_video(req: GenerateVideoRequest):

    # --------------------------------------------------------
    # Replicate API key
    # --------------------------------------------------------

    key = (
        req.replicate_api_key
        or os.getenv("REPLICATE_API_KEY")
        or ""
    ).strip()

    if not key:
        raise HTTPException(
            400,
            "Replicate API key is not configured. "
            "Add REPLICATE_API_KEY to backend environment."
        )

    # --------------------------------------------------------
    # Fixed backend video model
    # --------------------------------------------------------

    model = (
        os.getenv("VIDEO_MODEL")
        or VIDEO_MODEL
        or ""
    ).strip()

    if not model:
        raise HTTPException(
            500,
            "VIDEO_MODEL is not configured on the backend. "
            "Set VIDEO_MODEL=owner/model in the backend environment."
        )

    # --------------------------------------------------------
    # Validate owner/model
    # --------------------------------------------------------

    if "/" not in model:
        raise HTTPException(
            500,
            "Invalid backend VIDEO_MODEL. "
            "It must use owner/model format."
        )

    owner, name = model.split("/", 1)

    owner = owner.strip()
    name = name.strip()

    if not owner or not name:
        raise HTTPException(
            500,
            "Invalid backend VIDEO_MODEL. "
            "It must use owner/model format."
        )

    # --------------------------------------------------------
    # Replicate request
    # --------------------------------------------------------

    payload = {
        "input": {
            "prompt": req.prompt,
            "duration": req.duration_seconds,
            "aspect_ratio": req.aspect_ratio,
        }
    }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    try:

        async with httpx.AsyncClient(timeout=45) as client:

            response = await client.post(
                f"https://api.replicate.com/v1/models/{owner}/{name}/predictions",
                headers=headers,
                json=payload,
            )

            if response.status_code >= 400:
                raise HTTPException(
                    response.status_code,
                    response.text[:1000],
                )

            return response.json()

    except HTTPException:
        raise

    except httpx.HTTPError as exc:
        raise HTTPException(
            502,
            f"Video provider request failed: {exc}"
        ) from exc
````
