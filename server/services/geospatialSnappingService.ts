import type { GeospatialSnapResult, OsmRoadSegment } from '../../src/types/index.ts';
import { BASELINE_OSM_SEGMENTS } from './osmNetworkService.ts';

/**
 * Lightweight Geospatial Point-to-Polyline Snapping Service
 * 
 * Accurately snaps incident GPS coordinates reported by field drivers to the nearest
 * authoritative highway corridor road segment without requiring external PostGIS/GIS servers.
 */

// Haversine distance in meters between two lat/lng coordinates
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from point P to line segment AB
function distanceToSegmentMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): { distanceMeters: number; closestPoint: [number, number] } {
  const dAB = haversineDistanceMeters(aLat, aLng, bLat, bLng);
  if (dAB === 0) {
    return {
      distanceMeters: haversineDistanceMeters(pLat, pLng, aLat, aLng),
      closestPoint: [aLat, aLng],
    };
  }

  // Project point onto line segment using flat-earth approximation locally
  const x1 = aLng, y1 = aLat;
  const x2 = bLng, y2 = bLat;
  const px = pLng, py = pLat;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));

  const closestLat = y1 + t * dy;
  const closestLng = x1 + t * dx;

  return {
    distanceMeters: haversineDistanceMeters(pLat, pLng, closestLat, closestLng),
    closestPoint: [closestLat, closestLng],
  };
}

export class GeospatialSnappingService {
  private segments: OsmRoadSegment[] = BASELINE_OSM_SEGMENTS;

  public setRoadSegments(segments: OsmRoadSegment[]) {
    this.segments = segments;
  }

  public snapCoordinateToRoad(
    lat: number,
    lng: number,
    thresholdMeters = 15000 // 15 km search buffer in mountainous terrain
  ): GeospatialSnapResult {
    let closestSegment: OsmRoadSegment | null = null;
    let minDistance = Infinity;
    let bestSnapPoint: [number, number] = [lat, lng];

    for (const segment of this.segments) {
      const coords = segment.coordinates;
      if (!coords || coords.length < 2) continue;

      for (let i = 0; i < coords.length - 1; i++) {
        const [aLat, aLng] = coords[i];
        const [bLat, bLng] = coords[i + 1];

        const { distanceMeters, closestPoint } = distanceToSegmentMeters(
          lat,
          lng,
          aLat,
          aLng,
          bLat,
          bLng
        );

        if (distanceMeters < minDistance) {
          minDistance = distanceMeters;
          closestSegment = segment;
          bestSnapPoint = closestPoint;
        }
      }
    }

    const isWithinThreshold = minDistance <= thresholdMeters;
    
    // Confidence score: 1.0 within 100m, decaying to 0.5 at 5km, 0.0 at threshold
    let confidence = 0.0;
    if (minDistance <= 100) {
      confidence = 0.98;
    } else if (minDistance <= 1000) {
      confidence = 0.90;
    } else if (minDistance <= 5000) {
      confidence = 0.75;
    } else if (isWithinThreshold) {
      confidence = Math.max(0.2, (1 - minDistance / thresholdMeters) * 0.7);
    }

    return {
      incidentLat: lat,
      incidentLng: lng,
      snappedSegmentId: isWithinThreshold ? closestSegment?.id : undefined,
      snappedRoadName: isWithinThreshold ? closestSegment?.name : undefined,
      highwayRef: isWithinThreshold ? closestSegment?.ref : undefined,
      distanceMeters: Math.round(minDistance),
      confidence: Math.round(confidence * 100) / 100,
      snappedCoordinates: bestSnapPoint,
      isWithinThreshold,
    };
  }
}

export const geospatialSnappingService = new GeospatialSnappingService();
