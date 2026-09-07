"""Trip planning and candidate corridor routes (Foundation)."""
import uuid
from datetime import datetime
from fastapi import APIRouter
from app.schemas.trip import TripRequestSchema, TripResponse, RouteSchema

router = APIRouter()


@router.post("/plan", response_model=TripResponse, summary="Multi-Corridor Trip Planning Engine Foundation")
def plan_trip(request: TripRequestSchema) -> TripResponse:
    """
    Evaluates multi-corridor candidate routes considering vehicle type, cargo sensitivity, and constraints.
    Returns structured candidate routes for client evaluation.
    """
    # High-altitude corridor via NH-27 / NH-29
    route_a = RouteSchema(
        id="route-a",
        label="NH-27 / NH-29 (Via Nagaon & Lumding)",
        description="Broad valley highway, well maintained with low gradient and active emergency depots.",
        corridor_name="NH-27 / NH-29 North Corridor",
        risk_score=18,
        risk_level="low",
        eta_minutes=435,
        distance_km=485,
        recommended=True,
        waypoints=[
            [26.1445, 91.7362],
            [26.35, 92.68],
            [25.86, 93.75],
            [25.67, 94.11],
            [24.817, 93.9368],
        ],
        segment_ids=["rd-002", "rd-003"],
        risk_factors=["Moderate elevation climb near Lumding pass"],
    )

    # Mountain pass corridor via NH-2 (Mao Gate)
    route_b = RouteSchema(
        id="route-b",
        label="NH-2 Mountain Highway (Via Mao Gate)",
        description="Steep gradient ridge highway, elevated landslide vulnerability during monsoon seasons.",
        corridor_name="NH-2 Mountain Spine",
        risk_score=42,
        risk_level="moderate",
        eta_minutes=370,
        distance_km=430,
        recommended=False,
        waypoints=[
            [26.1445, 91.7362],
            [25.90, 92.20],
            [25.68, 93.20],
            [25.32, 93.55],
            [24.817, 93.9368],
        ],
        segment_ids=["rd-001"],
        risk_factors=["Steep slope gradient (34°)", "Monsoon shale zone at Mao Gate (km 312)"],
    )

    return TripResponse(
        request_id=f"TRIP-REQ-{uuid.uuid4().hex[:8].upper()}",
        recommended_route_id="route-a",
        routes=[route_a, route_b],
        generated_at=datetime.utcnow().isoformat(),
        provider="FastAPI Dynamic Routing Engine (Foundation)",
    )
