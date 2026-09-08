import type {
  Shipment,
  Vehicle,
  RoadSegment,
  Disruption,
  Incident,
  Godown,
  ShipmentImpactResult,
  ShipmentPriority,
  ContinuityStatus,
  ShipmentStatus,
  CargoSensitivity,
  EmergencyPickupRequest,
} from '../types/index.ts';

/**
 * Deterministic logistics priority evaluation based on cargo sensitivity,
 * cold-chain temperature control requirements, disruption status, and corridor delays.
 */
export function evaluateLogisticsPriority(
  _cargoCategory: string,
  cargoSensitivity: CargoSensitivity,
  coldChainRequired: boolean,
  isAffected: boolean,
  delayMinutes: number = 0
): { priority: ShipmentPriority; score: number; explanation: string } {
  let score = 30; // Baseline base score
  const reasons: string[] = [];

  if (cargoSensitivity === 'critical') {
    score += 35;
    reasons.push('Life-critical medical/pharmaceutical cargo');
  } else if (cargoSensitivity === 'high') {
    score += 20;
    reasons.push('High-priority relief supplies');
  } else if (cargoSensitivity === 'medium') {
    score += 10;
    reasons.push('Standard essential provisions');
  }

  if (coldChainRequired) {
    score += 20;
    reasons.push('Active cold-chain monitoring required (2–8°C / deep-freeze)');
  }

  if (isAffected) {
    score += 20;
    reasons.push('Active corridor blockage detected');
    if (delayMinutes > 60) {
      score += 10;
      reasons.push(`Significant delay risk (+${Math.round(delayMinutes)}m)`);
    }
  }

  score = Math.min(100, Math.max(0, score));

  let priority: ShipmentPriority = 'low';
  if (score >= 80) priority = 'critical';
  else if (score >= 60) priority = 'high';
  else if (score >= 40) priority = 'normal';
  else priority = 'low';

  const reasonText = reasons.length > 0 ? reasons.join(' · ') : 'Routine transit protocol';
  const explanation = `${priority.toUpperCase()} (${score}/100) — ${reasonText}`;

  return { priority, score, explanation };
}

/**
 * Evaluates cold chain stability risk based on detour delay and cargo type.
 */
export function evaluateColdChainRisk(shipment: Shipment, delayMinutes: number = 0): {
  hasRisk: boolean;
  message: string;
  simulatedTempDisplay: string;
} {
  if (!shipment.coldChainRequired) {
    return {
      hasRisk: false,
      message: 'Ambient temperature cargo (standard dry freight).',
      simulatedTempDisplay: 'N/A (Ambient)',
    };
  }

  const baseTemp = shipment.currentTemperatureC ?? 4.2;
  const isDeepFreeze = baseTemp < 0;

  if (shipment.affected || delayMinutes > 90) {
    const tempDrift = Math.min(3.5, (delayMinutes / 60) * 0.8);
    const estTemp = (baseTemp + tempDrift).toFixed(1);
    return {
      hasRisk: true,
      message: `Cold-chain risk: prolonged transit (+${delayMinutes}m delay) risks thermal breach. Target: ${isDeepFreeze ? '< -15°C' : '2.0°C – 8.0°C'}.`,
      simulatedTempDisplay: `${estTemp}°C (Exposed / Delay Risk)`,
    };
  }

  return {
    hasRisk: false,
    message: `Cold-chain stable within verified thresholds (${isDeepFreeze ? '< -15°C' : '2.0°C – 8.0°C'}).`,
    simulatedTempDisplay: `${baseTemp.toFixed(1)}°C (Stable)`,
  };
}

/**
 * Checks if a godown carries compatible buffer stock for a specific cargo category.
 */
export function isGodownCargoCompatible(godown: Godown, cargoCategory: string): boolean {
  if (!cargoCategory) return false;
  const target = cargoCategory.toLowerCase();
  return godown.suitableCargoTypes.some((token: string) => {
    const t = token.toLowerCase();
    return (
      t === 'all' ||
      target.includes(t) ||
      t.split(/\s+/).some((w: string) => w.length > 3 && target.includes(w))
    );
  });
}

/**
 * Finds the nearest suitable buffer godown for a shipment/vehicle when road corridors are blocked.
 */
export function findSuitableGodownForShipment(
  vehicle: Vehicle,
  shipment: Shipment,
  godowns: Godown[],
  requiredQuantity: number = 20
): {
  godown: Godown;
  distanceKm: number;
  explanation: string;
} | undefined {
  const suitable = godowns
    .filter(
      (g) =>
        g.status !== 'offline' &&
        g.availableStock >= requiredQuantity &&
        isGodownCargoCompatible(g, shipment.cargoCategory)
    )
    .map((g) => {
      const dLat = (vehicle.location[0] - g.location[0]) * 111.32;
      const dLng =
        (vehicle.location[1] - g.location[1]) *
        111.32 *
        Math.cos((vehicle.location[0] * Math.PI) / 180);
      const distanceKm = Math.max(1, Math.round(Math.sqrt(dLat * dLat + dLng * dLng)));
      return { godown: g, distanceKm };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (suitable.length === 0) return undefined;

  const best = suitable[0];
  return {
    godown: best.godown,
    distanceKm: best.distanceKm,
    explanation: `Recommended ${best.godown.name} (${best.distanceKm} km away): verified stock available (${best.godown.availableStock} units) with compatible buffer storage for ${shipment.cargoCategory}.`,
  };
}

/**
 * Recomputes all shipments deterministically according to vehicle states, road blockages,
 * disruptions, and emergency pickup statuses.
 */
export function computeShipmentImpacts(
  shipments: Shipment[],
  vehicles: Vehicle[],
  roadSegments: RoadSegment[],
  disruptions: Disruption[],
  _incidents: Incident[],
  pickupRequests: EmergencyPickupRequest[] = []
): ShipmentImpactResult {
  const updatedShipments = shipments.map((shp) => {
    const vehicle = vehicles.find((v) => v.id === shp.vehicleId);
    const existingPickup = pickupRequests.find(
      (p) => p.vehicleId === shp.vehicleId || p.id === shp.pickupRequestId
    );

    // 1. Check if vehicle is in emergency pickup / buffer state
    if (vehicle?.status === 'emergency_pickup' || existingPickup?.status === 'dispatched' || existingPickup?.status === 'approved') {
      const { priority, score, explanation } = evaluateLogisticsPriority(
        shp.cargoCategory,
        shp.cargoSensitivity,
        shp.coldChainRequired,
        false,
        0
      );
      return {
        ...shp,
        currentStatus: 'relief_buffered' as ShipmentStatus,
        continuityStatus: 'relief_secured' as ContinuityStatus,
        affected: false,
        priority,
        priorityScore: score,
        priorityExplanation: `${explanation} · Buffer space secured at ${existingPickup?.godownName || vehicle?.destination || 'Emergency Godown'}.`,
        impactReason: undefined,
        recommendedAction: `Delivery buffer stock reserved by ${existingPickup?.contractorName || 'Assigned Logistics Contractor'}.`,
        assignedGodownId: existingPickup?.godownId || vehicle?.recommendedGodownId,
        pickupRequestId: existingPickup?.id,
        lastUpdated: new Date().toISOString(),
      };
    }

    // 2. Check if vehicle is currently requesting pickup
    if (existingPickup?.status === 'requested' || vehicle?.rerouteStatus === 'no_alternative') {
      const { priority, score, explanation } = evaluateLogisticsPriority(
        shp.cargoCategory,
        shp.cargoSensitivity,
        shp.coldChainRequired,
        true,
        180
      );
      return {
        ...shp,
        currentStatus: 'disrupted' as ShipmentStatus,
        continuityStatus: 'relief_requested' as ContinuityStatus,
        affected: true,
        priority,
        priorityScore: score,
        priorityExplanation: `${explanation} · No viable alternate highway corridor. Strategic godown buffer requested.`,
        impactReason: vehicle?.rerouteReason || 'Transit halted due to verified corridor blockage without viable highway detour.',
        recommendedAction: `Emergency buffer diversion pending at ${existingPickup?.godownName || 'nearest relief godown'}.`,
        assignedGodownId: existingPickup?.godownId || vehicle?.recommendedGodownId,
        pickupRequestId: existingPickup?.id,
        lastUpdated: new Date().toISOString(),
      };
    }

    // 3. Check if vehicle is actively rerouted
    if (vehicle?.rerouteStatus === 'active') {
      const delay = 50; // Detour delay
      const { priority, score, explanation } = evaluateLogisticsPriority(
        shp.cargoCategory,
        shp.cargoSensitivity,
        shp.coldChainRequired,
        false,
        delay
      );
      return {
        ...shp,
        currentStatus: 'rerouted' as ShipmentStatus,
        continuityStatus: 'rerouting' as ContinuityStatus,
        affected: false,
        delayMinutes: delay,
        priority,
        priorityScore: score,
        priorityExplanation: `${explanation} · Reactive detour active (+${delay}m ETA).`,
        impactReason: undefined,
        recommendedAction: `Proceeding via reactive detour corridor (${vehicle.rerouteFromLabel || 'reroute'}).`,
        lastUpdated: new Date().toISOString(),
      };
    }

    // 4. Check if vehicle is disrupted by blocked road
    if (vehicle?.status === 'disrupted' || vehicle?.affectedByDisruptionId) {
      const disruption = disruptions.find((d) => d.id === vehicle?.affectedByDisruptionId);
      const segment = roadSegments.find((s) => s.id === disruption?.affectedSegmentId);
      const delay = 120; // Estimated blockage delay

      const { priority, score, explanation } = evaluateLogisticsPriority(
        shp.cargoCategory,
        shp.cargoSensitivity,
        shp.coldChainRequired,
        true,
        delay
      );

      return {
        ...shp,
        currentStatus: 'delayed' as ShipmentStatus,
        continuityStatus: 'at_risk' as ContinuityStatus,
        affected: true,
        disruptionId: vehicle.affectedByDisruptionId,
        delayMinutes: delay,
        priority,
        priorityScore: score,
        priorityExplanation: `${explanation} · Blocked by ${segment?.name || 'corridor incident'}.`,
        impactReason: vehicle.impactReason || `Traverses blocked ${segment?.name || 'highway segment'}.`,
        recommendedAction: 'Evaluate reactive detour corridor or request strategic godown buffer.',
        lastUpdated: new Date().toISOString(),
      };
    }

    // 5. Normal on-track status
    const { priority, score, explanation } = evaluateLogisticsPriority(
      shp.cargoCategory,
      shp.cargoSensitivity,
      shp.coldChainRequired,
      false,
      0
    );

    return {
      ...shp,
      currentStatus: (vehicle?.status === 'idle' ? 'scheduled' : 'in_transit') as ShipmentStatus,
      continuityStatus: 'on_track' as ContinuityStatus,
      affected: false,
      disruptionId: undefined,
      delayMinutes: 0,
      priority,
      priorityScore: score,
      priorityExplanation: explanation,
      impactReason: undefined,
      recommendedAction: undefined,
      lastUpdated: new Date().toISOString(),
    };
  });

  const affectedShipments = updatedShipments.filter((s) => s.affected || s.continuityStatus === 'at_risk' || s.continuityStatus === 'relief_requested');
  const criticalCount = updatedShipments.filter((s) => s.priority === 'critical').length;
  const coldChainAtRiskCount = updatedShipments.filter((s) => s.coldChainRequired && (s.affected || s.delayMinutes! > 60)).length;
  const activeContinuityRequests = pickupRequests.filter((p) => p.status === 'requested').length;

  return {
    totalShipments: updatedShipments.length,
    affectedShipments,
    affectedCount: affectedShipments.length,
    criticalCount,
    coldChainAtRiskCount,
    activeContinuityRequests,
    timestamp: new Date().toISOString(),
  };
}
