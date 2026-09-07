"""Emergency logistics and godown buffer pickup schemas."""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class GodownSchema(BaseModel):
    id: str
    name: str
    location_label: str
    location: List[float]
    suitable_cargo_types: List[str]
    available_stock: int


class EmergencyPickupCreate(BaseModel):
    vehicle_id: str
    driver_name: str
    cargo_type: str
    destination: str
    godown_id: str
    godown_name: str
    quantity: int = 20
    reason: str = "No viable alternate highway corridor from current position."


class EmergencyPickupDecision(BaseModel):
    approved: bool
    contractor_name: str = "North East Logistics Contractor"
    notes: Optional[str] = None


class EmergencyPickupSchema(BaseModel):
    id: str
    vehicle_id: str
    driver_name: str
    cargo_type: str
    destination: str
    godown_id: str
    godown_name: str
    status: str = Field(default="requested", description="requested, approved, declined, dispatched")
    quantity: int = 20
    reason: str
    requested_at: datetime
    approved_at: Optional[datetime] = None
    dispatched_at: Optional[datetime] = None
    contractor_name: Optional[str] = None
    destination_notified: bool = False
