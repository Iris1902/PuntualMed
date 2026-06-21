from datetime import UTC, datetime, timedelta

from app.reminders.worker import mark_missed_intakes


class _FakeRepo:
    def __init__(self, count: int) -> None:
        self.count = count
        self.cutoff: datetime | None = None

    async def mark_missed_before(self, cutoff: datetime) -> int:
        self.cutoff = cutoff
        return self.count


async def test_mark_missed_uses_grace_cutoff_and_returns_count() -> None:
    repo = _FakeRepo(count=4)
    now = datetime(2026, 6, 20, 12, 0, tzinfo=UTC)

    result = await mark_missed_intakes(repo, now, 60)

    assert result == 4
    assert repo.cutoff == now - timedelta(minutes=60)
