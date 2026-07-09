import httpx
import pytest

from app.ai.provider import GLMProvider, GeminiProvider


async def test_glm_provider_without_key_raises():
    provider = GLMProvider(api_key=None)
    with pytest.raises(RuntimeError):
        await provider.analyze_symptoms([], [])


async def test_glm_provider_sends_model_and_parses_response():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["auth"] = request.headers.get("Authorization")
        captured["body"] = request.content.decode()
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "Posible causa: deshidratacion."}}]},
        )

    provider = GLMProvider(api_key="test-key", transport=httpx.MockTransport(handler))
    result = await provider.analyze_symptoms(
        [{"description": "mareo", "severity": "leve"}],
        [{"name": "Ibuprofeno", "dose": "400 mg"}],
    )

    assert result == "Posible causa: deshidratacion."
    assert captured["auth"] == "Bearer test-key"
    # el tono prudente lo fija el prompt; el disclaimer lo anade el service, no el LLM
    assert "NUNCA diagnostiques" in captured["body"]
    assert "glm-4.5-flash" in captured["body"]


async def test_glm_provider_malformed_response_raises():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": []})

    provider = GLMProvider(api_key="test-key", transport=httpx.MockTransport(handler))
    with pytest.raises(RuntimeError):
        await provider.analyze_symptoms([], [])


async def test_gemini_provider_without_key_raises():
    provider = GeminiProvider(api_key=None)
    with pytest.raises(RuntimeError):
        await provider.analyze_symptoms([], [])


async def test_gemini_provider_sends_model_and_parses_response():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["body"] = request.content.decode()
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {"content": {"parts": [{"text": "Posible causa: deshidratacion."}]}}
                ]
            },
        )

    provider = GeminiProvider(api_key="test-key", transport=httpx.MockTransport(handler))
    result = await provider.analyze_symptoms(
        [{"description": "mareo", "severity": "leve"}],
        [{"name": "Ibuprofeno", "dose": "400 mg"}],
    )

    assert result == "Posible causa: deshidratacion."
    assert "models/gemini-1.5-flash:generateContent" in captured["url"]
    assert "test-key" in captured["url"]
    assert "mareo" in captured["body"]


async def test_gemini_provider_extracts_medication_payload_from_image():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": "[{\"name\": \"Amoxicilina\", \"dose\": \"500 mg\", \"start_date\": \"2026-01-01\", \"duration_days\": 7, \"frequency_hours\": 24, \"schedules\": [\"09:00\"], \"notes\": \"Tomar cada día\"}]"
                                }
                            ]
                        }
                    }
                ]
            },
        )

    provider = GeminiProvider(api_key="test-key", transport=httpx.MockTransport(handler))
    result = await provider.extract_medications_from_image("recipe.png", b"fake-image")

    assert result[0]["name"] == "Amoxicilina"
    assert result[0]["frequency_hours"] == 24
    assert result[0]["schedules"] == ["09:00"]
