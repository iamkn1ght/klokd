import { calculateDistance, toGeoHash, fromGeoHash } from '../src/utils/geoUtils';

describe('geoUtils', () => {
  describe('calculateDistance', () => {
    it('should return 0 for same point', () => {
      const d = calculateDistance(-1.2921, 36.8219, -1.2921, 36.8219);
      expect(d).toBe(0);
    });

    it('should calculate distance between two Nairobi points', () => {
      // Westlands to CBD (~3.5km)
      const d = calculateDistance(-1.2636, 36.8036, -1.2864, 36.8172);
      expect(d).toBeGreaterThan(2000);
      expect(d).toBeLessThan(5000);
    });

    it('should return distance in meters', () => {
      // ~500m test
      const d = calculateDistance(-1.2921, 36.8219, -1.2965, 36.8219);
      expect(d).toBeGreaterThan(400);
      expect(d).toBeLessThan(600);
    });
  });

  describe('toGeoHash / fromGeoHash', () => {
    it('should encode and decode a location approximately', () => {
      const lat = -1.2921;
      const lng = 36.8219;
      const hash = toGeoHash(lat, lng);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(7);

      const decoded = fromGeoHash(hash);
      expect(decoded.lat).toBeCloseTo(lat, 2);
      expect(decoded.lng).toBeCloseTo(lng, 2);
    });

    it('should produce different hashes for distant points', () => {
      const hash1 = toGeoHash(-1.2921, 36.8219);
      const hash2 = toGeoHash(0.3136, 32.5811); // Kampala
      expect(hash1).not.toBe(hash2);
    });
  });
});
