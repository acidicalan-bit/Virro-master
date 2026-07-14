from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, false
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

def now() -> datetime: return datetime.now(timezone.utc)
def uid() -> str: return str(uuid4())

class Tenant(Base):
    __tablename__="tenants"; id: Mapped[str]=mapped_column(String,primary_key=True,default=uid); name: Mapped[str]=mapped_column(String); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class License(Base):
    __tablename__="licenses"; id: Mapped[str]=mapped_column(String,primary_key=True,default=uid); tenant_id: Mapped[str]=mapped_column(ForeignKey("tenants.id"),index=True); company_name: Mapped[str]=mapped_column(String,default=""); plan: Mapped[str]=mapped_column(String,default="audit"); active_packs: Mapped[list]=mapped_column(JSON,default=list); monthly_event_limit: Mapped[int]=mapped_column(Integer,default=100); used_events: Mapped[int]=mapped_column(Integer,default=0); privacy_mode: Mapped[str]=mapped_column(String,default="safe"); deployment_mode: Mapped[str]=mapped_column(String,default="saas"); raw_data_retention: Mapped[str]=mapped_column(String,default="none"); safe_output_retention_days: Mapped[int]=mapped_column(Integer,default=90); aggregate_patterns_retention_days: Mapped[int]=mapped_column(Integer,default=365); audit_logs_retention_days: Mapped[int]=mapped_column(Integer,default=365); valid_until: Mapped[str|None]=mapped_column(String,nullable=True)
class User(Base):
    __tablename__="users"; id: Mapped[str]=mapped_column(String,primary_key=True,default=uid); tenant_id: Mapped[str]=mapped_column(ForeignKey("tenants.id"),index=True); role: Mapped[str]=mapped_column(String,default="member"); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Event(Base):
    __tablename__="events"; __table_args__=(CheckConstraint("raw_stored = false",name="ck_events_raw_stored_false"),UniqueConstraint("tenant_id","idempotency_key",name="uq_event_tenant_idempotency")); id: Mapped[str]=mapped_column(String,primary_key=True,default=uid); tenant_id: Mapped[str]=mapped_column(String,index=True); event_type: Mapped[str]=mapped_column(String); source_type: Mapped[str]=mapped_column(String); privacy_mode: Mapped[str]=mapped_column(String,default="safe"); fingerprint: Mapped[str]=mapped_column(String,index=True); idempotency_key: Mapped[str|None]=mapped_column(String,nullable=True); raw_stored: Mapped[bool]=mapped_column(Boolean,default=False,server_default=false(),nullable=False); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Analysis(Base):
    __tablename__="analyses"; id: Mapped[str]=mapped_column(String,primary_key=True,default=uid); event_id: Mapped[str]=mapped_column(ForeignKey("events.id"),index=True); tenant_id: Mapped[str]=mapped_column(String,index=True); readiness_score: Mapped[int]=mapped_column(Integer); risk_level: Mapped[str]=mapped_column(String); missing_context: Mapped[list]=mapped_column(JSON,default=list); interpretation_risks: Mapped[list]=mapped_column(JSON,default=list); questions: Mapped[list]=mapped_column(JSON,default=list); recommended_pack: Mapped[str]=mapped_column(String); next_action: Mapped[str]=mapped_column(String); safe_output: Mapped[dict]=mapped_column(JSON,default=dict); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Report(Base):
    __tablename__="reports"; id: Mapped[str]=mapped_column(String,primary_key=True,default=uid); tenant_id: Mapped[str]=mapped_column(String,index=True); summary: Mapped[dict]=mapped_column(JSON,default=dict); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class UsageRecord(Base):
    __tablename__="usage_records"; id: Mapped[str]=mapped_column(String,primary_key=True,default=uid); tenant_id: Mapped[str]=mapped_column(String,index=True); event_type: Mapped[str]=mapped_column(String); count: Mapped[int]=mapped_column(Integer,default=1); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class AuditLog(Base):
    __tablename__="audit_logs"; id: Mapped[str]=mapped_column(String,primary_key=True,default=uid); request_id: Mapped[str]=mapped_column(String,index=True); tenant_id: Mapped[str]=mapped_column(String,index=True); endpoint: Mapped[str]=mapped_column(String); status: Mapped[str]=mapped_column(String); processing_time_ms: Mapped[int]=mapped_column(Integer); event_type: Mapped[str]=mapped_column(String); privacy_mode: Mapped[str]=mapped_column(String,default="safe"); raw_stored: Mapped[bool]=mapped_column(Boolean,default=False); masking_applied: Mapped[bool]=mapped_column(Boolean,default=True); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
