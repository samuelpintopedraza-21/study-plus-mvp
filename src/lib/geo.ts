import { UNIANDES } from '@/lib/campus';
import { addDays, clamp, startOfDay } from '@/lib/utils';

export type TransportMode = 'carro' | 'publico';

export type GeocodeResult = {
  address: string;
  latitude: number;
  longitude: number;
  source?: 'nominatim' | 'open-meteo' | 'bogota-grid';
};

export type CommuteEstimate = {
  mode: TransportMode;
  distanceKm: number;
  minutes: number;
  source: 'osrm' | 'heuristic';
  walkingMinutes?: number;
  drivingMinutes?: number;
  summary: string;
};

export type DailyWeather = {
  date: string;
  precipitationProbabilityMax: number;
  rainSum: number;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  label: string;
  severity: 'baja' | 'media' | 'alta';
};

const WEATHER_LABELS: Record<number, string> = {
  0: 'Cielo despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia fuerte',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve fuerte',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos fuertes',
  95: 'Tormenta',
};

function normalizeBogotaAddress(address: string) {
  return address
    .trim()
    .replace(/#/g, ' ')
    .replace(/No\.?/gi, ' ')
    .replace(/N°/gi, ' ')
    .replace(/\s+/g, ' ');
}

function extractBogotaGrid(address: string) {
  const normalized = normalizeBogotaAddress(address).toLowerCase();
  const streetMatch = normalized.match(/(?:calle|cll|cl|cra|carrera|kr|kr\.|av|avenida)\s*(\d{1,3})\s*(?:[a-z])?\s+(\d{1,3})/i);
  if (!streetMatch) return null;

  const first = Number(streetMatch[1]);
  const second = Number(streetMatch[2]);
  const isStreet = /calle|cll|cl|av|avenida/i.test(normalized.split(String(first))[0] || normalized);
  const calle = isStreet ? first : second;
  const carrera = isStreet ? second : first;

  if (!Number.isFinite(calle) || !Number.isFinite(carrera)) return null;
  if (calle < 1 || calle > 250 || carrera < 1 || carrera > 160) return null;

  return { calle, carrera };
}

function approximateBogotaCoordinates(address: string): GeocodeResult | null {
  const grid = extractBogotaGrid(address);
  if (!grid) return null;

  // Aproximación simple para MVP: Bogotá aumenta latitud hacia el norte con las calles
  // y longitud hacia el occidente con carreras mayores. No reemplaza un geocoder real,
  // pero permite planificar movilidad cuando el geocoder gratuito no entiende la dirección exacta.
  const latitude = clamp(4.575 + grid.calle * 0.00118, 4.48, 4.86);
  const longitude = clamp(-74.048 - Math.max(grid.carrera - 7, 0) * 0.00072, -74.23, -74.03);

  return {
    address: `${address.trim()} · Bogotá, Colombia (ubicación aproximada por malla urbana)`,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    source: 'bogota-grid',
  };
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'co',
    addressdetails: '1',
    'accept-language': 'es',
    // Viewbox aproximado de Bogotá para mejorar resultados locales.
    viewbox: '-74.25,4.85,-73.98,4.45',
    bounded: '1',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'StudyPlusMVP/1.0 (local academic prototype)',
      'Accept-Language': 'es',
    },
  });

  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.[0];
  if (!result?.lat || !result?.lon) return null;

  return {
    address: result.display_name || query,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    source: 'nominatim',
  };
}

async function geocodeWithOpenMeteo(query: string): Promise<GeocodeResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=es&countryCode=CO`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.results?.[0];
  if (!result) return null;

  return {
    address: [result.name, result.admin1, result.country].filter(Boolean).join(', '),
    latitude: result.latitude,
    longitude: result.longitude,
    source: 'open-meteo',
  };
}

export async function geocodeBogotaAddress(address: string): Promise<GeocodeResult> {
  const clean = normalizeBogotaAddress(address);
  const candidates = [
    `${clean}, Bogotá, Colombia`,
    `${address.trim()}, Bogotá, Colombia`,
    clean,
  ];

  for (const candidate of candidates) {
    const nominatim = await geocodeWithNominatim(candidate);
    if (nominatim) return nominatim;
  }

  // Open-Meteo es mejor para barrios/lugares, no tanto para direcciones exactas.
  for (const candidate of candidates) {
    const openMeteo = await geocodeWithOpenMeteo(candidate);
    if (openMeteo) return openMeteo;
  }

  const approximate = approximateBogotaCoordinates(address);
  if (approximate) return approximate;

  throw new Error('No se encontraron coordenadas. Prueba con formato: Carrera 15 #100-20, Bogotá o Avenida Boyacá #127-08, Bogotá.');
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function osrmRoute(profile: 'driving' | 'foot', lat: number, lon: number) {
  const url = `https://router.project-osrm.org/route/v1/${profile}/${UNIANDES.longitude},${UNIANDES.latitude};${lon},${lat}?overview=false`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo consultar la ruta.');
  const data = await response.json();
  const route = data?.routes?.[0];
  if (!route) throw new Error('No se obtuvo una ruta válida.');
  return {
    distanceKm: route.distance / 1000,
    minutes: Math.round(route.duration / 60),
  };
}

export async function estimateCommute(lat: number, lon: number, mode: TransportMode): Promise<CommuteEstimate> {
  const directKm = haversineKm(UNIANDES.latitude, UNIANDES.longitude, lat, lon);

  let driving;
  let walking;
  try {
    [driving, walking] = await Promise.all([osrmRoute('driving', lat, lon), osrmRoute('foot', lat, lon)]);
  } catch {
    const drivingMinutes = Math.round((directKm / 18) * 60 + 10);
    const walkingMinutes = Math.round((directKm / 4.6) * 60);
    const minutes = mode === 'carro'
      ? clamp(drivingMinutes, 12, 140)
      : clamp(Math.round(drivingMinutes * 1.55 + Math.min(12, walkingMinutes * 0.16) + 10), 20, 170);

    return {
      mode,
      distanceKm: Number(directKm.toFixed(1)),
      minutes,
      source: 'heuristic',
      walkingMinutes,
      drivingMinutes,
      summary:
        mode === 'carro'
          ? `${minutes} min estimados en carro desde Uniandes.`
          : `${minutes} min estimados en transporte público desde Uniandes (heurístico Bogotá).`,
    };
  }

  if (mode === 'carro') {
    return {
      mode,
      distanceKm: Number(driving.distanceKm.toFixed(1)),
      minutes: driving.minutes,
      source: 'osrm',
      walkingMinutes: walking.minutes,
      drivingMinutes: driving.minutes,
      summary: `${driving.minutes} min en carro desde Uniandes (${driving.distanceKm.toFixed(1)} km).`,
    };
  }

  const transitMinutes = Math.round(
    Math.max(
      driving.minutes * 1.55 + Math.min(14, walking.minutes * 0.15) + 10,
      (driving.distanceKm / 14) * 60 + 12
    )
  );

  return {
    mode,
    distanceKm: Number(driving.distanceKm.toFixed(1)),
    minutes: clamp(transitMinutes, 18, 180),
    source: 'heuristic',
    walkingMinutes: walking.minutes,
    drivingMinutes: driving.minutes,
    summary: `${clamp(transitMinutes, 18, 180)} min estimados en transporte público desde Uniandes (${driving.distanceKm.toFixed(1)} km viales).`,
  };
}

export async function getDailyWeather(lat: number, lon: number): Promise<DailyWeather[]> {
  const today = startOfDay(new Date());
  const fallback = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index).toISOString().slice(0, 10);
    return {
      date,
      precipitationProbabilityMax: 20,
      rainSum: 0,
      temperatureMax: 19,
      temperatureMin: 10,
      weatherCode: 2,
      label: 'Parcialmente nublado',
      severity: 'baja' as const,
    };
  });

  try {
    const end = addDays(today, 6);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum` +
      `&timezone=auto&start_date=${today.toISOString().slice(0, 10)}&end_date=${end.toISOString().slice(0, 10)}`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    const data = await response.json();
    const daily = data?.daily;
    if (!daily?.time) return fallback;

    return daily.time.map((date: string, index: number) => {
      const probability = Number(daily.precipitation_probability_max?.[index] ?? 0);
      const rain = Number(daily.rain_sum?.[index] ?? 0);
      const weatherCode = Number(daily.weather_code?.[index] ?? 0);
      const severity = probability >= 70 || rain >= 8 ? 'alta' : probability >= 40 || rain >= 3 ? 'media' : 'baja';

      return {
        date,
        precipitationProbabilityMax: probability,
        rainSum: rain,
        temperatureMax: Number(daily.temperature_2m_max?.[index] ?? 0),
        temperatureMin: Number(daily.temperature_2m_min?.[index] ?? 0),
        weatherCode,
        label: WEATHER_LABELS[weatherCode] || 'Condición variable',
        severity,
      };
    });
  } catch {
    return fallback;
  }
}
