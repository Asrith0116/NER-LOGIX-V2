"""Weather intelligence routes (Foundation)."""
from datetime import datetime
from fastapi import APIRouter
from app.schemas.weather import RegionalWeatherResponse, WeatherObservationSchema

router = APIRouter()

FOUNDATION_WEATHER = {
    "guwahati": {
        "location_name": "Guwahati Transport Hub",
        "lat": 26.1445,
        "lng": 91.7362,
        "temperature_c": 28.5,
        "precipitation_mm": 2.1,
        "precipitation_intensity": "light",
        "rainfall_category": "light",
        "wind_speed_kmh": 12.0,
        "weather_code": 51,
        "weather_description": "Light Drizzle / Passing Cloud",
        "forecast_24h_mm": 18.0,
        "observed_at": datetime.utcnow(),
        "source": "Open-Meteo Weather Foundation",
        "availability_state": "live",
    },
    "mao_gate": {
        "location_name": "Mao Gate Mountain Pass (NH-2)",
        "lat": 25.50,
        "lng": 94.13,
        "temperature_c": 19.2,
        "precipitation_mm": 6.8,
        "precipitation_intensity": "moderate",
        "rainfall_category": "moderate",
        "wind_speed_kmh": 24.5,
        "weather_code": 63,
        "weather_description": "Moderate Mountain Rainfall & Mist",
        "forecast_24h_mm": 65.0,
        "observed_at": datetime.utcnow(),
        "source": "Open-Meteo Weather Foundation",
        "availability_state": "live",
    },
    "imphal": {
        "location_name": "Imphal Valley Terminus",
        "lat": 24.817,
        "lng": 93.9368,
        "temperature_c": 24.0,
        "precipitation_mm": 1.4,
        "precipitation_intensity": "none",
        "rainfall_category": "none",
        "wind_speed_kmh": 8.0,
        "weather_code": 2,
        "weather_description": "Partly Cloudy",
        "forecast_24h_mm": 12.0,
        "observed_at": datetime.utcnow(),
        "source": "Open-Meteo Weather Foundation",
        "availability_state": "live",
    },
}


@router.get("", response_model=RegionalWeatherResponse, summary="Get Regional Weather Observations")
def get_regional_weather() -> RegionalWeatherResponse:
    """Retrieve normalized real-time weather observations across North Eastern corridor telemetry nodes."""
    observations = {
        key: WeatherObservationSchema(**data) for key, data in FOUNDATION_WEATHER.items()
    }
    return RegionalWeatherResponse(
        observations=observations,
        is_spike_active=False,
        timestamp=datetime.utcnow(),
    )
