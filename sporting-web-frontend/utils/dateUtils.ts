/**
 * Centralized Date & Time Utility Functions for Sporting ONE
 */

/**
 * Formats a Date object or HH:mm time string into 12-hour AM/PM format.
 * Examples: "08:00" -> "08:00 AM", "14:30" -> "02:30 PM", Date -> "07:15 PM"
 */
export const formatTimeAMPM = (timeInput: string | Date | undefined | null): string => {
  if (!timeInput) return '';

  let hours = 0;
  let minutes = 0;

  if (timeInput instanceof Date) {
    if (isNaN(timeInput.getTime())) return '';
    hours = timeInput.getHours();
    minutes = timeInput.getMinutes();
  } else if (typeof timeInput === 'string') {
    if (timeInput.includes('T')) {
      const d = new Date(timeInput);
      if (isNaN(d.getTime())) return timeInput;
      hours = d.getHours();
      minutes = d.getMinutes();
    } else if (timeInput.includes(':')) {
      const [hStr, mStr] = timeInput.split(':');
      hours = parseInt(hStr, 10);
      minutes = parseInt(mStr, 10);
      if (isNaN(hours) || isNaN(minutes)) return timeInput;
    } else {
      return timeInput;
    }
  } else {
    return '';
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  let displayHour = hours % 12;
  displayHour = displayHour ? displayHour : 12; 

  const hDisplay = String(displayHour).padStart(2, '0');
  const mDisplay = String(minutes).padStart(2, '0');

  return `${hDisplay}:${mDisplay} ${ampm}`;
};

/**
 * Generates 15-minute increment time slot options for select dropdowns in AM/PM format.
 * Includes exact hour and minute options (e.g. 02:00 AM, 02:15 AM, 02:30 AM, 02:45 AM).
 */
export const generateTimeSlotsAMPM = (
  startHour = 0,
  endHour = 23,
  stepMinutes = 15
): Array<{ val: string; label: string }> => {
  const slots: Array<{ val: string; label: string }> = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let min = 0; min < 60; min += stepMinutes) {
      const hStr = String(hour).padStart(2, '0');
      const mStr = String(min).padStart(2, '0');
      const val = `${hStr}:${mStr}`;
      const label = formatTimeAMPM(val);
      slots.push({ val, label });
    }
  }
  return slots;
};

/**
 * Formats a Date or ISO string to Vietnamese date format (e.g. "Thứ 4, 05/08/2026" or "05/08")
 */
export const formatDateVietnamese = (
  dateInput: string | Date,
  options: { includeWeekday?: boolean; shortFormat?: boolean } = {}
): string => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  if (options.shortFormat) {
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  return d.toLocaleDateString('vi-VN', {
    weekday: options.includeWeekday ? 'short' : undefined,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Calculates duration in hours between two "HH:mm" time strings.
 */
export const calculateDurationHours = (startStr: string, endStr: string): number => {
  if (!startStr || !endStr) return 0;
  const [sH, sM] = startStr.split(':').map(Number);
  const [eH, eM] = endStr.split(':').map(Number);
  const startMins = sH * 60 + sM;
  const endMins = eH * 60 + eM;
  const diffMins = endMins - startMins;
  return diffMins > 0 ? diffMins / 60 : 0;
};

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

