from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    virro_env: str = "development"
    virro_api_key: str = ""
    database_url: str = "sqlite:///./virro-core.db"
    cors_origins: str = "https://www.virro.app"
    log_level: str = "INFO"
    safe_output_retention_days: int = 90
    aggregate_patterns_retention_days: int = 365
    audit_logs_retention_days: int = 365

    @property
    def origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

settings = Settings()
