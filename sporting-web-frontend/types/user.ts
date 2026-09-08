export interface UserAddress {
  id: number;
  userId: number;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
  ondeleted?: string | null;
}

export interface DetailUserPayload {
  name?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  city?: string;
  district?: string;
  ward?: string;
}

export interface DetailUserResponse extends DetailUserPayload {
  id?: number;
  email?: string;
  username?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileDetails {
  id?: number;
  username?: string;
  fullName?: string;
  email?: string;
  avatar?: string | null;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  currentAddress?: string;
  permanentAddress?: string;
  city?: string;
  userLat?: number;
  userLng?: number;
  hasUpdatedLocation?: boolean;
  addresses?: UserAddress[];
}
