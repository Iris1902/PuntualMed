import uuid
from types import SimpleNamespace

from app.notifications.alerts import poll_telegram_once, send_missed_alerts

USER = uuid.uuid4()


class _IntakeRepo:
    def __init__(self, intakes):
        self.intakes = intakes
        self.alerted = []

    async def list_unalerted_missed(self):
        return self.intakes

    async def mark_alerted(self, intake):
        intake.alert_sent = True
        self.alerted.append(intake)


class _ContactsRepo:
    def __init__(self, by_user):
        self.by_user = by_user

    async def list_by_user(self, user_id):
        return self.by_user.get(user_id, [])


class _Telegram:
    def __init__(self):
        self.sent = []

    async def send_message(self, chat_id, text):
        self.sent.append((chat_id, text))


async def test_send_missed_alerts_notifies_contacts_and_marks_alerted() -> None:
    med = SimpleNamespace(name="Metformina", dose="500 mg")
    intake = SimpleNamespace(
        user_id=USER, medication=med,
        scheduled_at=__import__("datetime").datetime(2026, 6, 20, 20, 0), alert_sent=False,
    )
    repo = _IntakeRepo([intake])
    contacts = _ContactsRepo({USER: [SimpleNamespace(chat_id="999")]})
    tg = _Telegram()
    count = await send_missed_alerts(repo, contacts, tg)
    assert count == 1
    assert tg.sent and tg.sent[0][0] == "999"
    assert "Metformina" in tg.sent[0][1]
    assert intake.alert_sent is True


class _PollTelegram:
    async def get_updates(self, offset, timeout=25):
        return [{"update_id": 7, "message": {"text": "/start x"}}]


class _Service:
    def __init__(self):
        self.seen = []

    async def handle_update(self, update):
        self.seen.append(update)
        return True


async def test_poll_advances_offset() -> None:
    svc = _Service()
    new_offset = await poll_telegram_once(_PollTelegram(), svc, offset=0)
    assert new_offset == 8
    assert len(svc.seen) == 1
