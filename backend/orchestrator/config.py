import os
from typing import List


def _clean_origin(value: str) -> str:
    return value.strip().rstrip('/')


def get_allowed_origins() -> List[str]:
    raw = os.getenv('CORS_ORIGINS', '*').strip()
    if raw == '*' or not raw:
        return ['*']
    return [_clean_origin(item) for item in raw.split(',') if item.strip()]


HF_MAIN_API_BASE = _clean_origin(
    os.getenv('HF_MAIN_API_BASE', 'https://valtry-llama3-2-3b-quantized.hf.space')
)
HF_IMAGE_GEN_BASE = _clean_origin(
    os.getenv('HF_IMAGE_GEN_BASE', 'https://valtry-llama-img-gen.hf.space')
)
HF_FAST_API_BASE = _clean_origin(
    os.getenv('HF_FAST_API_BASE', 'https://Valtry-llama-fast.hf.space')
)
HF_CODER_API_BASE = _clean_origin(
    os.getenv('HF_CODER_API_BASE', 'https://sabithulla-llama-coder.hf.space')
)
HF_TITLE_API_BASE = _clean_origin(
    os.getenv('HF_TITLE_API_BASE', 'https://valtry-llama-title.hf.space')
)

HF_API_TOKEN = os.getenv('HF_API_TOKEN')

REQUEST_TIMEOUT_SECONDS = float(os.getenv('REQUEST_TIMEOUT_SECONDS', '45'))
STREAM_TIMEOUT_SECONDS = float(os.getenv('STREAM_TIMEOUT_SECONDS', '120'))
HEALTH_CHECK_INTERVAL_SECONDS = float(os.getenv('HEALTH_CHECK_INTERVAL_SECONDS', '45'))
HEALTH_FAILURE_THRESHOLD = int(os.getenv('HEALTH_FAILURE_THRESHOLD', '3'))
HEALTH_DISABLE_SECONDS = int(os.getenv('HEALTH_DISABLE_SECONDS', '120'))
