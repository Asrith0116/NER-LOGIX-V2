"""Weather observation schemas."""
from typing import Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class WeatherObservationSchema(BaseModel):
    location_name: str
    lat: float
    lng: float
    temperature_c: float
    precipitation_mm: float
    precipitation_intensity: str = Field(default="none", description="none, light, moderate, heavy, torrential")
    rainfall_category: str = Field(default="none")
    wind_speed_kmh: float
    weather_code: int = 0
    weather_description: str
    forecast_24h_mm: float
    observed_at: datetime
    source: str = "Open-Meteo / Fallback"
    availability_state: str = "live"


class RegionalWeatherResponse(BaseModel):
    observations: Dict[str, WeatherObservationSchema]
    is_spike_active: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)
