import { apiClient, ApiResponse } from './apiClient';
import { UserProfileDetails, UserAddress } from '../types/user';
import { geolocationService } from './geolocationService';
import { userAddressService } from './userAddressService';
import { tokenManager } from '../utils/tokenManager';

export type { UserProfileDetails, UserAddress };

/**
 * Checks if date of birth is valid (filters out default invalid MySQL dates like 1899-11-30 or 0000-00-00)
 */
function sanitizeDateOfBirth(rawDate?: any): string {
  if (!rawDate) return '';
  const dStr = String(rawDate).split('T')[0].trim();
  if (
    !dStr ||
    dStr.startsWith('1899') ||
    dStr.startsWith('0000') ||
    dStr.startsWith('1900')
  ) {
    return '';
  }
  return dStr;
}

let isAutoFillingAddress = false;

export const accountAvatarCache = {
  getAvatar(username: string): string | null {
    if (!username) return null;
    try {
      const raw = localStorage.getItem('sporting_account_avatars');
      if (!raw) return null;
      const map = JSON.parse(raw);
      return map[username.toLowerCase()] || null;
    } catch {
      return null;
    }
  },
  saveAvatar(username: string, avatar: string): void {
    if (!username || !avatar) return;
    try {
      const raw = localStorage.getItem('sporting_account_avatars');
      const map = raw ? JSON.parse(raw) : {};
      map[username.toLowerCase()] = avatar;
      localStorage.setItem('sporting_account_avatars', JSON.stringify(map));
    } catch { }
  },
  saveAll(userMap: Record<string, string>): void {
    try {
      const raw = localStorage.getItem('sporting_account_avatars');
      const map = raw ? JSON.parse(raw) : {};
      Object.assign(map, userMap);
      localStorage.setItem('sporting_account_avatars', JSON.stringify(map));
    } catch { }
  },
  getAll(): Record<string, string> {
    try {
      const raw = localStorage.getItem('sporting_account_avatars');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },
};

export const userProfileService = {
  /**
   * Retrieves ProfileFromApi information.
   */
  async fetchProfileFromApi(): Promise<ApiResponse<UserProfileDetails>> {
    const token = tokenManager.getActiveToken();
    if (!token) {
      return {
        success: false,
        message: 'No active session token',
        data: undefined,
      };
    }
    try {
      const userRes = await apiClient.get<any>('/users/profile');

      let detailRes: ApiResponse<any> = { success: false, message: '' };
      try {
        detailRes = await apiClient.get<any>('/detail-users');
      } catch (err) {
        console.warn('detail-users record not initialized yet', err);
      }

      let addressesRes: ApiResponse<UserAddress[]> = { success: false, message: '' };
      try {
        addressesRes = await userAddressService.getMyAddresses();
      } catch (err) {
        console.warn('Failed to fetch user_address list', err);
      }

      if (!userRes.success && !detailRes.success) {
        return {
          success: false,
          message: userRes.message || detailRes.message || 'Unable to fetch user profile from Backend server.',
          statusCode: userRes.statusCode || detailRes.statusCode,
        };
      }

      const detail = detailRes.success ? (detailRes.data || {}) : {};
      const user = userRes.success ? (userRes.data || {}) : {};
      const userAddresses: UserAddress[] = Array.isArray(user.addresses) && user.addresses.length > 0
        ? user.addresses
        : (addressesRes.success && Array.isArray(addressesRes.data) ? addressesRes.data : []);

      const username = user.username || '';
      const fullName = detail.name || username || '';
      const dob = sanitizeDateOfBirth(detail.birthday);

      const defaultAddrObj = userAddresses.find((a) => a.isDefault) || userAddresses[0];
      const addr = defaultAddrObj ? defaultAddrObj.address : '';
      const userLat = defaultAddrObj?.latitude != null ? Number(defaultAddrObj.latitude) : (detail.latitude ? Number(detail.latitude) : undefined);
      const userLng = defaultAddrObj?.longitude != null ? Number(defaultAddrObj.longitude) : (detail.longitude ? Number(detail.longitude) : undefined);

      const resolvedAvatar =
        user.avatar ||
        user.avatarUrl ||
        accountAvatarCache.getAvatar(username) ||
        accountAvatarCache.getAvatar(fullName) ||
        null;

      const profile: UserProfileDetails = {
        id: detail.id ? Number(detail.id) : (user.id ? Number(user.id) : undefined),
        username: username,
        fullName: fullName,
        email: user.email || '',
        avatar: resolvedAvatar,
        phone: detail.phone || user.phone || '',
        gender: detail.gender || '',
        dateOfBirth: dob,
        address: addr,
        currentAddress: addr,
        permanentAddress: addr,
        city: detail.city || '',
        userLat,
        userLng,
        hasUpdatedLocation: Boolean(addr || (userLat && userLng)),
        addresses: userAddresses,
      };

      if (profile.username && resolvedAvatar) {
        accountAvatarCache.saveAvatar(profile.username, resolvedAvatar);
      }

      return {
        success: true,
        message: 'Successfully retrieved user profile details.',
        data: profile,
      };
    } catch {
      return {
        success: false,
        message: 'Unable to connect to Backend API',
      };
    }
  },

  /**
   * Creates or saves Profile.
   */
  async saveProfile(details: UserProfileDetails): Promise<{ success: boolean; message: string }> {
    try {
      const cleanDob = sanitizeDateOfBirth(details.dateOfBirth);

      const payload = {
        name: details.fullName || undefined,
        phone: details.phone || undefined,
        gender: details.gender || undefined,
        birthday: cleanDob || undefined,
      };

      let res = await apiClient.patch<any>('/detail-users/my', payload);

      if (!res.success && res.statusCode === 404) {
        res = await apiClient.post<any>('/detail-users', payload);
      }

      if (res.success) {
        return {
          success: true,
          message: 'Profile updated successfully!',
        };
      }

      return {
        success: false,
        message: res.message || 'Failed to update profile details.',
      };
    } catch {
      return {
        success: false,
        message: 'Unable to save profile details. Please try again!',
      };
    }
  },

  /**
   * Auto-fill user profile on login only if no address exists in user_address.
   */
  async ensureAutoFillUserProfile(username: string): Promise<UserProfileDetails | null> {
    const token = tokenManager.getActiveToken();
    if (!token || isAutoFillingAddress) return null;
    isAutoFillingAddress = true;
    try {
      const profileRes = await this.fetchProfileFromApi();
      const currentProfile = profileRes.success ? profileRes.data : null;
      if (!currentProfile) return null;

      const addresses = currentProfile.addresses || [];
      const hasExistingAddress = addresses.length > 0;

      if (hasExistingAddress) {
        return currentProfile;
      }

      let gpsFullAddress = '';
      try {
        const savedAddress = localStorage.getItem('sporting_gps_full_address');
        if (savedAddress && savedAddress.trim() !== '') {
          gpsFullAddress = savedAddress.trim();
        } else {
          const gpsData = await geolocationService.getDeviceLocation();
          if (gpsData && gpsData.fullAddress) {
            gpsFullAddress = gpsData.fullAddress;
          }
        }
      } catch {
      }

      if (gpsFullAddress) {
        const createRes = await userAddressService.createAddress({
          address: gpsFullAddress,
          isDefault: true,
        });

        if (createRes.success) {
          const updatedProfileRes = await this.fetchProfileFromApi();
          return updatedProfileRes.data || currentProfile;
        }
      }

      return currentProfile;
    } catch {
      return null;
    } finally {
      isAutoFillingAddress = false;
    }
  },

  /**
   * Uploads and updates user avatar image to Google Drive
   */
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string; fileId: string; user?: any }>> {
    const token = tokenManager.getActiveToken();
    if (!token) {
      return {
        success: false,
        message: 'No active session token',
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

    try {
      const response = await fetch(`${baseUrl}/users/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        if (data.user?.username && data.avatar) {
          accountAvatarCache.saveAvatar(data.user.username, data.avatar);
        }
        return {
          success: true,
          message: data.message || 'Cập nhật ảnh đại diện thành công',
          data: {
            avatar: data.avatar,
            fileId: data.fileId,
            user: data.user,
          },
        };
      }

      return {
        success: false,
        message: data.message || 'Tải ảnh lên Google Drive thất bại',
      };
    } catch {
      return {
        success: false,
        message: 'Không thể kết nối đến máy chủ để tải ảnh đại diện',
      };
    }
  },
};
