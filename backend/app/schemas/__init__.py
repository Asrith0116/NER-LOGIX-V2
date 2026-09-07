"""Pydantic schemas for request validation and response formatting."""
from .health import HealthResponse
from .vehicle import VehicleSchema, VehicleCreate, VehicleUpdate
from .trip import TripRequestSchema, RouteSchema, TripResponse
from .incident import IncidentSchema, IncidentCreate, IncidentVerifyRequest
from .road import RoadSegmentSchema, RoadSegmentUpdate
from .weather import WeatherObservationSchema, RegionalWeatherResponse
from .emergency import EmergencyPickupSchema, EmergencyPickupCreate, EmergencyPickupDecision

__all__ = [
    "HealthResponse",
    "VehicleSchema",
    "VehicleCreate",
    "VehicleUpdate",
    "TripRequestSchema",
    "RouteSchema",
    "TripResponse",
    "IncidentSchema",
    "IncidentCreate",
    "IncidentVerifyRequest",
    "RoadSegmentSchema",
    "RoadSegmentUpdate",
    "WeatherObservationSchema",
    "RegionalWeatherResponse",
    "EmergencyPickupSchema",
    "EmergencyPickupCreate",
    "EmergencyPickupDecision",
]
