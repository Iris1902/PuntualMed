import json

import httpx

from app.notifications.telegram import TelegramClient


def _transport(captured: dict) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["body"] = json.loads(request.content) if request.content else None
        if "getUpdates" in request.url.path:
            return httpx.Response(200, json={"ok": True, "result": [{"update_id": 5}]})
        return httpx.Response(200, json={"ok": True, "result": {}})

    return httpx.MockTransport(handler)


async def test_send_message_posts_to_bot_api() -> None:
    captured: dict = {}
    client = TelegramClient("T0KEN", transport=_transport(captured))
    await client.send_message("123", "hola")
    assert "bot T0KEN/sendMessage".replace(" ", "") in captured["url"]
    assert captured["body"] == {"chat_id": "123", "text": "hola"}


async def test_get_updates_returns_results() -> None:
    captured: dict = {}
    client = TelegramClient("T0KEN", transport=_transport(captured))
    updates = await client.get_updates(offset=4)
    assert updates == [{"update_id": 5}]


async def test_disabled_without_token() -> None:
    client = TelegramClient(None)
    assert client.enabled is False
    await client.send_message("123", "x")  # no-op, no exception
    assert await client.get_updates(0) == []
