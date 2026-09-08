/**
 * Centralized Time Picker Utilities for Sporting ONE
 * Handles normalization, validation, parsing, duration calculations, and overlap detection.
 */

export interface ParsedTime {
  hour: number;
  minute: number;
}

export interface TimeDuration {
  hours: number;
  minutes: number;
  totalHours: number;
  text: string;
}

export interface BookingInterval {
  startTime: string; // "HH:mm" or ISO string
  endTime: string;   // "HH:mm" or ISO string
  status?: string;
  isMyBooking?: boolean;
}

export interface TimeRangeValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Converts "HH:mm", "HH:mm:ss", or ISO date string into { hour, minute }
 */
export const parseTime = (timeStr?: string | null): ParsedTime | null => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;
    return { hour: d.getHours(), minute: d.getMinutes() };
  }

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return { hour: h, minute: m };
  }

  return null;
};

/**
 * Formats hour and minute into standard "HH:mm" string
 */
export const formatTime = (hour: number, minute: number): string => {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Converts "HH:mm" string to total minutes since midnight
 */
export const timeStrToMinutes = (timeStr?: string | null, fallback = 0): number => {
  const parsed = parseTime(timeStr);
  if (!parsed) return fallback;
  return parsed.hour * 60 + parsed.minute;
};

/**
 * Converts total minutes from midnight into "HH:mm" string
 */
export const minutesToTimeStr = (totalMinutes: number): string => {
  const normalized = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  const h = Math.floor(normalized / 60) % 24;
  const m = normalized % 60;
  return formatTime(h, m);
};

/**
 * Intelligently normalizes user input into valid "HH:mm".
 */
export const normalizeTimeInput = (input: string): string | null => {
  if (!input) return null;
  const raw = input.trim().toLowerCase();

  // If already contains colon
  if (raw.includes(':')) {
    const parts = raw.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return formatTime(h, m);
      }
    }
    return null;
  }

  // Pure digits handling
  const cleanDigits = raw.replace(/\D/g, '');
  if (!cleanDigits) return null;

  // 1 or 2 digits: "8" -> "08:00", "14" -> "14:00"
  if (cleanDigits.length === 1 || cleanDigits.length === 2) {
    const h = parseInt(cleanDigits, 10);
    if (h >= 0 && h <= 23) {
      return formatTime(h, 0);
    }
    return null;
  }

  // 3 digits: "802" -> 08:02, "930" -> 09:30
  if (cleanDigits.length === 3) {
    const h = parseInt(cleanDigits.slice(0, 1), 10);
    const m = parseInt(cleanDigits.slice(1), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return formatTime(h, m);
    }
    return null;
  }

  // 4 digits: "0802" -> 08:02, "2130" -> 21:30
  if (cleanDigits.length === 4) {
    const h = parseInt(cleanDigits.slice(0, 2), 10);
    const m = parseInt(cleanDigits.slice(2), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return formatTime(h, m);
    }
    return null;
  }

  return null;
};

/**
 * Normalizes single hour field (0-23)
 */
export const normalizeHourInput = (input: string): number | null => {
  const h = parseInt(input.trim(), 10);
  if (isNaN(h) || h < 0 || h > 23) return null;
  return h;
};

/**
 * Normalizes single minute field (0-59)
 */
export const normalizeMinuteInput = (input: string): number | null => {
  const m = parseInt(input.trim(), 10);
  if (isNaN(m) || m < 0 || m > 59) return null;
  return m;
};

/**
 * Calculates human-readable duration between two "HH:mm" time strings
 */
export const calculateDuration = (startTime: string, endTime: string): TimeDuration => {
  const startMins = timeStrToMinutes(startTime);
  const endMins = timeStrToMinutes(endTime);

  let diff = endMins - startMins;
  if (diff < 0) diff = 0;

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  const totalHours = Number((diff / 60).toFixed(2));

  let text = '';
  if (diff === 0) {
    text = '0 phút';
  } else if (hours === 0) {
    text = `${minutes} phút`;
  } else if (minutes === 0) {
    text = `${hours} tiếng`;
  } else {
    text = `${hours} tiếng ${minutes} phút`;
  }

  return {
    hours,
    minutes,
    totalHours,
    text,
  };
};

/**
 * Validates a single "HH:mm" string
 */
export const validateTime = (timeStr?: string | null): TimeRangeValidationResult => {
  if (!timeStr) {
    return { isValid: false, error: 'Vui lòng chọn thời gian.' };
  }
  const parsed = parseTime(timeStr);
  if (!parsed) {
    return { isValid: false, error: 'Định dạng giờ không hợp lệ (HH:mm).' };
  }
  if (parsed.hour < 0 || parsed.hour > 23) {
    return { isValid: false, error: 'Giờ phải từ 00 đến 23.' };
  }
  if (parsed.minute < 0 || parsed.minute > 59) {
    return { isValid: false, error: 'Phút phải từ 00 đến 59.' };
  }
  return { isValid: true };
};

/**
 * Validates full time range against court opening/closing hours
 */
export const isTimeRangeValid = (
  startTime: string,
  endTime: string,
  openingTime = '06:00',
  closingTime = '23:00'
): TimeRangeValidationResult => {
  const valStart = validateTime(startTime);
  if (!valStart.isValid) return valStart;

  const valEnd = validateTime(endTime);
  if (!valEnd.isValid) return valEnd;

  const startMins = timeStrToMinutes(startTime);
  const endMins = timeStrToMinutes(endTime);
  const openMins = timeStrToMinutes(openingTime, 6 * 60);
  const closeMins = timeStrToMinutes(closingTime, 23 * 60);

  if (endMins - startMins < 60) {
    return {
      isValid: false,
      error: 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu tối thiểu 1 tiếng.',
    };
  }

  if (startMins < openMins) {
    return {
      isValid: false,
      error: `Giờ bắt đầu (${startTime}) không được sớm hơn giờ mở cửa (${openingTime}).`,
    };
  }

  if (endMins > closeMins) {
    return {
      isValid: false,
      error: `Giờ kết thúc (${endTime}) không được trễ hơn giờ đóng cửa (${closingTime}).`,
    };
  }

  return { isValid: true };
};

export const isOverlapping = (
  rangeA: { start: string; end: string },
  rangeB: { start: string; end: string }
): boolean => {
  const startA = timeStrToMinutes(rangeA.start);
  const endA = timeStrToMinutes(rangeA.end);
  const startB = timeStrToMinutes(rangeB.start);
  const endB = timeStrToMinutes(rangeB.end);

  // Overlap condition: startA < endB && endA > startB
  return startA < endB && endA > startB;
};

/**
 * Checks if a selected time range conflicts with any existing booking intervals on that date
 */
export const checkBookingConflict = (
  startTime: string,
  endTime: string,
  existingBookings: BookingInterval[] = []
): { hasConflict: boolean; conflictingBooking?: BookingInterval } => {
  if (!existingBookings.length) return { hasConflict: false };

  const startMins = timeStrToMinutes(startTime);
  const endMins = timeStrToMinutes(endTime);

  for (let i = 0; i < existingBookings.length; i++) {
    const b = existingBookings[i];
    const bStartMins = timeStrToMinutes(b.startTime);
    const bEndMins = timeStrToMinutes(b.endTime);

    if (startMins < bEndMins && endMins > bStartMins) {
      return { hasConflict: true, conflictingBooking: b };
    }
  }

  return { hasConflict: false };
};

/**
 * Generates an array of hours (00-23 or within open/close range)
 */
export const generateOperatingHours = (
  openingTime = '06:00',
  closingTime = '23:00'
): number[] => {
  const openParsed = parseTime(openingTime) || { hour: 6, minute: 0 };
  const closeParsed = parseTime(closingTime) || { hour: 23, minute: 0 };

  const startHour = Math.max(0, openParsed.hour);
  // If close minute > 0, include closing hour
  const endHour = Math.min(23, closeParsed.minute > 0 ? closeParsed.hour : Math.max(startHour, closeParsed.hour));

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }
  return hours;
};

/**
 * Generates visual timeline slots (e.g. hourly or 30-min increments) for rendering status bars
 */
export const generateTimelineSegments = (
  startTime: string,
  endTime: string,
  openingTime = '06:00',
  closingTime = '23:00',
  existingBookings: BookingInterval[] = [],
  stepMinutes = 30
) => {
  const openMins = timeStrToMinutes(openingTime, 6 * 60);
  const closeMins = timeStrToMinutes(closingTime, 23 * 60);
  const selStartMins = timeStrToMinutes(startTime);
  const selEndMins = timeStrToMinutes(endTime);

  // Pre-calculate parsed booking ranges to avoid parsing inside loop
  const bookingRanges = existingBookings.map((b) => ({
    start: timeStrToMinutes(b.startTime),
    end: timeStrToMinutes(b.endTime),
  }));

  const segments: Array<{
    startMin: number;
    endMin: number;
    startStr: string;
    endStr: string;
    status: 'selected' | 'booked' | 'maintenance' | 'available' | 'closed';
  }> = [];

  const totalSteps = Math.floor((24 * 60) / stepMinutes);

  for (let i = 0; i < totalSteps; i++) {
    const slotStart = i * stepMinutes;
    const slotEnd = slotStart + stepMinutes;
    const startStr = minutesToTimeStr(slotStart);
    const endStr = minutesToTimeStr(slotEnd);

    if (slotStart < openMins || slotEnd > closeMins) {
      segments.push({ startMin: slotStart, endMin: slotEnd, startStr, endStr, status: 'closed' });
      continue;
    }

    let isBooked = false;
    for (let j = 0; j < bookingRanges.length; j++) {
      if (slotStart < bookingRanges[j].end && slotEnd > bookingRanges[j].start) {
        isBooked = true;
        break;
      }
    }

    if (isBooked) {
      segments.push({ startMin: slotStart, endMin: slotEnd, startStr, endStr, status: 'booked' });
      continue;
    }

    if (slotStart < selEndMins && slotEnd > selStartMins) {
      segments.push({ startMin: slotStart, endMin: slotEnd, startStr, endStr, status: 'selected' });
      continue;
    }

    segments.push({ startMin: slotStart, endMin: slotEnd, startStr, endStr, status: 'available' });
  }

  return segments;
};
