from typing import Literal
from pydantic import BaseModel, Field

EventType = Literal["handoff","meeting","message","ticket","document","ai_instruction","process","design_brief","data_request","support_signal","sales_to_delivery","knowledge_transfer"]
class AnalyzeRequest(BaseModel):
    tenant_id: str = Field(min_length=1,max_length=100); event_type: EventType; source_type: Literal["manual","api","connector","webhook"]="manual"; content: str = Field(min_length=1,max_length=100000); privacy_mode: Literal["safe"]="safe"; store_raw: bool=False; pack_hint: str|None=None; client_name: str|None=None; company_name: str|None=None
class PrivacyRequest(BaseModel):
    content: str = Field(min_length=1,max_length=100000); privacy_mode: Literal["safe"]="safe"; client_name: str|None=None; company_name: str|None=None
class AnalysisResponse(BaseModel):
    event_id: str|None=None; readiness_score: int; risk_level: Literal["low","medium","high"]; missing_context: list[str]; interpretation_risks: list[str]; critical_questions: list[str]; recommended_pack: str; next_action: str; safe_output: dict; raw_stored: bool=False
class LicenseActivate(BaseModel):
    tenant_id: str; company_name: str=""; plan: Literal["audit","department_pack","multi_pack_pilot","enterprise_layer"]="audit"; active_packs: list[str]=[]; monthly_event_limit: int=100; privacy_mode: Literal["safe"]="safe"; deployment_mode: Literal["saas","hybrid","private"]="saas"; raw_data_retention: Literal["none"]="none"; safe_output_retention_days: int=90; aggregate_patterns_retention_days: int=365; audit_logs_retention_days: int=365; valid_until: str|None=None
class ReportRequest(BaseModel): tenant_id: str
