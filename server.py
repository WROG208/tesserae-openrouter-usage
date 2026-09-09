"""Server-side OpenRouter usage collector for Tesserae."""

from __future__ import annotations

import contextlib
import json
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

from app.plugin_http import fetch_json

CACHE_TTL_S = 600
HTTP_TIMEOUT_S = 3
USER_AGENT = "tesserae/1.0 (+openrouter_usage)"


def _number(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _integer(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _read_cache(path: Path, allow_stale: bool = False) -> dict[str, Any] | None:
    if not path.exists():
        return None

    if not allow_stale and time.time() - path.stat().st_mtime >= CACHE_TTL_S:
        return None

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def fetch(
    options: dict[str, Any],
    settings: dict[str, Any],
    *,
    ctx: dict[str, Any],
) -> dict[str, Any]:
    del options

    api_key = str(
        settings.get("api_key")
        or settings.get("api_key_secret")
        or ""
    ).strip()

    if not api_key:
        return {
            "error": "Add the OpenRouter management key in Widget Settings."
        }

    data_dir = Path(ctx["data_dir"])
    data_dir.mkdir(parents=True, exist_ok=True)
    cache_path = data_dir / "openrouter_usage.json"

    cached = _read_cache(cache_path)
    if cached is not None:
        return cached

    headers = {
        "Authorization": f"Bearer {api_key}",
        "User-Agent": USER_AGENT,
    }

    try:
        credits_payload = fetch_json(
            "https://openrouter.ai/api/v1/credits",
            headers=headers,
            timeout=HTTP_TIMEOUT_S,
            retries=0,
        )
        activity_payload = fetch_json(
            "https://openrouter.ai/api/v1/activity",
            headers=headers,
            timeout=HTTP_TIMEOUT_S,
            retries=0,
        )
    except Exception:
        stale = _read_cache(cache_path, allow_stale=True)
        if stale is not None:
            stale["stale"] = True
            return stale
        return {"error": "Couldn't reach OpenRouter right now."}

    credits = credits_payload.get("data") or {}
    rows = activity_payload.get("data") or []

    total_credits = _number(credits.get("total_credits"))
    total_usage = _number(credits.get("total_usage"))
    balance = max(0.0, total_credits - total_usage)

    by_day: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "spend": 0.0,
            "requests": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "reasoning_tokens": 0,
        }
    )
    by_model: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "spend": 0.0,
            "requests": 0,
            "tokens": 0,
        }
    )

    for row in rows:
        if not isinstance(row, dict):
            continue

        date = str(row.get("date") or "")[:10]
        model = str(row.get("model") or "Unknown")

        prompt = _integer(row.get("prompt_tokens"))
        completion = _integer(row.get("completion_tokens"))
        reasoning = _integer(row.get("reasoning_tokens"))
        requests = _integer(row.get("requests"))
        spend = _number(row.get("usage"))

        if date:
            day = by_day[date]
            day["spend"] += spend
            day["requests"] += requests
            day["prompt_tokens"] += prompt
            day["completion_tokens"] += completion
            day["reasoning_tokens"] += reasoning

        model_row = by_model[model]
        model_row["spend"] += spend
        model_row["requests"] += requests
        model_row["tokens"] += prompt + completion

    daily = []
    for date in sorted(by_day)[-7:]:
        day = by_day[date]
        daily.append(
            {
                "date": date,
                "spend": round(day["spend"], 4),
                "requests": day["requests"],
                "prompt_tokens": day["prompt_tokens"],
                "completion_tokens": day["completion_tokens"],
                "reasoning_tokens": day["reasoning_tokens"],
            }
        )

    latest = daily[-1] if daily else {
        "date": "",
        "spend": 0,
        "requests": 0,
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "reasoning_tokens": 0,
    }

    models = sorted(
        (
            {
                "model": model,
                "spend": round(values["spend"], 4),
                "requests": values["requests"],
                "tokens": values["tokens"],
            }
            for model, values in by_model.items()
        ),
        key=lambda item: item["spend"],
        reverse=True,
    )

    result = {
        "total_credits": round(total_credits, 2),
        "total_usage": round(total_usage, 2),
        "balance": round(balance, 2),
        "latest": latest,
        "daily": daily,
        "top_model": models[0]["model"] if models else "No activity",
        "updated_at": int(time.time()),
        "stale": False,
    }

    with contextlib.suppress(OSError):
        cache_path.write_text(json.dumps(result), encoding="utf-8")

    return result
