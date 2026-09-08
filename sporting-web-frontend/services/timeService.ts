import { apiClient } from './apiClient';

export interface TimeData {
  iso: string;
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  time: string;
  timestamp: number;
  timezone: string;
}

let syncedOffsetMs: number | null = null;
let ongoingFetch: Promise<TimeData> | null = null;

export const timeService = {
  /**
   * Fetches current standardized timestamp from Time API or server,
   * calculating the clock offset between server and local machine.
   */
  async getCurrentTime(forceRefresh = false): Promise<TimeData> {
    if (!forceRefresh && ongoingFetch) {
      return ongoingFetch;
    }

    ongoingFetch = (async () => {
      try {
        const res = await apiClient.get<TimeData>('/time');
        if (
          res.success &&
          res.data &&
          res.data.formattedDate &&
          !res.data.formattedDate.includes('undefined')
        ) {
          const serverMs = Number(res.data.timestamp) || new Date(res.data.iso).getTime();
          if (!isNaN(serverMs) && serverMs > 0) {
            syncedOffsetMs = serverMs - Date.now();
          }
          return res.data;
        }
      } catch (error) {
        console.warn('[timeService fallback to client Vietnam date]:', error);
      } finally {
        ongoingFetch = null;
      }

      // Fallback calculation in Vietnam timezone if API fails
      const fallback = timeService.getFallbackVietnamTime();
      if (syncedOffsetMs === null) {
        syncedOffsetMs = fallback.timestamp - Date.now();
      }
      return fallback;
    })();

    return ongoingFetch;
  },

  /**
   * Returns current real-time timestamp (in milliseconds) synced with server/API.
   */
  getNowMs(): number {
    return Date.now() + (syncedOffsetMs ?? 0);
  },

  /**
   * Returns current real-time Date object synced with server/API.
   */
  getNow(): Date {
    return new Date(this.getNowMs());
  },

  /**
   * Returns current date string formatted as "YYYY-MM-DD" synced with server/API.
   */
  getTodayDateStr(): string {
    const d = this.getNow();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });
    return `${map.year || '2026'}-${map.month || '01'}-${map.day || '01'}`;
  },

  /**
   * Checks whether a given timestamp/Date is in the past relative to synced server time.
   */
  isPast(dateOrIso: string | Date | number): boolean {
    const targetMs = typeof dateOrIso === 'number' ? dateOrIso : new Date(dateOrIso).getTime();
    return targetMs < this.getNowMs();
  },

  /**
   * Fallback Vietnam Time calculation using Intl
   */
  getFallbackVietnamTime(): TimeData {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      weekday: 'long',
    });

    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });

    let hoursVal = map.hour || '00';
    if (hoursVal === '24') hoursVal = '00';

    const year = map.year || '2026';
    const month = map.month || '01';
    const day = map.day || '01';
    const hours = hoursVal.padStart(2, '0');
    const minutes = (map.minute || '00').padStart(2, '0');
    const seconds = (map.second || '00').padStart(2, '0');

    const daysOfWeekMap: Record<string, string> = {
      Sunday: 'Chủ Nhật',
      Monday: 'Thứ Hai',
      Tuesday: 'Thứ Ba',
      Wednesday: 'Thứ Tư',
      Thursday: 'Thứ Năm',
      Friday: 'Thứ Sáu',
      Saturday: 'Thứ Bảy',
    };

    const dayOfWeek = daysOfWeekMap[map.weekday] || 'Chủ Nhật';
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hours}:${minutes}:${seconds}`;

    return {
      iso: `${dateStr}T${timeStr}+07:00`,
      date: dateStr,
      formattedDate: `${day}/${month}/${year}`,
      dayOfWeek,
      time: timeStr,
      timestamp: d.getTime(),
      timezone: 'Asia/Ho_Chi_Minh',
    };
  },
};

// Automatically initiate time sync on module load
timeService.getCurrentTime().catch(() => {});

/**
 * Formats a Date or ISO string to Display Date Time (e.g. "14:30 - 15/08/2026")
 */
export const formatDisplayDateTime = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
};

