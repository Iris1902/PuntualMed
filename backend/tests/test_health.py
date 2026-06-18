async def test_health_returns_ok(client):
    # Act
    response = await client.get("/api/v1/health")
    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
