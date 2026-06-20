import uuid
from datetime import UTC, datetime

from app.reminders.models import IntakeLog


def test_intake_log_defaults_on_transient_object():
    # Los defaults de columna (status, alert_sent) NO se aplican en construccion,
    # solo al flush; un objeto transitorio refleja lo que se le pasa explicito.
    intake = IntakeLog(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        medication_id=uuid.uuid4(),
        scheduled_at=datetime(2026, 6, 19, 13, 0, tzinfo=UTC),
        status="pending",
        alert_sent=False,
    )
    assert intake.status == "pending"
    assert intake.alert_sent is False
    assert intake.confirmed_at is None
    assert intake.photo_url is None
