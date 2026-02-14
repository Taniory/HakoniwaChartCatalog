from __future__ import annotations

import json
from typing import Any

import requests


class GeminiError(RuntimeError):
    pass


def generate_json(
    *,
    api_key: str,
    model: str,
    prompt: str,
    schema: dict[str, Any] | None = None,
    temperature: float = 0.2,
    timeout_seconds: int = 60,
) -> dict[str, Any]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload: dict[str, Any] = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": temperature,
        },
    }
    if schema:
        payload["generationConfig"]["responseSchema"] = schema

    response = requests.post(url, json=payload, timeout=timeout_seconds)
    if response.status_code >= 400:
        raise GeminiError(f"Gemini request failed: {response.status_code} {response.text}")

    body = response.json()
    candidates = body.get("candidates") or []
    if not candidates:
        raise GeminiError(f"Gemini returned no candidates: {body}")

    parts = (((candidates[0] or {}).get("content") or {}).get("parts")) or []
    if not parts or "text" not in parts[0]:
        raise GeminiError(f"Gemini response had no text part: {body}")

    text = parts[0]["text"]
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise GeminiError(f"Gemini response was not valid JSON: {text}") from exc
