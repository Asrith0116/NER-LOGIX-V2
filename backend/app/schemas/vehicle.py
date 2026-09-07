"""Vehicle schemas for fleet tracking and status management."""
from typing import Optional, List, Tuple
from datetime import datetime
from pydantic import BaseModel, Field


class VehicleBase(BaseModel):
    id: str = Field(..., description="Vehicle registration identifier (e.g. AS-01-J-4422)")
    driver_name: str = Field(..., description="Name of the assigned driver")
    type: str = Field(..., description="Vehicle classification (e.g. Heavy Truck (16T), 4x4 Bolero Pickup)")
    status: str = Field(default="idle", description="Current status: idle, on_route, disrupted, offline, emergency_pickup")
    risk_level: str = Field(default="low", description="Assessed risk level: low, moderate, high, blocked")
    location: List[float] = Field(..., description="[lat, lng] geographic coordinate")
    origin: Optional[str] = None
    destination: Optional[str] = None
    cargo_type: Optional[str] = None
    planned_route_id: Optional[str] = None
    assigned_corridor_id: Optional[str] = None
    reroute_status: Optional[str] = Field(default="none", description="none, recommended, active, no_alternative")
    reroute_reason: Optional[str] = None
    recommended_godown_id: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    status: Optional[str] = None
    risk_level: Optional[str] = None
    location: Optional[List[float]] = None
    destination: Optional[str] = None
    reroute_status: Optional[str] = None
    reroute_reason: Optional[str] = None


class VehicleSchema(VehicleBase):
    last_seen: Optional[datetime] = None
    impact_reason: Optional[str] = None

    class Config:
        from_attributes = True
