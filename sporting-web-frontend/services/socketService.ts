import { apiClient } from './apiClient';
import { accountAvatarCache } from './userProfileService';

export interface UserStatusItem {
  userId: number;
  username: string;
  email: string;
  avatar?: string | null;
  isOnline: boolean;
  statusTime?: string;
  lastSeenSecondsAgo?: number | null;
}

export const socketService = {
  /**
   * Executes connect operation.
   */
  connect(_userId?: number): any {
    return null;
  },

  /**
   * Executes disconnect operation.
   */
  disconnect() {},

  onUsersStatusUpdate(_callback: (statuses: UserStatusItem[]) => void) {},

  /**
   * Executes request Status operation.
   */
  requestStatus() {},

  /**
   * Executes send User Active Heartbeat operation via REST.
   */
  sendUserActiveHeartbeat(_userId?: number) {
    this.updateStatusTime().catch(() => {});
  },

  onBookingUpdated(_callback: (data: any) => void) {},

  onBookingPaid(_callback: (data: any) => void) {},

  onBookingCreated(_callback: (data: any) => void) {},

  onBookingCancelled(_callback: (data: any) => void) {},

  /**
   * Updates StatusTime details.
   */
  async updateStatusTime(): Promise<boolean> {
    try {
      const res = await apiClient.post('/users/status-time', {});
      return Boolean(res.success);
    } catch {
      return false;
    }
  },

  /**
   * Retrieves UsersStatusRest information.
   */
  async fetchUsersStatusRest(): Promise<UserStatusItem[]> {
    try {
      const res = await apiClient.get<UserStatusItem[]>('/users/status');
      if (res.success && Array.isArray(res.data)) {
        const avatarMap: Record<string, string> = {};
        res.data.forEach((u) => {
          if (u.username && u.avatar) {
            avatarMap[u.username.toLowerCase()] = u.avatar;
          }
        });
        accountAvatarCache.saveAll(avatarMap);
        return res.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves UserStatus information.
   */
  async fetchUserStatus(userId: number): Promise<UserStatusItem | null> {
    try {
      const res = await apiClient.get<UserStatusItem>(`/users/status/${userId}`);
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  },
};
