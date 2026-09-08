import { apiClient, ApiResponse } from './apiClient';
import { AdminUser } from './adminService';

export interface NotificationReceiverUser {
  id: number;
  username: string;
  email: string;
  avatar?: string | null;
  role?: {
    id?: number;
    roleName: string;
    description?: string;
  };
  detailUser?: {
    id?: number;
    name?: string;
    phone?: string;
    avatar?: string;
  };
}

export interface NotificationRecipientItem {
  id: number;
  status: string | null;
  createdAt: string;
  receiver: NotificationReceiverUser;
}

export interface NotificationItem {
  id: number;
  notificationName: string;
  contents: string;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
    avatar?: string | null;
    detailUser?: {
      name?: string;
      phone?: string;
    };
    role?: {
      roleName: string;
    };
  };
  notificationUsers?: NotificationRecipientItem[];
}

export interface CreateNotificationPayload {
  userId: number;
  notificationName: string;
  contents: string;
  receiverIds?: number[];
}

export interface UserNotificationItem {
  id: number; // notification_user id
  status: string | null;
  createdAt: string;
  notification: {
    id: number;
    notificationName: string;
    contents: string;
    createdAt: string;
    user?: {
      id: number;
      username: string;
      email: string;
      detailUser?: {
        name?: string;
        phone?: string;
        avatar?: string;
      };
    };
  };
  receiver?: NotificationReceiverUser;
}

export const notificationService = {
  /**
   * Fetch all notifications created in the system with their recipient relations.
   */
  async getAllNotifications(): Promise<NotificationItem[]> {
    const res: ApiResponse<NotificationItem[]> = await apiClient.get('/notifications');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    // In case apiClient returns direct array or wrapped
    if (Array.isArray(res)) {
      return res;
    }
    return [];
  },

  /**
   * Fetch all notifications received by a specific user.
   */
  async getUserNotifications(receiverId: number): Promise<UserNotificationItem[]> {
    const res: ApiResponse<UserNotificationItem[]> = await apiClient.get(`/notification-users?receiverId=${receiverId}`);
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
    if (Array.isArray(res)) {
      return res;
    }
    return [];
  },

  /**
   * Mark a single notification as read for the user.
   */
  async markAsRead(notificationUserId: number): Promise<boolean> {
    const res: ApiResponse<any> = await apiClient.patch(`/notification-users/${notificationUserId}`, {
      status: 'read',
    });
    return res.success;
  },

  /**
   * Mark all notifications of a user as read.
   */
  async markAllAsRead(receiverId: number): Promise<boolean> {
    const res: ApiResponse<any> = await apiClient.patch(`/notification-users/read-all/${receiverId}`, {});
    return res.success;
  },

  /**
   * Fetch details of a specific notification.
   */
  async getNotificationById(id: number): Promise<NotificationItem | null> {
    const res: ApiResponse<NotificationItem> = await apiClient.get(`/notifications/${id}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  },

  /**
   * Create a new notification and distribute to selected receivers.
   */
  async createNotification(payload: CreateNotificationPayload): Promise<NotificationItem | null> {
    const res: ApiResponse<NotificationItem> = await apiClient.post('/notifications', payload);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  },

  /**
   * Delete a notification by ID.
   */
  async deleteNotification(id: number): Promise<boolean> {
    const res: ApiResponse<any> = await apiClient.delete(`/notifications/${id}`);
    return res.success;
  },
};
