"""Emergency logistics and godown buffer fallback routes (Foundation)."""
from typing import List, Optional
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas.emergency import (
    GodownSchema,
    EmergencyPickupSchema,
    EmergencyPickupCreate,
    EmergencyPickupDecision,
)

router = APIRouter()

FOUNDATION_GODOWNS: List[dict] = [
    {
        "id": "gdn-dimapur",
        "name": "Dimapur Central Emergency Godown (MDoNER / FCI)",
        "location_label": "Dimapur Industrial Area, Nagaland",
        "location": [25.90, 93.72],
        "suitable_cargo_types": ["cement", "perishables", "pharmaceuticals", "food grains"],
        "available_stock": 140,
    },
    {
        "id": "gdn-nagaon",
        "name": "Nagaon Valley Logistics Hub",
        "location_label": "Nagaon Bypass, Assam",
        "location": [26.34, 92.68],
        "suitable_cargo_types": ["perishables", "pharmaceuticals", "fmcg"],
        "available_stock": 210,
    },
]

FOUNDATION_PICKUP_REQUESTS: List[dict] = []


@router.get("/godowns", response_model=List[GodownSchema], summary="List Strategic Emergency Buffer Godowns")
def list_godowns() -> List[GodownSchema]:
    """Retrieve strategic emergency storage depots across the NER corridor."""
    return [GodownSchema(**g) for g in FOUNDATION_GODOWNS]


@router.get("/requests", response_model=List[EmergencyPickupSchema], summary="List Emergency Pickup Requests")
def list_pickup_requests() -> List[EmergencyPickupSchema]:
    """Retrieve all emergency cargo diversion and contractor buffer requests."""
    return [EmergencyPickupSchema(**r) for r in FOUNDATION_PICKUP_REQUESTS]


@router.post("/requests", response_model=EmergencyPickupSchema, summary="Submit Emergency Cargo Diversion Request")
def create_pickup_request(payload: EmergencyPickupCreate) -> EmergencyPickupSchema:
    """Submit request for emergency stock offload at strategic godown when all corridors are blocked."""
    req_id = f"EPK-{uuid.uuid4().hex[:6].upper()}"
    new_request = {
        **payload.model_dump(),
        "id": req_id,
        "status": "requested",
        "requested_at": datetime.utcnow(),
        "approved_at": None,
        "dispatched_at": None,
        "contractor_name": None,
        "destination_notified": False,
    }
    FOUNDATION_PICKUP_REQUESTS.insert(0, new_request)
    return EmergencyPickupSchema(**new_request)


@router.post("/requests/{request_id}/decision", response_model=EmergencyPickupSchema, summary="Contractor Decision")
def decide_pickup_request(request_id: str, decision: EmergencyPickupDecision) -> EmergencyPickupSchema:
    """Contractor approval/declination for emergency warehouse space and buffer fulfillment."""
    req = next((r for r in FOUNDATION_PICKUP_REQUESTS if r["id"] == request_id), None)
    if not req:
        raise HTTPException(status_code=404, detail=f"Request {request_id} not found")

    now = datetime.utcnow()
    if decision.approved:
        req["status"] = "dispatched"
        req["approved_at"] = now
        req["dispatched_at"] = now
        req["contractor_name"] = decision.contractor_name
        req["destination_notified"] = True
    else:
        req["status"] = "declined"
        req["contractor_name"] = decision.contractor_name

    return EmergencyPickupSchema(**req)
