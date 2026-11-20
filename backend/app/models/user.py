from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserInDB(BaseModel):
    """User model for database storage."""
    id: Optional[str] = None
    name: str
    email: str
    password_hash: str
    role: str  # admin | manager | engineer | supervisor | analyst
    plant_ids: list[str] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True
