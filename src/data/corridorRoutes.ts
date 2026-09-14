import type { RiskLevel } from '@/types';

export interface CorridorPairMetric {
  distanceKm: number;
  etaMinutes: number;
  baseSlopeDegrees?: number;
  segmentIds?: string[];
}

export interface CorridorTemplate {
  id: string;
  corridorKey: 'valley_low_risk' | 'nh2_mountain_direct' | 'southern_bypass' | 'wokha_ridge';
  label: string;
  description: string;
  corridorName: string;
  segmentIds: string[];
  baseSlopeDegrees: number;
  historicalDisruptionsCount: number;
  baseDistanceKm: number;
  baseEtaMinutes: number;
  baseRiskScore: number;
  baseRiskLevel: RiskLevel;
  advantages: string[];
  disadvantages: string[];
  riskFactors: string[];
  /** Supported origin -> destination keys */
  waypointsByPair: Record<string, [number, number][]>;
  /** Pair-specific distance and ETA metrics */
  pairMetrics?: Record<string, CorridorPairMetric>;
}

export const CORRIDOR_TEMPLATES: CorridorTemplate[] = [
  {
    id: 'corridor-alpha-valley',
    corridorKey: 'valley_low_risk',
    label: 'Route A — Valley Low-Risk Corridor',
    corridorName: 'NH-27 / NH-39 Valley Low-Risk Corridor',
    description: 'Via Dimapur & Karbi Anglong Foothills (Gentle Valley Grade)',
    segmentIds: ['rd-002', 'rd-003'],
    baseSlopeDegrees: 14,
    historicalDisruptionsCount: 2,
    baseDistanceKm: 498,
    baseEtaMinutes: 615, // 10h 15m
    baseRiskScore: 18,
    baseRiskLevel: 'low',
    advantages: [
      'Gentle valley floor alignment (<14° gradient)',
      'Bypasses the vulnerable NH-2 Mao Gate gorge',
      'Continuous dual-lane paved asphalt surface',
      'Low historical disruption probability',
    ],
    disadvantages: [
      '+77 km longer than NH-2 Direct pass',
      'Traverses Doyyang river bridge section',
    ],
    riskFactors: [
      'Minor water pooling on Doyyang bridge during intense rain',
      'Speed advisory on Wokha bypass hairpins',
    ],
    pairMetrics: {
      'guwahati-imphal': { distanceKm: 498, etaMinutes: 615, baseSlopeDegrees: 14, segmentIds: ['rd-002', 'rd-003'] },
      'kohima-silchar': { distanceKm: 245, etaMinutes: 375, baseSlopeDegrees: 14, segmentIds: ['rd-002', 'rd-004'] },
      'dimapur-kohima': { distanceKm: 74, etaMinutes: 120, baseSlopeDegrees: 13, segmentIds: ['rd-002'] },
      'silchar-imphal': { distanceKm: 222, etaMinutes: 315, baseSlopeDegrees: 14, segmentIds: ['rd-005'] },
      'dimapur-imphal': { distanceKm: 205, etaMinutes: 285, baseSlopeDegrees: 15, segmentIds: ['rd-002', 'rd-003'] },
      'guwahati-kohima': { distanceKm: 349, etaMinutes: 450, baseSlopeDegrees: 14, segmentIds: ['rd-002'] },
      'guwahati-dimapur': { distanceKm: 275, etaMinutes: 330, baseSlopeDegrees: 11, segmentIds: ['rd-002'] },
      'guwahati-silchar': { distanceKm: 310, etaMinutes: 420, baseSlopeDegrees: 15, segmentIds: ['rd-004'] },
      'dimapur-silchar': { distanceKm: 185, etaMinutes: 270, baseSlopeDegrees: 13, segmentIds: ['rd-004'] },
      'kohima-imphal': { distanceKm: 138, etaMinutes: 195, baseSlopeDegrees: 16, segmentIds: ['rd-003'] },
    },
    waypointsByPair: {
      'guwahati-imphal': [
        [26.1445, 91.7362],
        [26.1800, 92.4500],
        [25.9093, 93.7265],
        [25.7500, 93.9200],
        [25.6751, 94.1086],
        [25.2000, 94.0200],
        [24.8170, 93.9368],
      ],
      'kohima-silchar': [
        [25.6751, 94.1086],
        [25.7900, 93.8800],
        [25.9093, 93.7265],
        [25.8200, 93.4200],
        [25.1800, 93.0200],
        [24.8268, 92.7981],
      ],
      'dimapur-imphal': [
        [25.9093, 93.7265],
        [25.7800, 93.9000],
        [25.6751, 94.1086],
        [25.2500, 94.0200],
        [24.8170, 93.9368],
      ],
      'guwahati-kohima': [
        [26.1445, 91.7362],
        [26.1800, 92.4500],
        [25.9093, 93.7265],
        [25.7500, 93.9200],
        [25.6751, 94.1086],
      ],
      'dimapur-kohima': [
        [25.9093, 93.7265],
        [25.8200, 93.8500],
        [25.7500, 93.9200],
        [25.6751, 94.1086],
      ],
      'silchar-imphal': [
        [24.8268, 92.7981],
        [24.8000, 93.1200],
        [24.8300, 93.5500],
        [24.8170, 93.9368],
      ],
      'guwahati-dimapur': [
        [26.1445, 91.7362],
        [26.1800, 92.1500],
        [26.2400, 92.4800],
        [26.3450, 92.6850],
        [26.1200, 93.0100],
        [25.9800, 93.4200],
        [25.9093, 93.7265],
      ],
      'guwahati-silchar': [
        [26.1445, 91.7362],
        [25.9200, 91.8200],
        [25.5788, 91.8933],
        [25.4400, 92.2000],
        [25.1500, 92.4200],
        [24.8268, 92.7981],
      ],
      'dimapur-silchar': [
        [25.9093, 93.7265],
        [25.8200, 93.4200],
        [25.7500, 93.1500],
        [25.1800, 93.0200],
        [24.8268, 92.7981],
      ],
      'kohima-imphal': [
        [25.6751, 94.1086],
        [25.5100, 94.1300],
        [25.2667, 94.0167],
        [25.0800, 93.9800],
        [24.9500, 93.9600],
        [24.8170, 93.9368],
      ],
    },
  },
  {
    id: 'corridor-beta-direct',
    corridorKey: 'nh2_mountain_direct',
    label: 'Route B — NH-2 Mountain Direct',
    corridorName: 'NH-2 Kohima–Senapati Direct Mountain Pass',
    description: 'Via NH-2 Senapati & Mao Gate Escarpment (Steep Pass)',
    segmentIds: ['rd-001'],
    baseSlopeDegrees: 26,
    historicalDisruptionsCount: 7,
    baseDistanceKm: 421,
    baseEtaMinutes: 525, // 8h 45m
    baseRiskScore: 68,
    baseRiskLevel: 'high',
    advantages: [
      'Shortest physical distance (421 km)',
      'Fastest travel time (-90 min under dry conditions)',
      'Direct national highway freight link',
    ],
    disadvantages: [
      'Steep mountain cutting (26° grade) prone to scree slides',
      'Traverses chronic Mao Gate failure bottleneck (km 312-349)',
      'High vehicle rollover risk for overloaded multi-axle trucks',
      'Completely impassable during verified landslide blockages',
    ],
    riskFactors: [
      'Critical cliff-side gorge between Senapati and Mao Gate',
      '7 recorded seasonal mudslides in past 3 monsoon cycles',
      'High vulnerability to torrential downpours (>15mm/h)',
    ],
    pairMetrics: {
      'guwahati-imphal': { distanceKm: 421, etaMinutes: 525, baseSlopeDegrees: 26, segmentIds: ['rd-001'] },
      'kohima-silchar': { distanceKm: 210, etaMinutes: 345, baseSlopeDegrees: 24, segmentIds: ['rd-001'] },
      'dimapur-kohima': { distanceKm: 68, etaMinutes: 110, baseSlopeDegrees: 25, segmentIds: ['rd-001'] },
      'silchar-imphal': { distanceKm: 205, etaMinutes: 285, baseSlopeDegrees: 23, segmentIds: ['rd-005'] },
      'dimapur-imphal': { distanceKm: 195, etaMinutes: 255, baseSlopeDegrees: 26, segmentIds: ['rd-001'] },
      'guwahati-kohima': { distanceKm: 339, etaMinutes: 420, baseSlopeDegrees: 22, segmentIds: ['rd-001'] },
      'guwahati-dimapur': { distanceKm: 265, etaMinutes: 310, baseSlopeDegrees: 18, segmentIds: ['rd-002'] },
      'guwahati-silchar': { distanceKm: 305, etaMinutes: 405, baseSlopeDegrees: 24, segmentIds: ['rd-004'] },
      'dimapur-silchar': { distanceKm: 170, etaMinutes: 250, baseSlopeDegrees: 22, segmentIds: ['rd-004'] },
      'kohima-imphal': { distanceKm: 132, etaMinutes: 175, baseSlopeDegrees: 27, segmentIds: ['rd-001'] },
    },
    waypointsByPair: {
      'guwahati-imphal': [
        [26.1445, 91.7362],
        [25.9093, 93.7265],
        [25.5000, 93.2000],
        [25.3200, 93.5500], // Mao Gate
        [24.8170, 93.9368],
      ],
      'kohima-silchar': [
        [25.6751, 94.1086],
        [25.3200, 93.5500],
        [25.1500, 93.2000],
        [24.9500, 92.9500],
        [24.8268, 92.7981],
      ],
      'dimapur-imphal': [
        [25.9093, 93.7265],
        [25.5000, 93.6500],
        [25.3200, 93.5500],
        [24.8170, 93.9368],
      ],
      'guwahati-kohima': [
        [26.1445, 91.7362],
        [25.7500, 93.4000],
        [25.6751, 94.1086],
      ],
      'dimapur-kohima': [
        [25.9093, 93.7265],
        [25.7800, 93.9500],
        [25.7200, 94.0200],
        [25.6751, 94.1086],
      ],
      'silchar-imphal': [
        [24.8268, 92.7981],
        [24.8000, 93.2500],
        [25.1000, 93.4500],
        [24.8170, 93.9368],
      ],
      'guwahati-dimapur': [
        [26.1445, 91.7362],
        [26.1800, 92.4500],
        [26.0500, 93.2000],
        [25.9093, 93.7265],
      ],
      'guwahati-silchar': [
        [26.1445, 91.7362],
        [25.7500, 91.8700],
        [25.3000, 92.3000],
        [24.8268, 92.7981],
      ],
      'dimapur-silchar': [
        [25.9093, 93.7265],
        [25.6000, 93.3500],
        [25.1500, 93.1000],
        [24.8268, 92.7981],
      ],
      'kohima-imphal': [
        [25.6751, 94.1086],
        [25.3200, 93.5500],
        [25.1500, 93.9500],
        [24.8170, 93.9368],
      ],
    },
  },
  {
    id: 'corridor-gamma-southern',
    corridorKey: 'southern_bypass',
    label: 'Route C — Lumding–Halflong Southern Bypass',
    corridorName: 'NH-27 / NH-37 Halflong–Silchar Continuity Highway',
    description: 'Via Lumding Hill Cutting, Halflong Pass & Jiribam Corridor',
    segmentIds: ['rd-004', 'rd-005'],
    baseSlopeDegrees: 18,
    historicalDisruptionsCount: 3,
    baseDistanceKm: 538,
    baseEtaMinutes: 670, // 11h 10m
    baseRiskScore: 32,
    baseRiskLevel: 'moderate',
    advantages: [
      'Bypasses Nagaland mountain passes completely',
      'Wide multi-lane highway engineered for heavy industrial convoys',
      'Consistent all-weather concrete pavement',
      'Strategic alternate corridor when NH-2 is severed',
    ],
    disadvantages: [
      'Longest total travel distance (+117 km vs NH-2)',
      '+145 minutes additional travel time',
      'Winding climb through Halflong hill segment',
    ],
    riskFactors: [
      'Occasional fog blankets in Halflong valley before 08:00',
      'Single-lane bridge bypass near Jiribam border',
    ],
    pairMetrics: {
      'guwahati-imphal': { distanceKm: 538, etaMinutes: 670, baseSlopeDegrees: 18, segmentIds: ['rd-004', 'rd-005'] },
      'kohima-silchar': { distanceKm: 280, etaMinutes: 420, baseSlopeDegrees: 17, segmentIds: ['rd-004', 'rd-005'] },
      'dimapur-kohima': { distanceKm: 82, etaMinutes: 135, baseSlopeDegrees: 18, segmentIds: ['rd-002'] },
      'silchar-imphal': { distanceKm: 235, etaMinutes: 330, baseSlopeDegrees: 18, segmentIds: ['rd-005'] },
      'dimapur-imphal': { distanceKm: 380, etaMinutes: 510, baseSlopeDegrees: 18, segmentIds: ['rd-004', 'rd-005'] },
      'guwahati-kohima': { distanceKm: 425, etaMinutes: 555, baseSlopeDegrees: 19, segmentIds: ['rd-004'] },
      'guwahati-dimapur': { distanceKm: 360, etaMinutes: 465, baseSlopeDegrees: 16, segmentIds: ['rd-004'] },
      'guwahati-silchar': { distanceKm: 345, etaMinutes: 465, baseSlopeDegrees: 18, segmentIds: ['rd-004'] },
      'dimapur-silchar': { distanceKm: 350, etaMinutes: 525, baseSlopeDegrees: 18, segmentIds: ['rd-004'] },
      'kohima-imphal': { distanceKm: 420, etaMinutes: 570, baseSlopeDegrees: 18, segmentIds: ['rd-004', 'rd-005'] },
    },
    waypointsByPair: {
      'guwahati-imphal': [
        [26.1445, 91.7362],
        [25.7500, 92.4000], // Shillong/Meghalaya edge
        [25.1800, 93.0200], // Halflong
        [24.8268, 92.7981], // Silchar depot
        [24.8000, 93.2500], // Jiribam
        [24.8170, 93.9368], // Imphal
      ],
      'kohima-silchar': [
        [25.6751, 94.1086],
        [25.2667, 94.0167],
        [24.8170, 93.9368],
        [24.8300, 93.5500],
        [24.8000, 93.1200],
        [24.8268, 92.7981],
      ],
      'dimapur-imphal': [
        [25.9093, 93.7265],
        [25.4000, 93.1500],
        [24.8268, 92.7981],
        [24.8000, 93.2500],
        [24.8170, 93.9368],
      ],
      'guwahati-kohima': [
        [26.1445, 91.7362],
        [25.7500, 92.4000],
        [25.1800, 93.0200],
        [25.6751, 94.1086],
      ],
      'dimapur-kohima': [
        [25.9093, 93.7265],
        [25.7600, 93.7900],
        [25.6900, 93.9500],
        [25.6751, 94.1086],
      ],
      'silchar-imphal': [
        [24.8268, 92.7981],
        [24.8000, 93.2000],
        [24.8150, 93.5800],
        [24.8170, 93.9368],
      ],
      'guwahati-dimapur': [
        [26.1445, 91.7362],
        [25.7500, 92.4000],
        [25.5000, 93.1000],
        [25.9093, 93.7265],
      ],
      'guwahati-silchar': [
        [26.1445, 91.7362],
        [26.1800, 92.4500],
        [25.8000, 93.1000],
        [25.1800, 93.0200],
        [24.8268, 92.7981],
      ],
      'dimapur-silchar': [
        [25.9093, 93.7265],
        [25.6751, 94.1086],
        [24.8170, 93.9368],
        [24.8000, 93.1200],
        [24.8268, 92.7981],
      ],
      'kohima-imphal': [
        [25.6751, 94.1086],
        [25.9093, 93.7265],
        [24.8268, 92.7981],
        [24.8170, 93.9368],
      ],
    },
  },
  {
    id: 'corridor-delta-ridge',
    corridorKey: 'wokha_ridge',
    label: 'Route D — Wokha Ridge Agile Corridor',
    corridorName: 'Secondary Hill Highway 39A (Wokha–Mokokchung Ridge)',
    description: 'Via Golaghat Foothills & Mokokchung Agricultural Ridgeline',
    segmentIds: ['rd-002', 'rd-005'],
    baseSlopeDegrees: 22,
    historicalDisruptionsCount: 4,
    baseDistanceKm: 465,
    baseEtaMinutes: 585, // 9h 45m
    baseRiskScore: 48,
    baseRiskLevel: 'moderate',
    advantages: [
      'Balanced travel time between Route A and Route B',
      'Dense settlement density: high cellular connectivity & repair nodes',
      'Multiple regional buffer godowns within 25 km reach',
      'Excellent agility for Light Goods Vehicles & medical vans',
    ],
    disadvantages: [
      'Restricted load limit (12T gross) — unsuitable for 10-wheeler trucks',
      'Tight switchback turns requiring low-gear transit',
    ],
    riskFactors: [
      '22° ridge slope with loose scree margins',
      'Narrow shoulder clearance on Mokokchung ridge road',
    ],
    pairMetrics: {
      'guwahati-imphal': { distanceKm: 465, etaMinutes: 585, baseSlopeDegrees: 22, segmentIds: ['rd-002', 'rd-005'] },
      'kohima-silchar': { distanceKm: 295, etaMinutes: 450, baseSlopeDegrees: 22, segmentIds: ['rd-002', 'rd-004'] },
      'dimapur-kohima': { distanceKm: 88, etaMinutes: 145, baseSlopeDegrees: 22, segmentIds: ['rd-002'] },
      'silchar-imphal': { distanceKm: 245, etaMinutes: 360, baseSlopeDegrees: 21, segmentIds: ['rd-005'] },
      'dimapur-imphal': { distanceKm: 235, etaMinutes: 330, baseSlopeDegrees: 23, segmentIds: ['rd-002', 'rd-005'] },
      'guwahati-kohima': { distanceKm: 385, etaMinutes: 510, baseSlopeDegrees: 22, segmentIds: ['rd-002'] },
      'guwahati-dimapur': { distanceKm: 310, etaMinutes: 390, baseSlopeDegrees: 19, segmentIds: ['rd-002'] },
      'guwahati-silchar': { distanceKm: 330, etaMinutes: 450, baseSlopeDegrees: 22, segmentIds: ['rd-004'] },
      'dimapur-silchar': { distanceKm: 220, etaMinutes: 315, baseSlopeDegrees: 21, segmentIds: ['rd-004'] },
      'kohima-imphal': { distanceKm: 175, etaMinutes: 285, baseSlopeDegrees: 24, segmentIds: ['rd-005'] },
    },
    waypointsByPair: {
      'guwahati-imphal': [
        [26.1445, 91.7362],
        [26.3000, 92.6500],
        [26.0500, 93.9000],
        [25.7500, 94.2000],
        [25.3500, 94.1000],
        [24.8170, 93.9368],
      ],
      'kohima-silchar': [
        [25.6751, 94.1086],
        [26.1000, 94.2600],
        [25.9093, 93.7265],
        [25.4000, 93.1500],
        [24.8268, 92.7981],
      ],
      'dimapur-imphal': [
        [25.9093, 93.7265],
        [25.8500, 94.1000],
        [25.6751, 94.1086],
        [25.4000, 94.1500],
        [24.8170, 93.9368],
      ],
      'guwahati-kohima': [
        [26.1445, 91.7362],
        [26.2000, 93.3000],
        [26.1000, 94.2600],
        [25.6751, 94.1086],
      ],
      'dimapur-kohima': [
        [25.9093, 93.7265],
        [25.9500, 94.0200],
        [25.8000, 94.1200],
        [25.6751, 94.1086],
      ],
      'silchar-imphal': [
        [24.8268, 92.7981],
        [24.8800, 93.4000],
        [24.8500, 93.7000],
        [24.8170, 93.9368],
      ],
      'guwahati-dimapur': [
        [26.1445, 91.7362],
        [26.3000, 92.6500],
        [26.2000, 93.5000],
        [25.9093, 93.7265],
      ],
      'guwahati-silchar': [
        [26.1445, 91.7362],
        [25.6500, 92.1000],
        [25.1000, 92.6000],
        [24.8268, 92.7981],
      ],
      'dimapur-silchar': [
        [25.9093, 93.7265],
        [26.0500, 93.6000],
        [25.4000, 93.1500],
        [24.8268, 92.7981],
      ],
      'kohima-imphal': [
        [25.6751, 94.1086],
        [25.5500, 94.3000],
        [25.1000, 94.3500],
        [24.8170, 93.9368],
      ],
    },
  },
];
