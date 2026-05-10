from typing import Any

from modules.llm_reasoner.prompts import SYSTEM_PROMPT


def build_contradiction_prompt(text: str) -> list[dict[str, Any]]:

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