export type TimeRangePreset =
  | 'today'
  | 'yesterday'
  | '7days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'since_opened'
  | 'custom';

export type GranularityType = 'auto' | 'hour' | 'day' | 'week' | 'month';

export type ChartMetricType = 'revenue' | 'orders' | 'occupancy';

export type AnalyticsSubTabType = 'overview' | 'utilization' | 'courts' | 'orders';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export interface ChartDataPoint {
  label: string;
  subLabel?: string;
  timestamp?: number;
  currentValue: number;
  previousValue: number;
  currentOrders: number;
  previousOrders: number;
  currentHours: number;
  previousHours: number;
  currentOccupancy: number;
  previousOccupancy: number;
}

export interface SportRevenueItem {
  id: string | number;
  name: string;
  revenue: number;
  ordersCount: number;
  percentage: number;
  bookedHours: number;
  occupancyRate: number;
  growthRate: number;
  color: string;
}

export interface CourtPerformanceItem {
  yardId: number;
  yardName: string;
  vendorId: number;
  vendorName: string;
  sportName: string;
  grossRevenue: number;
  netRevenue: number;
  ordersCount: number;
  bookedHours: number;
  availableHours: number;
  occupancyRate: number;
  aov: number;
  trend: number;
  pricePerHour: number;
}

export interface ClusterPerformanceItem {
  vendorId: number;
  vendorName: string;
  grossRevenue: number;
  netRevenue: number;
  ordersCount: number;
  bookedHours: number;
  occupancyRate: number;
  yardsCount: number;
}

export interface DayOfWeekStat {
  dayName: string;
  dayShort: string;
  dayIndex: number; // 0: Sun, 1: Mon, ...
  revenue: number;
  ordersCount: number;
  bookedHours: number;
  occupancyRate: number;
  isPeakDay: boolean;
}

export interface TimeOfDayStat {
  slotKey: 'morning' | 'afternoon' | 'evening' | 'night';
  label: string;
  timeRange: string;
  revenue: number;
  percentage: number;
  ordersCount: number;
}

export interface HeatmapCell {
  dayIndex: number; // 1: Mon -> 7: Sun
  dayName: string;
  hour: number; // 6 -> 23
  hourLabel: string;
  occupancyRate: number;
  bookingsCount: number;
  revenue: number;
  level: 'low' | 'normal' | 'high' | 'peak';
}

export interface KpiSummaryData {
  grossRevenue: number;
  grossRevenueGrowth: number;
  netRevenue: number;
  netRevenueGrowth: number;
  totalOrders: number;
  totalOrdersGrowth: number;
  paidOrdersCount: number;
  aov: number;
  aovGrowth: number;
  occupancyRate: number;
  occupancyRateGrowth: number;
  cancellationRate: number;
  refundRate: number;
  paymentSuccessRate: number;
  totalAvailableHours: number;
  totalBookedHours: number;
  unpaidOrdersCount: number;
  cancelledOrdersCount: number;
  refundOrdersCount: number;
  refundedOrdersCount: number;
  refundedAmount: number;
}

export interface BusinessInsight {
  id: string;
  type: 'peak' | 'opportunity' | 'growth' | 'warning' | 'tip';
  title: string;
  description: string;
  actionText?: string;
  metric?: string;
}

export interface CustomerLoyaltyItem {
  userId: number;
  username: string;
  email: string;
  totalOrders: number;
  paidOrders: number;
  hourlyBookingsCount: number;
  monthlyBookingsCount: number;
  totalSpent: number;
  vendorNames: string[];
  favoriteYardName: string;
  favoriteSportName: string;
  lastBookingDate: string;
  customerTier: 'vip' | 'regular' | 'new';
  hasMonthlyBooking: boolean;
}
