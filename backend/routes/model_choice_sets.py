```python
from llm import Llm


# ============================================================
# VIDEO
# ============================================================
# Video generation always uses ONE fixed Gemini model.
#
# Frontend ko model name bhejne/select karne ki zarurat nahi.
# Backend automatically isi model ko video ke liye use karega.
# ============================================================

VIDEO_VARIANT_MODELS = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
)


# ============================================================
# IMAGE (CREATE)
# ============================================================

ALL_KEYS_MODELS_DEFAULT = (
    Llm.CLAUDE_OPUS_5_MEDIUM,
    Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
    Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
    Llm.GPT_5_6_SOL_MAX,
)


# ============================================================
# TEXT (CREATE)
# ============================================================

ALL_KEYS_MODELS_TEXT_CREATE = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GPT_5_6_SOL_HIGH,
    Llm.CLAUDE_OPUS_5_HIGH,
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
)


# ============================================================
# IMAGE + TEXT (UPDATE)
# ============================================================

ALL_KEYS_MODELS_UPDATE = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GPT_5_6_TERRA_LOW,
)


# ============================================================
# KEY SUBSET FALLBACKS
# ============================================================

GEMINI_ANTHROPIC_MODELS = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
    Llm.CLAUDE_OPUS_4_8_MEDIUM,
    Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
    Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
)


GEMINI_OPENAI_MODELS = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
    Llm.GPT_5_5_HIGH,
    Llm.GPT_5_5_LOW,
)


OPENAI_ANTHROPIC_MODELS = (
    Llm.CLAUDE_OPUS_4_8_MEDIUM,
    Llm.GPT_5_5_HIGH,
    Llm.GPT_5_5_LOW,
)


GEMINI_ONLY_MODELS = (
    Llm.GEMINI_3_FLASH_PREVIEW_MINIMAL,
    Llm.GEMINI_3_1_PRO_PREVIEW_LOW,
    Llm.GEMINI_3_FLASH_PREVIEW_HIGH,
    Llm.GEMINI_3_1_PRO_PREVIEW_HIGH,
)


ANTHROPIC_ONLY_MODELS = (
    Llm.CLAUDE_OPUS_4_8_MEDIUM,
    Llm.CLAUDE_SONNET_4_6,
)


OPENAI_ONLY_MODELS = (
    Llm.GPT_5_5_HIGH,
    Llm.GPT_5_5_LOW,
)
```
