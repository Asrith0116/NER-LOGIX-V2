import type {
  TripRequest,
  RouteCandidate,
  RouteFeatureBreakdown,
  OperationalContext,
  RouteProvider,
  RiskLevel,
  Location,
} from '../../types/index.ts';
import { CORRIDOR_TEMPLATES, type CorridorTemplate } from '../../data/corridorRoutes.ts';

function getPairKey(origin: Location, dest: Location): string {
  const o = (origin.shortName || origin.name || 'guwahati').toLowerCase();
  const d = (dest.shortName || dest.name || 'imphal').toLowerCase();
  return `${o}-${d}`;
}

function getReversePairKey(origin: Location, dest: Location): string {
  const o = (origin.shortName || origin.name || 'guwahati').toLowerCase();
  const d = (dest.shortName || dest.name || 'imphal').toLowerCase();
  return `${d}-${o}`;
}

/**
 * Resolves high-fidelity geometric waypoints and base metrics for any corridor and node pair.
 * Guarantees that waypoints start exactly at origin and end exactly at destination.
 */
export function resolveCorridorWaypointsAndMetrics(
  template: CorridorTemplate,
  origin: Location,
  destination: Location
): {
  waypoints: [number, number][];
  distanceKm: number;
  etaMinutes: number;
  baseSlopeDegrees: number;
  segmentIds: string[];
} {
  const pairKey = getPairKey(origin, destination);
  const reverseKey = getReversePairKey(origin, destination);

  const originCoord: [number, number] = [origin.lat, origin.lng];
  const destCoord: [number, number] = [destination.lat, destination.lng];

  // 1. Direct match
  if (template.waypointsByPair && template.waypointsByPair[pairKey]) {
    const rawWps = template.waypointsByPair[pairKey];
    const metrics = template.pairMetrics?.[pairKey];
    const waypoints: [number, number][] = [
      originCoord,
      ...rawWps.slice(1, -1),
      destCoord,
    ];
    return {
      waypoints,
      distanceKm: metrics?.distanceKm ?? template.baseDistanceKm,
      etaMinutes: metrics?.etaMinutes ?? template.baseEtaMinutes,
      baseSlopeDegrees: metrics?.baseSlopeDegrees ?? template.baseSlopeDegrees,
      segmentIds: metrics?.segmentIds ?? template.segmentIds,
    };
  }

  // 2. Reverse match
  if (template.waypointsByPair && template.waypointsByPair[reverseKey]) {
    const rawReverseWps = template.waypointsByPair[reverseKey];
    const metrics = template.pairMetrics?.[reverseKey];
    const reversed = [...rawReverseWps].reverse();
    const waypoints: [number, number][] = [
      originCoord,
      ...reversed.slice(1, -1),
      destCoord,
    ];
    return {
      waypoints,
      distanceKm: metrics?.distanceKm ?? template.baseDistanceKm,
      etaMinutes: metrics?.etaMinutes ?? template.baseEtaMinutes,
      baseSlopeDegrees: metrics?.baseSlopeDegrees ?? template.baseSlopeDegrees,
      segmentIds: metrics?.segmentIds ?? template.segmentIds,
    };
  }

  // 3. Dynamic interpolation for custom or unlisted coordinate pairs
  const dLat = (destCoord[0] - originCoord[0]) * (Math.PI / 180);
  const dLng = (destCoord[1] - originCoord[1]) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(originCoord[0] * (Math.PI / 180)) *
      Math.cos(destCoord[0] * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const haversineKm = Math.round(6371 * c);

  const curvature =
    template.corridorKey === 'nh2_mountain_direct'
      ? 1.25
      : template.corridorKey === 'valley_low_risk'
      ? 1.35
      : template.corridorKey === 'wokha_ridge'
      ? 1.45
      : 1.55;

  const estimatedDistKm = Math.max(15, Math.round(haversineKm * curvature));
  const avgSpeedKmh =
    template.corridorKey === 'nh2_mountain_direct'
      ? 48
      : template.corridorKey === 'valley_low_risk'
      ? 52
      : template.corridorKey === 'wokha_ridge'
      ? 38
      : 44;

  const estimatedEtaMin = Math.round((estimatedDistKm / avgSpeedKmh) * 60);

  const midLat = (originCoord[0] + destCoord[0]) / 2;
  const midLng = (originCoord[1] + destCoord[1]) / 2;
  const latOffset = template.corridorKey === 'southern_bypass' ? -0.15 : template.corridorKey === 'wokha_ridge' ? 0.12 : 0.04;
  const lngOffset = template.corridorKey === 'southern_bypass' ? -0.10 : template.corridorKey === 'wokha_ridge' ? 0.10 : -0.05;

  const waypoints: [number, number][] = [
    originCoord,
    [midLat + latOffset, midLng + lngOffset],
    destCoord,
  ];

  return {
    waypoints,
    distanceKm: estimatedDistKm,
    etaMinutes: estimatedEtaMin,
    baseSlopeDegrees: template.baseSlopeDegrees,
    segmentIds: template.segmentIds,
  };
}

const CORRIDOR_WEATHER_NODES: Record<string, string[]> = {
  valley_low_risk: ['Karbi Anglong', 'Doyyang', 'Dimapur', 'Guwahati'],
  nh2_mountain_direct: ['Kohima', 'Mao Pass', 'Imphal'],
  southern_bypass: ['Halflong', 'Silchar', 'Shillong', 'Imphal'],
  wokha_ridge: ['Wokha', 'Mokokchung', 'Dimapur'],
};

export function evaluateCorridorFeatures(
  template: CorridorTemplate,
  request: TripRequest,
  context: OperationalContext
): {
  features: RouteFeatureBreakdown;
  isBlocked: boolean;
  blockageReason?: string;
  adjustedDistanceKm: number;
  adjustedEtaMinutes: number;
} {
  const { distanceKm, etaMinutes, segmentIds } = resolveCorridorWaypointsAndMetrics(
    template,
    request.origin,
    request.destination
  );

  const adjustedDistanceKm = distanceKm;
  const adjustedEtaMinutes = etaMinutes;

  // 1. Check road segments & active disruptions
  let activeBlockedCount = 0;
  let activeIncidentCount = 0;
  let blockageReason: string | undefined = undefined;

  for (const segId of segmentIds) {
    const liveSegment = context.roadSegments.find((s) => s.id === segId);
    const activeDisruption = context.disruptions.find(
      (d) => d.affectedSegmentId === segId && d.status === 'active'
    );

    if (liveSegment?.status === 'blocked' || Boolean(activeDisruption)) {
      activeBlockedCount++;
      const segmentName = liveSegment?.name || 'Corridor mountain sector';
      blockageReason = `${segmentName} is BLOCKED due to an active verified incident / disruption.`;
    }

    const linkedIncidents = context.activeIncidents.filter(
      (inc) =>
        (inc.locationName && liveSegment?.name.toLowerCase().includes(inc.locationName.toLowerCase())) ||
        (liveSegment?.affectedByIncidentId && inc.id === liveSegment.affectedByIncidentId)
    );
    activeIncidentCount += linkedIncidents.length;
  }

  // 2. Sample weather along this specific corridor's geographic stations
  let rainfallMmPerHour = 6.5; // baseline moderate precipitation in season
  if (context.weatherData) {
    const configuredNodes = CORRIDOR_WEATHER_NODES[template.corridorKey] || ['Guwahati', 'Imphal'];
    const originNode = request.origin?.shortName || request.origin?.name;
    const destNode = request.destination?.shortName || request.destination?.name;
    const nodesToSample = Array.from(new Set([...configuredNodes, ...(originNode ? [originNode] : []), ...(destNode ? [destNode] : [])]));

    let maxRain = 0;
    let found = false;
    for (const node of nodesToSample) {
      const snap = context.weatherData[node];
      if (snap && typeof snap.precipitationMm === 'number') {
        maxRain = Math.max(maxRain, snap.precipitationMm);
        found = true;
      }
    }
    if (found) {
      rainfallMmPerHour = Math.round(maxRain * 10) / 10;
    } else {
      const vals = Object.values(context.weatherData);
      if (vals.length > 0) {
        rainfallMmPerHour = Math.round(vals.reduce((acc, w) => acc + (w.precipitationMm || 0), 0) / vals.length);
      }
    }
  }

  // 3. Vehicle compatibility
  const vType = (request.vehicleType || '').toLowerCase();
  let vehicleSuitability: 'optimal' | 'acceptable' | 'penalized' | 'restricted' = 'optimal';
  let vehicleRiskPenalty = 0;

  if (vType.includes('heavy') || vType.includes('10-wheeler') || vType.includes('multi-axle')) {
    if (template.corridorKey === 'wokha_ridge') {
      vehicleSuitability = 'restricted';
      vehicleRiskPenalty = 8;
    } else if (template.corridorKey === 'nh2_mountain_direct') {
      vehicleSuitability = 'penalized';
      vehicleRiskPenalty = 6;
    } else {
      vehicleSuitability = 'optimal';
      vehicleRiskPenalty = 0;
    }
  } else if (vType.includes('light') || vType.includes('van') || vType.includes('mini')) {
    if (template.corridorKey === 'wokha_ridge') {
      vehicleSuitability = 'optimal';
      vehicleRiskPenalty = 0;
    } else {
      vehicleSuitability = 'acceptable';
      vehicleRiskPenalty = 0;
    }
  } else if (vType.includes('refrigerated') || vType.includes('reefer') || request.constraints.requireColdChain) {
    if (template.corridorKey === 'wokha_ridge' || template.corridorKey === 'nh2_mountain_direct') {
      vehicleSuitability = 'penalized';
      vehicleRiskPenalty = 4;
    } else {
      vehicleSuitability = 'optimal';
      vehicleRiskPenalty = 0;
    }
  }

  // 4. Cargo vulnerability score
  let cargoVulnerabilityScore = 10;
  switch (request.cargoSensitivity) {
    case 'critical':
      cargoVulnerabilityScore = 32;
      break;
    case 'high':
      cargoVulnerabilityScore = 24;
      break;
    case 'medium':
      cargoVulnerabilityScore = 15;
      break;
    case 'low':
    default:
      cargoVulnerabilityScore = 8;
      break;
  }

  // 5. Priority speed weight
  let prioritySpeedWeight = 1.0;
  switch (request.priority) {
    case 'emergency':
      prioritySpeedWeight = 1.85;
      break;
    case 'urgent':
      prioritySpeedWeight = 1.45;
      break;
    case 'high':
      prioritySpeedWeight = 1.2;
      break;
    case 'standard':
    default:
      prioritySpeedWeight = 1.0;
      break;
  }

  // Real Terrain / Elevation Profile Integration (Open-Meteo Elevation API — Copernicus DEM GLO-90)
  const elevationData = context.elevationProfiles?.[template.corridorKey];
  const effectiveSlopeDegrees = elevationData?.averageSlopeDegrees ?? template.baseSlopeDegrees;
  const terrainComponent = elevationData
    ? elevationData.terrainRiskScore
    : Math.min(25, Math.round((effectiveSlopeDegrees / 30) * 25));

  // Real Monsoon Rainfall / Weather Integration (Open-Meteo Regional Weather)
  const weatherComponent = Math.min(35, Math.round((rainfallMmPerHour / 50) * 35));

  // Real Historical Landslide Hazard Integration (NASA GLC & GSI Inventory)
  const hazardExposure = context.historicalHazards?.[template.corridorKey];
  const effectiveHistoricalCount = hazardExposure?.totalRecordedEvents ?? template.historicalDisruptionsCount;
  const historicalComponent = hazardExposure
    ? hazardExposure.historicalSeasonalRiskScore
    : Math.min(20, Math.round(effectiveHistoricalCount * 2));

  // Active verified incidents / blockages
  const incidentComponent = activeBlockedCount > 0 ? 30 : Math.min(25, activeIncidentCount * 8);
  const vehicleComponent = Math.min(10, Math.max(0, vehicleRiskPenalty));
  const cargoComponent = Math.min(5, Math.max(1, Math.round((cargoVulnerabilityScore / 35) * 5)));

  const features: RouteFeatureBreakdown = {
    terrainSlopeDegrees: effectiveSlopeDegrees,
    historicalDisruptionsCount: effectiveHistoricalCount,
    rainfallMmPerHour,
    activeIncidentsCount: activeIncidentCount,
    activeBlockedSegmentsCount: activeBlockedCount,
    vehicleSuitability,
    cargoVulnerabilityScore,
    prioritySpeedWeight,
    riskComponents: {
      terrain: terrainComponent,
      weather: weatherComponent,
      historical: historicalComponent,
      incidents: incidentComponent,
      vehicle: vehicleComponent,
      cargo: cargoComponent,
    },
  };

  return {
    features,
    isBlocked: activeBlockedCount > 0,
    blockageReason,
    adjustedDistanceKm,
    adjustedEtaMinutes,
  };
}

export function computeRiskScore(
  features: RouteFeatureBreakdown,
  isBlocked: boolean,
  _baseRisk?: number
): { riskScore: number; riskLevel: RiskLevel } {
  if (isBlocked) {
    return { riskScore: 98, riskLevel: 'blocked' };
  }

  const { terrain, weather, historical, incidents, vehicle, cargo } = features.riskComponents;
  const rawSum = terrain + weather + historical + incidents + vehicle + cargo;
  const clamped = Math.min(95, Math.max(8, rawSum));

  let riskLevel: RiskLevel = 'low';
  if (clamped >= 66) riskLevel = 'high';
  else if (clamped >= 35) riskLevel = 'moderate';
  else riskLevel = 'low';

  return { riskScore: clamped, riskLevel };
}

export function computeOperationalScore(
  features: RouteFeatureBreakdown,
  riskScore: number,
  isBlocked: boolean,
  adjustedEtaMinutes: number,
  minEtaAcrossCandidates: number,
  request: TripRequest
): { operationalScore: number; suitability: 'High' | 'Moderate' | 'Constrained' | 'Unsuitable' } {
  if (isBlocked) {
    return { operationalScore: 0, suitability: 'Unsuitable' };
  }

  // 1. Time efficiency score (0-100, where minEta is 100)
  const timeDifferenceMins = Math.max(0, adjustedEtaMinutes - minEtaAcrossCandidates);
  const timeScore = Math.max(20, 100 - (timeDifferenceMins / 120) * 40);

  // 2. Safety score (inverse of risk)
  const safetyScore = Math.max(0, 100 - riskScore);

  // 3. Weighting based on urgency & constraints
  let timeWeight = 0.35 * features.prioritySpeedWeight;
  let safetyWeight = 0.65;

  if (request.constraints.avoidHighRiskCorridors) {
    safetyWeight += 0.2;
    timeWeight = Math.max(0.2, timeWeight - 0.15);
  }

  if (request.constraints.riskTolerance === 'conservative') {
    safetyWeight += 0.25;
  } else if (request.constraints.riskTolerance === 'aggressive') {
    safetyWeight -= 0.15;
    timeWeight += 0.15;
  }

  // Normalize weights
  const totalW = timeWeight + safetyWeight;
  let composite = (timeScore * timeWeight + safetyScore * safetyWeight) / totalW;

  // Penalize vehicle restrictions
  if (features.vehicleSuitability === 'restricted') {
    composite -= 30;
  } else if (features.vehicleSuitability === 'penalized') {
    composite -= 14;
  }

  // Penalize cold chain violation risk
  if (request.constraints.requireColdChain && riskScore > 50) {
    composite -= 16;
  }

  const finalScore = Math.round(Math.min(100, Math.max(5, composite)));

  let suitability: 'High' | 'Moderate' | 'Constrained' | 'Unsuitable' = 'High';
  if (finalScore >= 75) suitability = 'High';
  else if (finalScore >= 50) suitability = 'Moderate';
  else if (finalScore >= 25) suitability = 'Constrained';
  else suitability = 'Unsuitable';

  return { operationalScore: finalScore, suitability };
}

export function synthesizeRecommendationReason(
  candidate: {
    label: string;
    corridorName: string;
    isBlocked: boolean;
    blockageReason?: string;
    riskScore: number;
    riskLevel: RiskLevel;
    etaMinutes: number;
    distanceKm: number;
    operationalScore: number;
    features: RouteFeatureBreakdown;
  },
  request: TripRequest,
  rank: number
): string {
  if (candidate.isBlocked) {
    return candidate.blockageReason || 'BLOCKED: Impassable due to active road disruption.';
  }

  const isPharmaOrVaccine =
    request.cargoCategory.toLowerCase().includes('pharma') ||
    request.cargoCategory.toLowerCase().includes('vaccine') ||
    request.cargoCategory.toLowerCase().includes('cold-chain');

  if (rank === 1) {
    if (request.priority === 'emergency') {
      return `RECOMMENDED (#1): Highest-velocity viable corridor delivering an ETA of ${Math.floor(
        candidate.etaMinutes / 60
      )}h ${candidate.etaMinutes % 60}m for emergency response under active terrain conditions.`;
    }
    if (isPharmaOrVaccine || request.constraints.requireColdChain) {
      return `RECOMMENDED (#1): Safest valley alignment (Risk Score: ${candidate.riskScore}) minimizing temperature loss and landslide stoppage risks for sensitive cold-chain cargo.`;
    }
    if (candidate.features.vehicleSuitability === 'optimal') {
      return `RECOMMENDED (#1): Optimal balance of corridor safety, road quality, and vehicle axle geometry with minimal historical failure frequency.`;
    }
    return `RECOMMENDED (#1): Best overall operational safety score (${candidate.operationalScore}/100) avoiding active regional road choke points.`;
  }

  if (rank === 2) {
    return `ALTERNATIVE (#2): Viable secondary corridor with moderate travel time tradeoff; suitable if primary corridor experiences sudden localized congestion.`;
  }

  if (candidate.features.vehicleSuitability === 'restricted') {
    return `CONSTRAINED (#${rank}): Axle weight or turning radius restrictions on steep mountain switchbacks make this corridor unadvisable for ${request.vehicleType}.`;
  }

  if (candidate.riskScore > 65) {
    return `ELEVATED RISK (#${rank}): High gradient terrain (${candidate.features.terrainSlopeDegrees}°) and chronic historical slide frequency; recommended only if weather remains completely clear.`;
  }

  return `STANDBY (#${rank}): Distance +${candidate.distanceKm} km with slower travel time; reserved as contingency fallback.`;
}

/**
 * Default Seeded Corridor Route Provider (implements RouteProvider interface).
 * Uses real NER highway geometries and dynamically evaluates live networkStore context.
 */
export class SeededCorridorRouteProvider implements RouteProvider {
  id = 'seeded-corridor-provider';
  name = 'NER Seeded Strategic Corridor Engine';
  isLive = false;

  findCandidates(request: TripRequest, context: OperationalContext): RouteCandidate[] {
    const candidatesData = CORRIDOR_TEMPLATES.map((tmpl) => {
      const { waypoints } = resolveCorridorWaypointsAndMetrics(tmpl, request.origin, request.destination);

      const { features, isBlocked, blockageReason, adjustedDistanceKm, adjustedEtaMinutes } =
        evaluateCorridorFeatures(tmpl, request, context);

      const { riskScore, riskLevel } = computeRiskScore(features, isBlocked, tmpl.baseRiskScore);

      return {
        template: tmpl,
        waypoints,
        features,
        isBlocked,
        blockageReason,
        adjustedDistanceKm,
        adjustedEtaMinutes,
        riskScore,
        riskLevel,
      };
    });

    const minEta = Math.min(...candidatesData.map((c) => c.adjustedEtaMinutes));

    // Calculate operational score for each
    const scored = candidatesData.map((c) => {
      const { operationalScore, suitability } = computeOperationalScore(
        c.features,
        c.riskScore,
        c.isBlocked,
        c.adjustedEtaMinutes,
        minEta,
        request
      );

      return {
        ...c,
        operationalScore,
        suitability,
      };
    });

    // Sort by operationalScore descending (blocked routes with 0 will be at the bottom)
    scored.sort((a, b) => b.operationalScore - a.operationalScore);

    // Build final RouteCandidate objects
    return scored.map((item, index) => {
      const rank = index + 1;
      const isRecommended = rank === 1 && !item.isBlocked;
      const reason = synthesizeRecommendationReason(
        {
          label: item.template.label,
          corridorName: item.template.corridorName,
          isBlocked: item.isBlocked,
          blockageReason: item.blockageReason,
          riskScore: item.riskScore,
          riskLevel: item.riskLevel,
          etaMinutes: item.adjustedEtaMinutes,
          distanceKm: item.adjustedDistanceKm,
          operationalScore: item.operationalScore,
          features: item.features,
        },
        request,
        rank
      );

      const candidate: RouteCandidate = {
        id: item.template.id,
        corridorKey: item.template.corridorKey,
        label: item.template.label,
        corridorName: item.template.corridorName,
        description: item.template.description,
        waypoints: item.waypoints,
        distanceKm: item.adjustedDistanceKm,
        etaMinutes: item.adjustedEtaMinutes,
        riskScore: item.riskScore,
        riskLevel: item.riskLevel,
        recommended: isRecommended,
        operationalScore: item.operationalScore,
        suitability: item.suitability,
        recommendationRank: rank,
        recommendationReason: reason,
        advantages: item.template.advantages,
        disadvantages: item.template.disadvantages,
        riskFactors: item.template.riskFactors,
        segmentIds: item.template.segmentIds,
        isBlocked: item.isBlocked,
        blockageReason: item.blockageReason,
        featureBreakdown: item.features,
        providerId: this.id,
        providerType: 'SEED',
      };

      return candidate;
    });
  }
}

/**
 * Route Provider Registry and Dispatcher.
 * Allows seamless plugging of future live APIs (OSRM, GraphHopper, Google Routes)
 * without touching UI or scoring layers.
 */
export const defaultRouteProvider = new SeededCorridorRouteProvider();

export function calculateTripCandidates(
  request: TripRequest,
  context: OperationalContext,
  provider: RouteProvider = defaultRouteProvider
): Promise<RouteCandidate[]> | RouteCandidate[] {
  return provider.findCandidates(request, context);
}
