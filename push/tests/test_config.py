import base64

from py_vapid import Vapid

from kneadtime_push.config import load_settings, public_key_of


def _pem() -> str:
    vapid = Vapid()
    vapid.generate_keys()
    return vapid.private_pem().decode()


def test_the_public_key_is_the_uncompressed_p256_point_base64url():
    vapid = Vapid()
    vapid.generate_keys()
    key = public_key_of(vapid)
    raw = base64.urlsafe_b64decode(key + "=" * (-len(key) % 4))
    assert len(raw) == 65
    assert raw[0] == 0x04
    assert "+" not in key and "/" not in key and "=" not in key


def test_settings_come_from_the_environment():
    settings = load_settings(
        {
            "DATABASE_URL": "postgresql://x",
            "VAPID_PRIVATE_KEY": _pem(),
            "VAPID_SUBJECT": "https://kneadtime.pizza",
            "ALLOWED_ORIGINS": "https://kneadtime.pizza, http://localhost:5173",
        }
    )
    assert settings.database_url == "postgresql://x"
    assert settings.vapid_subject == "https://kneadtime.pizza"
    assert settings.allowed_origins == ("https://kneadtime.pizza", "http://localhost:5173")
    assert settings.vapid_public_key == public_key_of(settings.vapid)


def test_the_subject_defaults_to_the_site_and_origins_to_none():
    settings = load_settings({"DATABASE_URL": "postgresql://x", "VAPID_PRIVATE_KEY": _pem()})
    assert settings.vapid_subject == "https://kneadtime.pizza"
    assert settings.allowed_origins == ()
