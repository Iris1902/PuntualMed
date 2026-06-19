from app.users.models import Profile


def test_profile_tablename():
    assert Profile.__tablename__ == "profiles"


def test_profile_has_expected_columns():
    cols = set(Profile.__table__.columns.keys())
    assert cols == {"id", "full_name", "expo_push_token", "created_at"}


def test_profile_id_is_primary_key():
    assert Profile.__table__.c.id.primary_key is True
