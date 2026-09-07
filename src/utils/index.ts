import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel, IncidentSeverity, IncidentSyncStatus, VehicleStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEta(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return '#16a34a';
    case 'moderate': return '#d97706';
    case 'high': return '#dc2626';
    case 'blocked': return '#7f1d1d';
  }
}

export function getRiskBg(level: RiskLevel): string {
  switch (level) {
    case 'low': return '#f0fdf4';
    case 'moderate': return '#fffbeb';
    case 'high': return '#fef2f2';
    case 'blocked': return '#fef2f2';
  }
}

export function getRiskBorder(level: RiskLevel): string {
  switch (level) {
    case 'low': return '#bbf7d0';
    case 'moderate': return '#fde68a';
    case 'high': return '#fecaca';
    case 'blocked': return '#fca5a5';
  }
}

export function getRiskLabel(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'Low Risk';
    case 'moderate': return 'Moderate Risk';
    case 'high': return 'High Risk';
    case 'blocked': return 'Blocked';
  }
}

export function getSeverityLabel(severity: IncidentSeverity): string {
  switch (severity) {
    case 'low': return 'Low';
    case 'moderate': return 'Moderate';
    case 'high': return 'High';
    case 'critical': return 'Critical';
  }
}

export function getSeverityColor(severity: IncidentSeverity): string {
  switch (severity) {
    case 'low': return '#16a34a';
    case 'moderate': return '#d97706';
    case 'high': return '#dc2626';
    case 'critical': return '#7f1d1d';
  }
}

export function getSyncStatusLabel(status: IncidentSyncStatus): string {
  switch (status) {
    case 'local_pending': return 'Local — Pending Sync';
    case 'synced': return 'Synced';
    case 'pending_verification': return 'Awaiting Verification';
    case 'verified': return 'Verified';
    case 'rejected': return 'Rejected';
  }
}

export function getVehicleStatusLabel(status: VehicleStatus): string {
  switch (status) {
    case 'on_route': return 'On Route';
    case 'idle': return 'Idle';
    case 'disrupted': return 'Disrupted';
    case 'offline': return 'Offline';
    case 'emergency_pickup': return 'Emergency Pickup';
  }
}

export function getIncidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    landslide: 'Landslide / Mudslip',
    flood: 'Flood / Waterlogging',
    rockfall: 'Rockfall / Debris',
    road_washout: 'Road Washout / Erosion',
    bridge_damage: 'Bridge Structural Damage',
    tree_fall: 'Fallen Tree / Powerline',
    vehicle_accident: 'Vehicle Accident / Obstruction',
    severe_weather: 'Severe Weather / Dense Fog',
    road_closure: 'Administrative Road Closure',
    pothole_surface: 'Severe Pothole / Surface Damage',
    fire_smoke: 'Forest Fire / Smoke Obstruction',
    fog: 'Dense Mountain Fog',
    other: 'Other Hazard',
  };
  return labels[type] ?? type;
}

export function riskScoreToLevel(score: number): RiskLevel {
  if (score < 30) return 'low';
  if (score < 60) return 'moderate';
  if (score < 85) return 'high';
  return 'blocked';
}
