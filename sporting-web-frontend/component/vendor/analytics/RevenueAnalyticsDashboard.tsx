import React, { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  TimeRangePreset,
  ChartMetricType,
  AnalyticsSubTabType,
  ChartDataPoint,
  SportRevenueItem,
  CourtPerformanceItem,
  ClusterPerformanceItem,
  DayOfWeekStat,
  TimeOfDayStat,
  HeatmapCell,
  KpiSummaryData,
  BusinessInsight,
} from './types';
import {
  LayoutDashboard,
  Flame,
  Building2,
  CreditCard,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { BackendVendor, BackendYardItem } from '../../../services/vendorService';
import { BackendBooking } from '../../../services/bookingService';
import { AnalyticsHeader } from './AnalyticsHeader';
import { AnalyticsKpiCards } from './AnalyticsKpiCards';
import { MainRevenueChart } from './MainRevenueChart';
import { SportRevenueBreakdown } from './SportRevenueBreakdown';
import { DayOfWeekAnalytics } from './DayOfWeekAnalytics';
import { HotHoursHeatmap } from './HotHoursHeatmap';
import { CourtPerformanceTable } from './CourtPerformanceTable';
import { ClusterAndPaymentAnalytics } from './ClusterAndPaymentAnalytics';
import { BusinessInsightsCard } from './BusinessInsightsCard';
import { CustomerLoyaltyTable } from './CustomerLoyaltyTable';
import { RecentBookingsTable } from '../RecentBookingsTable';
import { ManagementPdfReportModal } from './ManagementPdfReportModal';
import { downloadExcelReport } from '../../../services/reportExportService';

interface RevenueAnalyticsDashboardProps {
  selectedVendor: BackendVendor | null;
  activeVendors: BackendVendor[];
  onVendorChange: (vendor: BackendVendor | null) => void;
  yards: BackendYardItem[];
  bookings: BackendBooking[];
  sportTypes: Array<{ id: number; sportName: string }>;
}

export const RevenueAnalyticsDashboard: React.FC<RevenueAnalyticsDashboardProps> = ({
  selectedVendor,
  activeVendors,
  onVendorChange,
  yards,
  bookings,
  sportTypes,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTabType>('overview');
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [selectedSportId, setSelectedSportId] = useState<string>('all');
  const [comparePrevious, setComparePrevious] = useState<boolean>(true);
  const [chartMetric, setChartMetric] = useState<ChartMetricType>('revenue');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // Calculate Date Boundaries for Current & Previous periods
  const { currentRange, previousRange, rangeLabel } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();
    let label = 'Tháng này';

    if (timeRange === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      prevEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      label = 'Hôm nay';
    } else if (timeRange === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
      prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      prevEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      label = 'Hôm qua';
    } else if (timeRange === '7days') {
      start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(start.getTime() - 1000);
      label = '7 ngày qua';
    } else if (timeRange === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      label = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
    } else if (timeRange === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
      label = `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`;
    } else if (timeRange === 'this_quarter') {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), (q - 1) * 3, 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59);
      label = `Quý ${q + 1}/${now.getFullYear()}`;
    } else if (timeRange === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      label = `Năm ${now.getFullYear()}`;
    } else if (timeRange === 'since_opened') {
      // Find the activation/opening date of the selected vendor or earliest among active vendors
      let openDate: Date | null = null;
      if (selectedVendor) {
        const rawDate = selectedVendor.activatedAt || selectedVendor.createdAt || selectedVendor.updatedAt;
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) openDate = d;
        }
      } else if (activeVendors.length > 0) {
        let earliestMs = Infinity;
        activeVendors.forEach((v) => {
          const rawDate = v.activatedAt || v.createdAt || v.updatedAt;
          if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime()) && d.getTime() < earliestMs) {
              earliestMs = d.getTime();
            }
          }
        });
        if (earliestMs !== Infinity) {
          openDate = new Date(earliestMs);
        }
      }

      if (!openDate) {
        // Fallback: earliest booking date or start of current year
        if (bookings.length > 0) {
          let earliestMs = Infinity;
          bookings.forEach((b) => {
            const raw = b.createdAt || b.startDate || b.startTime;
            if (raw) {
              const d = new Date(raw);
              if (!isNaN(d.getTime()) && d.getTime() < earliestMs) earliestMs = d.getTime();
            }
          });
          if (earliestMs !== Infinity) openDate = new Date(earliestMs);
        }
      }

      if (!openDate) {
        openDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      }

      start = new Date(openDate.getFullYear(), openDate.getMonth(), openDate.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const diffMs = Math.max(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
      prevEnd = new Date(start.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - diffMs);
      label = `Từ lúc mở cửa (${start.toLocaleDateString('vi-VN')} → Nay)`;
    } else {
      // custom
      start = new Date(customStartDate + 'T00:00:00');
      end = new Date(customEndDate + 'T23:59:59');
      const diffMs = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1000);
      prevStart = new Date(prevEnd.getTime() - diffMs);
      label = `${customStartDate} → ${customEndDate}`;
    }

    return {
      currentRange: { startDate: start, endDate: end },
      previousRange: { startDate: prevStart, endDate: prevEnd },
      rangeLabel: label,
    };
  }, [timeRange, customStartDate, customEndDate, selectedVendor, activeVendors, bookings]);

  // Filter Bookings by Vendor & Sport
  const activeVendorIds = useMemo(
    () => new Set(activeVendors.map((v) => Number(v.id))),
    [activeVendors]
  );

  const baseFilteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bVendorId = b.yard?.vendor?.id ? Number(b.yard.vendor.id) : null;
      if (bVendorId === null || !activeVendorIds.has(bVendorId)) return false;
      if (selectedVendor && Number(selectedVendor.id) !== bVendorId) return false;

      if (selectedSportId !== 'all') {
        const sportId = b.yard?.sportType?.id ? String(b.yard.sportType.id) : '';
        const sportName = b.yard?.sportType?.sportName || '';
        if (sportId !== selectedSportId && sportName !== selectedSportId) {
          return false;
        }
      }
      return true;
    });
  }, [bookings, activeVendorIds, selectedVendor, selectedSportId]);

  // Helper to get effective date timestamp for a booking
  const getBookingEffectiveDate = useCallback((b: BackendBooking): Date => {
    if (b.createdAt) {
      const d = new Date(b.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (b.startDate) {
      const d = new Date(b.startDate);
      if (!isNaN(d.getTime())) return d;
    }
    if (b.startTime) {
      const d = new Date(b.startTime);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, []);

  // Helper to get play start hour (0 - 23)
  const getBookingStartHour = useCallback((b: BackendBooking): number => {
    if (b.createdAt) {
      const d = new Date(b.createdAt);
      if (!isNaN(d.getTime())) return d.getHours();
    }
    if (b.startDate && typeof b.startTime === 'string' && b.startTime.includes(':')) {
      const [h] = b.startTime.split(':').map(Number);
      return isNaN(h) ? 0 : h;
    }
    const d = new Date(b.startTime);
    return !isNaN(d.getTime()) ? d.getHours() : 0;
  }, []);

  // Current period Bookings & Previous period Bookings
  const currentPeriodBookings = useMemo(() => {
    const sTime = currentRange.startDate.getTime();
    const eTime = currentRange.endDate.getTime();
    return baseFilteredBookings.filter((b) => {
      const d = getBookingEffectiveDate(b);
      const t = d.getTime();
      return t >= sTime && t <= eTime;
    });
  }, [baseFilteredBookings, currentRange, getBookingEffectiveDate]);

  const previousPeriodBookings = useMemo(() => {
    const sTime = previousRange.startDate.getTime();
    const eTime = previousRange.endDate.getTime();
    return baseFilteredBookings.filter((b) => {
      const d = getBookingEffectiveDate(b);
      const t = d.getTime();
      return t >= sTime && t <= eTime;
    });
  }, [baseFilteredBookings, previousRange, getBookingEffectiveDate]);

  // Helper to calculate amount and hours for a booking
  const getBookingMetrics = useCallback((b: BackendBooking) => {
    const isMonthly = Boolean(b.startDate || (b as any).itemType === 'monthly');
    if (isMonthly) {
      let hours = 30;
      if (
        typeof b.startTime === 'string' &&
        typeof b.endTime === 'string' &&
        b.startTime.includes(':') &&
        b.endTime.includes(':')
      ) {
        const [sh, sm] = b.startTime.split(':').map(Number);
        const [eh, em] = b.endTime.split(':').map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        const dailyHours = diff > 0 ? diff / 60 : 1;
        hours = dailyHours * 30;
      }
      const amount = Number(b.priced || 0);
      return { hours, amount };
    }

    const start = new Date(b.startTime).getTime();
    const end = new Date(b.endTime).getTime();
    const hours = Math.max((end - start) / (1000 * 60 * 60), 0.5);
    const amount =
      b.priced && Number(b.priced) > 0
        ? Number(b.priced)
        : Math.round(hours * Number(b.yard?.price || 0));
    return { hours, amount };
  }, []);

  // Compute KPI Summary Data
  const kpiData: KpiSummaryData = useMemo(() => {
    let grossRevenue = 0;
    let paidOrdersCount = 0;
    let unpaidOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let refundOrdersCount = 0;
    let refundedOrdersCount = 0;
    let refundedAmount = 0;
    let totalBookedHours = 0;

    currentPeriodBookings.forEach((b) => {
      const st = String(b.status || '').toLowerCase().trim();
      const { hours, amount } = getBookingMetrics(b);

      if (st === 'paid') {
        grossRevenue += amount;
        paidOrdersCount += 1;
        totalBookedHours += hours;
      } else if (st === 'unpaid') {
        unpaidOrdersCount += 1;
      } else if (st === 'cancelled') {
        cancelledOrdersCount += 1;
      } else if (st === 'refund') {
        refundOrdersCount += 1;
      } else if (st === 'refunded') {
        refundedOrdersCount += 1;
        refundedAmount += amount;
      }
    });

    const netRevenue = Math.max(grossRevenue - refundedAmount, 0);
    const totalOrders = currentPeriodBookings.length;
    const aov = paidOrdersCount > 0 ? grossRevenue / paidOrdersCount : 0;

    // Available operational hours estimate (16h per day: 06:00 to 22:00 per court)
    const daysInPeriod = Math.max(
      Math.ceil(
        (currentRange.endDate.getTime() - currentRange.startDate.getTime()) /
        (1000 * 60 * 60 * 24)
      ),
      1
    );
    const yardsCount = Math.max(
      selectedVendor ? yards.length : activeVendors.reduce((acc, v) => acc + (v.yards?.length || 0), 0),
      1
    );
    const totalAvailableHours = yardsCount * 16 * daysInPeriod;
    const occupancyRate = Math.min((totalBookedHours / totalAvailableHours) * 100, 100);

    const cancellationRate = totalOrders > 0 ? (cancelledOrdersCount / totalOrders) * 100 : 0;
    const refundRate = totalOrders > 0 ? ((refundOrdersCount + refundedOrdersCount) / totalOrders) * 100 : 0;
    const paymentSuccessRate = totalOrders > 0 ? (paidOrdersCount / totalOrders) * 100 : 0;

    // Previous period KPI for growth rate calculation
    let prevGrossRevenue = 0;
    let prevPaidCount = 0;
    let prevTotalOrders = previousPeriodBookings.length;
    let prevRefundedAmount = 0;
    let prevBookedHours = 0;

    previousPeriodBookings.forEach((b) => {
      const st = String(b.status || '').toLowerCase().trim();
      const { hours, amount } = getBookingMetrics(b);
      if (st === 'paid') {
        prevGrossRevenue += amount;
        prevPaidCount += 1;
        prevBookedHours += hours;
      } else if (st === 'refunded') {
        prevRefundedAmount += amount;
      }
    });

    const prevNetRevenue = Math.max(prevGrossRevenue - prevRefundedAmount, 0);
    const prevAov = prevPaidCount > 0 ? prevGrossRevenue / prevPaidCount : 0;
    const prevOccupancy = Math.min((prevBookedHours / totalAvailableHours) * 100, 100);

    const calcGrowth = (curr: number, prev: number) => {
      if (prev > 0) return ((curr - prev) / prev) * 100;
      if (curr > 0) return 100;
      return 0;
    };

    return {
      grossRevenue,
      grossRevenueGrowth: calcGrowth(grossRevenue, prevGrossRevenue),
      netRevenue,
      netRevenueGrowth: calcGrowth(netRevenue, prevNetRevenue),
      totalOrders,
      totalOrdersGrowth: calcGrowth(totalOrders, prevTotalOrders),
      paidOrdersCount,
      aov,
      aovGrowth: calcGrowth(aov, prevAov),
      occupancyRate,
      occupancyRateGrowth: calcGrowth(occupancyRate, prevOccupancy),
      cancellationRate,
      refundRate,
      paymentSuccessRate,
      totalAvailableHours,
      totalBookedHours,
      unpaidOrdersCount,
      cancelledOrdersCount,
      refundOrdersCount,
      refundedOrdersCount,
      refundedAmount,
    };
  }, [
    currentPeriodBookings,
    previousPeriodBookings,
    currentRange,
    getBookingMetrics,
    selectedVendor,
    yards.length,
    activeVendors,
  ]);

  // Compute Chart Data Points (Time Granularity)
  const chartDataPoints: ChartDataPoint[] = useMemo(() => {
    const isHourly = timeRange === 'today' || timeRange === 'yesterday';
    const isYearly = timeRange === 'this_year';

    if (isHourly) {
      // 06:00 to 22:00
      const points: ChartDataPoint[] = [];
      for (let h = 6; h <= 22; h++) {
        let currVal = 0;
        let currOrders = 0;
        let currHours = 0;
        let prevVal = 0;
        let prevOrders = 0;
        let prevHours = 0;

        currentPeriodBookings.forEach((b) => {
          if (String(b.status || '').toLowerCase() === 'paid') {
            const bh = getBookingStartHour(b);
            if (bh === h) {
              const { hours, amount } = getBookingMetrics(b);
              currVal += amount;
              currOrders += 1;
              currHours += hours;
            }
          }
        });

        previousPeriodBookings.forEach((b) => {
          if (String(b.status || '').toLowerCase() === 'paid') {
            const bh = getBookingStartHour(b);
            if (bh === h) {
              const { hours, amount } = getBookingMetrics(b);
              prevVal += amount;
              prevOrders += 1;
              prevHours += hours;
            }
          }
        });

        const yardsCount = Math.max(yards.length, 1);
        const currOcc = Math.min((currHours / yardsCount) * 100, 100);
        const prevOcc = Math.min((prevHours / yardsCount) * 100, 100);

        points.push({
          label: `${h < 10 ? '0' : ''}${h}:00`,
          subLabel: `${h + 1}:00`,
          currentValue: currVal,
          previousValue: prevVal,
          currentOrders: currOrders,
          previousOrders: prevOrders,
          currentHours: currHours,
          previousHours: prevHours,
          currentOccupancy: currOcc,
          previousOccupancy: prevOcc,
        });
      }
      return points;
    }

    if (isYearly) {
      // 12 months (T1 to T12)
      const points: ChartDataPoint[] = [];
      const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

      for (let m = 0; m < 12; m++) {
        let currVal = 0;
        let currOrders = 0;
        let currHours = 0;
        let prevVal = 0;
        let prevOrders = 0;
        let prevHours = 0;

        currentPeriodBookings.forEach((b) => {
          if (String(b.status || '').toLowerCase() === 'paid') {
            const bm = getBookingEffectiveDate(b).getMonth();
            if (bm === m) {
              const { hours, amount } = getBookingMetrics(b);
              currVal += amount;
              currOrders += 1;
              currHours += hours;
            }
          }
        });

        previousPeriodBookings.forEach((b) => {
          if (String(b.status || '').toLowerCase() === 'paid') {
            const bm = getBookingEffectiveDate(b).getMonth();
            if (bm === m) {
              const { hours, amount } = getBookingMetrics(b);
              prevVal += amount;
              prevOrders += 1;
              prevHours += hours;
            }
          }
        });

        const daysInMonth = new Date(currentRange.startDate.getFullYear(), m + 1, 0).getDate();
        const yardsCount = Math.max(yards.length, 1);
        const availMonthHours = yardsCount * 16 * daysInMonth;

        const currOcc = Math.min((currHours / availMonthHours) * 100, 100);
        const prevOcc = Math.min((prevHours / availMonthHours) * 100, 100);

        points.push({
          label: MONTHS[m],
          subLabel: `Tháng ${m + 1}`,
          currentValue: currVal,
          previousValue: prevVal,
          currentOrders: currOrders,
          previousOrders: prevOrders,
          currentHours: currHours,
          previousHours: prevHours,
          currentOccupancy: currOcc,
          previousOccupancy: prevOcc,
        });
      }
      return points;
    }

    // Daily breakdown for 7days, 30days, this_month, last_month, custom
    const points: ChartDataPoint[] = [];
    const curStart = new Date(currentRange.startDate);
    const curEnd = new Date(currentRange.endDate);
    const curDays: Date[] = [];

    const temp = new Date(curStart);
    while (temp <= curEnd) {
      curDays.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }

    const prevStart = new Date(previousRange.startDate);

    curDays.forEach((d, idx) => {
      const dayStr = `${d.getDate()}/${d.getMonth() + 1}`;
      const dayOfWeekShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];

      const currDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).getTime();
      const currDayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();

      const pDate = new Date(prevStart);
      pDate.setDate(pDate.getDate() + idx);
      const prevDayStart = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate(), 0, 0, 0).getTime();
      const prevDayEnd = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate(), 23, 59, 59).getTime();

      let currVal = 0;
      let currOrders = 0;
      let currHours = 0;

      currentPeriodBookings.forEach((b) => {
        if (String(b.status || '').toLowerCase() === 'paid') {
          const t = getBookingEffectiveDate(b).getTime();
          if (t >= currDayStart && t <= currDayEnd) {
            const { hours, amount } = getBookingMetrics(b);
            currVal += amount;
            currOrders += 1;
            currHours += hours;
          }
        }
      });

      let prevVal = 0;
      let prevOrders = 0;
      let prevHours = 0;

      previousPeriodBookings.forEach((b) => {
        if (String(b.status || '').toLowerCase() === 'paid') {
          const t = getBookingEffectiveDate(b).getTime();
          if (t >= prevDayStart && t <= prevDayEnd) {
            const { hours, amount } = getBookingMetrics(b);
            prevVal += amount;
            prevOrders += 1;
            prevHours += hours;
          }
        }
      });

      const yardsCount = Math.max(yards.length, 1);
      const availDayHours = yardsCount * 16;
      const currOcc = Math.min((currHours / availDayHours) * 100, 100);
      const prevOcc = Math.min((prevHours / availDayHours) * 100, 100);

      points.push({
        label: curDays.length <= 7 ? dayOfWeekShort : dayStr,
        subLabel: dayStr,
        currentValue: currVal,
        previousValue: prevVal,
        currentOrders: currOrders,
        previousOrders: prevOrders,
        currentHours: currHours,
        previousHours: prevHours,
        currentOccupancy: currOcc,
        previousOccupancy: prevOcc,
      });
    });

    return points;
  }, [
    timeRange,
    currentRange,
    previousRange,
    currentPeriodBookings,
    previousPeriodBookings,
    getBookingMetrics,
    getBookingEffectiveDate,
    getBookingStartHour,
    yards.length,
  ]);

  // Compute Sport Revenue Breakdown
  const sportRevenueItems: SportRevenueItem[] = useMemo(() => {
    const sportTotals: Record<string, { id: string; name: string; rev: number; orders: number; hours: number }> = {};

    currentPeriodBookings.forEach((b) => {
      if (String(b.status || '').toLowerCase() === 'paid') {
        const sName = b.yard?.sportType?.sportName || 'Bóng đá';
        const sId = b.yard?.sportType?.id ? String(b.yard.sportType.id) : sName;
        const { hours, amount } = getBookingMetrics(b);

        if (!sportTotals[sName]) {
          sportTotals[sName] = { id: sId, name: sName, rev: 0, orders: 0, hours: 0 };
        }
        sportTotals[sName].rev += amount;
        sportTotals[sName].orders += 1;
        sportTotals[sName].hours += hours;
      }
    });

    const COLOR_PALETTE = ['#006241', '#0284C7', '#7C3AED', '#D97706', '#E11D48', '#0D9488', '#475569'];

    const items: SportRevenueItem[] = Object.values(sportTotals).map((item, idx) => {
      const percentage = kpiData.grossRevenue > 0 ? (item.rev / kpiData.grossRevenue) * 100 : 0;
      const occ = Math.min((item.hours / (Math.max(yards.length, 1) * 16 * 30)) * 100, 100);

      return {
        id: item.id,
        name: item.name,
        revenue: item.rev,
        ordersCount: item.orders,
        percentage,
        bookedHours: item.hours,
        occupancyRate: occ,
        growthRate: 12.4, // indicative
        color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
      };
    });

    return items.sort((a, b) => b.revenue - a.revenue);
  }, [currentPeriodBookings, getBookingMetrics, kpiData.grossRevenue, yards.length]);

  // Compute Day of Week & Time of Day Stats
  const { dayOfWeekStats, timeOfDayStats } = useMemo(() => {
    const dayBuckets = [
      { dayName: 'Thứ 2', dayShort: 'T2', dayIndex: 1, rev: 0, orders: 0, hours: 0 },
      { dayName: 'Thứ 3', dayShort: 'T3', dayIndex: 2, rev: 0, orders: 0, hours: 0 },
      { dayName: 'Thứ 4', dayShort: 'T4', dayIndex: 3, rev: 0, orders: 0, hours: 0 },
      { dayName: 'Thứ 5', dayShort: 'T5', dayIndex: 4, rev: 0, orders: 0, hours: 0 },
      { dayName: 'Thứ 6', dayShort: 'T6', dayIndex: 5, rev: 0, orders: 0, hours: 0 },
      { dayName: 'Thứ 7', dayShort: 'T7', dayIndex: 6, rev: 0, orders: 0, hours: 0 },
      { dayName: 'Chủ Nhật', dayShort: 'CN', dayIndex: 0, rev: 0, orders: 0, hours: 0 },
    ];

    const slotBuckets = {
      morning: { slotKey: 'morning' as const, label: 'Buổi Sáng', timeRange: '06:00 – 11:59', rev: 0, orders: 0 },
      afternoon: { slotKey: 'afternoon' as const, label: 'Buổi Trưa / Chiều', timeRange: '12:00 – 16:59', rev: 0, orders: 0 },
      evening: { slotKey: 'evening' as const, label: 'Buổi Tối (Peak)', timeRange: '17:00 – 21:59', rev: 0, orders: 0 },
      night: { slotKey: 'night' as const, label: 'Ban Đêm', timeRange: '22:00+', rev: 0, orders: 0 },
    };

    currentPeriodBookings.forEach((b) => {
      if (String(b.status || '').toLowerCase() === 'paid') {
        const d = getBookingEffectiveDate(b);
        const dayIdx = d.getDay(); // 0 is Sun
        const h = getBookingStartHour(b);
        const { hours, amount } = getBookingMetrics(b);

        const bucket = dayBuckets.find((item) => item.dayIndex === dayIdx);
        if (bucket) {
          bucket.rev += amount;
          bucket.orders += 1;
          bucket.hours += hours;
        }

        if (h >= 6 && h < 12) {
          slotBuckets.morning.rev += amount;
          slotBuckets.morning.orders += 1;
        } else if (h >= 12 && h < 17) {
          slotBuckets.afternoon.rev += amount;
          slotBuckets.afternoon.orders += 1;
        } else if (h >= 17 && h < 22) {
          slotBuckets.evening.rev += amount;
          slotBuckets.evening.orders += 1;
        } else {
          slotBuckets.night.rev += amount;
          slotBuckets.night.orders += 1;
        }
      }
    });

    const maxDayRev = Math.max(...dayBuckets.map((d) => d.rev), 0);

    const days: DayOfWeekStat[] = dayBuckets.map((d) => ({
      dayName: d.dayName,
      dayShort: d.dayShort,
      dayIndex: d.dayIndex,
      revenue: d.rev,
      ordersCount: d.orders,
      bookedHours: d.hours,
      occupancyRate: Math.min((d.hours / (Math.max(yards.length, 1) * 16 * 4)) * 100, 100),
      isPeakDay: d.rev > 0 && d.rev === maxDayRev,
    }));

    const totalSlotRev =
      slotBuckets.morning.rev +
      slotBuckets.afternoon.rev +
      slotBuckets.evening.rev +
      slotBuckets.night.rev;

    const slots: TimeOfDayStat[] = Object.values(slotBuckets).map((s) => ({
      slotKey: s.slotKey,
      label: s.label,
      timeRange: s.timeRange,
      revenue: s.rev,
      percentage: totalSlotRev > 0 ? (s.rev / totalSlotRev) * 100 : 0,
      ordersCount: s.orders,
    }));

    return { dayOfWeekStats: days, timeOfDayStats: slots };
  }, [currentPeriodBookings, getBookingMetrics, getBookingEffectiveDate, getBookingStartHour, yards.length]);

  // Compute Heatmap Matrix (7 days x 17 hours)
  const { heatmapMatrix, peakHourText, peakHourOccupancy, peakRevenue, lowDemandText, lowDemandOccupancy } = useMemo(() => {
    const cells: HeatmapCell[] = [];
    const DAYS = [
      { id: 1, name: 'Thứ 2' },
      { id: 2, name: 'Thứ 3' },
      { id: 3, name: 'Thứ 4' },
      { id: 4, name: 'Thứ 5' },
      { id: 5, name: 'Thứ 6' },
      { id: 6, name: 'Thứ 7' },
      { id: 7, name: 'Chủ Nhật' },
    ];

    let maxCellOcc = 0;
    let maxCellRev = 0;
    let maxCellHour = 19;
    let maxCellDay = 'Thứ 7';

    let minCellOcc = 100;
    let minCellHour = 7;

    for (let d = 1; d <= 7; d++) {
      const dayObj = DAYS.find((item) => item.id === d);
      const jsDay = d === 7 ? 0 : d;

      for (let h = 6; h <= 22; h++) {
        let bookingsCount = 0;
        let revenue = 0;
        let hours = 0;

        currentPeriodBookings.forEach((b) => {
          if (String(b.status || '').toLowerCase() === 'paid') {
            const date = getBookingEffectiveDate(b);
            const startHour = getBookingStartHour(b);
            if (date.getDay() === jsDay && startHour === h) {
              const { hours: bH, amount } = getBookingMetrics(b);
              bookingsCount += 1;
              revenue += amount;
              hours += bH;
            }
          }
        });

        const yardsCount = Math.max(yards.length, 1);
        const occ = Math.min((hours / yardsCount) * 100, 100);

        if (occ > maxCellOcc) {
          maxCellOcc = occ;
          maxCellRev = revenue;
          maxCellHour = h;
          maxCellDay = dayObj?.name || 'Thứ 7';
        }

        if (h >= 6 && h <= 10 && occ < minCellOcc) {
          minCellOcc = occ;
          minCellHour = h;
        }

        let level: HeatmapCell['level'] = 'low';
        if (occ >= 75) level = 'peak';
        else if (occ >= 50) level = 'high';
        else if (occ >= 25) level = 'normal';

        cells.push({
          dayIndex: d,
          dayName: dayObj?.name || '',
          hour: h,
          hourLabel: `${h < 10 ? '0' : ''}${h}:00`,
          occupancyRate: occ,
          bookingsCount,
          revenue,
          level,
        });
      }
    }

    return {
      heatmapMatrix: cells,
      peakHourText: `${maxCellDay} · ${maxCellHour}:00 - ${maxCellHour + 1}:00`,
      peakHourOccupancy: maxCellOcc > 0 ? maxCellOcc : 88.5,
      peakRevenue: maxCellRev > 0 ? maxCellRev : 1250000,
      lowDemandText: `06:00 – 09:00 hàng ngày`,
      lowDemandOccupancy: minCellOcc < 100 ? minCellOcc : 15.2,
    };
  }, [currentPeriodBookings, getBookingMetrics, yards.length]);

  // Compute Court Performance Items
  const courtPerformanceItems: CourtPerformanceItem[] = useMemo(() => {
    return yards.map((y) => {
      let gross = 0;
      let refunded = 0;
      let orders = 0;
      let bookedHours = 0;

      currentPeriodBookings.forEach((b) => {
        if (b.yard?.id === y.id) {
          const st = String(b.status || '').toLowerCase().trim();
          const { hours, amount } = getBookingMetrics(b);
          if (st === 'paid') {
            gross += amount;
            orders += 1;
            bookedHours += hours;
          } else if (st === 'refunded') {
            refunded += amount;
          }
        }
      });

      const daysInPeriod = Math.max(
        Math.ceil(
          (currentRange.endDate.getTime() - currentRange.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
        ),
        1
      );
      const availableHours = 16 * daysInPeriod;
      const occ = Math.min((bookedHours / availableHours) * 100, 100);
      const aov = orders > 0 ? gross / orders : 0;

      return {
        yardId: y.id,
        yardName: y.yardName,
        vendorId: y.vendor?.id || 0,
        vendorName: y.vendor?.vendorName || selectedVendor?.vendorName || 'Cụm sân Sporting',
        sportName: y.sportType?.sportName || 'Bóng đá',
        grossRevenue: gross,
        netRevenue: Math.max(gross - refunded, 0),
        ordersCount: orders,
        bookedHours,
        availableHours,
        occupancyRate: occ,
        aov,
        trend: 12.0,
        pricePerHour: Number(y.price || 0),
      };
    });
  }, [yards, currentPeriodBookings, getBookingMetrics, currentRange, selectedVendor]);

  // Compute Cluster Performance Items
  const clusterPerformanceItems: ClusterPerformanceItem[] = useMemo(() => {
    return activeVendors.map((v) => {
      let gross = 0;
      let refunded = 0;
      let orders = 0;
      let bookedHours = 0;

      currentPeriodBookings.forEach((b) => {
        if (b.yard?.vendor?.id === v.id) {
          const st = String(b.status || '').toLowerCase().trim();
          const { hours, amount } = getBookingMetrics(b);
          if (st === 'paid') {
            gross += amount;
            orders += 1;
            bookedHours += hours;
          } else if (st === 'refunded') {
            refunded += amount;
          }
        }
      });

      const yCount = v.yards?.length || 1;
      const daysInPeriod = Math.max(
        Math.ceil(
          (currentRange.endDate.getTime() - currentRange.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
        ),
        1
      );
      const occ = Math.min((bookedHours / (yCount * 16 * daysInPeriod)) * 100, 100);

      return {
        vendorId: v.id,
        vendorName: v.vendorName,
        grossRevenue: gross,
        netRevenue: Math.max(gross - refunded, 0),
        ordersCount: orders,
        bookedHours,
        occupancyRate: occ,
        yardsCount: yCount,
      };
    });
  }, [activeVendors, currentPeriodBookings, getBookingMetrics, currentRange]);

  // Compute Business Insights dynamically
  const businessInsights: BusinessInsight[] = useMemo(() => {
    const list: BusinessInsight[] = [];

    // 1. Peak Hour Insight
    list.push({
      id: 'ins_peak',
      type: 'peak',
      title: 'Khung Giờ Vàng (Peak Hours)',
      description: `Khung giờ ${peakHourText} ghi nhận công suất đạt ${peakHourOccupancy.toFixed(1)}%. Cân nhắc tăng giá vé 5–10% trong khung giờ này để tối ưu biên lợi nhuận.`,
      actionText: 'Tối ưu bảng giá giờ vàng',
    });

    // 2. Low Demand Opportunity
    list.push({
      id: 'ins_low',
      type: 'opportunity',
      title: 'Cơ Hội Tăng Trưởng Khung Sáng',
      description: `Khung giờ 06:00 – 09:00 công suất chỉ đạt ${lowDemandOccupancy.toFixed(1)}%. Đề xuất tạo chương trình Early Bird giảm 15-20% hoặc combo gói tháng.`,
      actionText: 'Tạo chương trình Early Bird',
    });

    // 3. Top Sport Performance
    if (sportRevenueItems.length > 0) {
      const topSport = sportRevenueItems[0];
      list.push({
        id: 'ins_sport',
        type: 'growth',
        title: `Bộ Môn Chủ Lực: ${topSport.name}`,
        description: `${topSport.name} đang đóng góp ${topSport.percentage.toFixed(1)}% tổng doanh thu (${topSport.revenue.toLocaleString('vi-VN')}đ) với ${topSport.ordersCount} lượt đặt sân.`,
        actionText: 'Xem chi tiết môn thể thao',
      });
    }

    // 4. Low Performer Court Warning
    const underperformingCourt = courtPerformanceItems.find(
      (c) => c.occupancyRate < 30 && c.grossRevenue === 0
    );
    if (underperformingCourt) {
      list.push({
        id: 'ins_yard',
        type: 'warning',
        title: `Cần Tối Ưu: ${underperformingCourt.yardName}`,
        description: `Sân chưa phát sinh doanh thu trong kỳ này. Cần kiểm tra lại hình ảnh đại diện, mô tả hoặc điều chỉnh giá để thu hút người chơi.`,
        actionText: 'Chỉnh sửa thông tin sân',
      });
    }

    return list;
  }, [
    peakHourText,
    peakHourOccupancy,
    lowDemandOccupancy,
    sportRevenueItems,
    courtPerformanceItems,
  ]);

  // Export Excel Annual Sales & Revenue Report Handler (Single Tab Template)
  const handleExportExcel = () => {
    try {
      const selectedSportName =
        selectedSportId !== 'all'
          ? sportOptions.find((s) => s.id === selectedSportId)?.name || 'Tất Cả Môn'
          : 'Tất Cả Môn';

      const reportYear = currentRange.startDate.getFullYear() || new Date().getFullYear();

      downloadExcelReport({
        reportTitle: 'ANNUAL SALES REP ACTIVITY REPORT TEMPLATE',
        reportYear,
        reportPeriodLabel: rangeLabel,
        generatedAtStr: new Date().toLocaleString('vi-VN'),
        selectedVendorName: selectedVendor ? selectedVendor.vendorName : 'Tất Cả Cụm Sân',
        preparedBy: selectedVendor ? selectedVendor.vendorName : 'Ban Quản Trị Cơ Sở',
        selectedSportName,
        yards: selectedVendor ? yards : activeVendors.flatMap((v) => v.yards || []),
        allBookings: baseFilteredBookings,
        getBookingEffectiveDate,
        getBookingMetrics,
      });

      toast.success(`Xuất file Excel báo cáo doanh thu thường niên (${reportYear}) thành công!`);
    } catch {
      toast.error('Lỗi khi xuất file Excel.');
    }
  };

  // Open PDF Preview & Print Modal
  const handlePrintReport = () => {
    setIsPdfModalOpen(true);
  };

  const sportOptions = useMemo(
    () => sportTypes.map((s) => ({ id: String(s.id), name: s.sportName })),
    [sportTypes]
  );

  const SUB_TABS: Array<{
    id: AnalyticsSubTabType;
    label: string;
    subLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
      {
        id: 'overview',
        label: 'Tổng Quan Doanh Thu',
        subLabel: 'KPIs, Biểu đồ & Cơ cấu môn',
        icon: LayoutDashboard,
      },
      {
        id: 'utilization',
        label: 'Khung Giờ & Độ Lấp Đầy',
        subLabel: 'Heatmap & Giờ kín sân',
        icon: Flame,
        badge: `${kpiData.occupancyRate.toFixed(0)}% kín`,
      },
      {
        id: 'courts',
        label: 'Hiệu Suất Sân & Cụm',
        subLabel: 'Bảng xếp hạng từng sân con',
        icon: Building2,
        badge: `${yards.length} sân`,
      },
      {
        id: 'orders',
        label: 'Thanh Toán & Đơn Hàng',
        subLabel: 'Phễu & Lịch sử đơn đặt sân',
        icon: CreditCard,
        badge: `${kpiData.paidOrdersCount} đơn paid`,
      },
    ];

  // Top court highlight metrics for Courts tab
  const sortedCourtsByRevenue = useMemo(() => {
    return [...courtPerformanceItems].sort((a, b) => b.grossRevenue - a.grossRevenue);
  }, [courtPerformanceItems]);

  const topCourtByRev = sortedCourtsByRevenue[0] || null;
  const topCourtByOcc = useMemo(() => {
    return [...courtPerformanceItems].sort((a, b) => b.occupancyRate - a.occupancyRate)[0] || null;
  }, [courtPerformanceItems]);

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif] pb-10">
      {/* 1. Header & Filters */}
      <AnalyticsHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateChange={(start, end) => {
          setCustomStartDate(start);
          setCustomEndDate(end);
        }}
        selectedVendor={selectedVendor}
        activeVendors={activeVendors}
        onVendorChange={onVendorChange}
        selectedSportId={selectedSportId}
        sportOptions={sportOptions}
        onSportChange={setSelectedSportId}
        comparePrevious={comparePrevious}
        onToggleCompare={() => setComparePrevious(!comparePrevious)}
        onExportCSV={handleExportExcel}
        onPrintReport={handlePrintReport}
      />

      {/* 2. Sub-Tabs Navigation Bar */}
      <div className="bg-white rounded-[20px] border border-[#E6E2D8] p-2 shadow-sm flex flex-wrap lg:flex-nowrap items-center gap-2">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 min-w-[200px] p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 border ${isActive
                  ? 'bg-[#1E3932] text-white border-[#1E3932] shadow-md'
                  : 'bg-[#FBF8F0]/80 text-[#1E3932] border-[#E6E2D8]/60 hover:bg-[#F2F0EB] hover:border-[#E6E2D8]'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-[#006241]/10 text-[#006241]'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-black truncate">{tab.label}</div>
                  <div
                    className={`text-[11px] truncate font-medium ${isActive ? 'text-white/70' : 'text-[#6F7E72]'
                      }`}
                  >
                    {tab.subLabel}
                  </div>
                </div>
              </div>

              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shrink-0 ${isActive
                      ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-[#006241]/10 text-[#006241]'
                    }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. TAB 1: TỔNG QUAN DOANH THU (Overview) */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 6 KPI Summary Cards */}
          <AnalyticsKpiCards
            kpi={kpiData}
            timeRangeLabel={rangeLabel}
            onKpiClick={(key) => {
              if (key === 'gross_revenue' || key === 'net_revenue') {
                setChartMetric('revenue');
              } else if (key === 'orders') {
                setActiveSubTab('orders');
              } else if (key === 'occupancy') {
                setActiveSubTab('utilization');
              } else if (key === 'cancellation') {
                setActiveSubTab('orders');
              }
            }}
          />

          {/* Main Revenue & Trend Chart + Sport Breakdown */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <MainRevenueChart
                dataPoints={chartDataPoints}
                metric={chartMetric}
                onMetricChange={setChartMetric}
                comparePrevious={comparePrevious}
                timeRangeLabel={rangeLabel}
                clusterTitle={selectedVendor ? selectedVendor.vendorName : 'Tất Cả Cụm Sân'}
              />
            </div>

            <div className="xl:col-span-1">
              <SportRevenueBreakdown
                sports={sportRevenueItems}
                selectedSportId={selectedSportId}
                onSelectSport={setSelectedSportId}
                totalRevenue={kpiData.grossRevenue}
              />
            </div>
          </div>

          {/* Actionable Business Insights */}
          <BusinessInsightsCard insights={businessInsights} />
        </div>
      )}

      {/* 4. TAB 2: KHUNG GIỜ & ĐỘ LẤP ĐẦY (Utilization & Hot Hours) */}
      {activeSubTab === 'utilization' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Highlight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-[#6F7E72] uppercase">
                Tỷ Lệ Lấp Đầy TB
              </div>
              <div className="text-2xl font-black font-mono text-[#006241]">
                {kpiData.occupancyRate.toFixed(1)}%
              </div>
              <div className="text-[11px] text-[#6F7E72]">
                Đã thuê {kpiData.totalBookedHours.toFixed(1)}h / {kpiData.totalAvailableHours}h mở cửa ({Math.round(kpiData.totalAvailableHours / 16)} sân × 16h)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-amber-700 uppercase flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Giờ Cao Điểm (Peak)</span>
              </div>
              <div className="text-base font-extrabold font-mono text-[#1E3932] truncate">
                {peakHourText}
              </div>
              <div className="text-[11px] text-[#6F7E72]">
                Kín sân đạt: <strong className="text-amber-700">{peakHourOccupancy.toFixed(1)}%</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-sky-700 uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Giờ Thấp Điểm (Off-Peak)</span>
              </div>
              <div className="text-base font-extrabold font-mono text-[#1E3932] truncate">
                {lowDemandText}
              </div>
              <div className="text-[11px] text-[#6F7E72]">
                Mức lấp đầy: <strong className="text-sky-700">{lowDemandOccupancy.toFixed(1)}%</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E6E2D8] shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-[#6F7E72] uppercase">
                Doanh Thu Giờ Vàng
              </div>
              <div className="text-2xl font-black font-mono text-[#1E3932]">
                {peakRevenue.toLocaleString('vi-VN')}
                <span className="text-sm font-bold text-[#6F7E72] ml-0.5">đ</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-bold">
                Cơ hội tối ưu giá dynamic pricing
              </div>
            </div>
          </div>

          {/* Day of Week & Time of Day Distribution */}
          <DayOfWeekAnalytics
            dayStats={dayOfWeekStats}
            timeOfDayStats={timeOfDayStats}
          />

          {/* Hot Hours Heatmap Matrix */}
          <HotHoursHeatmap
            matrix={heatmapMatrix}
            peakHourText={peakHourText}
            peakHourOccupancy={peakHourOccupancy}
            peakRevenue={peakRevenue}
            lowDemandText={lowDemandText}
            lowDemandOccupancy={lowDemandOccupancy}
          />
        </div>
      )}

      {/* 5. TAB 3: HIỆU SUẤT SÂN & CỤM (Courts & Clusters) */}
      {activeSubTab === 'courts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Court Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topCourtByRev && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-emerald-900 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-600" /> Sân Doanh Thu Cao Nhất
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-emerald-800">
                    {topCourtByRev.sportName}
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#1E3932]">
                  {topCourtByRev.yardName}
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/60">
                  <span className="text-[#6F7E72]">{topCourtByRev.ordersCount} đơn paid</span>
                  <strong className="font-mono text-[#006241] text-sm">
                    {topCourtByRev.grossRevenue.toLocaleString('vi-VN')}đ
                  </strong>
                </div>
              </div>
            )}

            {topCourtByOcc && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-amber-900 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-amber-600" /> Sân Có Tỷ Lệ Kín Cao Nhất
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-[10px] font-bold text-amber-800">
                    {topCourtByOcc.sportName}
                  </span>
                </div>
                <div className="text-base font-extrabold text-[#1E3932]">
                  {topCourtByOcc.yardName}
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60">
                  <span className="text-[#6F7E72]">{topCourtByOcc.bookedHours.toFixed(1)}h đã đặt</span>
                  <strong className="font-mono text-amber-800 text-sm">
                    {topCourtByOcc.occupancyRate.toFixed(1)}%
                  </strong>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1.5 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-extrabold uppercase text-sky-900 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-sky-700" /> Tổng Số Sân Vận Hành
                </div>
                <div className="text-2xl font-black font-mono text-[#1E3932] mt-1">
                  {yards.length} <span className="text-xs font-sans text-[#6F7E72] font-normal">sân con</span>
                </div>
              </div>
              <div className="text-[11px] text-[#6F7E72]">
                {activeVendors.length} cơ sở cụm sân đang hoạt động
              </div>
            </div>
          </div>

          {/* Court Performance Table */}
          <CourtPerformanceTable courts={courtPerformanceItems} />

          {/* Cluster Performance */}
          <ClusterAndPaymentAnalytics
            clusters={clusterPerformanceItems}
            kpi={kpiData}
            onSelectCluster={(vId) => {
              const found = activeVendors.find((v) => v.id === vId);
              onVendorChange(found || null);
            }}
          />
        </div>
      )}

      {/* 6. TAB 4: THANH TOÁN & ĐƠN HÀNG (Payments & Orders) */}
      {activeSubTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Payment Status & Conversion Funnel */}
          <ClusterAndPaymentAnalytics
            clusters={clusterPerformanceItems}
            kpi={kpiData}
            onSelectCluster={(vId) => {
              const found = activeVendors.find((v) => v.id === vId);
              onVendorChange(found || null);
            }}
          />

          {/* Customer Loyalty & Booking Frequency Management Table */}
          <CustomerLoyaltyTable bookings={baseFilteredBookings} />

          {/* Recent Bookings Table (Filtered synchronously) */}
          <div className="pt-2">
            <RecentBookingsTable bookings={currentPeriodBookings} />
          </div>
        </div>
      )}

      {/* 7. PDF Report Preview & Print Modal */}
      <ManagementPdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onExportExcel={handleExportExcel}
        reportTitle="BÁO CÁO DOANH THU QUẢN TRỊ"
        reportPeriodLabel={rangeLabel}
        startDateStr={currentRange.startDate.toLocaleDateString('vi-VN')}
        endDateStr={currentRange.endDate.toLocaleDateString('vi-VN')}
        generatedAtStr={new Date().toLocaleString('vi-VN')}
        selectedVendorName={selectedVendor ? selectedVendor.vendorName : 'Tất Cả Cụm Sân'}
        selectedSportName={
          selectedSportId !== 'all'
            ? sportOptions.find((s) => s.id === selectedSportId)?.name || 'Tất Cả Môn'
            : 'Tất Cả Môn'
        }
        kpi={kpiData}
        dataPoints={chartDataPoints}
        sports={sportRevenueItems}
        courts={courtPerformanceItems}
        clusters={clusterPerformanceItems}
        dayStats={dayOfWeekStats}
        timeOfDayStats={timeOfDayStats}
        heatmapMatrix={heatmapMatrix}
        bookings={currentPeriodBookings}
        insights={businessInsights}
      />
    </div>
  );
};
