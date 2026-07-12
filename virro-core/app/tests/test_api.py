import pytest
from sqlalchemy import select
from app.database import SessionLocal
from app.models import Event

BASE = {"tenant_id": "tenant-a", "event_type": "handoff", "source_type": "api", "content": "Send this soon to alan@example.com or +52 55 1234 5678 using token abcdefghijklmnop", "privacy_mode": "safe", "store_raw": False}

def test_health(client):
    assert client.get("/health").json()["status"] == "ok"

def test_privacy_mask(client, headers):
    data = client.post("/v1/privacy/mask", headers=headers, json={"content": BASE["content"]}).json()
    text = data["masked_text"]
    assert "alan@example.com" not in text and "1234 5678" not in text
    assert "[EMAIL_1]" in text and "[PHONE_1]" in text and "[TOKEN_1]" in text
    people = client.post("/v1/privacy/mask", headers=headers, json={"content": "Juan de QA pidió a María validar el login de Banco Azul", "client_name": "Banco Azul"}).json()["masked_text"]
    assert "[PERSON_1]" in people and "[PERSON_2]" in people and "[CLIENT_1]" in people

def test_analyze_safe_never_persists_raw(client, headers, caplog):
    secret = "alan@example.com"
    response = client.post("/v1/understanding/analyze-safe", headers=headers, json=BASE)
    assert response.status_code == 200 and response.json()["raw_stored"] is False
    with SessionLocal() as db:
        event = db.scalar(select(Event))
        assert event.raw_stored is False
        assert not hasattr(event, "raw_text") and not hasattr(event, "content")
    assert secret not in caplog.text

def test_store_raw_rejected_without_echo(client, headers):
    payload = {**BASE, "store_raw": True, "content": "private@example.com SECRET-PAYLOAD"}
    response = client.post("/v1/understanding/analyze-safe", headers=headers, json=payload)
    assert response.status_code == 400 and "SECRET-PAYLOAD" not in response.text

@pytest.mark.parametrize("pack", ["product-delivery", "ai-understanding", "handoff-intelligence", "process-understanding", "data-request", "design-to-dev", "sales-to-delivery", "support-signal", "knowledge-continuity"])
def test_pack_schema(client, headers, pack):
    response = client.post(f"/v1/packs/{pack}/analyze", headers=headers, json=BASE)
    assert response.status_code == 200
    assert {"readiness_score", "risk_level", "missing_context", "interpretation_risks", "critical_questions", "recommended_pack", "next_action", "safe_output"} <= response.json().keys()

def test_license_usage_and_report_are_safe(client, headers):
    activation = {"tenant_id": "tenant-a", "company_name": "Demo", "plan": "multi_pack_pilot", "active_packs": ["handoff-intelligence"]}
    assert client.post("/v1/license/activate", headers=headers, json=activation).status_code == 200
    assert client.post("/v1/events", headers=headers, json=BASE).status_code == 200
    assert client.get("/v1/usage?tenant_id=tenant-a", headers=headers).json()["used_events"] == 1
    report = client.post("/v1/reports/executive", headers=headers, json={"tenant_id": "tenant-a"})
    assert report.status_code == 200
    assert "alan@example.com" not in report.text and "+52" not in report.text and "abcdefghijklmnop" not in report.text

def test_trust_summary(client, headers):
    data = client.get("/v1/trust/data-handling-summary", headers=headers).json()
    assert data["raw_data_stored_by_default"] is False
