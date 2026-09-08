export interface RateUser {
  id: number;
  username: string;
  email?: string;
  avatar?: string;
}

export interface RateItem {
  id: number;
  rating: number | null;
  comment: string | null;
  images?: string[] | null;
  status?: string;
  likesCount?: number;
  createdAt: string;
  updatedAt: string;
  user?: RateUser;
  yard?: {
    id: number;
    yardName: string;
    sportType?: { id: number; sportName: string };
  };
  booking?: {
    id: number;
    startTime?: string;
    endTime?: string;
    status?: string;
  } | null;
  parentRate?: RateItem | null;
  replies?: RateItem[];
}

export interface RatingBreakdown {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface RatingStats {
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: RatingBreakdown;
}

export interface YardRatesResponse {
  yardId?: number;
  vendorId?: number;
  stats: RatingStats;
  data: RateItem[];
}

export interface CreateRatePayload {
  yardId: number;
  userId: number;
  rating?: number;
  comment?: string;
  bookingId?: number;
  rateId?: number | null;
  images?: string[];
}

export interface ReplyRatePayload {
  userId: number;
  comment: string;
  images?: string[];
}

export interface UpdateRatePayload {
  rating?: number;
  comment?: string;
  images?: string[];
}
