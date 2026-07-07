from unittest.mock import AsyncMock

import app.main as main


async def test_run_missed_job_runs_service_and_commits(monkeypatch) -> None:
    committed = {"value": False}

    class _FakeSession:
        async def __aenter__(self) -> "_FakeSession":
            return self

        async def __aexit__(self, *args) -> bool:
            return False

        async def commit(self) -> None:
            committed["value"] = True

    monkeypatch.setattr(main, "get_session_factory", lambda: (lambda: _FakeSession()))
    service = AsyncMock(return_value=3)
    monkeypatch.setattr(main, "mark_missed_intakes", service)

    # Aisla la config del .env real: sin token, no se toma el camino de alertas.
    class _FakeSettings:
        missed_grace_minutes = 60
        telegram_bot_token = None

    monkeypatch.setattr(main, "get_settings", lambda: _FakeSettings())

    await main.run_missed_job()

    assert committed["value"] is True
    service.assert_awaited_once()


async def test_run_missed_job_skips_alerts_when_no_token(monkeypatch) -> None:
    # Sin token configurado, send_missed_alerts no debe invocarse y el job no debe lanzar.
    committed = {"value": False}

    class _FakeSession:
        async def __aenter__(self) -> "_FakeSession":
            return self

        async def __aexit__(self, *args) -> bool:
            return False

        async def commit(self) -> None:
            committed["value"] = True

    monkeypatch.setattr(main, "get_session_factory", lambda: (lambda: _FakeSession()))
    monkeypatch.setattr(main, "mark_missed_intakes", AsyncMock(return_value=0))

    alerts_called = {"value": False}

    async def _fake_send_missed_alerts(*args, **kwargs) -> int:
        alerts_called["value"] = True
        return 0

    monkeypatch.setattr(main, "send_missed_alerts", _fake_send_missed_alerts)

    class _FakeSettings:
        missed_grace_minutes = 60
        telegram_bot_token = None

    monkeypatch.setattr(main, "get_settings", lambda: _FakeSettings())

    await main.run_missed_job()

    assert committed["value"] is True
    assert alerts_called["value"] is False
