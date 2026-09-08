import React from 'react';
import { TimeRangePicker, TimeRangePickerProps, TimeRangePickerValue } from '../common/TimeRangePicker';

export interface BookingTimePickerProps extends TimeRangePickerProps {
  courtName?: string;
  vendorName?: string;
}

export const BookingTimePicker: React.FC<BookingTimePickerProps> = (props) => {
  return <TimeRangePicker {...props} />;
};

export type { TimeRangePickerValue };
