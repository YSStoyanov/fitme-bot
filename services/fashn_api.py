"""
FASHN AI Virtual Try-On API wrapper.
Docs: https://fashn.ai/docs
"""
import asyncio
import aiohttp
import base64
from config import FASHN_API_KEY

BASE_URL = "https://api.fashn.ai/v1"

QUALITY_MAP = {
    "standard": {"num_samples": 1},
    "hd":       {"num_samples": 1, "long_side": 1024},
    "ultra_hd": {"num_samples": 1, "long_side": 1536},
}

HEADERS = {
    "Authorization": f"Bearer {FASHN_API_KEY}",
    "Content-Type": "application/json",
}


async def _encode_image(image_bytes: bytes) -> str:
    """Convert image bytes to base64 data URI."""
    b64 = base64.b64encode(image_bytes).decode()
    return f"data:image/jpeg;base64,{b64}"


async def start_tryon(
    person_bytes: bytes,
    garment_bytes: bytes,
    quality: str = "standard",
) -> str | None:
    """
    Submit a try-on job.
    Returns fashn prediction ID or None on error.
    """
    params = QUALITY_MAP.get(quality, QUALITY_MAP["standard"])

    person_b64  = await _encode_image(person_bytes)
    garment_b64 = await _encode_image(garment_bytes)

    payload = {
        "model_name": "tryon-v1.6",
        "inputs": {
            "model_image":   person_b64,
            "garment_image": garment_b64,
            "category":      "auto",
            **params,
        }
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/run", json=payload, headers=HEADERS) as resp:
            text = await resp.text()
            print(f"[FASHN] POST /run → {resp.status}: {text}")
            if resp.status != 200:
                return None
            import json
            data = json.loads(text)
            pred_id = data.get("id") or data.get("prediction_id") or data.get("task_id")
            print(f"[FASHN] prediction id: {pred_id}")
            return pred_id


async def poll_result(prediction_id: str, timeout: int = 120) -> str | None:
    """
    Poll until the job finishes.
    Returns image URL or None on failure/timeout.
    """
    deadline = asyncio.get_event_loop().time() + timeout
    async with aiohttp.ClientSession() as session:
        while asyncio.get_event_loop().time() < deadline:
            async with session.get(
                f"{BASE_URL}/status/{prediction_id}", headers=HEADERS
            ) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json()
                status = data.get("status")

                if status == "completed":
                    output = data.get("output", [])
                    return output[0] if output else None

                if status in ("failed", "cancelled"):
                    print(f"[FASHN] job {prediction_id} → {status}")
                    return None

            await asyncio.sleep(3)

    print(f"[FASHN] timeout for {prediction_id}")
    return None


async def run_tryon(
    person_bytes: bytes,
    garment_bytes: bytes,
    quality: str = "standard",
) -> tuple[str | None, str | None]:
    """
    Full flow: submit + poll.
    Returns (prediction_id, result_url).
    """
    pred_id = await start_tryon(person_bytes, garment_bytes, quality)
    if not pred_id:
        return None, None
    result_url = await poll_result(pred_id)
    return pred_id, result_url
