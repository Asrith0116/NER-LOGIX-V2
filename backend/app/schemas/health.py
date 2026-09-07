"""Health schema for API health monitoring."""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Health status string (ok / degraded)")
    service: str = Field(default="ner-logix-api", description="Service identifier")
    version: str = Field(default="1.0.0", description="API version")
    environment: str = Field(default="development", description="Current execution environment")
    database: str = Field(default="foundation_unconnected", description="Database connection status (connected / foundation_unconnected)")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of the health check")
    capabilities: List[str] = Field(
        default_factory=lambda: [
            "health_check",
            "vehicle_foundation",
            "trip_foundation",
            "incident_foundation",
            "road_foundation",
            "weather_foundation",
            "emergency_logistics_foundation",
        ],
        description="Available foundational capabilities",
    )
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional server metadata")
