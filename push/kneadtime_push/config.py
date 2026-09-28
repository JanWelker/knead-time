import os
from collections.abc import Mapping
from dataclasses import dataclass

from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from py_vapid import Vapid
from py_vapid.utils import b64urlencode


@dataclass(frozen=True)
class Settings:
    database_url: str
    vapid: Vapid
    vapid_public_key: str
    vapid_subject: str
    allowed_origins: tuple[str, ...]


def public_key_of(vapid: Vapid) -> str:
    """The `applicationServerKey` a browser subscribes with: the X9.62 point, base64url."""
    raw = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return b64urlencode(raw)


def load_settings(env: Mapping[str, str] = os.environ) -> Settings:
    pem = env["VAPID_PRIVATE_KEY"]
    vapid = Vapid.from_pem(pem.encode())
    origins = tuple(o.strip() for o in env.get("ALLOWED_ORIGINS", "").split(",") if o.strip())
    return Settings(
        database_url=env["DATABASE_URL"],
        vapid=vapid,
        vapid_public_key=public_key_of(vapid),
        vapid_subject=env.get("VAPID_SUBJECT", "https://kneadtime.pizza"),
        allowed_origins=origins,
    )
