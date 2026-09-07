"""Health check route."""
from datetime import datetime
from fastapi import APIRouter
from app.core.config import settings
from app.db.session import is_database_connected
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="System Health & Connectivity Probe")
def get_health() -> HealthResponse:
    """
    Returns the real-time operational status of the FastAPI backend service.
    This endpoint is used by the frontend API boundary to detect live backend connectivity.
    """
    db_status = "connected" if is_database_connected() else "foundation_unconnected"

    return HealthResponse(
        status="ok",
        service="ner-logix-api",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database=db_status,
        timestamp=datetime.utcnow(),
        capabilities=[
            "fastapi_core_service",
            "health_probe",
            "vehicle_foundation",
            "trip_foundation",
            "incident_foundation",
            "road_foundation",
            "weather_foundation",
            "emergency_logistics_foundation",
            "postgresql_postgis_ready_schemas",
        ],
        metadata={
            "api_version": settings.VERSION,
            "cors_allowed_origins": settings.cors_origin_list,
            "architecture": "FastAPI + Pydantic + PostGIS Ready",
            "sih_project_code": "SIH26002",
        },
    )
