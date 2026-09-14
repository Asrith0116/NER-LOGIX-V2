import type {
  BackendVehiclePosition,
  VehiclePositionUpdatePayload,
} from '../../src/types/index.ts';

/**
 * Backend Vehicle Position Boundary Service
 * 
 * Provides a backend-authoritative boundary for vehicle positions.
 * Currently consumes simulated client-side movement and dispatcher updates.
 * Architected to seamlessly connect to external telematics gateway in future phases.
 * 
 * Honesty Notice: No hardware GPS telemetry is claimed; positions are labeled
 * as simulated client signal / manual entry.
 */

export class BackendVehiclePositionService {
  private positions: Map<string, BackendVehiclePosition> = new Map();

  constructor() {
    this.seedBaselinePositions();
  }

  public seedBaselinePositions() {
    const baseline: BackendVehiclePosition[] = [
      {
        vehicleId: 'AS-01-J-4422',
        latitude: 25.682,
        longitude: 94.112,
        speedKmh: 42,
        heading: 175,
        accuracyMeters: 8,
        timestamp: new Date().toISOString(),
        source: 'simulated_driver_client',
        isSimulated: true,
        telemetryState: 'simulated_client_signal',
        nearestLocation: '12 km South of Kohima on NH-2',
        provenance: {
          description: 'Backend position signal (Simulated Client Feed)',
          isHardwareTelematics: false,
        },
      },
      {
        vehicleId: 'NL-07-A-8819',
        latitude: 25.850,
        longitude: 93.810,
        speedKmh: 55,
        heading: 140,
        accuracyMeters: 10,
        timestamp: new Date().toISOString(),
        source: 'simulated_driver_client',
        isSimulated: true,
        telemetryState: 'simulated_client_signal',
        nearestLocation: 'NH-29 Foothill Cut near Chumukedima',
        provenance: {
          description: 'Backend position signal (Simulated Client Feed)',
          isHardwareTelematics: false,
        },
      },
      {
        vehicleId: 'MN-01-B-9901',
        latitude: 24.817,
        longitude: 93.936,
        speedKmh: 0,
        heading: 0,
        accuracyMeters: 5,
        timestamp: new Date().toISOString(),
        source: 'simulated_driver_client',
        isSimulated: true,
        telemetryState: 'simulated_client_signal',
        nearestLocation: 'Imphal Central Relief Godown',
        provenance: {
          description: 'Backend position signal (Stationary Warehouse Berth)',
          isHardwareTelematics: false,
        },
      },
      {
        vehicleId: 'MZ-01-C-5544',
        latitude: 25.578,
        longitude: 91.893,
        speedKmh: 48,
        heading: 110,
        accuracyMeters: 12,
        timestamp: new Date().toISOString(),
        source: 'simulated_driver_client',
        isSimulated: true,
        telemetryState: 'simulated_client_signal',
        nearestLocation: 'Shillong East Bypass (NH-6)',
        provenance: {
          description: 'Backend position signal (Simulated Client Feed)',
          isHardwareTelematics: false,
        },
      },
      {
        vehicleId: 'ML-05-D-2211',
        latitude: 26.144,
        longitude: 91.736,
        speedKmh: 0,
        heading: 0,
        accuracyMeters: 5,
        timestamp: new Date().toISOString(),
        source: 'simulated_driver_client',
        isSimulated: true,
        telemetryState: 'simulated_client_signal',
        nearestLocation: 'Guwahati Logistics Hub',
        provenance: {
          description: 'Backend position signal (Staged for Departure)',
          isHardwareTelematics: false,
        },
      },
    ];

    this.positions.clear();
    for (const pos of baseline) {
      this.positions.set(pos.vehicleId, pos);
    }
  }

  public updatePosition(payload: VehiclePositionUpdatePayload): BackendVehiclePosition {
    const existing = this.positions.get(payload.vehicleId);
    const source = payload.source || existing?.source || 'simulated_driver_client';
    const isSim = source === 'simulated_driver_client' || source === 'manual_dispatcher';

    const updated: BackendVehiclePosition = {
      vehicleId: payload.vehicleId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speedKmh: payload.speedKmh ?? existing?.speedKmh ?? 0,
      heading: payload.heading ?? existing?.heading ?? 0,
      accuracyMeters: payload.accuracyMeters ?? existing?.accuracyMeters ?? 10,
      timestamp: payload.timestamp || new Date().toISOString(),
      source,
      isSimulated: isSim,
      telemetryState: isSim ? 'simulated_client_signal' : 'active_gateway',
      nearestLocation: existing?.nearestLocation || `${payload.latitude.toFixed(3)}°N, ${payload.longitude.toFixed(3)}°E`,
      provenance: {
        description: isSim
          ? 'Backend position signal (Client/Dispatcher Input)'
          : 'External Gateway Telemetry Feed',
        isHardwareTelematics: !isSim,
      },
    };

    this.positions.set(payload.vehicleId, updated);
    return updated;
  }

  public batchUpdatePositions(payloads: VehiclePositionUpdatePayload[]): BackendVehiclePosition[] {
    return payloads.map((p) => this.updatePosition(p));
  }

  public getPosition(vehicleId: string): BackendVehiclePosition | null {
    return this.positions.get(vehicleId) || null;
  }

  public getAllPositions(): BackendVehiclePosition[] {
    return Array.from(this.positions.values());
  }

  public resetToCleanState() {
    this.seedBaselinePositions();
  }
}

export const backendVehiclePositionService = new BackendVehiclePositionService();
export { BackendVehiclePositionService as VehiclePositionService };

