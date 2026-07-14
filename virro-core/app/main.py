import hashlib
import hmac
import logging
import time
from collections import Counter
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, engine, get_db
from .engine import PACK_RULES, analyze
from .models import Analysis, AuditLog, Event, License, Report, Tenant, UsageRecord
from .privacy import privacy_shield
from .schemas import AnalyzeRequest, AnalysisResponse, LicenseActivate, PrivacyRequest, ReportRequest
from .security import AuthContext, authorize, enforce_privacy_policy, require_tenant

logging.basicConfig(level=(settings.log_level.strip().upper() or "INFO"), format="%(levelname)s %(message)s")
logger = logging.getLogger("virro-core")

if settings.virro_env in {"development", "test"}:
    Base.metadata.create_all(engine)

development_mode = settings.virro_env in {"development", "test"}
app = FastAPI(
    title="Virro Core Understanding Engine",
    version="0.1.0",
    docs_url="/docs" if development_mode else None,
    redoc_url=None,
    openapi_url="/openapi.json" if development_mode else None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization", "X-Tenant-ID"],
    allow_credentials=False,
)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", str(uuid4()))


def _error_code(status_code: int) -> str:
    return {
        400: "invalid_request",
        401: "authentication_required",
        403: "tenant_access_denied",
        404: "not_found",
        409: "conflict",
        422: "validation_failed",
        429: "rate_limit_exceeded",
    }.get(status_code, "request_failed")


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    message = exc.detail if isinstance(exc.detail, str) else "Request could not be completed"
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": _error_code(exc.status_code), "message": message, "request_id": _request_id(request)},
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, _exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error_code": "validation_failed", "message": "Request validation failed", "request_id": _request_id(request)},
    )


@app.exception_handler(Exception)
async def internal_error(request: Request, _exc: Exception):
    logger.error("request_id=%s endpoint=%s status=500", _request_id(request), request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error_code": "internal_error", "message": "Request could not be completed", "request_id": _request_id(request)},
    )


@app.middleware("http")
async def security_and_safe_logging(request: Request, call_next):
    request.state.request_id = request.headers.get("X-Request-ID") or str(uuid4())
    if settings.virro_env == "production" and request.headers.get("x-forwarded-proto", "https") != "https":
        return RedirectResponse(str(request.url).replace("http://", "https://", 1), status_code=308)

    start = time.perf_counter()
    response = await call_next(request)
    elapsed = int((time.perf_counter() - start) * 1000)
    logger.info(
        "request_id=%s tenant_id=%s endpoint=%s status=%s processing_time_ms=%s privacy_mode=safe raw_stored=false masking_applied=true",
        request.state.request_id,
        getattr(request.state, "tenant_id", "public"),
        request.url.path,
        response.status_code,
        elapsed,
    )
    response.headers.update({
        "X-Request-ID": request.state.request_id,
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
        "Cache-Control": "no-store",
    })
    return response


def _fingerprint(masked_content: str) -> str:
    key = settings.virro_fingerprint_key
    if not key:
        raise HTTPException(status_code=503, detail="Security configuration unavailable")
    return hmac.new(key.encode(), masked_content.encode(), hashlib.sha256).hexdigest()


def _existing_analysis(req: AnalyzeRequest, db: Session) -> AnalysisResponse | None:
    if not req.idempotency_key:
        return None
    event = db.scalar(select(Event).where(Event.tenant_id == req.tenant_id, Event.idempotency_key == req.idempotency_key))
    if not event:
        return None
    result = db.scalar(select(Analysis).where(Analysis.event_id == event.id, Analysis.tenant_id == req.tenant_id))
    if not result:
        return None
    return AnalysisResponse(
        event_id=event.id,
        readiness_score=result.readiness_score,
        risk_level=result.risk_level,
        missing_context=result.missing_context,
        interpretation_risks=result.interpretation_risks,
        critical_questions=result.questions,
        recommended_pack=result.recommended_pack,
        next_action=result.next_action,
        safe_output=result.safe_output,
        raw_stored=False,
    )


def persist_safe(req: AnalyzeRequest, result: dict, masked_content: str, db: Session, endpoint: str, request_id: str) -> str:
    event = Event(
        tenant_id=req.tenant_id,
        event_type=req.event_type,
        source_type=req.source_type,
        privacy_mode="safe",
        fingerprint=_fingerprint(masked_content),
        idempotency_key=req.idempotency_key,
        raw_stored=False,
    )
    db.add(event)
    db.flush()
    db.add(Analysis(
        event_id=event.id,
        tenant_id=req.tenant_id,
        readiness_score=result["readiness_score"],
        risk_level=result["risk_level"],
        missing_context=result["missing_context"],
        interpretation_risks=result["interpretation_risks"],
        questions=result["critical_questions"],
        recommended_pack=result["recommended_pack"],
        next_action=result["next_action"],
        safe_output=result["safe_output"],
    ))
    db.add(UsageRecord(tenant_id=req.tenant_id, event_type=req.event_type))
    db.add(AuditLog(
        request_id=request_id,
        tenant_id=req.tenant_id,
        endpoint=endpoint,
        status="success",
        processing_time_ms=0,
        event_type=req.event_type,
        privacy_mode="safe",
        raw_stored=False,
        masking_applied=True,
    ))
    license_record = db.scalar(select(License).where(License.tenant_id == req.tenant_id))
    if license_record:
        license_record.used_events += 1
    db.commit()
    return event.id


def safe_analysis(req: AnalyzeRequest, auth: AuthContext, request: Request, db: Session, persist: bool = True, endpoint: str = "/v1/understanding/analyze-safe"):
    require_tenant(auth, req.tenant_id)
    request.state.event_type = req.event_type
    enforce_privacy_policy(req.privacy_mode, req.store_raw)
    if existing := _existing_analysis(req, db):
        return existing
    masked = privacy_shield.mask(req.content, req.client_name, req.company_name)
    result = analyze(masked.masked_text, req.event_type, req.pack_hint)
    event_id = persist_safe(req, result, masked.masked_text, db, endpoint, _request_id(request)) if persist else None
    return AnalysisResponse(event_id=event_id, raw_stored=False, **result)


@app.get("/health")
def health():
    return {"status": "ok", "service": "virro-core", "version": "0.1.0"}


@app.get("/v1/trust/data-handling-summary", dependencies=[Depends(authorize)])
def trust_summary():
    return {
        "default_privacy_mode": "safe",
        "raw_data_stored_by_default": False,
        "stores": ["metadata", "readiness scores", "risk patterns", "recommended packs", "safe reports", "usage counters"],
        "does_not_store_by_default": ["raw conversations", "complete documents", "transcripts", "emails", "phone numbers", "tokens", "secrets"],
        "message": "Virro processes operational information to generate understanding signals without storing raw client content by default.",
    }


@app.get("/v1/trust/retention-policy", dependencies=[Depends(authorize)])
def retention_policy():
    return {"raw_data_retention": "none", "safe_output_retention_days": settings.safe_output_retention_days, "aggregate_patterns_retention_days": settings.aggregate_patterns_retention_days, "audit_logs_retention_days": settings.audit_logs_retention_days}


@app.get("/v1/trust/security-overview", dependencies=[Depends(authorize)])
def security_overview():
    return {"privacy_mode": "safe", "pipeline": ["Auth", "Tenant Guard", "PrivacyPolicyGuard", "Privacy Shield", "Analyze-Safe", "Store Signals"], "raw_stored": False, "certification_claimed": False}


@app.post("/v1/privacy/detect")
def privacy_detect(req: PrivacyRequest, _auth: AuthContext = Depends(authorize)):
    masked = privacy_shield.mask(req.content, req.client_name, req.company_name)
    return {"original_received": True, "detected_entities": masked.detected_entities, "privacy_mode": "safe", "warnings": masked.warnings}


@app.post("/v1/privacy/mask")
def privacy_mask(req: PrivacyRequest, _auth: AuthContext = Depends(authorize)):
    masked = privacy_shield.mask(req.content, req.client_name, req.company_name)
    return {"original_received": True, "masked_text": masked.masked_text, "detected_entities": masked.detected_entities, "privacy_mode": "safe", "warnings": masked.warnings}


@app.post("/v1/understanding/analyze-safe", response_model=AnalysisResponse)
def analyze_safe(req: AnalyzeRequest, request: Request, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    return safe_analysis(req, auth, request, db)


@app.post("/v1/understanding/analyze", response_model=AnalysisResponse)
def analyze_default(req: AnalyzeRequest, request: Request, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    return safe_analysis(req, auth, request, db)


@app.post("/v1/understanding/readiness", response_model=AnalysisResponse)
def readiness(req: AnalyzeRequest, request: Request, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    return safe_analysis(req, auth, request, db, False)


@app.post("/v1/events", response_model=AnalysisResponse)
def create_event(req: AnalyzeRequest, request: Request, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    return safe_analysis(req, auth, request, db, True, "/v1/events")


@app.get("/v1/events/{event_id}")
def get_event(event_id: str, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    event = db.scalar(select(Event).where(Event.id == event_id, Event.tenant_id == auth.tenant_id))
    analysis = db.scalar(select(Analysis).where(Analysis.event_id == event_id, Analysis.tenant_id == auth.tenant_id))
    if not event or not analysis:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"id": event.id, "tenant_id": event.tenant_id, "event_type": event.event_type, "source_type": event.source_type, "privacy_mode": event.privacy_mode, "raw_stored": False, "readiness_score": analysis.readiness_score, "risk_level": analysis.risk_level, "missing_context": analysis.missing_context, "recommended_pack": analysis.recommended_pack}


def pack_endpoint(pack: str, req: AnalyzeRequest, request: Request, auth: AuthContext, db: Session):
    req.pack_hint = pack
    return safe_analysis(req, auth, request, db)


for pack in PACK_RULES:
    def endpoint(req: AnalyzeRequest, request: Request, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db), _pack=pack):
        return pack_endpoint(_pack, req, request, auth, db)
    app.post(f"/v1/packs/{pack}/analyze", response_model=AnalysisResponse, name=f"analyze_{pack}")(endpoint)


@app.post("/v1/reports/executive")
def executive_report(req: ReportRequest, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    require_tenant(auth, req.tenant_id)
    rows = list(db.scalars(select(Analysis).where(Analysis.tenant_id == auth.tenant_id)))
    scores = [row.readiness_score for row in rows]
    missing = Counter(item for row in rows for item in row.missing_context)
    risks = Counter(item for row in rows for item in row.interpretation_risks)
    packs = Counter(row.recommended_pack for row in rows)
    summary = {"executive_summary": f"{len(rows)} safe Understanding Events analyzed.", "total_events_analyzed": len(rows), "average_readiness": round(sum(scores) / len(scores)) if scores else 0, "high_risk_events": sum(row.risk_level == "high" for row in rows), "top_missing_context_patterns": [item for item, _ in missing.most_common(5)], "top_interpretation_risks": [item for item, _ in risks.most_common(5)], "recommended_packs": [item for item, _ in packs.most_common(3)], "quick_wins": ["Validate owners, evidence and receiver before advancing"], "pilot_recommendation": f"Start with {packs.most_common(1)[0][0]}" if packs else "Start with a critical-flow audit", "raw_stored": False}
    report = Report(tenant_id=auth.tenant_id, summary=summary)
    db.add(report)
    db.commit()
    return {"report_id": report.id, **summary}


@app.get("/v1/reports/{report_id}")
def get_report(report_id: str, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    report = db.scalar(select(Report).where(Report.id == report_id, Report.tenant_id == auth.tenant_id))
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"report_id": report.id, **report.summary}


@app.post("/v1/license/activate")
def activate_license(req: LicenseActivate, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    require_tenant(auth, req.tenant_id)
    tenant = db.get(Tenant, auth.tenant_id)
    if not tenant:
        db.add(Tenant(id=auth.tenant_id, name=req.company_name or auth.tenant_id))
    license_record = License(**req.model_dump())
    db.add(license_record)
    db.commit()
    return {"license_id": license_record.id, **req.model_dump(), "used_events": 0, "raw_data_retention": "none"}


@app.get("/v1/license")
def get_license(tenant_id: str, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    require_tenant(auth, tenant_id)
    license_record = db.scalar(select(License).where(License.tenant_id == auth.tenant_id))
    if not license_record:
        raise HTTPException(status_code=404, detail="License not found")
    return {"tenant_id": license_record.tenant_id, "plan": license_record.plan, "active_packs": license_record.active_packs, "monthly_event_limit": license_record.monthly_event_limit, "used_events": license_record.used_events, "privacy_mode": license_record.privacy_mode, "deployment_mode": license_record.deployment_mode}


@app.get("/v1/usage")
def usage(tenant_id: str, auth: AuthContext = Depends(authorize), db: Session = Depends(get_db)):
    require_tenant(auth, tenant_id)
    used_events = db.scalar(select(func.count()).select_from(UsageRecord).where(UsageRecord.tenant_id == auth.tenant_id)) or 0
    return {"tenant_id": auth.tenant_id, "used_events": used_events, "raw_stored": False}
