import type { Incident, IncidentCorrelationInfo } from '@/types';

/**
 * Calculates geographical distance between two coordinates in kilometers using Haversine formula
 */
function getGeoDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371; // Earth radius in km
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

/**
 * Correlates incident reports across spatial proximity, hazard similarity, and road status contradictions
 */
export function correlateIncidents(incidents: Incident[]): Incident[] {
  return incidents.map((current, idx) => {
    const corroboratingIds: string[] = [];
    let isConflicting = false;
    let conflictReason: string | undefined = undefined;

    for (let i = 0; i < incidents.length; i++) {
      if (i === idx) continue;
      const other = incidents[i];

      const distanceKm = getGeoDistanceKm(current.location, other.location);
      const isNearby = distanceKm <= 35; // Within 35 km corridor radius
      const isSameCorridor =
        Boolean(current.affectedRouteId && current.affectedRouteId === other.affectedRouteId) ||
        (Boolean(current.locationName) &&
          Boolean(other.locationName) &&
          current.locationName.slice(0, 4).toLowerCase() === other.locationName.slice(0, 4).toLowerCase());

      if (isNearby || isSameCorridor) {
        // Check for corroborating reports (similar hazard or both reporting severe blockage)
        if (
          current.type === other.type ||
          (current.severity === 'critical' && other.severity === 'critical') ||
          (current.severity === 'high' && other.severity === 'high')
        ) {
          corroboratingIds.push(other.id);
        }

        // Check for conflicting reports (one reports critical blockage while another reports open/caution)
        if (
          (current.severity === 'critical' && other.severity === 'low') ||
          (current.severity === 'low' && other.severity === 'critical') ||
          (current.aiAnalysis?.roadImpact === 'fully_blocked' &&
            other.aiAnalysis?.roadImpact === 'caution')
        ) {
          isConflicting = true;
          conflictReason = `Discrepancy detected with report ${other.id} (${other.reportedBy}): One report asserts complete corridor blockage while the other reports open/caution condition. Physical highway patrol verification advised before closing transit.`;
        }
      }
    }

    const isDuplicateOrCorroborating = corroboratingIds.length > 0;
    const correlationNotes = isDuplicateOrCorroborating
      ? `Corroborated by ${corroboratingIds.length} nearby observer report(s): ${corroboratingIds.join(', ')}. High triage confidence.`
      : undefined;

    const correlation: IncidentCorrelationInfo = {
      isDuplicateOrCorroborating,
      corroboratingIncidentIds: isDuplicateOrCorroborating ? corroboratingIds : undefined,
      isConflicting,
      conflictReason,
      correlationNotes,
    };

    return {
      ...current,
      correlation,
    };
  });
}
