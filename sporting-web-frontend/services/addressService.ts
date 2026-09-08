import { apiClient } from './apiClient';
import { ProvinceItem, WardItem } from '../types/address';

export type { ProvinceItem, WardItem };

export const addressService = {
  /**
   * Fetches Vietnam provinces list.
   */
  async getProvinces(): Promise<ProvinceItem[]> {
    try {
      const res = await apiClient.get<ProvinceItem[]>('/detail-address/provinces');
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Fetches Vietnam wards list directly by province code.
   */
  async getWards(provinceCode: number): Promise<WardItem[]> {
    if (!provinceCode) return [];
    try {
      const res = await apiClient.get<WardItem[]>(`/detail-address/provinces/${provinceCode}/wards`);
      if (res.success && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Geocodes an address string to { lat, lng, fullAddress }.
   */
  async geocode(address: string): Promise<{ lat: number; lng: number; fullAddress?: string } | null> {
    if (!address || !address.trim()) return null;
    try {
      const res = await apiClient.get<{ lat: number; lng: number; fullAddress?: string }>(
        `/detail-address/geocode?address=${encodeURIComponent(address.trim())}`
      );
      if (res.success && res.data && !isNaN(res.data.lat) && !isNaN(res.data.lng)) {
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  },
};
