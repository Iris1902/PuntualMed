import httpx

_BASE = "https://api.telegram.org"


class TelegramClient:
    # Cliente minimo de la Bot API (sin libreria): enviar mensajes y leer updates por long-polling.
    def __init__(
        self, token: str | None, *, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._token = token
        self._transport = transport

    @property
    def enabled(self) -> bool:
        return bool(self._token)

    def _url(self, method: str) -> str:
        return f"{_BASE}/bot{self._token}/{method}"

    async def send_message(self, chat_id: str, text: str) -> None:
        if not self._token:
            return
        async with httpx.AsyncClient(transport=self._transport, timeout=15.0) as client:
            await client.post(self._url("sendMessage"), json={"chat_id": chat_id, "text": text})

    async def get_updates(self, offset: int, timeout: int = 25) -> list[dict]:
        if not self._token:
            return []
        async with httpx.AsyncClient(
            transport=self._transport, timeout=timeout + 10
        ) as client:
            resp = await client.get(
                self._url("getUpdates"), params={"offset": offset, "timeout": timeout}
            )
            return resp.json().get("result", [])
