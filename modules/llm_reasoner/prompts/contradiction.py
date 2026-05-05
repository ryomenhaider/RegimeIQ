"""Prompt template for detecting contradictions in guidance vs numbers."""

from typing import Any

from modules.llm_reasoner.prompts import SYSTEM_PROMPT


def build_contradiction_prompt(text: str) -> list[dict[str, Any]]:
    """Build prompt for detecting contradictions in text.

    Args:
        text: Text containing both guidance and numeric claims

    Returns:
        List of message dictionaries ready for OpenRouter API
    """
    user_content = f"""Detect any contradiction between forward guidance and reported numbers in this text.
Text: {text}
Return JSON: {{
  "contradiction_found": true,
  "guidance_claim": "string",
  "numbers_claim": "string",
  "severity": "high|medium|low",
  "affected_assets": [],
  "direction": "bullish|bearish|neutral"
}}"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]