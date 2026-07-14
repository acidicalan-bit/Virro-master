import re
from pathlib import Path

import pytest
from sqlalchemy import inspect, select

from app.database import SessionLocal, engine
from app.models import AuditLog, Event

BASE = {
    "tenant_id": "tenant-a",
    "event_type": "handoff",
    "source_type": "api",
    "content": "Send this soon to alan@example.com or +52 55 1234 5678 using token abcdefghijklmnop",
    "privacy_mode": "safe",
    "store_raw": False,
}
SENSITIVE = ["alan@example.com", "+52 55 1234 5678", "abcdefghijklmnop"]


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_auth_requires_tenant_bound_credential(client, headers):
    assert client.get("/v1/trust/data-handling-summary").status_code == 401
    wrong_tenant = {**headers, "X-Tenant-ID": "tenant-b"}
    assert client.get("/v1/trust/data-handling-summary", headers=wrong_tenant).status_code == 403


def test_privacy_mask_masks_email_phone_and_token(client, headers):
    data = client.post("/v1/privacy/mask", headers=headers, json={"content": BASE["content"]}).json()
    text = data["masked_text"]
    assert not any(secret in text for secret in SENSITIVE)
    assert "[EMAIL_1]" in text and "[PHONE_1]" in text and "[TOKEN_1]" in text
    people = client.post("/v1/privacy/mask", headers=headers, json={"content": "Juan de QA pidió a María validar el login de Banco Azul", "client_name": "Banco Azul"}).json()["masked_text"]
    assert "[PERSON_1]" in people and "[PERSON_2]" in people and "[CLIENT_1]" in people


def test_analyze_safe_never_persists_or_logs_raw(client, headers, caplog):
    response = client.post("/v1/understanding/analyze-safe", headers=headers, json=BASE)
    assert response.status_code == 200 and response.json()["raw_stored"] is False
    with SessionLocal() as db:
        event = db.scalar(select(Event))
        audit = db.scalar(select(AuditLog))
        assert event.raw_stored is False
        assert audit.raw_stored is False and audit.masking_applied is True
        assert not hasattr(event, "raw_text") and not hasattr(event, "content")
    assert not any(secret in caplog.text for secret in SENSITIVE)
    assert "raw_stored=false" in caplog.text and "masking_applied=true" in caplog.text


def test_database_rejects_raw_stored_true():
    from sqlalchemy.exc import IntegrityError
    with SessionLocal() as db:
        db.add(Event(tenant_id="tenant-a", event_type="ticket", source_type="api", privacy_mode="safe", fingerprint="test", raw_stored=True))
        with pytest.raises(IntegrityError):
            db.commit()


def test_store_raw_rejected_without_echo(client, headers):
    payload = {**BASE, "store_raw": True, "content": "private@example.com SECRET-PAYLOAD"}
    response = client.post("/v1/understanding/analyze-safe", headers=headers, json=payload)
    assert response.status_code == 400
    assert "SECRET-PAYLOAD" not in response.text and "private@example.com" not in response.text
    assert set(response.json()) == {"error_code", "message", "request_id"}


def test_validation_errors_do_not_echo_raw_content(client, headers):
    response = client.post("/v1/understanding/analyze-safe", headers=headers, json={**BASE, "event_type": "invalid", "content": "private@example.com SECRET-PAYLOAD"})
    assert response.status_code == 422
    assert "SECRET-PAYLOAD" not in response.text and "private@example.com" not in response.text
    assert response.json()["error_code"] == "validation_failed"


def test_idempotency_key_prevents_duplicate_events(client, headers):
    payload = {**BASE, "idempotency_key": "handoff-retry-0001"}
    first = client.post("/v1/understanding/analyze-safe", headers=headers, json=payload)
    second = client.post("/v1/understanding/analyze-safe", headers=headers, json=payload)
    assert first.status_code == second.status_code == 200
    assert first.json()["event_id"] == second.json()["event_id"]
    with SessionLocal() as db:
        assert len(list(db.scalars(select(Event)))) == 1


def test_tenant_cannot_read_another_tenant_event(client, headers, tenant_b_headers):
    event_id = client.post("/v1/understanding/analyze-safe", headers=headers, json=BASE).json()["event_id"]
    response = client.get(f"/v1/events/{event_id}", headers=tenant_b_headers)
    assert response.status_code == 404


@pytest.mark.parametrize("pack", ["product-delivery", "ai-understanding", "handoff-intelligence", "process-understanding", "data-request", "design-to-dev", "sales-to-delivery", "support-signal", "knowledge-continuity"])
def test_pack_schema(client, headers, pack):
    response = client.post(f"/v1/packs/{pack}/analyze", headers=headers, json=BASE)
    assert response.status_code == 200
    assert {"readiness_score", "risk_level", "missing_context", "interpretation_risks", "critical_questions", "recommended_pack", "next_action", "safe_output"} <= response.json().keys()


def test_license_usage_and_executive_report_are_safe(client, headers):
    activation = {"tenant_id": "tenant-a", "company_name": "Demo", "plan": "multi_pack_pilot", "active_packs": ["handoff-intelligence"]}
    assert client.post("/v1/license/activate", headers=headers, json=activation).status_code == 200
    assert client.post("/v1/events", headers=headers, json=BASE).status_code == 200
    assert client.get("/v1/usage?tenant_id=tenant-a", headers=headers).json()["used_events"] == 1
    report = client.post("/v1/reports/executive", headers=headers, json={"tenant_id": "tenant-a"})
    assert report.status_code == 200
    assert not any(secret in report.text for secret in SENSITIVE)


def test_trust_endpoints(client, headers):
    handling = client.get("/v1/trust/data-handling-summary", headers=headers)
    retention = client.get("/v1/trust/retention-policy", headers=headers)
    security = client.get("/v1/trust/security-overview", headers=headers)
    assert handling.status_code == retention.status_code == security.status_code == 200
    assert handling.json()["raw_data_stored_by_default"] is False
    assert retention.json()["raw_data_retention"] == "none"
    assert security.json()["pipeline"] == ["Auth", "Tenant Guard", "PrivacyPolicyGuard", "Privacy Shield", "Analyze-Safe", "Store Signals"]


def test_persistent_schema_has_no_raw_content_columns():
    forbidden = {"raw_text", "original_content", "full_message", "full_document", "transcript", "conversation_body", "content"}
    columns = {column["name"] for table in inspect(engine).get_table_names() for column in inspect(engine).get_columns(table)}
    assert columns.isdisjoint(forbidden)
    prisma_schema = (Path(__file__).resolve().parents[3] / "prisma" / "schema.prisma").read_text(encoding="utf-8")
    assert not re.search(r"\b(rawInput|raw_text|original_content|full_message|full_document|transcript|conversation_body)\b", prisma_schema)
