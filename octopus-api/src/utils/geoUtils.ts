import ngeohash from 'ngeohash';

/**
 * Calculate distance between two points using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Encode coordinates to geohash. Raw coordinates are never persisted (DPA 2019).
 * Precision 7 gives ~153m x 153m cells.
 */
export function toGeoHash(lat: number, lng: number, precision = 7): string {
  return ngeohash.encode(lat, lng, precision);
}

/**
 * Decode geohash back to approximate coordinates.
 */
export function fromGeoHash(hash: string): { lat: number; lng: number } {
  const { latitude, longitude } = ngeohash.decode(hash);
  return { lat: latitude, lng: longitude };
}
