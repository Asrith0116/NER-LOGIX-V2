import type { WeatherDataPoint, EnvironmentalSnapshot } from '@/types';

// Key geographical nodes across North Eastern Region
export const NER_WEATHER_NODES: Record<string, { lat: number; lng: number; defaultTemp: number; defaultRain: number }> = {
  Guwahati: { lat: 26.1445, lng: 91.7362, defaultTemp: 27, defaultRain: 12.4 },
  Shillong: { lat: 25.5788, lng: 91.8933, defaultTemp: 20, defaultRain: 28.6 },
  Dimapur: { lat: 25.9093, lng: 93.7265, defaultTemp: 28, defaultRain: 18.2 },
  Kohima: { lat: 25.6751, lng: 94.1086, defaultTemp: 21, defaultRain: 34.8 },
  Imphal: { lat: 24.8170, lng: 93.9368, defaultTemp: 24, defaultRain: 22.0 },
  Silchar: { lat: 24.8268, lng: 92.7981, defaultTemp: 29, defaultRain: 41.5 },
  Aizawl: { lat: 23.7271, lng: 92.7176, defaultTemp: 22, defaultRain: 31.0 },
  'Mao Pass': { lat: 25.32, lng: 93.55, defaultTemp: 19, defaultRain: 38.0 },
  'Karbi Anglong': { lat: 26.1800, lng: 93.4500, defaultTemp: 26, defaultRain: 14.0 },
  Doyyang: { lat: 26.0500, lng: 93.9000, defaultTemp: 25, defaultRain: 16.0 },
  Halflong: { lat: 25.1800, lng: 93.0200, defaultTemp: 23, defaultRain: 18.0 },
  Wokha: { lat: 26.1000, lng: 94.2600, defaultTemp: 21, defaultRain: 20.0 },
  Mokokchung: { lat: 26.3200, lng: 94.5200, defaultTemp: 20, defaultRain: 22.0 },
};

function categorizeRainfall(mm: number): WeatherDataPoint['rainfallCategory'] {
  if (mm < 1) return 'none';
  if (mm < 7.5) return 'light';
  if (mm < 30) return 'moderate';
  if (mm < 60) return 'heavy';
  return 'torrential';
}

function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Mountain fog & mist';
  if (code <= 55) return 'Light drizzle';
  if (code <= 65) return 'Rain showers';
  if (code <= 82) return 'Heavy monsoonal rain';
  if (code >= 95) return 'Thunderstorm & cloudburst';
  return 'Overcast';
}

export function formatWeatherFreshness(timestampMs: number, source: 'Open-Meteo' | 'Fallback / Demo'): string {
  if (source === 'Fallback / Demo') {
    return 'Fallback Demo Model';
  }
  const diffMinutes = Math.floor((Date.now() - timestampMs) / 60000);
  if (diffMinutes <= 1) return 'Updated just now';
  if (diffMinutes < 60) return `Updated ${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `Updated ${diffHours}h ago`;
}

export interface EnvironmentalProvider {
  id: string;
  name: string;
  fetchEnvironment(locationName: string): Promise<EnvironmentalSnapshot>;
  fetchAllRegionalEnvironment(): Promise<Record<string, EnvironmentalSnapshot>>;
}

// In-memory cache for live weather
const weatherCache = new Map<string, { data: EnvironmentalSnapshot; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Live Open-Meteo provider for real-world meteorological data
 */
export class OpenMeteoEnvironmentalProvider implements EnvironmentalProvider {
  id = 'open-meteo-live';
  name = 'Open-Meteo Live Forecast Engine';

  async fetchEnvironment(locationName: string): Promise<EnvironmentalSnapshot> {
    const node = NER_WEATHER_NODES[locationName] || NER_WEATHER_NODES['Guwahati'];
    const cacheKey = locationName.toLowerCase();

    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        ...cached.data,
        freshness: formatWeatherFreshness(cached.timestamp, cached.data.source),
      };
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${node.lat}&longitude=${node.lng}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation&timezone=Asia%2FKolkata`;
      const response = await fetch(url, { signal: AbortSignal.timeout(3500) });

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP ${response.status}`);
      }

      const json = await response.json();
      const current = json.current || {};
      const precip = Number(current.precipitation ?? current.rain ?? 0);
      const hourly = json.hourly?.precipitation || [];
      const forecast24h = (hourly.slice(0, 24) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);
      const now = new Date().toISOString();

      const point: EnvironmentalSnapshot = {
        locationName,
        lat: node.lat,
        lng: node.lng,
        temperatureC: Math.round(Number(current.temperature_2m ?? node.defaultTemp)),
        precipitationMm: Math.round(precip * 10) / 10,
        precipitationIntensity: categorizeRainfall(precip),
        rainfallCategory: categorizeRainfall(precip),
        windSpeedKmh: Math.round(Number(current.wind_speed_10m ?? 12)),
        weatherCode: Number(current.weather_code ?? 61),
        weatherDescription: getWeatherDescription(Number(current.weather_code ?? 61)),
        forecast24hMm: Math.round(forecast24h * 10) / 10,
        updatedAt: now,
        observedAt: now,
        source: 'Open-Meteo',
        freshness: 'Updated just now',
        availabilityState: 'live',
        isSimulated: false,
      };

      weatherCache.set(cacheKey, { data: point, timestamp: Date.now() });
      return point;
    } catch {
      // Graceful deterministic fallback
      return fallbackProvider.fetchEnvironment(locationName);
    }
  }

  async fetchAllRegionalEnvironment(): Promise<Record<string, EnvironmentalSnapshot>> {
    const results: Record<string, EnvironmentalSnapshot> = {};
    await Promise.all(
      Object.keys(NER_WEATHER_NODES).map(async (name) => {
        results[name] = await this.fetchEnvironment(name);
      })
    );
    return results;
  }
}

/**
 * Deterministic Fallback Environmental Provider (Offline resilient)
 */
export class DeterministicFallbackEnvironmentalProvider implements EnvironmentalProvider {
  id = 'fallback-deterministic';
  name = 'Regional Terrain Baseline (Offline Cache)';

  async fetchEnvironment(locationName: string): Promise<EnvironmentalSnapshot> {
    const node = NER_WEATHER_NODES[locationName] || NER_WEATHER_NODES['Guwahati'];
    const now = new Date().toISOString();

    const fallbackPoint: EnvironmentalSnapshot = {
      locationName,
      lat: node.lat,
      lng: node.lng,
      temperatureC: node.defaultTemp,
      precipitationMm: node.defaultRain,
      precipitationIntensity: categorizeRainfall(node.defaultRain),
      rainfallCategory: categorizeRainfall(node.defaultRain),
      windSpeedKmh: 18,
      weatherCode: 65,
      weatherDescription: 'Monsoon showers (Fallback demo baseline)',
      forecast24hMm: Math.round(node.defaultRain * 3.5),
      updatedAt: now,
      observedAt: now,
      source: 'Fallback / Demo',
      freshness: 'Fallback Demo Model',
      availabilityState: 'fallback',
      isSimulated: true,
    };
    return fallbackPoint;
  }

  async fetchAllRegionalEnvironment(): Promise<Record<string, EnvironmentalSnapshot>> {
    const results: Record<string, EnvironmentalSnapshot> = {};
    for (const name of Object.keys(NER_WEATHER_NODES)) {
      results[name] = await this.fetchEnvironment(name);
    }
    return results;
  }
}

const liveProvider = new OpenMeteoEnvironmentalProvider();
const fallbackProvider = new DeterministicFallbackEnvironmentalProvider();

export async function fetchLiveWeather(locationName: string): Promise<EnvironmentalSnapshot> {
  return liveProvider.fetchEnvironment(locationName);
}

export function getBaselineRegionalWeather(spikeActive = false): Record<string, EnvironmentalSnapshot> {
  const now = new Date().toISOString();
  const results: Record<string, EnvironmentalSnapshot> = {};
  for (const name of Object.keys(NER_WEATHER_NODES)) {
    const node = NER_WEATHER_NODES[name];
    results[name] = {
      locationName: name,
      lat: node.lat,
      lng: node.lng,
      temperatureC: node.defaultTemp,
      precipitationMm: node.defaultRain,
      precipitationIntensity: categorizeRainfall(node.defaultRain),
      rainfallCategory: categorizeRainfall(node.defaultRain),
      windSpeedKmh: 18,
      weatherCode: 65,
      weatherDescription: 'Monsoon showers (Terrain baseline)',
      forecast24hMm: Math.round(node.defaultRain * 3.5),
      updatedAt: now,
      observedAt: now,
      source: 'Fallback / Demo',
      freshness: 'Regional Baseline',
      availabilityState: 'fallback',
      isSimulated: true,
    };
  }

  if (spikeActive) {
    return applySpikeToRegionalWeather(results, true);
  }
  return results;
}

export function applySpikeToRegionalWeather(
  base: Record<string, EnvironmentalSnapshot>,
  active: boolean
): Record<string, EnvironmentalSnapshot> {
  if (!active) return base;

  const now = new Date().toISOString();
  const spiked = { ...base };

  // Cloudburst epicenter over Karbi Anglong and Doyyang corridor (45 mm/h)
  spiked['Karbi Anglong'] = {
    ...(spiked['Karbi Anglong'] || {
      locationName: 'Karbi Anglong',
      lat: 26.18,
      lng: 93.45,
      temperatureC: 24,
      windSpeedKmh: 35,
      weatherCode: 95,
      forecast24hMm: 140,
      source: 'Fallback / Demo',
      freshness: 'Simulated Spike',
      availabilityState: 'live',
    }),
    precipitationMm: 45.0,
    precipitationIntensity: 'torrential',
    rainfallCategory: 'torrential',
    weatherDescription: 'Torrential cloudburst (45 mm/h) · Flash flood & mudslide warning',
    updatedAt: now,
    observedAt: now,
    isSimulated: true,
  };

  spiked['Doyyang'] = {
    ...(spiked['Doyyang'] || {
      locationName: 'Doyyang',
      lat: 26.05,
      lng: 93.9,
      temperatureC: 23,
      windSpeedKmh: 32,
      weatherCode: 95,
      forecast24hMm: 135,
      source: 'Fallback / Demo',
      freshness: 'Simulated Spike',
      availabilityState: 'live',
    }),
    precipitationMm: 44.5,
    precipitationIntensity: 'torrential',
    rainfallCategory: 'torrential',
    weatherDescription: 'Torrential river basin downpour (44.5 mm/h) · Submerged bridge advisory',
    updatedAt: now,
    observedAt: now,
    isSimulated: true,
  };

  spiked['Dimapur'] = {
    ...(spiked['Dimapur'] || {
      locationName: 'Dimapur',
      lat: 25.9093,
      lng: 93.7265,
      temperatureC: 25,
      windSpeedKmh: 28,
      weatherCode: 82,
      forecast24hMm: 95,
      source: 'Fallback / Demo',
      freshness: 'Simulated Spike',
      availabilityState: 'live',
    }),
    precipitationMm: 38.0,
    precipitationIntensity: 'heavy',
    rainfallCategory: 'heavy',
    weatherDescription: 'Severe monsoonal rainstorm (38 mm/h)',
    updatedAt: now,
    observedAt: now,
    isSimulated: true,
  };

  spiked['Kohima'] = {
    ...(spiked['Kohima'] || {
      locationName: 'Kohima',
      lat: 25.6751,
      lng: 94.1086,
      temperatureC: 20,
      windSpeedKmh: 24,
      weatherCode: 82,
      forecast24hMm: 85,
      source: 'Fallback / Demo',
      freshness: 'Simulated Spike',
      availabilityState: 'live',
    }),
    precipitationMm: 32.0,
    precipitationIntensity: 'heavy',
    rainfallCategory: 'heavy',
    weatherDescription: 'Heavy mountain rainfall (32 mm/h)',
    updatedAt: now,
    observedAt: now,
    isSimulated: true,
  };

  return spiked;
}

export async function fetchAllRegionalWeather(spikeActive = false): Promise<Record<string, EnvironmentalSnapshot>> {
  try {
    const liveData = await liveProvider.fetchAllRegionalEnvironment();
    if (spikeActive) {
      return applySpikeToRegionalWeather(liveData, true);
    }
    return liveData;
  } catch {
    return getBaselineRegionalWeather(spikeActive);
  }
}
