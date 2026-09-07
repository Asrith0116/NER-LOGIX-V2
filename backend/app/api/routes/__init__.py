"""API router aggregations."""
from fastapi import APIRouter
from .health import router as health_router
from .vehicles import router as vehicles_router
from .trips import router as trips_router
from .incidents import router as incidents_router
from .roads import router as roads_router
from .weather import router as weather_router
from .emergency_logistics import router as emergency_router

api_router = APIRouter()

# Core health endpoint mounted at /api/v1 as well as root /health
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(vehicles_router, prefix="/vehicles", tags=["Vehicles"])
api_router.include_router(trips_router, prefix="/trips", tags=["Trips & Routing"])
api_router.include_router(incidents_router, prefix="/incidents", tags=["Incidents & Hazards"])
api_router.include_router(roads_router, prefix="/roads", tags=["Road Network"])
api_router.include_router(weather_router, prefix="/weather", tags=["Weather Intelligence"])
api_router.include_router(emergency_router, prefix="/emergency-logistics", tags=["Emergency Logistics"])
