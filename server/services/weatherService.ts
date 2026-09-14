import type { EnvironmentalSnapshot, WeatherDataPoint } from '../../src/types/index.ts';

// Geographical nodes across the North Eastern Region corridors
export const NER_WEATHER_NODES: Record<
  string,
  { lat: number; lng: number; defaultTemp: number; defaultRain: number }
> = {
  Guwahati: { lat: 26.1445, lng: 91.7362, defaultTemp: 27, defaultRain: 12.4 },
  Shillong: { lat: 25.5788, lng: 91.8933, defaultTemp: 20, defaultRain: 28.6 },
  Dimapur: { lat: 25.9093, lng: 93.7265, defaultTemp: 28, defaultRain: 18.2 },
  Kohima: { lat: 25.6751, lng: 94.1086, defaultTemp: 21, defaultRain: 34.8 },
  Imphal: { lat: 24.817, lng: 93.9368, defaultTemp: 24, defaultRain: 22.0 },
  Silchar: { lat: 24.8268, lng: 92.7981, defaultTemp: 29, defaultRain: 41.5 },
  Aizawl: { lat: 23.7271, lng: 92.7176, defaultTemp: 22, defaultRain: 31.0 },
  'Mao Pass': { lat: 25.32, lng: 93.55, defaultTemp: 19, defaultRain: 38.0 },
  'Karbi Anglong': { lat: 26.18, lng: 93.45, defaultTemp: 26, defaultRain: 14.0 },
  Doyyang: { lat: 26.05, lng: 93.9, defaultTemp: 25, defaultRain: 16.0 },
  Halflong: { lat: 25.18, lng: 93.02, defaultTemp: 23, defaultRain: 18.0 },
  Wokha: { lat: 26.1, lng: 94.26, defaultTemp: 21, defaultRain: 20.0 },
  Senapati: { lat: 25.2667, lng: 94.0167, defaultTemp: 22, defaultRain: 24.0 },
};

export function categorizeRainfall(mm: number): WeatherDataPoint['rainfallCategory'] {
  if (mm < 1) return 'none';
  if (mm < 7.5) return 'light';
  if (mm < 30) return 'moderate';
  if (mm < 60) return 'heavy';
  return 'torrential';
}

export function getWeatherDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Mountain fog & mist';
  if (code <= 55) return 'Light drizzle';
  if (code <= 65) return 'Rain showers';
  if (code <= 82) return 'Heavy monsoonal rain';
  if (code >= 95) return 'Thunderstorm & cloudburst';
  return 'Overcast';
}

export interface CachedWeatherEntry {
  data: EnvironmentalSnapshot;
  cachedAtMs: number;
}

export class BackendWeatherService {
  private cache = new Map<string, CachedWeatherEntry>();
  private cacheTtlMs = 10 * 60 * 1000; // 10 minutes cache TTL
  private isSpikeActive = false;

  constructor(cacheTtlMs?: number) {
    if (typeof cacheTtlMs === 'number') {
      this.cacheTtlMs = cacheTtlMs;
    }
  }

  public setSpike(active: boolean): void {
    this.isSpikeActive = active;
  }

  public getSpikeStatus(): boolean {
    return this.isSpikeActive;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Normalizes raw Open-Meteo JSON into standard EnvironmentalSnapshot
   */
  public normalizeOpenMeteoPayload(
    locationName: string,
    lat: number,
    lng: number,
    rawJson: any,
    defaultTemp = 24
  ): EnvironmentalSnapshot {
    const current = rawJson?.current || {};
    const precip = Number(current.precipitation ?? current.rain ?? 0);
    const hourly = rawJson?.hourly?.precipitation || [];
    const forecast24h = (hourly.slice(0, 24) as number[]).reduce(
      (acc: number, val: number) => acc + (Number(val) || 0),
      0
    );
    const now = new Date().toISOString();
    const weatherCode = Number(current.weather_code ?? 61);

    return {
      locationName,
      lat,
      lng,
      temperatureC: Math.round(Number(current.temperature_2m ?? defaultTemp)),
      precipitationMm: Math.round(precip * 10) / 10,
      precipitationIntensity: categorizeRainfall(precip),
      rainfallCategory: categorizeRainfall(precip),
      windSpeedKmh: Math.round(Number(current.wind_speed_10m ?? 12)),
      weatherCode,
      weatherDescription: getWeatherDescription(weatherCode),
      forecast24hMm: Math.round(forecast24h * 10) / 10,
      updatedAt: now,
      observedAt: now,
      source: 'Open-Meteo',
      freshness: 'Updated just now (Backend Live Feed)',
      availabilityState: 'live',
      isSimulated: false,
    };
  }

  /**
   * Provides deterministic regional baseline when external API is unreachable or times out
   */
  public getDeterministicFallback(locationName: string): EnvironmentalSnapshot {
    const node = NER_WEATHER_NODES[locationName] || NER_WEATHER_NODES['Guwahati'];
    const now = new Date().toISOString();

    return {
      locationName,
      lat: node.lat,
      lng: node.lng,
      temperatureC: node.defaultTemp,
      precipitationMm: node.defaultRain,
      precipitationIntensity: categorizeRainfall(node.defaultRain),
      rainfallCategory: categorizeRainfall(node.defaultRain),
      windSpeedKmh: 18,
      weatherCode: 65,
      weatherDescription: 'Monsoon showers (Regional Baseline)',
      forecast24hMm: Math.round(node.defaultRain * 3.5),
      updatedAt: now,
      observedAt: now,
      source: 'Fallback / Demo',
      freshness: 'Regional Baseline (Offline Cache)',
      availabilityState: 'fallback',
      isSimulated: true,
    };
  }

  /**
   * Fetches weather for a single geographical node with caching and timeout
   */
  public async fetchLocationWeather(
    locationName: string,
    fetchFn: typeof fetch = fetch
  ): Promise<EnvironmentalSnapshot> {
    const node = NER_WEATHER_NODES[locationName] || NER_WEATHER_NODES['Guwahati'];
    const cacheKey = locationName.toLowerCase();
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAtMs < this.cacheTtlMs) {
      return cached.data;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${node.lat}&longitude=${node.lng}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation&timezone=Asia%2FKolkata`;
      const response = await fetchFn(url, { signal: AbortSignal.timeout(3500) });

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP ${response.status}`);
      }

      const rawJson = await response.json();
      const normalized = this.normalizeOpenMeteoPayload(
        locationName,
        node.lat,
        node.lng,
        rawJson,
        node.defaultTemp
      );

      this.cache.set(cacheKey, { data: normalized, cachedAtMs: Date.now() });
      return normalized;
    } catch (err) {
      console.warn(`[BackendWeatherService] Fallback for ${locationName}:`, (err as Error).message);
      return this.getDeterministicFallback(locationName);
    }
  }

  /**
   * Fetches regional weather across all NER corridor nodes
   */
  public async fetchRegionalWeather(
    fetchFn: typeof fetch = fetch
  ): Promise<Record<string, EnvironmentalSnapshot>> {
    const results: Record<string, EnvironmentalSnapshot> = {};
    const nodeNames = Object.keys(NER_WEATHER_NODES);

    await Promise.all(
      nodeNames.map(async (name) => {
        results[name] = await this.fetchLocationWeather(name, fetchFn);
      })
    );

    if (this.isSpikeActive) {
      return this.applySimulatedSpike(results);
    }

    return results;
  }

  /**
   * Simulates a localized monsoon cloudburst over critical corridors (Karbi Anglong, Doyyang)
   */
  public applySimulatedSpike(
    base: Record<string, EnvironmentalSnapshot>
  ): Record<string, EnvironmentalSnapshot> {
    const now = new Date().toISOString();
    const spiked = { ...base };

    spiked['Karbi Anglong'] = {
      ...(spiked['Karbi Anglong'] || this.getDeterministicFallback('Karbi Anglong')),
      precipitationMm: 45.0,
      precipitationIntensity: 'torrential',
      rainfallCategory: 'torrential',
      weatherCode: 95,
      weatherDescription: 'Torrential cloudburst (45 mm/h) · Flash flood & mudslide warning',
      source: 'Fallback / Demo',
      freshness: 'Simulated Weather Spike',
      isSimulated: true,
      updatedAt: now,
      observedAt: now,
    };

    spiked['Doyyang'] = {
      ...(spiked['Doyyang'] || this.getDeterministicFallback('Doyyang')),
      precipitationMm: 44.5,
      precipitationIntensity: 'torrential',
      rainfallCategory: 'torrential',
      weatherCode: 95,
      weatherDescription: 'Torrential river basin downpour (44.5 mm/h) · Submerged bridge advisory',
      source: 'Fallback / Demo',
      freshness: 'Simulated Weather Spike',
      isSimulated: true,
      updatedAt: now,
      observedAt: now,
    };

    spiked['Dimapur'] = {
      ...(spiked['Dimapur'] || this.getDeterministicFallback('Dimapur')),
      precipitationMm: 38.0,
      precipitationIntensity: 'heavy',
      rainfallCategory: 'heavy',
      weatherCode: 82,
      weatherDescription: 'Severe monsoonal rainstorm (38 mm/h)',
      source: 'Fallback / Demo',
      freshness: 'Simulated Weather Spike',
      isSimulated: true,
      updatedAt: now,
      observedAt: now,
    };

    spiked['Kohima'] = {
      ...(spiked['Kohima'] || this.getDeterministicFallback('Kohima')),
      precipitationMm: 32.0,
      precipitationIntensity: 'heavy',
      rainfallCategory: 'heavy',
      weatherCode: 82,
      weatherDescription: 'Heavy mountain rainfall (32 mm/h)',
      source: 'Fallback / Demo',
      freshness: 'Simulated Weather Spike',
      isSimulated: true,
      updatedAt: now,
      observedAt: now,
    };

    return spiked;
  }
}

export const backendWeatherService = new BackendWeatherService();
