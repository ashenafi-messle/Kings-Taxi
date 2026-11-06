/**
 * Kings Taxi — Geolocation & Navigation Provider Interface (Gondar Metropole)
 */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteMatrixResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
}

export interface IMapsProvider {
  calculateRoute(origin: Coordinate, destination: Coordinate): Promise<RouteMatrixResult>;
  reverseGeocode(coordinate: Coordinate): Promise<string>;
}

