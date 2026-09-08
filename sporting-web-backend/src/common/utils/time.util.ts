export interface VietnamTimeInfo {
  iso: string;
  date: string;
  formattedDate: string;
  dayOfWeek: string;
  time: string;
  timestamp: number;
  timezone: string;
  source: 'timeapi.io' | 'worldtimeapi.org' | 'server_fallback';
}

/**
 * Extracts accurate date and time in Vietnam timezone (Asia/Ho_Chi_Minh - GMT+7)
 * using Intl.DateTimeFormat standard to avoid system clock discrepancies.
 */
export function getVietnamTimeParts(d = new Date()): {
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds: string;
  formattedDate: string;
  dateStr: string;
  timeStr: string;
  dayOfWeek: string;
} {
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

  return {
    year,
    month,
    day,
    hours,
    minutes,
    seconds,
    dateStr: `${year}-${month}-${day}`,
    formattedDate: `${day}/${month}/${year}`,
    timeStr: `${hours}:${minutes}:${seconds}`,
    dayOfWeek,
  };
}

/**
 * Retrieves VietnamTimeFromApi information.
 */
export async function fetchVietnamTimeFromApi(): Promise<VietnamTimeInfo> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      'https://timeapi.io/api/v1/time/current/zone?timeZone=Asia/Ho_Chi_Minh',
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.year && data.month && data.day) {
        const month = String(data.month).padStart(2, '0');
        const day = String(data.day).padStart(2, '0');
        const hours = String(data.hour || 0).padStart(2, '0');
        const minutes = String(data.minute || 0).padStart(2, '0');
        const seconds = String(data.seconds || 0).padStart(2, '0');

        const dayOfWeekMap: Record<string, string> = {
          Sunday: 'Chủ Nhật',
          Monday: 'Thứ Hai',
          Tuesday: 'Thứ Ba',
          Wednesday: 'Thứ Tư',
          Thursday: 'Thứ Năm',
          Friday: 'Thứ Sáu',
          Saturday: 'Thứ Bảy',
        };
        const dayOfWeek = dayOfWeekMap[data.dayOfWeek] || 'Chủ Nhật';
        const isoDate = `${data.year}-${month}-${day}T${hours}:${minutes}:${seconds}+07:00`;

        return {
          iso: isoDate,
          date: `${data.year}-${month}-${day}`,
          formattedDate: `${day}/${month}/${data.year}`,
          dayOfWeek,
          time: `${hours}:${minutes}:${seconds}`,
          timestamp: new Date(isoDate).getTime() || Date.now(),
          timezone: 'Asia/Ho_Chi_Minh',
          source: 'timeapi.io',
        };
      }
    }
  } catch {
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      'http://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh',
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.datetime) {
        const dt = new Date(data.datetime);
        if (!isNaN(dt.getTime())) {
          const parts = getVietnamTimeParts(dt);
          return {
            iso: data.datetime,
            date: parts.dateStr,
            formattedDate: parts.formattedDate,
            dayOfWeek: parts.dayOfWeek,
            time: parts.timeStr,
            timestamp: data.unixtime ? data.unixtime * 1000 : dt.getTime(),
            timezone: 'Asia/Ho_Chi_Minh',
            source: 'worldtimeapi.org',
          };
        }
      }
    }
  } catch {
  }

  return getCurrentVietnamTimeFallback();
}

/**
 * Retrieves CurrentVietnamTimeFallback information.
 */
export function getCurrentVietnamTimeFallback(): VietnamTimeInfo {
  const parts = getVietnamTimeParts(new Date());
  const isoDate = `${parts.dateStr}T${parts.timeStr}+07:00`;

  return {
    iso: isoDate,
    date: parts.dateStr,
    formattedDate: parts.formattedDate,
    dayOfWeek: parts.dayOfWeek,
    time: parts.timeStr,
    timestamp: Date.now(),
    timezone: 'Asia/Ho_Chi_Minh',
    source: 'server_fallback',
  };
}
