from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"
    allowed_origins: str = "http://localhost:3000"

    # Introductions
    matchmaker_secret: str = ""  # required header for POST /matchmaker/run
    intro_min_score: float = 60.0  # below this, no intro beats a bad one
    intro_ttl_hours: int = 24  # time each side has to respond
    intro_method: str = "greedy"  # or "blossom"; see scripts/eval_matchmaker.py
    learn_offsets: bool = True  # revealed-preference offsets; unproven, see matchmaker.py

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
