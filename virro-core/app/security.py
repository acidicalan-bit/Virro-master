import hashlib
import secrets
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import Header, HTTPException, Request

from .config import settings


@dataclass(frozen=True)
class AuthContext:
    tenant_id: str
    credential_id: str


class FixedWindowRateLimiter:
    def __init__(self) -> None:
        self._buckets: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int) -> None:
        now = time.monotonic()
        cutoff = now - settings.rate_limit_window_seconds
        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            bucket.append(now)


rate_limiter = FixedWindowRateLimiter()


def _resolve_token(x_api_key: str | None, authorization: str | None) -> str:
    if x_api_key:
        return x_api_key
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return ""


def authorize(
    request: Request,
    x_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
    x_tenant_id: str | None = Header(default=None),
) -> AuthContext:
    token = _resolve_token(x_api_key, authorization)
    tenant_keys = settings.tenant_api_keys

    authorized_tenant = next(
        (tenant for tenant, key in tenant_keys.items() if token and secrets.compare_digest(token, key)),
        None,
    )
    if not authorized_tenant:
        raise HTTPException(status_code=401, detail="Invalid or missing credentials")
    if not x_tenant_id or not secrets.compare_digest(x_tenant_id, authorized_tenant):
        raise HTTPException(status_code=403, detail="Tenant access denied")

    credential_id = hashlib.sha256(token.encode()).hexdigest()[:16]
    client_ip = request.client.host if request.client else "unknown"
    rate_limiter.check(f"credential:{credential_id}", settings.rate_limit_per_api_key)
    rate_limiter.check(f"tenant:{authorized_tenant}", settings.rate_limit_per_tenant)
    rate_limiter.check(f"ip:{client_ip}", settings.rate_limit_per_ip)
    request.state.tenant_id = authorized_tenant
    return AuthContext(tenant_id=authorized_tenant, credential_id=credential_id)


def require_tenant(auth: AuthContext, tenant_id: str) -> None:
    if not tenant_id or not secrets.compare_digest(auth.tenant_id, tenant_id):
        raise HTTPException(status_code=403, detail="Tenant access denied")


def enforce_privacy_policy(privacy_mode: str, store_raw: bool) -> None:
    if privacy_mode != "safe":
        raise HTTPException(status_code=400, detail="Only privacy_mode=safe is supported")
    if store_raw:
        raise HTTPException(status_code=400, detail="store_raw=true is not supported in safe mode")
