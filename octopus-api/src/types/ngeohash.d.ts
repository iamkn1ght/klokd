declare module 'ngeohash' {
  export function encode(lat: number, lng: number, precision?: number): string;
  export function decode(hash: string): { latitude: number; longitude: number };
}
