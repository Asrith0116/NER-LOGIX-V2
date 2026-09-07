"""Road network and segment status routes (Foundation)."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas.road import RoadSegmentSchema, RoadSegmentUpdate

router = APIRouter()

FOUNDATION_ROAD_SEGMENTS: List[dict] = [
    {
        "id": "rd-001",
        "name": "NH-2 Mao Gate Mountain Cut (km 308-320)",
        "from_location": "Kohima",
        "to_location": "Mao Gate / Imphal Border",
        "status": "open",
        "risk_level": "low",
        "affected_by_incident_id": None,
        "last_updated": datetime.utcnow(),
    },
    {
        "id": "rd-002",
        "name": "NH-27 Nagaon - Lumding Valley Pass",
        "from_location": "Nagaon",
        "to_location": "Lumding",
        "status": "open",
        "risk_level": "low",
        "affected_by_incident_id": None,
        "last_updated": datetime.utcnow(),
    },
    {
        "id": "rd-003",
        "name": "NH-29 Lumding - Dimapur Corridor",
        "from_location": "Lumding",
        "to_location": "Dimapur",
        "status": "open",
        "risk_level": "low",
        "affected_by_incident_id": None,
        "last_updated": datetime.utcnow(),
    },
]


@router.get("", response_model=List[RoadSegmentSchema], summary="List Road Network Segments")
def list_road_segments(status: Optional[str] = None) -> List[RoadSegmentSchema]:
    """Retrieve all corridor road segments and their live passable status."""
    segments = FOUNDATION_ROAD_SEGMENTS
    if status:
        segments = [s for s in segments if s["status"] == status]
    return [RoadSegmentSchema(**s) for s in segments]


@router.patch("/{segment_id}", response_model=RoadSegmentSchema, summary="Update Road Segment Status")
def update_road_segment(segment_id: str, patch: RoadSegmentUpdate) -> RoadSegmentSchema:
    """Update passable status or risk level for a road segment upon verification."""
    seg = next((s for s in FOUNDATION_ROAD_SEGMENTS if s["id"] == segment_id), None)
    if not seg:
        raise HTTPException(status_code=404, detail=f"Road segment {segment_id} not found")

    update_data = patch.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        seg[key] = val
    seg["last_updated"] = datetime.utcnow()
    return RoadSegmentSchema(**seg)
