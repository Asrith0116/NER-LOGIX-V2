"""Trip and route candidate schemas."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LocationSchema(BaseModel):
    name: str
    short_name: str
    lat: float
    lng: float
    district: Optional[str] = None
    state: Optional[str] = None


class OperationalConstraintsSchema(BaseModel):
    require_cold_chain: bool = False
    avoid_high_risk_corridors: bool = True
    max_delay_tolerance: str = Field(default="moderate", description="strict, moderate, flexible")
    risk_tolerance: str = Field(default="balanced", description="conservative, balanced, aggressive")
    avoid_unpaved_sections: bool = False


class TripRequestSchema(BaseModel):
    origin: LocationSchema
    destination: LocationSchema
    vehicle_id: str
    vehicle_type: str
    driver_name: str
    cargo_category: str
    cargo_sensitivity: str = Field(default="medium", description="low, medium, high, critical")
    priority: str = Field(default="standard", description="standard, high, urgent, emergency")
    departure_window: str = Field(default="immediate", description="immediate, within_2h, morning_clear")
    constraints: OperationalConstraintsSchema = Field(default_factory=OperationalConstraintsSchema)


class RouteRiskSegmentSchema(BaseModel):
    from_coord: List[float]
    to_coord: List[float]
    risk_level: str
    reason: Optional[str] = None


class RouteSchema(BaseModel):
    id: str
    label: str
    description: str
    corridor_name: Optional[str] = None
    risk_score: int
    risk_level: str
    eta_minutes: int
    distance_km: int
    recommended: bool
    waypoints: List[List[float]]
    segment_ids: Optional[List[str]] = None
    risk_segments: Optional[List[RouteRiskSegmentSchema]] = None
    risk_factors: Optional[List[str]] = None


class TripResponse(BaseModel):
    request_id: str
    recommended_route_id: str
    routes: List[RouteSchema]
    generated_at: str
    provider: str = "FastAPI Trip Engine (Foundation)"


class ComputeRoutingRequest(BaseModel):
    origin: LocationSchema
    destination: LocationSchema
    vehicle_type: Optional[str] = "10-wheeler"
    cargo_category: Optional[str] = "general_cargo"
    cargo_sensitivity: Optional[str] = "medium"
    priority: Optional[str] = "standard"
    constraints: Optional[OperationalConstraintsSchema] = None


class ComputeRoutingResponse(BaseModel):
    provider_status: str = Field(description="google_live, fallback_local, or error")
    candidates_count: int
    routes: List[RouteSchema]
    message: str

