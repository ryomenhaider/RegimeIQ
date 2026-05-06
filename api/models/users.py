"""Users models - Pydantic models for user management."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


class UserProfile(BaseModel):
    username: str
    plan: str = "trial"
    trial_ends_at: Optional[str] = None
    created_at: str


class UserSettings(BaseModel):
    username: str
    alert_threshold: float = Field(0.75, ge=0.5, le=0.95)
    discord_webhook: Optional[str] = None
    reddit_subs: List[str] = Field(default_factory=list)
    fred_series: List[str] = Field(default_factory=lambda: ["T10Y2Y", "CPIAUCSL", "FEDFUNDS"])
    trends_keywords: List[str] = Field(default_factory=list)
    timezone: str = "UTC"
    default_tab: str = "microstructure"
    layout_config: dict = Field(default_factory=dict)
    notifications: dict = Field(
        default_factory=lambda: {
            "email": True,
            "regime_alerts": True,
            "weekly_summary": False
        }
    )


class SettingsUpdateRequest(BaseModel):
    alert_threshold: Optional[float] = Field(None, ge=0.5, le=0.95)
    discord_webhook: Optional[str] = None
    reddit_subs: Optional[List[str]] = None
    trends_keywords: Optional[List[str]] = None
    fred_series: Optional[List[str]] = None
    timezone: Optional[str] = None
    layout_config: Optional[dict] = None
    default_tab: Optional[str] = None

    @field_validator("reddit_subs", "trends_keywords")
    @classmethod
    def check_max_items(cls, v):
        if v and len(v) > 20:
            raise ValueError("Maximum 20 items allowed")
        return v

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v):
        if v is None:
            return v
        try:
            import pytz
            if v not in pytz.all_timezones:
                raise ValueError("Invalid timezone")
        except ImportError:
            pass
        return v


class AccountUpdateRequest(BaseModel):
    current_password: str
    new_email: Optional[str] = None
    new_password: Optional[str] = Field(None, min_length=8)


class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(..., pattern=r"^DELETE$")
    current_password: str


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserSettingsResponse(BaseModel):
    id: UUID
    user_id: UUID
    watched_symbols: List[str]
    alert_webhook_url: Optional[str] = None
    display_timezone: str
    subreddits: List[str]
    trends_keywords: List[str]
    fred_series: List[str]
    dashboard_layout: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdateSettingsRequestOld(BaseModel):
    watched_symbols: Optional[List[str]] = None
    alert_webhook_url: Optional[str] = None
    display_timezone: Optional[str] = None
    subreddits: Optional[List[str]] = None
    trends_keywords: Optional[List[str]] = None
    fred_series: Optional[List[str]] = None
    dashboard_layout: Optional[dict] = None


class UpdateAccountRequestOld(BaseModel):
    email: Optional[str] = None
    current_password: str
    new_password: Optional[str] = Field(None, min_length=8)


class DeleteAccountRequestOld(BaseModel):
    confirmation: str = Field(..., pattern=r"^DELETE$")


UpdateSettingsRequest = SettingsUpdateRequest
UpdateAccountRequest = AccountUpdateRequest
DeleteAccountRequest = DeleteAccountRequest