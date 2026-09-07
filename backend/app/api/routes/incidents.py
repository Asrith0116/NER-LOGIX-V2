"""Incident and hazard routes (Foundation)."""
from typing import List, Optional
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas.incident import IncidentSchema, IncidentCreate, IncidentVerifyRequest

router = APIRouter()

# Structured foundation incident store
FOUNDATION_INCIDENTS: List[dict] = [
    {
        "id": "INC-2026-001",
        "type": "landslide",
        "severity": "critical",
        "location": [25.32, 93.55],
        "location_name": "NH-2 near Mao Gate, km 312",
        "location_source": "DEVICE_GPS",
        "description": "Slope collapse following continuous rainfall. Both carriageways blocked by shale debris.",
        "reported_by": "Arjun Baruah (Field Driver)",
        "reported_vehicle_id": "AS-01-J-4422",
        "reported_at": datetime.utcnow(),
        "sync_status": "pending_verification",
        "photo_url": None,
        "voice_note": True,
        "voice_transcript": "Bhal boroxun hoi ase, rasta bondo hoi gose Mao Gateor osorot.",
        "voice_language": "Assamese",
        "affected_route_id": "route-b",
    }
]


@router.get("", response_model=List[IncidentSchema], summary="List Field Incidents")
def list_incidents(sync_status: Optional[str] = None) -> List[IncidentSchema]:
    """List all reported field hazards, optionally filtered by verification status."""
    incidents = FOUNDATION_INCIDENTS
    if sync_status:
        incidents = [i for i in incidents if i["sync_status"] == sync_status]
    return [IncidentSchema(**i) for i in incidents]


@router.post("", response_model=IncidentSchema, summary="Submit New Field Hazard Report")
def create_incident(payload: IncidentCreate) -> IncidentSchema:
    """Submit a field incident report with optional audio transcript and GPS coordinates."""
    inc_id = payload.id or f"INC-2026-{uuid.uuid4().hex[:6].upper()}"
    new_record = {
        **payload.model_dump(),
        "id": inc_id,
        "reported_at": datetime.utcnow(),
        "sync_status": "pending_verification",
        "ai_analysis": {
            "detectedLanguage": payload.voice_language or "English",
            "hazardCategory": payload.type,
            "estimatedSeverity": payload.severity,
            "roadImpact": "fully_blocked" if payload.severity in ["high", "critical"] else "caution",
            "confidenceScore": 0.94,
            "recommendedAction": "Immediate SDMA Verification and Fleet Rerouting",
            "provider": "FastAPI Triage Intelligence (Foundation)",
        },
    }
    FOUNDATION_INCIDENTS.insert(0, new_record)
    return IncidentSchema(**new_record)


@router.post("/{incident_id}/verify", response_model=IncidentSchema, summary="SDMA Human-in-the-Loop Verification")
def verify_incident(incident_id: str, decision: IncidentVerifyRequest) -> IncidentSchema:
    """Verify or reject a field hazard report with officer authorization."""
    incident = next((i for i in FOUNDATION_INCIDENTS if i["id"] == incident_id), None)
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    incident["sync_status"] = "verified" if decision.approved else "rejected"
    incident["verified_by"] = decision.verified_by
    incident["verified_at"] = datetime.utcnow()
    return IncidentSchema(**incident)
