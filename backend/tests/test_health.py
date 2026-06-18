from app.core.database import get_db


async def test_health_returns_ok(client):
    # Act
    response = await client.get("/api/v1/health")
    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


class _FakeSession:
    # Sesion falsa para probar readiness sin una base de datos real
    def __init__(self, fail: bool):
        self._fail = fail

    async def execute(self, *args, **kwargs):
        if self._fail:
            raise RuntimeError("db down")
        return None


async def test_readiness_ok(app, client):
    # Arrange
    async def _ok_db():
        yield _FakeSession(fail=False)

    app.dependency_overrides[get_db] = _ok_db
    # Act
    try:
        response = await client.get("/api/v1/health/ready")
    finally:
        app.dependency_overrides.clear()
    # Assert
    assert response.status_code == 200
    assert response.json() == {"database": "ok"}


async def test_readiness_db_down(app, client):
    # Arrange
    async def _bad_db():
        yield _FakeSession(fail=True)

    app.dependency_overrides[get_db] = _bad_db
    # Act
    try:
        response = await client.get("/api/v1/health/ready")
    finally:
        app.dependency_overrides.clear()
    # Assert
    assert response.status_code == 503
