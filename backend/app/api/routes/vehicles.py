"""Vehicle routes (Foundation)."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException
from app.schemas.vehicle import VehicleSchema, VehicleUpdate

router = APIRouter()

# Structured foundation data for fleet verification
FOUNDATION_VEHICLES: List[dict] = [
    {
        "id": "AS-01-J-4422",
        "driver_name": "Arjun Baruah",
        "type": "Heavy Truck (16T)",
        "status": "idle",
        "risk_level": "low",
        "location": [26.1445, 91.7362],
        "origin": "Guwahati",
        "destination": "Imphal",
        "cargo_type": "Pharmaceutical Supplies",
        "planned_route_id": "route-a",
        "assigned_corridor_id": "nh-27-29",
        "reroute_status": "none",
        "last_seen": datetime.utcnow(),
    },
    {
        "id": "MN-04-B-1121",
        "driver_name": "Nongmaithem Singh",
        "type": "4x4 Bolero Pickup",
        "status": "on_route",
        "risk_level": "low",
        "location": [25.75, 93.85],
        "origin": "Guwahati",
        "destination": "Imphal",
        "cargo_type": "Fresh Produce / Perishables",
        "planned_route_id": "route-b",
        "assigned_corridor_id": "nh-2",
        "reroute_status": "none",
        "last_seen": datetime.utcnow(),
    },
    {
        "id": "NL-02-C-3391",
        "driver_name": "Kevi Angami",
        "type": "Heavy Truck (16T)",
        "status": "on_route",
        "risk_level": "low",
        "location": [25.34, 93.60],
        "origin": "Dimapur",
        "destination": "Kohima",
        "cargo_type": "Construction Cement",
        "planned_route_id": "route-b",
        "assigned_corridor_id": "nh-2",
        "reroute_status": "none",
        "last_seen": datetime.utcnow(),
    },
    {
        "id": "TR-01-A-7788",
        "driver_name": "Bikash Debbarma",
        "type": "Medium Carrier (8T)",
        "status": "on_route",
        "risk_level": "low",
        "location": [24.82, 92.80],
        "origin": "Silchar",
        "destination": "Agartala",
        "cargo_type": "Essential Food Grains",
        "planned_route_id": "route-c",
        "assigned_corridor_id": "nh-8",
        "reroute_status": "none",
        "last_seen": datetime.utcnow(),
    },
]


@router.get("", response_model=List[VehicleSchema], summary="List Fleet Vehicles")
def list_vehicles(status: Optional[str] = None) -> List[VehicleSchema]:
    """Retrieve all vehicles or filter by current operational status."""
    vehicles = FOUNDATION_VEHICLES
    if status:
        vehicles = [v for v in vehicles if v["status"] == status]
    return [VehicleSchema(**v) for v in vehicles]


@router.get("/{vehicle_id}", response_model=VehicleSchema, summary="Get Vehicle by ID")
def get_vehicle(vehicle_id: str) -> VehicleSchema:
    """Retrieve telemetry and operational state for a specific vehicle."""
    vehicle = next((v for v in FOUNDATION_VEHICLES if v["id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    return VehicleSchema(**vehicle)


@router.patch("/{vehicle_id}", response_model=VehicleSchema, summary="Update Vehicle Telemetry (Foundation)")
def update_vehicle(vehicle_id: str, patch: VehicleUpdate) -> VehicleSchema:
    """Update vehicle telemetry, location, or reroute status."""
    vehicle = next((v for v in FOUNDATION_VEHICLES if v["id"] == vehicle_id), None)
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
    
    update_data = patch.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        vehicle[key] = val
    vehicle["last_seen"] = datetime.utcnow()
    return VehicleSchema(**vehicle)
