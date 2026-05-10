"""Prompt template for Federal Reserve statement classification."""

from typing import Any, Optional

from modules.llm_reasoner.prompts import SYSTEM_PROMPT


def build_fed_prompt(
    fed_text: str,
    prior_text: Optional[str] = None
) -> list[dict[str, Any]]:

    prior_display = prior_text if prior_text else "None provided"

    user_content = f"""Classify this Federal Reserve statement as hawkish, dovish, or neutral.
        Compare language shift from prior statement if provided.
        Statement: {fed_text}
        Prior statement: {prior_display}
        Return JSON: {{
        "stance": "hawkish|dovish|neutral",
        "confidence": 0.0,
        "language_shift": "more_hawkish|more_dovish|unchanged",
        "key_phrase": "exact phrase driving classification",
        "market_implication": "string"
    }}"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]