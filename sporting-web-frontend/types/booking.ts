export type SportType = 'FOOTBALL' | 'BADMINTON' | 'TENNIS' | 'PICKLEBALL' | 'BASKETBALL';

export interface SearchBookingParams {
  sportType: SportType | 'ALL';
  location: string;
  date: string;
  timeSlot?: string;
}

export interface CourtVenue {
  id: string;
  name: string;
  sport: SportType;
  address: string;
  rating: number;
  reviewsCount: number;
  pricePerHour: number;
  imageUrl: string;
  isAvailableNow: boolean;
  hasAiCamera: boolean;
}
