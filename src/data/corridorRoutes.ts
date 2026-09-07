import type { RiskLevel } from '@/types';

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
        [25.6751, 94.1086],
      ],
      'dimapur-kohima': [
        [25.9093, 93.7265],
        [25.7900, 93.8800],
        [25.6751, 94.1086],
      ],
      'silchar-imphal': [
        [24.8268, 92.7981],
        [24.8000, 93.3000],
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
    waypointsByPair: {
      'guwahati-imphal': [
        [26.1445, 91.7362],
        [25.9093, 93.7265],
        [25.5000, 93.2000],
        [25.3200, 93.5500], // Mao Gate
        [24.8170, 93.9368],
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
        [25.7000, 93.9500],
        [25.6751, 94.1086],
      ],
      'silchar-imphal': [
        [24.8268, 92.7981],
        [25.1000, 93.4500],
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
    waypointsByPair: {
      'guwahati-imphal': [
        [26.1445, 91.7362],
        [25.7500, 92.4000], // Shillong/Meghalaya edge
        [25.1800, 93.0200], // Halflong
        [24.8268, 92.7981], // Silchar depot
        [24.8000, 93.2500], // Jiribam
        [24.8170, 93.9368], // Imphal
      ],
      'dimapur-imphal': [
        [25.9093, 93.7265],
        [25.4000, 93.1500],
        [24.8268, 92.7981],
        [24.8170, 93.9368],
      ],
      'guwahati-kohima': [
        [26.1445, 91.7362],
        [25.8500, 92.8000],
        [25.6751, 94.1086],
      ],
      'dimapur-kohima': [
        [25.9093, 93.7265],
        [25.6751, 94.1086],
      ],
      'silchar-imphal': [
        [24.8268, 92.7981],
        [24.8000, 93.2000],
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
    waypointsByPair: {
      'guwahati-imphal': [
        [26.1445, 91.7362],
        [26.3000, 92.6500],
        [26.0500, 93.9000],
        [25.7500, 94.2000],
        [25.3500, 94.1000],
        [24.8170, 93.9368],
      ],
      'dimapur-imphal': [
        [25.9093, 93.7265],
        [25.8500, 94.1000],
        [25.4000, 94.1500],
        [24.8170, 93.9368],
      ],
      'guwahati-kohima': [
        [26.1445, 91.7362],
        [26.2000, 93.3000],
        [25.6751, 94.1086],
      ],
      'dimapur-kohima': [
        [25.9093, 93.7265],
        [25.7800, 94.0500],
        [25.6751, 94.1086],
      ],
      'silchar-imphal': [
        [24.8268, 92.7981],
        [24.8800, 93.4000],
        [24.8170, 93.9368],
      ],
    },
  },
];
