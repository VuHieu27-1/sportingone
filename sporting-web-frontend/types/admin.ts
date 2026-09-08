import { AuthUser } from './auth';

export interface DetailUserSummary {
  id?: number;
  name?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  avatar?: string | null;
  role?: string | { id: number; roleName: string };
  statusTime?: string;
  isOnline?: boolean;
  createdAt?: string;
  detailUser?: DetailUserSummary;
  ondeleted?: string | null;
}

export interface AdminVendor {
  id: number;
  vendorName: string;
  avatar?: string | null;
  vendorAddress?: string;
  vendorPhone?: string;
  openTime?: string;
  closeTime?: string;
  status: 'active' | 'pending' | 'reject';
  userId?: number;
  user?: AdminUser;
  yards?: AdminYard[];
  createdAt?: string;
  ondeleted?: string | null;
}

export interface AdminYard {
  id: number;
  yardName: string;
  price?: number;
  pricePerHour?: number;
  peakHourPrice?: number;
  status?: string;
  vendorId?: number;
  vendor?: AdminVendor;
  sportType?: { id: number; sportName: string };
  typeYard?: { id: number; typeName: string };
  images?: any[];
  createdAt?: string;
  ondeleted?: string | null;
}

export interface CreateAdminUserDTO {
  username: string;
  email: string;
  password?: string;
  roleId?: number;
}

export interface UpdateAdminUserDTO {
  username?: string;
  email?: string;
  password?: string;
  roleId?: number;
}

export interface CreateVendorDTO {
  vendorName: string;
  avatar?: string | null;
  vendorAddress?: string;
  vendorPhone?: string;
  openTime?: string;
  closeTime?: string;
  status?: 'active' | 'pending' | 'reject';
  userId?: number;
}

export interface UpdateVendorDTO {
  vendorName?: string;
  avatar?: string | null;
  vendorAddress?: string;
  vendorPhone?: string;
  openTime?: string;
  closeTime?: string;
  status?: 'active' | 'pending' | 'reject';
  userId?: number;
  reason?: string;
}

export interface CreateYardDTO {
  yardName: string;
  price?: number;
  pricePerHour?: number;
  peakHourPrice?: number;
  vendorId: number;
  sportTypeId?: number;
  typeYardId?: number;
}

export interface UpdateYardDTO {
  yardName?: string;
  price?: number;
  pricePerHour?: number;
  peakHourPrice?: number;
  vendorId?: number;
  sportTypeId?: number;
  typeYardId?: number;
}
