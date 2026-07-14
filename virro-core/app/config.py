import json
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    virro_env: str = "development"
    virro_tenant_api_keys: str = "{}"
    virro_fingerprint_key: str = ""
    database_url: str = "sqlite:///./virro-core.db"
    cors_origins: str = "https://www.virro.app"
    log_level: str = "INFO"
    safe_output_retention_days: int = 90
    aggregate_patterns_retention_days: int = 365
    audit_logs_retention_days: int = 365
    rate_limit_per_api_key: int = 120
    rate_limit_per_tenant: int = 120
    rate_limit_per_ip: int = 240
    rate_limit_window_seconds: int = 60

    @property
    def origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def tenant_api_keys(self) -> dict[str, str]:
        try:
            parsed = json.loads(self.virro_tenant_api_keys)
        except json.JSONDecodeError:
            return {}
        return {str(tenant): str(key) for tenant, key in parsed.items() if tenant and key}

settings = Settings()
