import os
import json
import logging
import time
from typing import Dict, Any
from google import genai
from google.genai import types
from groq import Groq
from app.config import load_environment

logger = logging.getLogger(__name__)


class ImageEngineClient:
    """
    Modern Vision Engine using Groq Llama 3.2 Vision with Gemini Fallback.
    Implements a single-pass "Smart Router" logic.
    """

    SYSTEM_PROMPT = """
You are an intelligent Vision Engine. Classify this image and extract content.

Step 1: CLASSIFY
- If the image contains dense text, lists, receipts, documents, or signs: Classify as "ocr".
- If the image is a photo of a person, object, landscape, or scene: Classify as "description".

Step 2: PROCESS
- If "ocr": Extract ALL visible text verbatim. Preserve line breaks.
- If "description": Write a detailed, factual caption.

Step 3: OUTPUT
Return ONLY valid JSON with this schema:
{
  "detected_type": "ocr" | "description",
  "content": "string",
  "confidence": float
}
"""

    def __init__(self):
        load_environment()

        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")

        if not self.groq_api_key:
            logger.warning("GROQ_API_KEY not found in environment")
        if not self.gemini_api_key:
            logger.warning("GEMINI_API_KEY not found in environment")

        self.groq_client = (
            Groq(api_key=self.groq_api_key) if self.groq_api_key else None
        )

        if self.gemini_api_key:
            self.gemini_client = genai.Client(api_key=self.gemini_api_key)
        else:
            self.gemini_client = None

    async def analyze_image(self, image_url: str) -> Dict[str, Any]:
        """
        Analyze image using Groq with Gemini fallback.
        """
        start_time = time.time()

        try:
            if not self.groq_client:
                raise ValueError("Groq client not initialized (missing API key)")

            result = await self._call_groq(image_url)
            result["processing_time_ms"] = int((time.time() - start_time) * 1000)
            result["model"] = "groq"
            return result

        except Exception as e:
            logger.error(f"Groq API call failed: {e}. Attempting Gemini fallback...")
            try:
                result = await self._call_gemini_fallback(image_url)
                result["processing_time_ms"] = int((time.time() - start_time) * 1000)
                result["model"] = "gemini"
                return result
            except Exception as fe:
                logger.error(f"Gemini fallback failed: {fe}")
                raise Exception(
                    f"Vision analysis failed: {str(e)} -> Fallback error: {str(fe)}"
                )

    async def _call_groq(self, image_url: str) -> Dict[str, Any]:
        """
        Perform analysis using Groq Llama 3.2 Vision
        """
        completion = self.groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": self.SYSTEM_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url,
                            },
                        },
                    ],
                }
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
        )

        content = completion.choices[0].message.content
        return json.loads(content)

    async def _call_gemini_fallback(self, image_url: str) -> Dict[str, Any]:
        """
        Perform analysis using Gemini 2.5 Flash via new google-genai SDK
        """
        if not self.gemini_client:
            raise ValueError("Gemini client not initialized (missing API key)")

        import aiohttp

        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as resp:
                if resp.status != 200:
                    raise Exception(f"Failed to download image from {image_url}")
                image_bytes = await resp.read()

        image_part = types.Part.from_bytes(
            data=image_bytes,
            mime_type="image/*",
        )

        response = self.gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[self.SYSTEM_PROMPT, image_part],
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
            ),
        )

        return json.loads(response.text)


# Singleton helper
_engine_client = None


def get_image_engine():
    global _engine_client
    if _engine_client is None:
        _engine_client = ImageEngineClient()
    return _engine_client


def reset_image_engine():
    global _engine_client
    _engine_client = None
