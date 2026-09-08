import { apiClient, ApiResponse } from './apiClient';
import { BackendYard, BackendVendor, VendorDisplayItem, VendorDistanceResponse, UserCourtItem } from '../types/vendor';
import { tokenManager } from '../utils/tokenManager';
import { geolocationService } from './geolocationService';

export type { BackendYard, BackendVendor, VendorDisplayItem, VendorDistanceResponse, UserCourtItem };

import { getSportImageUrl } from '../utils/sportImageUtils';

export { getSportImageUrl };

/**
 * Executes process Vendor With Yards operation.
 */
async function processVendorWithYards(item: any): Promise<VendorDisplayItem> {
  const vendorId = item.id || item.vendorId;
  let yards: any[] = Array.isArray(item.yards) ? item.yards : [];

  if (!Array.isArray(item.yards)) {
    try {
      const yardsRes = await apiClient.get<any[]>(`/yards/vendor/${vendorId}`);
      if (yardsRes.success && Array.isArray(yardsRes.data)) {
        yards = yardsRes.data;
      }
    } catch {
    }
  }

  let priceRange = 'Chưa có thông tin giá';
  if (yards.length > 0) {
    const prices = yards.map((y: any) => Number(y.price)).filter((p: number) => !isNaN(p) && p > 0);
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      priceRange = minPrice === maxPrice
        ? `${minPrice.toLocaleString('vi-VN')}đ / giờ`
        : `${minPrice.toLocaleString('vi-VN')}đ - ${maxPrice.toLocaleString('vi-VN')}đ / giờ`;
    }
  }

  const counts: Record<string, { rawName: string; count: number }> = {};

  if (yards.length > 0) {
    for (const yard of yards) {
      const sportObj = yard.sportType || yard.sport_type || yard.sport;
      const rawSportName = (
        sportObj?.sportName ||
        sportObj?.typeName ||
        sportObj?.name ||
        yard.sportName ||
        yard.typeName ||
        yard.name ||
        ''
      ).trim();

      if (rawSportName) {
        const key = rawSportName.toUpperCase();
        if (!counts[key]) {
          counts[key] = { rawName: rawSportName, count: 1 };
        } else {
          counts[key].count += 1;
        }
      }
    }
  }

  const sortedSportList = Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .map((item) => item.rawName);

  let primarySportName = sortedSportList.length > 0 ? sortedSportList[0] : '';
  const vendorName = item.vendorName || item.name || '';

  if (!primarySportName && vendorName) {
    const nameUpper = String(vendorName).toUpperCase();
    if (nameUpper.includes('CẦU LÔNG') || nameUpper.includes('BADMINTON')) primarySportName = 'Cầu lông';
    else if (nameUpper.includes('PICKLEBALL')) primarySportName = 'Pickleball';
    else if (nameUpper.includes('TENNIS')) primarySportName = 'Tennis';
    else if (nameUpper.includes('BÓNG RỔ') || nameUpper.includes('BASKETBALL')) primarySportName = 'Bóng rổ';
    else if (nameUpper.includes('BÓNG ĐÁ') || nameUpper.includes('FOOTBALL') || nameUpper.includes('SOCCER')) primarySportName = 'Bóng đá';
    else if (nameUpper.includes('BÓNG CHUYỀN') || nameUpper.includes('VOLLEYBALL')) primarySportName = 'Bóng chuyền';
    else if (nameUpper.includes('GOLF')) primarySportName = 'Golf';
    else if (nameUpper.includes('BƠI') || nameUpper.includes('SWIMMING')) primarySportName = 'Bơi lội';
  }

  if (!primarySportName) {
    primarySportName = 'Thể thao';
  }

  const allSportTypes = sortedSportList.length > 0 ? sortedSportList : [primarySportName];

  const rawAvatar = item.avatar || (item.rawVendor && item.rawVendor.avatar);
  const effectiveAvatar = (rawAvatar && typeof rawAvatar === 'string' && rawAvatar.trim() !== '') ? rawAvatar.trim() : null;
  const imageUrl = effectiveAvatar || getSportImageUrl(primarySportName);

  const rawDist = item.distanceKm ?? item.distance_km ?? item.distance;
  const hasDistance = rawDist !== undefined && rawDist !== null && rawDist !== '';
  const distNum = hasDistance ? Number(rawDist) : NaN;

  let badgeTag = '';
  if (hasDistance && !isNaN(distNum)) {
    badgeTag = distNum <= 0 || distNum < 1 ? 'Cách dưới 1 km' : `Cách ${distNum} km`;
  } else if (item.badgeTag) {
    badgeTag = String(item.badgeTag).replace(/Cách 0(\.0+)? km/gi, 'Cách dưới 1 km');
  }

  const distText = !isNaN(distNum) ? (distNum <= 0 || distNum < 1 ? 'dưới 1 km' : `${distNum} km`) : '';

  const rawRating = item.rating ?? item.averageRating ?? (item.rawVendor && (item.rawVendor.rating ?? item.rawVendor.averageRating));
  const rawTotalReviews = item.totalReviews ?? (item.rawVendor && item.rawVendor.totalReviews);

  const rating = rawRating !== undefined && rawRating !== null && !isNaN(Number(rawRating))
    ? Number(Number(rawRating).toFixed(1))
    : 0;
  const totalReviews = rawTotalReviews !== undefined && rawTotalReviews !== null && !isNaN(Number(rawTotalReviews))
    ? Number(rawTotalReviews)
    : 0;

  const priorityScore = item.priorityScore !== undefined && item.priorityScore !== null ? Number(item.priorityScore) : undefined;
  const distanceScore = item.distanceScore !== undefined && item.distanceScore !== null ? Number(item.distanceScore) : undefined;
  const openStatusScore = item.openStatusScore !== undefined && item.openStatusScore !== null ? Number(item.openStatusScore) : undefined;
  const bayesianRatingScore = item.bayesianRatingScore !== undefined && item.bayesianRatingScore !== null ? Number(item.bayesianRatingScore) : undefined;
  const openStatus = item.openStatus || undefined;

  return {
    id: String(vendorId),
    name: vendorName || `Vendor ${vendorId}`,
    avatar: effectiveAvatar,
    sportType: primarySportName,
    sportTypes: allSportTypes,
    badgeTag,
    dateTag: '🟢 Hoạt Động',
    rating,
    totalReviews,
    averageRating: rating,
    priorityScore,
    distanceScore,
    openStatusScore,
    bayesianRatingScore,
    openStatus,
    imageUrl,
    address: item.vendorAddress || item.address || 'Chưa cập nhật địa chỉ',
    priceRange,
    description: hasDistance
      ? `Vendor ${vendorName} cách vị trí của bạn ${distText}.`
      : `Vendor ${vendorName} quản lý ${yards.length} sân thể thao. Hotline: ${item.vendorPhone || 'Chưa cập nhật'}.`,
    facilities: [`${yards.length} Sân Thể Thao`],
    phone: item.vendorPhone || item.phone || undefined,
    openTime: item.openTime || '06:00',
    closeTime: item.closeTime || '23:00',
    rawVendor: { ...item, yards, avatar: effectiveAvatar, rating, totalReviews, averageRating: rating, priorityScore },
  };
}

export const vendorService = {
  /**
   * Retrieves active vendors with distance calculated for the logged-in user via API GET /api/v1/detail-users/vendor-distances.
   */
  async getVendorDistances(): Promise<ApiResponse<VendorDisplayItem[]>> {
    const res = await apiClient.get<VendorDistanceResponse>('/detail-users/vendor-distances');

    if (res.success && res.data && Array.isArray(res.data.vendors)) {
      console.log('[VendorService] Vị trí User (Đã đăng nhập) từ backend:', res.data.userLocation);
      const activeVendors = res.data.vendors.filter((item) => item.status === 'active');

      const formattedVendors = await Promise.all(
        activeVendors.map((item) => processVendorWithYards(item))
      );

      return {
        success: true,
        message: 'Lấy danh sách khoảng cách Vendor thành công!',
        data: formattedVendors,
      };
    }

    return {
      success: false,
      message: res.message || 'Không thể lấy dữ liệu khoảng cách Vendor từ máy chủ.',
      data: [],
    };
  },

  /**
   * Retrieves active vendors. For logged-in users, includes distance calculation automatically.
   */
  async getVendors(status: string = 'active'): Promise<ApiResponse<VendorDisplayItem[]>> {
    const token = tokenManager.getActiveToken();
    if (token) {
      try {
        const distRes = await this.getVendorDistances();
        if (distRes.success && Array.isArray(distRes.data) && distRes.data.length > 0) {
          return distRes;
        }
      } catch (err) {
        console.warn('[vendorService] getVendorDistances fallback to standard getVendors:', err);
      }
    }

    // For guest users, pass location if available in localStorage or memory
    let guestLat: string | null = null;
    let guestLng: string | null = null;
    if (typeof window !== 'undefined') {
      guestLat = localStorage.getItem('sporting_user_lat');
      guestLng = localStorage.getItem('sporting_user_lng');
    }

    let endpoint = `/vendors?status=${status}`;
    if (guestLat && guestLng && !isNaN(Number(guestLat)) && !isNaN(Number(guestLng))) {
      endpoint += `&lat=${guestLat}&lng=${guestLng}`;
    }

    const res = await apiClient.get<BackendVendor[]>(endpoint);

    if (res.success && Array.isArray(res.data)) {
      const activeVendors = res.data.filter((item) => item.status === 'active');

      const formattedVendors = await Promise.all(
        activeVendors.map((item) => processVendorWithYards(item))
      );

      return {
        success: true,
        message: 'Successfully fetched active vendors!',
        data: formattedVendors,
      };
    }

    return {
      success: false,
      message: res.message || 'Unable to connect to Backend API /vendors',
      data: [],
    };
  },

  /**
   * Retrieves active vendors with distance calculated for guest users
   */
  async getGuestVendorDistances(lat: number, lng: number): Promise<ApiResponse<VendorDisplayItem[]>> {
    const res = await apiClient.get<VendorDistanceResponse>(`/detail-users/guest-vendor-distances?lat=${lat}&lng=${lng}`);

    if (res.success && res.data && Array.isArray(res.data.vendors)) {
      console.log('[VendorService] Vị trí Guest gửi tới backend:', { lat, lng, userLocation: res.data.userLocation });
      const activeVendors = res.data.vendors.filter((item) => item.status === 'active');

      const formattedVendors = await Promise.all(
        activeVendors.map((item) => processVendorWithYards(item))
      );

      return {
        success: true,
        message: 'Lấy danh sách khoảng cách Vendor cho khách thành công!',
        data: formattedVendors,
      };
    }

    return {
      success: false,
      message: res.message || 'Không thể lấy dữ liệu khoảng cách Vendor.',
      data: [],
    };
  },

  async getNearbyVendors(payload: {
    userLat?: number;
    userLng?: number;
    maxDistanceKm?: number;
  }): Promise<ApiResponse<VendorDisplayItem[]>> {
    const maxDist = payload.maxDistanceKm ?? 10;
    const token = tokenManager.getActiveToken();

    try {
      let distRes: ApiResponse<VendorDisplayItem[]> | null = null;
      if (payload.userLat !== undefined && payload.userLng !== undefined && !isNaN(payload.userLat) && !isNaN(payload.userLng)) {
        distRes = await this.getGuestVendorDistances(payload.userLat, payload.userLng);
      } else if (token) {
        distRes = await this.getVendorDistances();
      } else {
        let lat = payload.userLat;
        let lng = payload.userLng;

        if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
          const gpsData = await geolocationService.getDeviceLocation();
          if (gpsData && gpsData.lat && gpsData.lng) {
            lat = gpsData.lat;
            lng = gpsData.lng;
          }
        }

        if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
          distRes = await this.getGuestVendorDistances(lat, lng);
        }
      }

      if (distRes && distRes.success && Array.isArray(distRes.data) && distRes.data.length > 0) {
        const filtered = distRes.data.filter((v) => {
          const rawDist = v.rawVendor?.distanceKm;
          if (rawDist !== undefined && rawDist !== null) {
            return Number(rawDist) <= maxDist;
          }
          return true;
        });
        return {
          success: true,
          message: 'Lấy danh sách Vendor gần bạn thành công!',
          data: filtered,
        };
      }
    } catch (e) {
      console.warn('[vendorService] getNearbyVendors error:', e);
    }

    return {
      success: false,
      message: 'Không thể lấy dữ liệu khoảng cách Vendor từ hệ thống.',
      data: [],
    };
  },
  /**
   * Retrieves MyVendors information.
   */
  async fetchMyVendors(): Promise<ApiResponse<BackendVendor[]>> {
    const res = await apiClient.get<BackendVendor[]>('/vendors/my');
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Successfully loaded user vendors list!',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Failed to fetch my vendors list.',
      data: [],
    };
  },

  async registerVendor(payload: {
    vendorName: string;
    vendorAddress: string;
    vendorPhone: string;
    openTime?: string;
    closeTime?: string;
    avatar?: string | null;
  }): Promise<ApiResponse<BackendVendor>> {
    const res = await apiClient.post<BackendVendor>('/vendors', {
      vendorName: payload.vendorName.trim(),
      vendorAddress: payload.vendorAddress.trim(),
      vendorPhone: payload.vendorPhone.trim(),
      openTime: payload.openTime,
      closeTime: payload.closeTime,
      avatar: payload.avatar,
    });
    return res;
  },

  async updateVendor(
    vendorId: string | number,
    payload: {
      vendorName?: string;
      vendorAddress?: string;
      vendorPhone?: string;
      openTime?: string;
      closeTime?: string;
      avatar?: string | null;
      status?: 'pending' | 'reject' | 'active';
    }
  ): Promise<ApiResponse<BackendVendor>> {
    const res = await apiClient.patch<BackendVendor>(`/vendors/${vendorId}`, payload);
    return res;
  },

  /**
   * Executes touch Vendor Activity operation.
   */
  async touchVendorActivity(openTime?: string, closeTime?: string): Promise<ApiResponse<any>> {
    if (!openTime && !closeTime) {
      return { success: true, message: 'No operating hours update requested' };
    }
    try {
      const res = await apiClient.patch<any>('/vendors/my/hours', {
        openTime,
        closeTime,
      });
      return res;
    } catch {
      return { success: false, message: 'Vendor activity touch failed' };
    }
  },

  /**
   * Retrieves sports courts belonging to a specific vendor.
   */
  async getYardsByVendor(vendorId: string | number): Promise<ApiResponse<BackendYardItem[]>> {
    const res = await apiClient.get<BackendYardItem[]>(`/yards/vendor/${vendorId}`);
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Successfully loaded yards list for vendor!',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Không thể lấy danh sách sân của Vendor này.',
      data: [],
    };
  },

  /**
   * Retrieves single yard details by yard ID.
   */
  async getYardById(yardId: string | number): Promise<ApiResponse<BackendYardItem>> {
    const res = await apiClient.get<BackendYardItem>(`/yards/${yardId}`);
    return res;
  },

  async createYard(payload: {
    yardName: string;
    vendorId: number;
    sportTypeId?: number | null;
    typeYardId?: number | null;
    price: number;
    peakHourPrice?: number | null;
    status?: string;
  }): Promise<ApiResponse<BackendYardItem>> {
    const res = await apiClient.post<BackendYardItem>('/yards', payload);
    return res;
  },

  async updateYard(
    yardId: string | number,
    payload: {
      yardName?: string;
      sportTypeId?: number | null;
      typeYardId?: number | null;
      price?: number;
      peakHourPrice?: number | null;
      status?: string;
    }
  ): Promise<ApiResponse<BackendYardItem>> {
    const res = await apiClient.patch<BackendYardItem>(`/yards/${yardId}`, payload);
    return res;
  },

  /**
   * Deletes a sports court from the system.
   */
  async deleteYard(yardId: string | number): Promise<ApiResponse<any>> {
    const res = await apiClient.delete<any>(`/yards/${yardId}`);
    return res;
  },

  /**
   * Retrieves available sport categories list.
   */
  async getSportTypes(): Promise<ApiResponse<Array<{ id: number; sportName: string }>>> {
    const res = await apiClient.get<Array<{ id: number; sportName: string }>>('/sport-types');
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Loaded sport types',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Failed to load sport types',
      data: [],
    };
  },

  /**
   * Retrieves available yard size/type categories list.
   */
  async getYardTypes(): Promise<ApiResponse<Array<{ id: number; typeName: string }>>> {
    const res = await apiClient.get<Array<{ id: number; typeName: string }>>('/types');
    if (res.success && Array.isArray(res.data)) {
      return {
        success: true,
        message: 'Loaded yard types',
        data: res.data,
      };
    }
    return {
      success: false,
      message: res.message || 'Failed to load yard types',
      data: [],
    };
  },

  /**
   * Uploads vendor avatar image to Google Drive folder avatar-vendor.
   */
  async uploadVendorAvatar(
    vendorId: number | string,
    file: File,
  ): Promise<ApiResponse<{ avatar: string; fileId?: string; vendor: BackendVendor }>> {
    const token = tokenManager.getActiveToken();
    if (!token) {
      return { success: false, message: 'Vui lòng đăng nhập để tải ảnh đại diện cụm sân' };
    }

    const formData = new FormData();
    formData.append('file', file);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    try {
      const response = await fetch(`${apiBaseUrl}/vendors/${vendorId}/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return {
          success: true,
          message: data.message || 'Cập nhật ảnh đại diện cụm sân thành công',
          data: {
            avatar: data.avatar,
            fileId: data.fileId,
            vendor: data.vendor,
          },
        };
      }
      return {
        success: false,
        message: data.message || 'Tải ảnh cụm sân lên Google Drive thất bại',
      };
    } catch {
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ để tải ảnh đại diện cụm sân',
      };
    }
  },

  /**
   * Deletes vendor avatar image from Google Drive and database.
   */
  async deleteVendorAvatar(
    vendorId: number | string,
  ): Promise<ApiResponse<{ vendor: BackendVendor }>> {
    try {
      const res = await apiClient.delete<{ vendor: BackendVendor }>(`/vendors/${vendorId}/avatar`);
      return res;
    } catch {
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ để xóa ảnh đại diện cụm sân',
      };
    }
  },

  /**
   * Retrieves detailed vendor profile by ID.
   */
  async getVendorById(vendorId: string | number): Promise<VendorDisplayItem | null> {
    try {
      const singleRes = await apiClient.get<BackendVendor>(`/vendors/${vendorId}`);
      if (singleRes.success && singleRes.data) {
        return await processVendorWithYards(singleRes.data);
      }
    } catch {
    }

    const vendorsRes = await this.getVendors('active');
    if (vendorsRes.success && Array.isArray(vendorsRes.data)) {
      const found = vendorsRes.data.find((v) => String(v.id) === String(vendorId));
      if (found) return found;
    }
    return null;
  },

  /**
   * Retrieves courts (yards) sorted by vendor distance (ASC) -> court ID (ASC).
   */
  async getCourtsSortedByVendorDistance(lat?: number, lng?: number): Promise<ApiResponse<UserCourtItem[]>> {
    try {
      const params = new URLSearchParams();
      if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
        params.append('lat', String(lat));
        params.append('lng', String(lng));
      }
      const url = `/yards/by-distance${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await apiClient.get<UserCourtItem[]>(url);
      return res;
    } catch {
      return {
        success: false,
        message: 'Không thể tải danh sách sân của Vendor',
      };
    }
  },
};

export interface BackendYardItem {
  id: number;
  yardName: string;
  price: number;
  peakHourPrice?: number | null;
  status: string | null;
  sportType?: {
    id: number;
    sportName: string;
  };
  typeYard?: {
    id: number;
    typeName: string;
  };
  sale?: {
    id: number;
    discountPercent?: number;
    description?: string;
  };
  vendor?: {
    id: number;
    vendorName?: string;
    vendorAddress?: string | null;
    vendorPhone?: string | null;
    avatar?: string | null;
    openTime?: string | null;
    closeTime?: string | null;
    status?: string | null;
  };
  images?: Array<{
    id: number;
    imageUrl: string;
    isCover?: boolean;
    caption?: string | null;
  }>;
  rating?: number | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  ratingStats?: {
    averageRating: number;
    totalReviews: number;
  } | null;
}

