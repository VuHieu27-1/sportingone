import { BadRequestException } from '@nestjs/common';
import { getVietnamTimeParts } from './time.util';

/**
 * Retrieves VietnamDate information.
 */
export function getVietnamDate(date = new Date()): Date {
  const parts = getVietnamTimeParts(date);
  return new Date(`${parts.dateStr}T${parts.timeStr}+07:00`);
}

/**
 * Validates and verifies parameters for validateVendorOperatingHours.
 */
export function validateVendorOperatingHours(
  startTimeStr: string | Date,
  endTimeStr: string | Date,
  openTimeStr?: string | null,
  closeTimeStr?: string | null,
  yardName?: string,
) {
  const openTime = (openTimeStr || '06:00').trim();
  const closeTime = (closeTimeStr || '23:00').trim();

  const startDate = new Date(startTimeStr);
  const endDate = new Date(endTimeStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

  // Đối với đặt sân dài hạn (>= 24 giờ như đặt theo tháng), không áp dụng giới hạn giờ đóng/mở cửa trong ngày
  if (endDate.getTime() - startDate.getTime() >= 24 * 60 * 60 * 1000) {
    return;
  }

  /**
   * Retrieves MinutesFromMidnight information.
   */
  const getMinutesFromMidnight = (d: Date) => {
    const parts = getVietnamTimeParts(d);
    const h = parseInt(parts.hours || '0', 10);
    const m = parseInt(parts.minutes || '0', 10);
    return h * 60 + m;
  };

  /**
   * Executes parse Time To Minutes operation.
   */
  const parseTimeToMinutes = (timeStr: string) => {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h * 60 + m;
  };

  const startMinutes = getMinutesFromMidnight(startDate);
  let endMinutes = getMinutesFromMidnight(endDate);

  if (endMinutes === 0 && endDate.getTime() > startDate.getTime()) {
    endMinutes = 1440;
  }

  const openMinutes = parseTimeToMinutes(openTime);
  let closeMinutes = parseTimeToMinutes(closeTime);
  if (closeMinutes === 0) closeMinutes = 1440;

  /**
   * Formats input data into standard display format.
   */
  const formatHHmm = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startHHmm = formatHHmm(startMinutes);
  const endHHmm = formatHHmm(endMinutes);

  if (closeMinutes >= openMinutes) {
    if (startMinutes < openMinutes) {
      throw new BadRequestException(
        `Giờ đặt sân (${startHHmm}) trước giờ mở cửa (${openTime}) của sân "${yardName || 'thể thao'}". Khung giờ hoạt động của sân là từ ${openTime} đến ${closeTime}.`
      );
    }

    if (endMinutes >= closeMinutes) {
      throw new BadRequestException(
        `Khung giờ hoạt động của sân là từ ${openTime} đến ${closeTime}. Vui lòng điều chỉnh lại giờ đặt và trả sân.`
      );
    }
  } else {
    const adjustedCloseMinutes = closeMinutes + 1440;
    let adjStart = startMinutes < openMinutes ? startMinutes + 1440 : startMinutes;
    let adjEnd = endMinutes < openMinutes ? endMinutes + 1440 : endMinutes;

    if (adjStart < openMinutes) {
      throw new BadRequestException(
        `Giờ đặt sân (${startHHmm}) ngoài khung giờ hoạt động (${openTime} - ${closeTime}) của sân "${yardName || 'thể thao'}".`
      );
    }

    if (adjEnd > adjustedCloseMinutes) {
      throw new BadRequestException(
        `Khung giờ hoạt động của sân là từ ${openTime} đến ${closeTime}. Vui lòng điều chỉnh lại giờ đặt và trả sân.`
      );
    }
  }
}

export { fetchVietnamTimeFromApi, getCurrentVietnamTimeFallback, getVietnamTimeParts } from './time.util';
export type { VietnamTimeInfo } from './time.util';
