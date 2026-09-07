import type { WeatherDataPoint } from '@/types';

// Key geographical nodes across North Eastern Region
const NER_WEATHER_NODES: Record<string, { lat: number; lng: number; defaultTemp: number; defaultRain: number }> = {
  Guwahati: { lat: 26.1445, lng: 91.7362, defaultTemp: 27, defaultRain: 12.4 },
  Shillong: { lat: 25.5788, lng: 91.8933, defaultTemp: 20, defaultRain: 28.6 },
  Dimapur: { lat: 25.9093, lng: 93.7265, defaultTemp: 28, defaultRain: 18.2 },
  Kohima: { lat: 25.6751, lng: 94.1086, defaultTemp: 21, defaultRain: 34.8 },
  Imphal: { lat: 24.8170, lng: 93.9368, defaultTemp: 24, defaultRain: 22.0 },
  Silchar: { lat: 24.8268, lng: 92.7981, defaultTemp: 29, defaultRain: 41.5 },
  Aizawl: { lat: 23.7271, lng: 92.7176, defaultTemp: 22, defaultRain: 31.0 },
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

// In-memory cache for live weather
const weatherCache = new Map<string, { data: WeatherDataPoint; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchLiveWeather(locationName: string): Promise<WeatherDataPoint> {
  const node = NER_WEATHER_NODES[locationName] || NER_WEATHER_NODES['Guwahati'];
  const cacheKey = locationName.toLowerCase();

  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${node.lat}&longitude=${node.lng}&current=temperature_2m,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation&timezone=Asia%2FKolkata`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`);
    }

    const json = await response.json();
    const current = json.current || {};
    const precip = Number(current.precipitation ?? current.rain ?? 0);
    const hourly = json.hourly?.precipitation || [];
    const forecast24h = (hourly.slice(0, 24) as number[]).reduce((a, b) => a + (Number(b) || 0), 0);

    const point: WeatherDataPoint = {
      locationName,
      lat: node.lat,
      lng: node.lng,
      temperatureC: Math.round(Number(current.temperature_2m ?? node.defaultTemp)),
      precipitationMm: Math.round(precip * 10) / 10,
      rainfallCategory: categorizeRainfall(precip),
      windSpeedKmh: Math.round(Number(current.wind_speed_10m ?? 12)),
      weatherCode: Number(current.weather_code ?? 61),
      weatherDescription: getWeatherDescription(Number(current.weather_code ?? 61)),
      forecast24hMm: Math.round(forecast24h * 10) / 10,
      updatedAt: new Date().toISOString(),
      isSimulated: false,
    };

    weatherCache.set(cacheKey, { data: point, timestamp: Date.now() });
    return point;
  } catch {
    // Graceful deterministic fallback for offline dead-zones or network timeout
    const fallbackPoint: WeatherDataPoint = {
      locationName,
      lat: node.lat,
      lng: node.lng,
      temperatureC: node.defaultTemp,
      precipitationMm: node.defaultRain,
      rainfallCategory: categorizeRainfall(node.defaultRain),
      windSpeedKmh: 18,
      weatherCode: 65,
      weatherDescription: 'Monsoon showers (Offline cache)',
      forecast24hMm: Math.round(node.defaultRain * 3.5),
      updatedAt: new Date().toISOString(),
      isSimulated: true,
    };
    weatherCache.set(cacheKey, { data: fallbackPoint, timestamp: Date.now() });
    return fallbackPoint;
  }
}

export async function fetchAllRegionalWeather(): Promise<Record<string, WeatherDataPoint>> {
  const results: Record<string, WeatherDataPoint> = {};
  await Promise.all(
    Object.keys(NER_WEATHER_NODES).map(async (name) => {
      results[name] = await fetchLiveWeather(name);
    })
  );
  return results;
}
