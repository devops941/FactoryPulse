from typing import Any
from pydantic import BaseModel, Field


class ResponseEnvelope(BaseModel):
    """Standard API response envelope."""

    data: Any
    message: str = "success"


class ErrorDetail(BaseModel):
    """Error detail object."""

    code: str
    message: str
    details: list[dict] = Field(default_factory=list)
    request_id: str = ""


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: ErrorDetail


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    page: int
    limit: int
    total: int
    pages: int
