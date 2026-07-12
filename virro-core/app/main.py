import hashlib, logging, time
from collections import Counter
from uuid import uuid4
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .config import settings
from .database import Base, engine, get_db
from .engine import PACK_RULES, analyze
from .models import Analysis, AuditLog, Event, License, Report, Tenant, UsageRecord
from .privacy import privacy_shield
from .schemas import AnalyzeRequest, AnalysisResponse, LicenseActivate, PrivacyRequest, ReportRequest

logging.basicConfig(level=(settings.log_level.strip().upper() or "INFO"),format="%(levelname)s %(message)s")
logger=logging.getLogger("virro-core")
if settings.virro_env in {"development", "test"}:
    Base.metadata.create_all(engine)
app=FastAPI(title="Virro Core Understanding Engine",version="0.1.0",docs_url="/docs")
app.add_middleware(CORSMiddleware,allow_origins=settings.origins,allow_methods=["GET","POST"],allow_headers=["Content-Type","X-API-Key"],allow_credentials=False)

@app.middleware("http")
async def safe_request_log(request:Request,call_next):
    start=time.perf_counter(); request_id=str(uuid4()); response=await call_next(request)
    logger.info("request_id=%s endpoint=%s status=%s processing_time_ms=%s raw_stored=false",request_id,request.url.path,response.status_code,int((time.perf_counter()-start)*1000))
    response.headers["X-Request-ID"]=request_id; return response

def authorize(x_api_key:str|None=Header(default=None)):
    if not settings.virro_api_key or x_api_key != settings.virro_api_key: raise HTTPException(401,"Invalid or missing tenant API key")

def persist_safe(req:AnalyzeRequest,result:dict,db:Session,endpoint:str)->str:
    event=Event(tenant_id=req.tenant_id,event_type=req.event_type,source_type=req.source_type,privacy_mode="safe",fingerprint=hashlib.sha256(req.content.encode()).hexdigest(),raw_stored=False)
    db.add(event); db.flush(); db.add(Analysis(event_id=event.id,tenant_id=req.tenant_id,readiness_score=result["readiness_score"],risk_level=result["risk_level"],missing_context=result["missing_context"],interpretation_risks=result["interpretation_risks"],questions=result["critical_questions"],recommended_pack=result["recommended_pack"],next_action=result["next_action"],safe_output=result["safe_output"])); db.add(UsageRecord(tenant_id=req.tenant_id,event_type=req.event_type)); db.add(AuditLog(request_id=str(uuid4()),tenant_id=req.tenant_id,endpoint=endpoint,status="success",processing_time_ms=0,event_type=req.event_type,privacy_mode="safe",raw_stored=False)); lic=db.scalar(select(License).where(License.tenant_id==req.tenant_id));
    if lic: lic.used_events+=1
    db.commit(); return event.id

def safe_analysis(req:AnalyzeRequest,db:Session,persist:bool=True,endpoint:str="/v1/understanding/analyze-safe"):
    if req.store_raw: raise HTTPException(400,"store_raw=true is not supported in safe mode")
    masked=privacy_shield.mask(req.content,req.client_name,req.company_name); result=analyze(masked.masked_text,req.event_type,req.pack_hint); event_id=persist_safe(req,result,db,endpoint) if persist else None
    return AnalysisResponse(event_id=event_id,raw_stored=False,**result)

@app.get("/health")
def health(): return {"status":"ok","service":"virro-core","version":"0.1.0"}

@app.get("/v1/trust/data-handling-summary",dependencies=[Depends(authorize)])
def trust_summary(): return {"default_privacy_mode":"safe","raw_data_stored_by_default":False,"stores":["metadata","readiness scores","risk patterns","recommended packs","safe reports","usage counters"],"does_not_store_by_default":["raw conversations","complete documents","transcripts","emails","phone numbers","tokens","secrets"],"message":"Virro processes operational information to generate understanding signals without storing raw client content by default."}

@app.post("/v1/privacy/detect",dependencies=[Depends(authorize)])
def privacy_detect(req:PrivacyRequest):
    masked=privacy_shield.mask(req.content,req.client_name,req.company_name); return {"original_received":True,"detected_entities":masked.detected_entities,"privacy_mode":"safe","warnings":masked.warnings}
@app.post("/v1/privacy/mask",dependencies=[Depends(authorize)])
def privacy_mask(req:PrivacyRequest):
    masked=privacy_shield.mask(req.content,req.client_name,req.company_name); return {"original_received":True,"masked_text":masked.masked_text,"detected_entities":masked.detected_entities,"privacy_mode":"safe","warnings":masked.warnings}
@app.post("/v1/understanding/analyze-safe",response_model=AnalysisResponse,dependencies=[Depends(authorize)])
def analyze_safe(req:AnalyzeRequest,db:Session=Depends(get_db)): return safe_analysis(req,db)
@app.post("/v1/understanding/analyze",response_model=AnalysisResponse,dependencies=[Depends(authorize)])
def analyze_default(req:AnalyzeRequest,db:Session=Depends(get_db)): return safe_analysis(req,db)
@app.post("/v1/understanding/readiness",response_model=AnalysisResponse,dependencies=[Depends(authorize)])
def readiness(req:AnalyzeRequest,db:Session=Depends(get_db)): return safe_analysis(req,db,False)
@app.post("/v1/events",response_model=AnalysisResponse,dependencies=[Depends(authorize)])
def create_event(req:AnalyzeRequest,db:Session=Depends(get_db)): return safe_analysis(req,db,True,"/v1/events")
@app.get("/v1/events/{event_id}",dependencies=[Depends(authorize)])
def get_event(event_id:str,db:Session=Depends(get_db)):
    event=db.get(Event,event_id); analysis=db.scalar(select(Analysis).where(Analysis.event_id==event_id));
    if not event or not analysis: raise HTTPException(404,"Event not found")
    return {"id":event.id,"tenant_id":event.tenant_id,"event_type":event.event_type,"source_type":event.source_type,"privacy_mode":event.privacy_mode,"raw_stored":False,"readiness_score":analysis.readiness_score,"risk_level":analysis.risk_level,"missing_context":analysis.missing_context,"recommended_pack":analysis.recommended_pack}

def pack_endpoint(pack:str,req:AnalyzeRequest,db:Session): req.pack_hint=pack; return safe_analysis(req,db)
for pack in PACK_RULES:
    def endpoint(req:AnalyzeRequest,db:Session=Depends(get_db),_pack=pack): return pack_endpoint(_pack,req,db)
    app.post(f"/v1/packs/{pack}/analyze",response_model=AnalysisResponse,dependencies=[Depends(authorize)],name=f"analyze_{pack}")(endpoint)

@app.post("/v1/reports/executive",dependencies=[Depends(authorize)])
def executive_report(req:ReportRequest,db:Session=Depends(get_db)):
    rows=list(db.scalars(select(Analysis).where(Analysis.tenant_id==req.tenant_id))); scores=[r.readiness_score for r in rows]; missing=Counter(x for r in rows for x in r.missing_context); risks=Counter(x for r in rows for x in r.interpretation_risks); packs=Counter(r.recommended_pack for r in rows)
    summary={"executive_summary":f"{len(rows)} safe Understanding Events analyzed.","total_events_analyzed":len(rows),"average_readiness":round(sum(scores)/len(scores)) if scores else 0,"high_risk_events":sum(r.risk_level=="high" for r in rows),"top_missing_context_patterns":[x for x,_ in missing.most_common(5)],"top_interpretation_risks":[x for x,_ in risks.most_common(5)],"recommended_packs":[x for x,_ in packs.most_common(3)],"quick_wins":["Validate owners, evidence and receiver before advancing"],"pilot_recommendation":f"Start with {packs.most_common(1)[0][0]}" if packs else "Start with a critical-flow audit","raw_stored":False}; report=Report(tenant_id=req.tenant_id,summary=summary); db.add(report); db.commit(); return {"report_id":report.id,**summary}
@app.get("/v1/reports/{report_id}",dependencies=[Depends(authorize)])
def get_report(report_id:str,db:Session=Depends(get_db)):
    report=db.get(Report,report_id)
    if not report: raise HTTPException(404,"Report not found")
    return {"report_id":report.id,**report.summary}
@app.post("/v1/license/activate",dependencies=[Depends(authorize)])
def activate_license(req:LicenseActivate,db:Session=Depends(get_db)):
    tenant=db.get(Tenant,req.tenant_id)
    if not tenant: db.add(Tenant(id=req.tenant_id,name=req.company_name or req.tenant_id))
    lic=License(**req.model_dump()); db.add(lic); db.commit(); return {"license_id":lic.id,**req.model_dump(),"used_events":0,"raw_data_retention":"none"}
@app.get("/v1/license",dependencies=[Depends(authorize)])
def get_license(tenant_id:str,db:Session=Depends(get_db)):
    lic=db.scalar(select(License).where(License.tenant_id==tenant_id));
    if not lic: raise HTTPException(404,"License not found")
    return {"tenant_id":lic.tenant_id,"plan":lic.plan,"active_packs":lic.active_packs,"monthly_event_limit":lic.monthly_event_limit,"used_events":lic.used_events,"privacy_mode":lic.privacy_mode,"deployment_mode":lic.deployment_mode}
@app.get("/v1/usage",dependencies=[Depends(authorize)])
def usage(tenant_id:str,db:Session=Depends(get_db)): return {"tenant_id":tenant_id,"used_events":db.scalar(select(func.count()).select_from(UsageRecord).where(UsageRecord.tenant_id==tenant_id)) or 0,"raw_stored":False}
