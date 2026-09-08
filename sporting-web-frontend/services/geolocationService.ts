import { apiClient } from './apiClient';

export interface DeviceLocationData {
  lat: number;
  lng: number;
  fullAddress: string;
  road: string;
  ward: string;
  district: string;
  city: string;
  country: string;
  ip?: string;
  method: 'hardware_gps' | 'ip_geolocation';
  source: string;
}

/**
 * Prompts browser API for high-accuracy GPS position.
 */
function requestBrowserGpsPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator || !navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('[geolocationService] Browser GPS permission denied or unavailable:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}

export const geolocationService = {

  /**
   * Fetches current device location from IP or browser GPS.
   */
  async getDeviceLocation(lat?: number, lng?: number, forceStorageUpdate = false): Promise<DeviceLocationData | null> {
    try {
      let targetLat = lat;
      let targetLng = lng;

      if (targetLat === undefined || targetLng === undefined) {
        const coords = await requestBrowserGpsPosition();
        if (coords) {
          targetLat = coords.lat;
          targetLng = coords.lng;
        }
      }

      const url =
        targetLat !== undefined && targetLng !== undefined
          ? `/gps?lat=${targetLat}&lng=${targetLng}`
          : '/gps';

      const res = await apiClient.get<DeviceLocationData>(url);
      if (res.success && res.data) {
        console.log('[Geolocation] Vị trí thiết bị người dùng hiện tại:', {
          lat: res.data.lat,
          lng: res.data.lng,
          fullAddress: res.data.fullAddress,
          city: res.data.city,
          method: res.data.method,
        });
        const existingCustomAddress = typeof window !== 'undefined' ? localStorage.getItem('sporting_gps_full_address') : null;
        if (res.data.fullAddress && res.data.fullAddress.trim() !== '' && (!existingCustomAddress || forceStorageUpdate)) {
          try {
            localStorage.setItem('sporting_gps_full_address', res.data.fullAddress.trim());
          } catch (e) {
            console.error('Failed to save sporting_gps_full_address to localStorage', e);
          }
        }
        return res.data;
      }
      return null;
    } catch (error) {
      console.warn('[geolocationService] Lỗi lấy vị trí GPS thiết bị:', error);
      return null;
    }
  },
};
