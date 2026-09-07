import type { RiskLevel, RiskFactorBreakdown, Incident, RouteCandidate } from '@/types';
import type { WeatherDataPoint } from '@/types';

export interface RiskEvaluationInput {
  segmentId?: string;
  segmentName?: string;
  routeId?: string;
  routeLabel?: string;
  weather?: WeatherDataPoint;
  slopeDegrees?: number;
  historicalDisruptionsCount?: number;
  activeHazards?: Incident[];
  vehicleType?: string;
  cargoPriority?: string;
  isColdChain?: boolean;
}

export function candidateToRiskBreakdown(candidate: RouteCandidate): RiskFactorBreakdown {
  const fb = candidate.featureBreakdown;
  const rc = fb.riskComponents;

  return {
    totalScore: candidate.riskScore,
    riskCategory: candidate.riskLevel,
    factors: {
      rainfall: {
        score: Math.min(35, rc.weather),
        max: 35,
        label: 'Monsoon Rainfall & Moisture Saturation',
        value: `${fb.rainfallMmPerHour} mm/h precipitation along corridor`,
      },
      slopeTerrain: {
        score: Math.min(25, rc.terrain),
        max: 25,
        label: 'Terrain Slope & Soil Shear Gradient',
        value: `${fb.terrainSlopeDegrees}° average gradient (${fb.terrainSlopeDegrees > 20 ? 'steep scree cutting' : 'gentle valley alignment'})`,
      },
      historicalDisruptions: {
        score: Math.min(20, rc.historical),
        max: 20,
        label: 'Historical Seasonal Failure Index',
        value: `${fb.historicalDisruptionsCount} documented washouts/slides across past monsoon seasons`,
      },
      activeHazards: {
        score: Math.min(30, rc.incidents),
        max: 30,
        label: 'Active Field Incident & Blockage Reports',
        value: candidate.isBlocked
          ? (candidate.blockageReason || 'Active verified road blockage')
          : fb.activeIncidentsCount > 0
            ? `${fb.activeIncidentsCount} active advisory hazard report(s) noted along corridor`
            : 'No active road disruptions reported on this alignment',
      },
      vehicleWeightModifier: {
        score: Math.min(15, rc.vehicle + rc.cargo),
        max: 15,
        label: 'Vehicle Constraint & Cargo Sensitivity Match',
        value: `Axle match: ${fb.vehicleSuitability.toUpperCase()} · Cargo sensitivity factor: ${fb.cargoVulnerabilityScore}/35`,
      },
    },
    plainLanguageExplanation: candidate.recommendationReason,
    recommendation: candidate.isBlocked
      ? 'DO NOT PROCEED. Corridor is impassable; select #1 Recommended alternate route.'
      : candidate.advantages.length > 0
        ? `Advisory: ${candidate.advantages.slice(0, 2).join(' · ')}`
        : 'Viable corridor for dispatch with standard telemetry enabled.',
  };
}

/**
 * NER-LOGIX Multi-Factor Risk Assessment Engine
 * Segment Risk Score (W) = f(Precipitation) + f(Terrain Slope) + f(Historical Disruption) + f(Active Hazard) + f(Vehicle Constraints)
 *
 * Range: 0 to 100
 * Low Risk: 0 - 35
 * Moderate Risk: 36 - 65
 * High Risk: 66 - 85
 * Blocked / Impassable: 86 - 100
 */
export function calculateExplainableRisk(input: RiskEvaluationInput): RiskFactorBreakdown {
  const {
    weather,
    slopeDegrees = 18,
    historicalDisruptionsCount = 3,
    activeHazards = [],
    vehicleType = 'Medium Commercial Reefer',
    cargoPriority = 'normal',
    isColdChain = false,
  } = input;

  // 1. Weather / Rainfall Contribution (Max: 35)
  // Formula: scaled by mm of rainfall and intensity
  const precipMm = weather?.precipitationMm ?? 15;
  let rainfallScore = 0;
  let rainfallText = 'Clear to minimal precipitation';
  if (precipMm < 2) {
    rainfallScore = 4;
    rainfallText = 'Clear / light mist (<2mm/h)';
  } else if (precipMm < 15) {
    rainfallScore = 12;
    rainfallText = `Moderate rain (${precipMm}mm/h) — slick road conditions`;
  } else if (precipMm < 35) {
    rainfallScore = 24;
    rainfallText = `Heavy monsoonal downpour (${precipMm}mm/h) — saturation warning`;
  } else {
    rainfallScore = 34;
    rainfallText = `Torrential cloudburst (${precipMm}mm/h) — extreme washout hazard`;
  }

  // 2. Terrain Slope / Mountain Gradient (Max: 25)
  // Higher slopes (>20°) in NER clay/shale soil have exponential slide probability
  let slopeScore = 0;
  let slopeText = 'Gentle valley gradient (<10°)';
  if (slopeDegrees <= 10) {
    slopeScore = 4;
    slopeText = `Valley floor alignment (${slopeDegrees}° grade)`;
  } else if (slopeDegrees <= 20) {
    slopeScore = 12;
    slopeText = `Intermediate mountain pass (${slopeDegrees}° slope)`;
  } else if (slopeDegrees <= 30) {
    slopeScore = 19;
    slopeText = `Steep escarpment cutting (${slopeDegrees}° slope) — loose scree`;
  } else {
    slopeScore = 25;
    slopeText = `Critical cliff-side gorge (${slopeDegrees}° slope) — high shear stress`;
  }

  // 3. Historical Disruption Frequency (Max: 20)
  // Based on past monsoon season failure logs on this specific corridor
  let historicalScore = 0;
  let histText = 'Infrequent failure record (<2 events/season)';
  if (historicalDisruptionsCount <= 2) {
    historicalScore = 4;
    histText = `${historicalDisruptionsCount} minor disruptions in past 3 seasons`;
  } else if (historicalDisruptionsCount <= 6) {
    historicalScore = 11;
    histText = `${historicalDisruptionsCount} seasonal washout/slide events on record`;
  } else {
    historicalScore = 18;
    histText = `${historicalDisruptionsCount}+ recurring seasonal blockages — chronic bottleneck`;
  }

  // 4. Active Verified / Field Hazards (Max: 30)
  let activeHazardScore = 0;
  let hazardText = 'No active field incidents reported';
  const highSeverityHazards = activeHazards.filter(
    (h) => h.severity === 'critical' || h.severity === 'high'
  );
  if (highSeverityHazards.length > 0) {
    activeHazardScore = 28;
    hazardText = `${highSeverityHazards.length} active high/critical field incident(s) reported ahead`;
  } else if (activeHazards.length > 0) {
    activeHazardScore = 14;
    hazardText = `${activeHazards.length} moderate advisory field report(s) noted`;
  }

  // 5. Vehicle Weight / Constraints Modifier (Max: 15)
  let vehicleScore = 0;
  let vehicleText = 'Standard commercial transit profile';
  const vType = vehicleType.toLowerCase();
  if (vType.includes('heavy') || vType.includes('10-wheeler') || vType.includes('multi-axle')) {
    vehicleScore = 12;
    vehicleText = 'Heavy axle payload: high rollover risk on unpaved bypasses';
  } else if (vType.includes('reefer') || isColdChain) {
    vehicleScore = 8;
    vehicleText = 'Temperature-sensitive cold chain: severe penalty for transit stoppage';
  } else if (vType.includes('ambulance') || cargoPriority === 'critical') {
    vehicleScore = 4;
    vehicleText = 'High priority/light emergency vehicle: high agility, sensitive to complete blockages';
  }

  // Total calculation (capped at 100)
  const rawTotal = rainfallScore + slopeScore + historicalScore + activeHazardScore + vehicleScore;
  const totalScore = Math.min(100, Math.max(0, rawTotal));

  let riskCategory: RiskLevel = 'low';
  if (totalScore >= 85) riskCategory = 'blocked';
  else if (totalScore >= 65) riskCategory = 'high';
  else if (totalScore >= 35) riskCategory = 'moderate';

  // Plain-language synthesis for driver and dispatcher trust
  let plainLanguageExplanation = '';
  let recommendation = '';

  if (riskCategory === 'blocked' || totalScore >= 85) {
    plainLanguageExplanation = `Corridor impassable or critical danger. Combined rainfall intensity (+${rainfallScore}) and active terrain failure (+${activeHazardScore}) exceed heavy transit threshold.`;
    recommendation = 'DO NOT PROCEED. Execute reactive reroute via alternate corridor or divert to nearest verified emergency godown.';
  } else if (riskCategory === 'high') {
    plainLanguageExplanation = `High risk corridor: Steep slope grade (+${slopeScore}) combined with active precipitation (+${rainfallScore}) creates significant mudslide probability.`;
    recommendation = 'Proceed with extreme caution or prefer safer valley corridor (Route A) if available.';
  } else if (riskCategory === 'moderate') {
    plainLanguageExplanation = `Moderate operating risk: Wet roadway (+${rainfallScore}) and moderate slope (+${slopeScore}) with active speed advisory.`;
    recommendation = 'Route is viable for dispatch with turn-by-turn hazard alerts enabled.';
  } else {
    plainLanguageExplanation = `Clear corridor conditions. Stable geology (+${slopeScore}) and nominal weather (+${rainfallScore}).`;
    recommendation = 'Optimal recommended path for priority dispatch.';
  }

  return {
    totalScore,
    riskCategory,
    factors: {
      rainfall: {
        score: rainfallScore,
        max: 35,
        label: 'Monsoon Rainfall Intensity',
        value: rainfallText,
      },
      slopeTerrain: {
        score: slopeScore,
        max: 25,
        label: 'Terrain Slope & Soil Shear',
        value: slopeText,
      },
      historicalDisruptions: {
        score: historicalScore,
        max: 20,
        label: 'Historical Disruption Rate',
        value: histText,
      },
      activeHazards: {
        score: activeHazardScore,
        max: 30,
        label: 'Active Field Incident Reports',
        value: hazardText,
      },
      vehicleWeightModifier: {
        score: vehicleScore,
        max: 15,
        label: 'Vehicle Class & Cargo Sensitivity',
        value: vehicleText,
      },
    },
    plainLanguageExplanation,
    recommendation,
  };
}
