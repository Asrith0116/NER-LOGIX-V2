"""Road segment schemas."""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class RoadSegmentBase(BaseModel):
    id: str
    name: str
    from_location: str
    to_location: str
    status: str = Field(default="open", description="open, caution, high_risk, blocked")
    risk_level: str = Field(default="low", description="low, moderate, high, blocked")
    affected_by_incident_id: Optional[str] = None


class RoadSegmentUpdate(BaseModel):
    status: Optional[str] = None
    risk_level: Optional[str] = None
    affected_by_incident_id: Optional[str] = None


class RoadSegmentSchema(RoadSegmentBase):
    last_updated: datetime

    class Config:
        from_attributes = True
