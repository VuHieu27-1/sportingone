/**
 * Helper function to calculate straight-line Haversine distance in kilometers and meters
 * between 2 sets of coordinates (lat1, lon1) and (lat2, lon2).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): { distanceKm: number; distanceMeters: number } {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c * 100) / 100;
  const distanceMeters = Math.round(R * c * 1000);
  return { distanceKm, distanceMeters };
}
