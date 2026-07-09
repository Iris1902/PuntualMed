import base64
import json
import re
from typing import Protocol

import httpx

# Disclaimer medico obligatorio en toda respuesta de texto de salud.
DISCLAIMER = (
    "Esto no reemplaza una consulta medica; acude a un profesional de la salud."
)

_GLM_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
_GLM_MODEL = "glm-4.5-flash"
_GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


class AIProvider(Protocol):
    # Analiza sintomas; devuelve texto con disclaimer (solo texto).
    async def analyze_symptoms(
        self, symptoms: list[dict], meds: list[dict]
    ) -> str: ...

    async def extract_medications_from_image(
        self, filename: str, image_bytes: bytes
    ) -> list[dict]: ...


class GLMProvider:
    # Implementacion real con GLM-4-Flash (texto) de Zhipu.
    # Escrita pero no probada contra la API real; los tests usan httpx.MockTransport.
    def __init__(
        self, api_key: str | None, *, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._api_key = api_key
        self._transport = transport

    async def analyze_symptoms(self, symptoms: list[dict], meds: list[dict]) -> str:
        if not self._api_key:
            raise RuntimeError("ZHIPU_API_KEY no configurada")
        system = (
            "Eres un asistente de salud. NUNCA diagnostiques de forma afirmativa. "
            "Sugiere posibles causas en lenguaje prudente e indica cuando acudir al medico. "
            "NO agregues disclaimers ni avisos legales; la aplicacion los anade automaticamente."
        )
        user = (
            f"Sintomas registrados: {symptoms}\n"
            f"Medicamentos actuales: {meds}\n"
            "Analiza posibles causas y cuando acudir al medico."
        )
        payload = {
            "model": _GLM_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        async with httpx.AsyncClient(transport=self._transport, timeout=30.0) as client:
            response = await client.post(
                _GLM_ENDPOINT,
                headers={"Authorization": f"Bearer {self._api_key}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            try:
                return data["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError) as exc:
                raise RuntimeError(f"Respuesta inesperada de GLM: {data}") from exc

    async def extract_medications_from_image(
        self, filename: str, image_bytes: bytes
    ) -> list[dict]:
        return []


class GeminiProvider:
    def __init__(
        self, api_key: str | None, *, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._api_key = api_key
        self._transport = transport

    async def analyze_symptoms(self, symptoms: list[dict], meds: list[dict]) -> str:
        if not self._api_key:
            raise RuntimeError("GEMINI_API_KEY no configurada")

        prompt = (
            "Eres un asistente de salud. NUNCA diagnostiques de forma afirmativa. "
            "Sugiere posibles causas en lenguaje prudente e indica cuando acudir al medico.\n"
            f"Sintomas registrados: {symptoms}\n"
            f"Medicamentos actuales: {meds}\n"
            "Analiza posibles causas y cuando acudir al medico."
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2},
        }
        async with httpx.AsyncClient(transport=self._transport, timeout=30.0) as client:
            response = await client.post(
                f"{_GEMINI_ENDPOINT}?key={self._api_key}",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            try:
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError, TypeError) as exc:
                raise RuntimeError(f"Respuesta inesperada de Gemini: {data}") from exc

    async def extract_medications_from_image(
        self, filename: str, image_bytes: bytes
    ) -> list[dict]:
        if not self._api_key:
            raise RuntimeError("GEMINI_API_KEY no configurada")

        mime_type = self._infer_mime_type(filename)
        prompt = (
            "Analiza esta receta médica. Extrae los medicamentos como un JSON válido de objetos. "
            "Cada objeto debe incluir exactamente estas claves: name, dose, start_date, duration_days, "
            "frequency_hours, schedules y notes. "
            "Si no encuentras un valor, usa null para texto o 0/7 según corresponda. "
            "Devuelve solo un array JSON, sin explicaciones ni markdown."
        )
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": base64.b64encode(image_bytes).decode("ascii"),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }
        async with httpx.AsyncClient(transport=self._transport, timeout=30.0) as client:
            response = await client.post(
                f"{_GEMINI_ENDPOINT}?key={self._api_key}",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError, TypeError) as exc:
                raise RuntimeError(f"Respuesta inesperada de Gemini: {data}") from exc

        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\[(.*)\]", text, re.S)
            if match is None:
                return []
            try:
                parsed = json.loads(match.group(0))
            except json.JSONDecodeError:
                return []

        if isinstance(parsed, dict):
            return [parsed]
        if isinstance(parsed, list):
            return [item for item in parsed if isinstance(item, dict)]
        return []

    @staticmethod
    def _infer_mime_type(filename: str) -> str:
        lower = filename.lower()
        if lower.endswith(".png"):
            return "image/png"
        if lower.endswith(".jpg") or lower.endswith(".jpeg"):
            return "image/jpeg"
        if lower.endswith(".webp"):
            return "image/webp"
        return "image/png"
