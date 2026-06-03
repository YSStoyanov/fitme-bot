import asyncio
import aiohttp
import base64
import json
import logging
from config import FASHN_API_KEY

logger = logging.getLogger(__name__)

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
    b64 = base64.b64encode(image_bytes).decode()
    return f"data:image/jpeg;base64,{b64}"


async def start_tryon(
    person_bytes: bytes,
    garment_bytes: bytes,
    quality: str = "standard",
) -> str | None:
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
            if resp.status != 200:
                logger.error("FASHN POST /run failed: %d — %s", resp.status, text)
                return None
            data = json.loads(text)
            pred_id = data.get("id") or data.get("prediction_id") or data.get("task_id")
            logger.info("FASHN job started: %s (quality=%s)", pred_id, quality)
            return pred_id


async def poll_result(prediction_id: str, timeout: int = 120) -> str | None:
    deadline = asyncio.get_event_loop().time() + timeout
    async with aiohttp.ClientSession() as session:
        while asyncio.get_event_loop().time() < deadline:
            async with session.get(
                f"{BASE_URL}/status/{prediction_id}", headers=HEADERS
            ) as resp:
                if resp.status != 200:
                    logger.error("FASHN status check failed: %d for %s", resp.status, prediction_id)
                    return None
                data = await resp.json()
                status = data.get("status")

                if status == "completed":
                    output = data.get("output", [])
                    url = output[0] if output else None
                    logger.info("FASHN job %s completed → %s", prediction_id, url)
                    return url

                if status in ("failed", "cancelled"):
                    logger.warning("FASHN job %s ended with status: %s", prediction_id, status)
                    return None

            await asyncio.sleep(3)

    logger.warning("FASHN job %s timed out after %ds", prediction_id, timeout)
    return None


async def run_tryon(
    person_bytes: bytes,
    garment_bytes: bytes,
    quality: str = "standard",
) -> tuple[str | None, str | None]:
    pred_id = await start_tryon(person_bytes, garment_bytes, quality)
    if not pred_id:
        return None, None
    result_url = await poll_result(pred_id)
    return pred_id, result_url
