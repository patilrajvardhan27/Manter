"""One shared model API client plus a helper for forced tool calls.

Every model call in this service uses a forced tool call so the response
always parses into a known schema (see README, "Structured output").
"""

import json
from typing import Any

from anthropic import Anthropic

from app.config import get_settings

_client: Anthropic | None = None


def get_anthropic() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=get_settings().anthropic_api_key)
    return _client


def call_tool(
    *,
    system: str,
    messages: list[dict[str, Any]],
    tool: dict[str, Any],
    max_tokens: int = 512,
    model: str | None = None,
) -> dict[str, Any]:
    """Run one forced tool call and return the tool input as a dict."""
    resp = get_anthropic().messages.create(
        model=model or get_settings().anthropic_model,
        max_tokens=max_tokens,
        system=system,
        tools=[tool],
        tool_choice={"type": "tool", "name": tool["name"]},
        messages=messages,
    )
    for block in resp.content:
        if block.type == "tool_use" and block.name == tool["name"]:
            payload = block.input
            return json.loads(payload) if isinstance(payload, str) else dict(payload)
    return {}
