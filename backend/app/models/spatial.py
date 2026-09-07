"""
SQLAlchemy ORM models representing spatial entities for future PostgreSQL + PostGIS deployment.
These models represent the relational and spatial schema targets for future migrations.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class CorridorModel(Base):
    """Corridor master model for regional routes (e.g. NH-2, NH-29, NH-27)."""
    __tablename__ = "corridors"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    from_state = Column(String(64), nullable=False)
    to_state = Column(String(64), nullable=False)
    risk_level = Column(String(32), default="low")
    active_vehicles_count = Column(Integer, default=0)
    incidents_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Future PostGIS geometry:
    # geom = Column(Geometry(geometry_type='LINESTRING', srid=4326))


class RoadSegmentModel(Base):
    """Specific highway/road segments along corridors."""
    __tablename__ = "road_segments"

    id = Column(String(64), primary_key=True, index=True)
    corridor_id = Column(String(64), ForeignKey("corridors.id"), nullable=True)
    name = Column(String(128), nullable=False)
    from_location = Column(String(128), nullable=False)
    to_location = Column(String(128), nullable=False)
    status = Column(String(32), default="open")  # open, caution, high_risk, blocked
    risk_level = Column(String(32), default="low")
    affected_by_incident_id = Column(String(64), nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow)

    # Future PostGIS geometry:
    # geom = Column(Geometry(geometry_type='LINESTRING', srid=4326))


class IncidentModel(Base):
    """Field-reported and sensor-detected incidents (landslides, washouts, etc.)."""
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True, index=True)
    type = Column(String(64), nullable=False)  # landslide, flood, rockfall, etc.
    severity = Column(String(32), default="moderate")  # low, moderate, high, critical
    location_name = Column(String(256), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_source = Column(String(32), default="DEVICE_GPS")
    description = Column(Text, nullable=True)
    reported_by = Column(String(128), nullable=False)
    reported_vehicle_id = Column(String(64), nullable=True)
    reported_at = Column(DateTime, default=datetime.utcnow)
    sync_status = Column(String(32), default="pending_verification")
    
    # Evidence fields
    photo_url = Column(String(512), nullable=True)
    voice_note = Column(Boolean, default=False)
    voice_transcript = Column(Text, nullable=True)
    voice_language = Column(String(64), nullable=True)
    
    # AI and SDMA verification
    ai_analysis = Column(JSON, nullable=True)
    verified_by = Column(String(128), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    affected_route_id = Column(String(64), nullable=True)

    # Future PostGIS point geometry:
    # geom = Column(Geometry(geometry_type='POINT', srid=4326))


class VehicleModel(Base):
    """Fleet vehicle state and spatial tracking."""
    __tablename__ = "vehicles"

    id = Column(String(64), primary_key=True, index=True)
    driver_name = Column(String(128), nullable=False)
    type = Column(String(64), nullable=False)  # Heavy Truck (16T), 4x4 Bolero, etc.
    status = Column(String(32), default="idle")
    risk_level = Column(String(32), default="low")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    origin = Column(String(128), nullable=True)
    destination = Column(String(128), nullable=True)
    cargo_type = Column(String(128), nullable=True)
    planned_route_id = Column(String(64), nullable=True)
    reroute_status = Column(String(32), nullable=True)
    last_seen = Column(DateTime, default=datetime.utcnow)

    # Future PostGIS point geometry:
    # geom = Column(Geometry(geometry_type='POINT', srid=4326))


class GodownModel(Base):
    """Strategic emergency buffer godowns/warehouses across NER."""
    __tablename__ = "godowns"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    location_label = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    available_stock = Column(Integer, default=100)
    suitable_cargo_types = Column(JSON, nullable=True)

    # Future PostGIS point geometry:
    # geom = Column(Geometry(geometry_type='POINT', srid=4326))


class EmergencyPickupModel(Base):
    """Emergency cargo storage and diversion requests."""
    __tablename__ = "emergency_pickups"

    id = Column(String(64), primary_key=True, index=True)
    vehicle_id = Column(String(64), ForeignKey("vehicles.id"), nullable=False)
    godown_id = Column(String(64), ForeignKey("godowns.id"), nullable=False)
    driver_name = Column(String(128), nullable=False)
    cargo_type = Column(String(128), nullable=False)
    destination = Column(String(128), nullable=False)
    status = Column(String(32), default="requested")  # requested, approved, declined, dispatched
    quantity = Column(Integer, default=20)
    reason = Column(Text, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    contractor_name = Column(String(128), nullable=True)
