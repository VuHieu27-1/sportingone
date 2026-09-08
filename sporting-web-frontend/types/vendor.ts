import { AdminYard } from './admin';

export type VendorStatus = 'active' | 'pending' | 'reject';

export interface BackendYard {
  id: number;
  yardName: string;
  price: number | string;
  status: string;
  sportType?: {
    id: number;
    sportName?: string;
    typeName?: string;
    name?: string;
  };
  ondeleted?: string | null;
}

export interface UserCourtItem {
  id: number;
  yardName: string;
  price: number | string;
  peakHourPrice?: number | string | null;
  status: string;
  sportType?: {
    id: number;
    sportName?: string;
    typeName?: string;
    name?: string;
  } | null;
  typeYard?: {
    id: number;
    typeName?: string;
  } | null;
  sale?: {
    id: number;
    saleName?: string;
    discountPercent?: number;
  } | null;
  images?: {
    id: number;
    imagePath?: string;
    imageUrl?: string;
  }[];
  vendor?: {
    id: number;
    vendorName: string;
    avatar?: string | null;
    vendorAddress: string | null;
    vendorPhone?: string | null;
    openTime?: string | null;
    closeTime?: string | null;
    status: VendorStatus;
    latitude?: number | null;
    longitude?: number | null;
    distanceKm?: number | null;
    distanceMeters?: number | null;
    rating?: number | null;
    averageRating?: number | null;
  } | null;
  distanceKm?: number | null;
  distanceMeters?: number | null;
  rating?: number | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  priorityScore?: number | null;
  distanceScore?: number | null;
  openStatusScore?: number | null;
  bayesianRatingScore?: number | null;
  openStatus?: 'open' | 'closing_soon' | 'closed';
  ratingStats?: {
    averageRating: number;
    totalReviews: number;
  } | null;
}

export interface BackendVendor {
  id: number;
  vendorName: string;
  avatar?: string | null;
  vendorAddress: string | null;
  vendorPhone: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  status: VendorStatus;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  distanceMeters?: number | null;
  rating?: number | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  priorityScore?: number | null;
  yards?: BackendYard[];
  user?: {
    id: number;
    username: string;
    email: string;
    role?: {
      id: number;
      name: string;
    };
  };
  activatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  ondeleted?: string | null;
}

export interface VendorDistanceItem {
  id: number;
  vendorName: string;
  avatar?: string | null;
  vendorAddress: string | null;
  vendorPhone: string | null;
  openTime: string | null;
  closeTime: string | null;
  status: VendorStatus;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  distanceMeters: number | null;
  rating?: number | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  priorityScore?: number | null;
  distanceScore?: number | null;
  openStatusScore?: number | null;
  bayesianRatingScore?: number | null;
  openStatus?: 'open' | 'closing_soon' | 'closed';
  ondeleted?: string | null;
}

export interface VendorDistanceResponse {
  userLocation: {
    userId: number;
    latitude: number;
    longitude: number;
    address?: string;
  };
  vendors: VendorDistanceItem[];
}

export interface VendorDisplayItem {
  id: string;
  name: string;
  avatar?: string | null;
  sportType: string;
  sportTypes?: string[];
  badgeTag: string;
  dateTag: string;
  rating: number;
  totalReviews?: number;
  averageRating?: number;
  priorityScore?: number;
  distanceScore?: number;
  openStatusScore?: number;
  bayesianRatingScore?: number;
  openStatus?: 'open' | 'closing_soon' | 'closed';
  imageUrl: string;
  address: string;
  priceRange: string;
  description: string;
  facilities: string[];
  phone?: string;
  openTime?: string;
  closeTime?: string;
  rawVendor?: BackendVendor;
}

export interface VendorRegisterPayload {
  vendorName: string;
  avatar?: string | null;
  vendorAddress: string;
  vendorPhone: string;
  openTime?: string;
  closeTime?: string;
  userId?: number;
}

export interface VendorFacility {
  id: number;
  vendorName: string;
  avatar?: string | null;
  vendorAddress?: string;
  vendorPhone?: string;
  openTime?: string;
  closeTime?: string;
  status: VendorStatus;
  userId?: number;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  yards?: AdminYard[];
  createdAt?: string;
}
