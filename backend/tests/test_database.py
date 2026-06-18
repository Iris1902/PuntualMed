import inspect

from sqlalchemy.ext.asyncio import AsyncEngine

from app.core import database


def test_engine_is_async():
    # Assert: el engine se construyo como asincrono
    assert isinstance(database.engine, AsyncEngine)


def test_get_db_is_async_generator():
    # Assert: la dependencia es un generador asincrono
    assert inspect.isasyncgenfunction(database.get_db)
