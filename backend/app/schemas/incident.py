"""Incident schemas for field hazard reports and SDMA triage."""
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class IncidentBase(BaseModel):
    type: str = Field(..., description="Hazard type (e.g. landslide, flood, rockfall, road_washout)")
    severity: str = Field(default="moderate", description="low, moderate, high, critical")
    location: List[float] = Field(..., description="[lat, lng] coordinates")
    location_name: str
    location_source: str = Field(default="DEVICE_GPS", description="DEVICE_GPS, SIMULATED, FALLBACK")
    description: str
    reported_by: str
    reported_vehicle_id: Optional[str] = None
    affected_route_id: Optional[str] = None
    photo_url: Optional[str] = None
    voice_note: bool = False
    voice_transcript: Optional[str] = None
    voice_language: Optional[str] = None


class IncidentCreate(IncidentBase):
    id: Optional[str] = None


class IncidentVerifyRequest(BaseModel):
    approved: bool
    verified_by: str = Field(default="SDMA Command Officer")
    notes: Optional[str] = None


class IncidentSchema(IncidentBase):
    id: str
    reported_at: datetime
    sync_status: str = Field(default="pending_verification", description="local_pending, synced, pending_verification, verified, rejected")
    ai_analysis: Optional[Dict[str, Any]] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True
