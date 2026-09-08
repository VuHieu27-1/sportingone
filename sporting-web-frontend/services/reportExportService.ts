import { BackendBooking } from './bookingService';
import { BackendYardItem, BackendYard } from './vendorService';

export interface AnnualCourtReportItem {
  courtId: string | number;
  courtName: string;
  sportName: string;
  monthlyBookings: number[];
  totalBookings: number;
  monthlyHours: number[];
  totalHours: number;
  monthlyUnitsSold: number[];
  totalUnitsSold: number;
  monthlySales: number[];
  totalSales: number;
  revenuePercentage: number;
  avgRatePerHour: number;
}

export interface AnnualReportExportData {
  reportTitle?: string;
  reportYear: number;
  reportPeriodLabel?: string;
  generatedAtStr: string;
  selectedVendorName: string;
  preparedBy: string;
  selectedSportName?: string;
  yards: Array<BackendYardItem | BackendYard | any>;
  allBookings: BackendBooking[];
  getBookingEffectiveDate?: (b: BackendBooking) => Date;
  getBookingMetrics?: (b: BackendBooking) => { hours: number; amount: number };
}

/**
 * Escapes XML special characters for SpreadsheetML
 */
function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Aggregates vendor booking data into 12 months for the specified year.
 */
export function processAnnualReportData(data: AnnualReportExportData) {
  const {
    reportYear,
    yards,
    allBookings,
    getBookingEffectiveDate,
    getBookingMetrics,
  } = data;

  const defaultGetDate = (b: BackendBooking): Date => {
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
  };

  const defaultGetMetrics = (b: BackendBooking): { hours: number; amount: number } => {
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
  };

  const getDateFn = getBookingEffectiveDate || defaultGetDate;
  const getMetricsFn = getBookingMetrics || defaultGetMetrics;

  // Filter bookings for the target year
  const yearBookings = allBookings.filter((b) => {
    const d = getDateFn(b);
    return d.getFullYear() === reportYear;
  });

  // Prepare Court List
  const courtMap = new Map<string | number, { yard: BackendYardItem; courtName: string; sportName: string }>();
  yards.forEach((y) => {
    const sName = y.sportType?.sportName || y.sport?.sportName || (y as any).sportName || 'Thể Thao';
    courtMap.set(y.id, {
      yard: y,
      courtName: y.yardName || `Sân #${y.id}`,
      sportName: sName,
    });
  });

  // Check if any booking belongs to a yard not in the map
  yearBookings.forEach((b) => {
    if (b.yard && b.yard.id && !courtMap.has(b.yard.id)) {
      const sName = b.yard.sportType?.sportName || 'Thể Thao';
      courtMap.set(b.yard.id, {
        yard: b.yard as BackendYardItem,
        courtName: b.yard.yardName || `Sân #${b.yard.id}`,
        sportName: sName,
      });
    }
  });

  // If no yards exist, create a default fallback item
  if (courtMap.size === 0) {
    courtMap.set('default', {
      yard: { id: 0, yardName: 'Sân Tổng Hợp', price: 0 } as any,
      courtName: 'Sân Tổng Hợp Cơ Sở',
      sportName: 'Thể Thao Chung',
    });
  }

  // Initialize court items
  const courtItemList: AnnualCourtReportItem[] = Array.from(courtMap.entries()).map(([cId, info]) => ({
    courtId: cId,
    courtName: info.courtName,
    sportName: info.sportName,
    monthlyBookings: new Array(12).fill(0),
    totalBookings: 0,
    monthlyHours: new Array(12).fill(0),
    totalHours: 0,
    monthlyUnitsSold: new Array(12).fill(0),
    totalUnitsSold: 0,
    monthlySales: new Array(12).fill(0),
    totalSales: 0,
    revenuePercentage: 0,
    avgRatePerHour: 0,
  }));

  const courtItemMap = new Map<string | number, AnnualCourtReportItem>();
  courtItemList.forEach((item) => courtItemMap.set(item.courtId, item));

  // Overall summary
  const summary12Months = {
    monthlyBookings: new Array(12).fill(0),
    totalBookings: 0,
    monthlyHours: new Array(12).fill(0),
    totalHours: 0,
    monthlyUnitsSold: new Array(12).fill(0),
    totalUnitsSold: 0,
    monthlySales: new Array(12).fill(0),
    totalSales: 0,
  };

  // Populate data
  yearBookings.forEach((b) => {
    const d = getDateFn(b);
    const m = d.getMonth(); // 0 to 11
    if (m < 0 || m > 11) return;

    const { hours, amount } = getMetricsFn(b);
    const isPaid = String(b.status || '').toLowerCase().trim() === 'paid';

    // Summary accumulation
    summary12Months.monthlyBookings[m] += 1;
    summary12Months.totalBookings += 1;

    if (isPaid) {
      summary12Months.monthlyHours[m] += hours;
      summary12Months.totalHours += hours;

      summary12Months.monthlyUnitsSold[m] += 1;
      summary12Months.totalUnitsSold += 1;

      summary12Months.monthlySales[m] += amount;
      summary12Months.totalSales += amount;
    }

    // Court accumulation
    const yardId = b.yard?.id || (courtItemList.length > 0 ? courtItemList[0].courtId : 'default');
    const courtItem = courtItemMap.get(yardId) || courtItemList[0];

    if (courtItem) {
      courtItem.monthlyBookings[m] += 1;
      courtItem.totalBookings += 1;

      if (isPaid) {
        courtItem.monthlyHours[m] += hours;
        courtItem.totalHours += hours;

        courtItem.monthlyUnitsSold[m] += 1;
        courtItem.totalUnitsSold += 1;

        courtItem.monthlySales[m] += amount;
        courtItem.totalSales += amount;
      }
    }
  });

  // Calculate percentages and average rates
  courtItemList.forEach((item) => {
    item.revenuePercentage = summary12Months.totalSales > 0
      ? (item.totalSales / summary12Months.totalSales) * 100
      : 0;
    item.avgRatePerHour = item.totalHours > 0
      ? Math.round(item.totalSales / item.totalHours)
      : 0;
  });

  return {
    yearBookings,
    courtItemList,
    summary12Months,
  };
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];

/**
 * Generates an XML-based Excel Workbook (.xlsx / .xml compatible)
 * with 1 SINGLE TAB matching the Annual Sales Rep Activity Report Template.
 */
export function generateAnnualVendorReportXml(data: AnnualReportExportData): string {
  const {
    reportTitle = 'ANNUAL SALES REP ACTIVITY REPORT TEMPLATE',
    reportYear,
    generatedAtStr,
    selectedVendorName,
    preparedBy,
    selectedSportName = 'Tất Cả Bộ Môn',
  } = data;

  const { courtItemList, summary12Months } = processAnnualReportData(data);

  // XML Header & Styles
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${escapeXml(reportTitle)}</Title>
  <Author>${escapeXml(preparedBy)}</Author>
  <Created>${escapeXml(new Date().toISOString())}</Created>
  <Company>SPORTING ONE Management System</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1F2937"/>
  </Style>

  <!-- Title Style -->
  <Style ss:ID="MainTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#2D3748"/>
  </Style>

  <!-- Metadata Styles -->
  <Style ss:ID="MetaLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Bold="1" ss:Color="#718096"/>
  </Style>
  <Style ss:ID="MetaBox">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#2D3748"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>

  <!-- Accounted For Card -->
  <Style ss:ID="AccountedCardHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Bold="1" ss:Color="#78350F"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
   </Borders>
  </Style>
  <Style ss:ID="AccountedCardRow">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Color="#92400E"/>
   <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEF3C7"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEF3C7"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEF3C7"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEF3C7"/>
   </Borders>
  </Style>

  <!-- Table 1: Sales Activity Summary (Gold/Yellow) -->
  <Style ss:ID="SummaryTableTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="SummaryNote">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="7.5" ss:Italic="1" ss:Color="#6B7280"/>
  </Style>
  <Style ss:ID="GoldColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#374151"/>
   <Interior ss:Color="#F5CF68" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
   </Borders>
  </Style>
  <Style ss:ID="GoldColHeaderLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#374151"/>
   <Interior ss:Color="#F5CF68" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D97706"/>
   </Borders>
  </Style>

  <!-- Sage Green Tables (Tables 2, 3, 4, 5) -->
  <Style ss:ID="SageTableTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#374151"/>
  </Style>
  <Style ss:ID="SageColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#8CA884" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6E8E66"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6E8E66"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6E8E66"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6E8E66"/>
   </Borders>
  </Style>
  <Style ss:ID="SageColHeaderLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#8CA884" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6E8E66"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6E8E66"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6E8E66"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#6E8E66"/>
   </Borders>
  </Style>

  <!-- Data Rows -->
  <Style ss:ID="DataRowLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Color="#2D3748"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataNumber">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Color="#2D3748"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataHours">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Color="#2D3748"/>
   <NumberFormat ss:Format="#,##0.0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Color="#2D3748"/>
   <NumberFormat ss:Format="#,##0&quot; đ&quot;"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataPercent">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Color="#2D3748"/>
   <NumberFormat ss:Format="0.0%"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Color="#2D3748"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>

  <!-- Summary / Total Row Styles -->
  <Style ss:ID="TotalRowLabel">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#1A202C"/>
   <Interior ss:Color="#EDF2F7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRowNumber">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#1A202C"/>
   <Interior ss:Color="#EDF2F7" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRowHours">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#1A202C"/>
   <Interior ss:Color="#EDF2F7" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0.0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalRowCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#1A202C"/>
   <Interior ss:Color="#EDF2F7" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="#,##0&quot; đ&quot;"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBD5E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E0"/>
   </Borders>
  </Style>

  <!-- Performance Breakdown Dark Header -->
  <Style ss:ID="DarkSageColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#567250" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3E5439"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3E5439"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3E5439"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3E5439"/>
   </Borders>
  </Style>
  <Style ss:ID="DarkSageColHeaderLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8.5" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#567250" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3E5439"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3E5439"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3E5439"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3E5439"/>
   </Borders>
  </Style>
 </Styles>

 <Worksheet ss:Name="Annual Sales Report">
  <Table ss:DefaultRowHeight="18">
   <!-- Column Widths: 1 Name column + 12 Months + 1 Annual Totals -->
   <Column ss:AutoFitWidth="0" ss:Width="230"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="65"/>
   <Column ss:AutoFitWidth="0" ss:Width="110"/>
`;

  // Top Title
  let content = `${xmlHeader}
   <!-- ROW 1: Main Title -->
   <Row ss:Height="28">
    <Cell ss:MergeAcross="13" ss:StyleID="MainTitle"><Data ss:Type="String">${escapeXml(reportTitle.toUpperCase())}</Data></Cell>
   </Row>

   <!-- ROW 2: Metadata Labels -->
   <Row ss:Height="14">
    <Cell ss:MergeAcross="2" ss:StyleID="MetaLabel"><Data ss:Type="String">YEAR / NĂM TÀI CHÍNH</Data></Cell>
    <Cell ss:MergeAcross="4" ss:StyleID="MetaLabel"><Data ss:Type="String">REPORT PREPARED BY / NGƯỜI LẬP BÁO CÁO</Data></Cell>
    <Cell ss:MergeAcross="5" ss:StyleID="MetaLabel"><Data ss:Type="String">SIGNATURE / XÁC THỰC HỆ THỐNG</Data></Cell>
   </Row>

   <!-- ROW 3: Metadata Boxes -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="2" ss:StyleID="MetaBox"><Data ss:Type="String">${escapeXml(reportYear)}</Data></Cell>
    <Cell ss:MergeAcross="4" ss:StyleID="MetaBox"><Data ss:Type="String">${escapeXml(preparedBy || selectedVendorName)}</Data></Cell>
    <Cell ss:MergeAcross="5" ss:StyleID="MetaBox"><Data ss:Type="String">SPORTING ONE PLATFORM VERIFIED (${escapeXml(generatedAtStr)})</Data></Cell>
   </Row>

   <Row ss:Height="8"/>

   <!-- ACCOUNTED FOR IN THIS REPORT CARD -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="4" ss:StyleID="AccountedCardHeader"><Data ss:Type="String">SALESPERSONS / COURTS ACCOUNTED FOR IN THIS REPORT</Data></Cell>
   </Row>
`;

  // Court items in the card
  courtItemList.slice(0, 8).forEach((c) => {
    content += `   <Row ss:Height="18">
    <Cell ss:MergeAcross="4" ss:StyleID="AccountedCardRow"><Data ss:Type="String">${escapeXml(c.courtName)} (${escapeXml(c.sportName)})</Data></Cell>
   </Row>
`;
  });

  content += `   <Row ss:Height="12"/>

   <!-- ========================================== -->
   <!-- TABLE 1: SALES ACTIVITY SUMMARY (GOLD HEADER) -->
   <!-- ========================================== -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="3" ss:StyleID="SummaryTableTitle"><Data ss:Type="String">SALES ACTIVITY SUMMARY</Data></Cell>
    <Cell ss:MergeAcross="9" ss:StyleID="SummaryNote"><Data ss:Type="String">Note: Summary data from the individual court reports below, compiled across 12 months.</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="GoldColHeaderLeft"><Data ss:Type="String">ACTIVITY</Data></Cell>
`;

  MONTH_NAMES.forEach((m) => {
    content += `    <Cell ss:StyleID="GoldColHeader"><Data ss:Type="String">${m}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="GoldColHeader"><Data ss:Type="String">ANNUAL TOTALS</Data></Cell>
   </Row>

   <!-- Table 1 Row 1: Outbound Calls (Total Bookings) -->
   <Row ss:Height="20">
    <Cell ss:StyleID="DataRowLabel"><Data ss:Type="String">Outbound Calls (Lượt đặt sân)</Data></Cell>
`;
  summary12Months.monthlyBookings.forEach((val) => {
    content += `    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${val}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${summary12Months.totalBookings}</Data></Cell>
   </Row>

   <!-- Table 1 Row 2: Sales Visits (Court Hours) -->
   <Row ss:Height="20">
    <Cell ss:StyleID="DataRowLabel"><Data ss:Type="String">Sales Visits (Số giờ hoạt động)</Data></Cell>
`;
  summary12Months.monthlyHours.forEach((val) => {
    content += `    <Cell ss:StyleID="DataHours"><Data ss:Type="Number">${Math.round(val * 10) / 10}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="DataHours"><Data ss:Type="Number">${Math.round(summary12Months.totalHours * 10) / 10}</Data></Cell>
   </Row>

   <!-- Table 1 Row 3: Total Units Sold (Completed Orders) -->
   <Row ss:Height="20">
    <Cell ss:StyleID="DataRowLabel"><Data ss:Type="String">Total Units Sold (Đơn hoàn tất)</Data></Cell>
`;
  summary12Months.monthlyUnitsSold.forEach((val) => {
    content += `    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${val}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${summary12Months.totalUnitsSold}</Data></Cell>
   </Row>

   <!-- Table 1 Row 4: Total Sales Amount ($ / VNĐ) -->
   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRowLabel"><Data ss:Type="String">Total Sales Amount (Doanh Thu VNĐ)</Data></Cell>
`;
  summary12Months.monthlySales.forEach((val) => {
    content += `    <Cell ss:StyleID="TotalRowCurrency"><Data ss:Type="Number">${val}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="TotalRowCurrency"><Data ss:Type="Number">${summary12Months.totalSales}</Data></Cell>
   </Row>

   <Row ss:Height="14"/>

   <!-- ========================================== -->
   <!-- TABLE 2: SALES CALLS PER SALE REPRESENTATIVE -->
   <!-- ========================================== -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="13" ss:StyleID="SageTableTitle"><Data ss:Type="String">SALES CALLS PER SALE REPRESENTATIVE (SỐ LƯỢT ĐẶT THEO SÂN)</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="SageColHeaderLeft"><Data ss:Type="String">Outbound Calls (Tên Sân)</Data></Cell>
`;
  MONTH_NAMES.forEach((m) => {
    content += `    <Cell ss:StyleID="SageColHeader"><Data ss:Type="String">${m}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="SageColHeader"><Data ss:Type="String">ANNUAL TOTALS</Data></Cell>
   </Row>
`;

  courtItemList.forEach((court) => {
    content += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataRowLabel"><Data ss:Type="String">${escapeXml(court.courtName)}</Data></Cell>
`;
    court.monthlyBookings.forEach((v) => {
      content += `    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${v}</Data></Cell>\n`;
    });
    content += `    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${court.totalBookings}</Data></Cell>
   </Row>
`;
  });

  // Total Number of Calls Row
  content += `   <Row ss:Height="20">
    <Cell ss:StyleID="TotalRowLabel"><Data ss:Type="String">Total Number of Calls</Data></Cell>
`;
  summary12Months.monthlyBookings.forEach((v) => {
    content += `    <Cell ss:StyleID="TotalRowNumber"><Data ss:Type="Number">${v}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="TotalRowNumber"><Data ss:Type="Number">${summary12Months.totalBookings}</Data></Cell>
   </Row>

   <Row ss:Height="14"/>

   <!-- ========================================== -->
   <!-- TABLE 3: SALES VISITS PER SALE REPRESENTATIVE -->
   <!-- ========================================== -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="13" ss:StyleID="SageTableTitle"><Data ss:Type="String">SALES VISITS PER SALE REPRESENTATIVE (SỐ GIỜ THUÊ THEO SÂN)</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="SageColHeaderLeft"><Data ss:Type="String">Sales Visits (Tên Sân)</Data></Cell>
`;
  MONTH_NAMES.forEach((m) => {
    content += `    <Cell ss:StyleID="SageColHeader"><Data ss:Type="String">${m}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="SageColHeader"><Data ss:Type="String">ANNUAL TOTALS</Data></Cell>
   </Row>
`;

  courtItemList.forEach((court) => {
    content += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataRowLabel"><Data ss:Type="String">${escapeXml(court.courtName)}</Data></Cell>
`;
    court.monthlyHours.forEach((v) => {
      content += `    <Cell ss:StyleID="DataHours"><Data ss:Type="Number">${Math.round(v * 10) / 10}</Data></Cell>\n`;
    });
    content += `    <Cell ss:StyleID="DataHours"><Data ss:Type="Number">${Math.round(court.totalHours * 10) / 10}</Data></Cell>
   </Row>
`;
  });

  // Total Number of Visits Row
  content += `   <Row ss:Height="20">
    <Cell ss:StyleID="TotalRowLabel"><Data ss:Type="String">Total Number of Visits</Data></Cell>
`;
  summary12Months.monthlyHours.forEach((v) => {
    content += `    <Cell ss:StyleID="TotalRowHours"><Data ss:Type="Number">${Math.round(v * 10) / 10}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="TotalRowHours"><Data ss:Type="Number">${Math.round(summary12Months.totalHours * 10) / 10}</Data></Cell>
   </Row>

   <Row ss:Height="14"/>

   <!-- ========================================== -->
   <!-- TABLE 4: UNITS SOLD PER SALE REPRESENTATIVE -->
   <!-- ========================================== -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="13" ss:StyleID="SageTableTitle"><Data ss:Type="String">UNITS SOLD PER SALE REPRESENTATIVE (SỐ ĐƠN HOÀN TẤT THEO SÂN)</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="SageColHeaderLeft"><Data ss:Type="String">Units Sold (Tên Sân)</Data></Cell>
`;
  MONTH_NAMES.forEach((m) => {
    content += `    <Cell ss:StyleID="SageColHeader"><Data ss:Type="String">${m}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="SageColHeader"><Data ss:Type="String">ANNUAL TOTALS</Data></Cell>
   </Row>
`;

  courtItemList.forEach((court) => {
    content += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataRowLabel"><Data ss:Type="String">${escapeXml(court.courtName)}</Data></Cell>
`;
    court.monthlyUnitsSold.forEach((v) => {
      content += `    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${v}</Data></Cell>\n`;
    });
    content += `    <Cell ss:StyleID="DataNumber"><Data ss:Type="Number">${court.totalUnitsSold}</Data></Cell>
   </Row>
`;
  });

  // Total Units Sold Row
  content += `   <Row ss:Height="20">
    <Cell ss:StyleID="TotalRowLabel"><Data ss:Type="String">Total Units Sold</Data></Cell>
`;
  summary12Months.monthlyUnitsSold.forEach((v) => {
    content += `    <Cell ss:StyleID="TotalRowNumber"><Data ss:Type="Number">${v}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="TotalRowNumber"><Data ss:Type="Number">${summary12Months.totalUnitsSold}</Data></Cell>
   </Row>

   <Row ss:Height="14"/>

   <!-- ========================================== -->
   <!-- TABLE 5: SALES AMOUNT PER SALE REP -->
   <!-- ========================================== -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="13" ss:StyleID="SageTableTitle"><Data ss:Type="String">SALES AMOUNT PER SALE REP (DOANH THU THEO SÂN - VNĐ)</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="SageColHeaderLeft"><Data ss:Type="String">Sales Amount (Tên Sân)</Data></Cell>
`;
  MONTH_NAMES.forEach((m) => {
    content += `    <Cell ss:StyleID="SageColHeader"><Data ss:Type="String">${m}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="SageColHeader"><Data ss:Type="String">ANNUAL TOTALS</Data></Cell>
   </Row>
`;

  courtItemList.forEach((court) => {
    content += `   <Row ss:Height="19">
    <Cell ss:StyleID="DataRowLabel"><Data ss:Type="String">${escapeXml(court.courtName)}</Data></Cell>
`;
    court.monthlySales.forEach((v) => {
      content += `    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${v}</Data></Cell>\n`;
    });
    content += `    <Cell ss:StyleID="DataCurrency"><Data ss:Type="Number">${court.totalSales}</Data></Cell>
   </Row>
`;
  });

  // Total Sales Row
  content += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRowLabel"><Data ss:Type="String">Total Sales</Data></Cell>
`;
  summary12Months.monthlySales.forEach((v) => {
    content += `    <Cell ss:StyleID="TotalRowCurrency"><Data ss:Type="Number">${v}</Data></Cell>\n`;
  });
  content += `    <Cell ss:StyleID="TotalRowCurrency"><Data ss:Type="Number">${summary12Months.totalSales}</Data></Cell>
   </Row>

   <Row ss:Height="16"/>

   <!-- ========================================== -->
   <!-- TABLE 6: DETAILED PERFORMANCE BREAKDOWN -->
   <!-- ========================================== -->
   <Row ss:Height="20">
    <Cell ss:MergeAcross="13" ss:StyleID="SageTableTitle"><Data ss:Type="String">BẢNG TỔNG HỢP HIỆU SUẤT &amp; TỶ TRỌNG KINH DOANH CHI TIẾT TỪNG SÂN</Data></Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="DarkSageColHeaderLeft"><Data ss:Type="String">Tên Sân / Cơ Sở</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DarkSageColHeader"><Data ss:Type="String">Môn Thể Thao</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DarkSageColHeader"><Data ss:Type="String">Doanh Thu Cả Năm (VNĐ)</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DarkSageColHeader"><Data ss:Type="String">Tỷ Trọng (%)</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DarkSageColHeader"><Data ss:Type="String">Tổng Giờ Đặt (Giờ)</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DarkSageColHeader"><Data ss:Type="String">Tổng Đơn Hoàn Tất</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DarkSageColHeader"><Data ss:Type="String">Đơn Giá TB / Giờ (VNĐ/h)</Data></Cell>
    <Cell ss:StyleID="DarkSageColHeader"><Data ss:Type="String">Đánh Giá Hiệu Suất</Data></Cell>
   </Row>
`;

  courtItemList.forEach((court) => {
    const perfText =
      court.revenuePercentage >= 25
        ? 'Xuất sắc (Top Đóng Góp)'
        : court.revenuePercentage >= 10
        ? 'Hiệu quả tốt'
        : court.totalBookings > 0
        ? 'Tiềm năng'
        : 'Chưa có phát sinh';

    content += `   <Row ss:Height="20">
    <Cell ss:StyleID="DataRowLabel"><Data ss:Type="String">${escapeXml(court.courtName)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCenter"><Data ss:Type="String">${escapeXml(court.sportName)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCurrency"><Data ss:Type="Number">${court.totalSales}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataPercent"><Data ss:Type="Number">${(court.revenuePercentage / 100).toFixed(4)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataHours"><Data ss:Type="Number">${Math.round(court.totalHours * 10) / 10}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataNumber"><Data ss:Type="Number">${court.totalUnitsSold}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="DataCurrency"><Data ss:Type="Number">${court.avgRatePerHour}</Data></Cell>
    <Cell ss:StyleID="DataCenter"><Data ss:Type="String">${escapeXml(perfText)}</Data></Cell>
   </Row>
`;
  });

  // Table 6 Total Summary Row
  const totalAvgPerHour = summary12Months.totalHours > 0
    ? Math.round(summary12Months.totalSales / summary12Months.totalHours)
    : 0;

  content += `   <Row ss:Height="22">
    <Cell ss:StyleID="TotalRowLabel"><Data ss:Type="String">TỔNG CỘNG TOÀN BỘ CƠ SỞ</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="TotalRowLabel"><Data ss:Type="String">${escapeXml(selectedSportName)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="TotalRowCurrency"><Data ss:Type="Number">${summary12Months.totalSales}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="TotalRowLabel"><Data ss:Type="String">100.0%</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="TotalRowHours"><Data ss:Type="Number">${Math.round(summary12Months.totalHours * 10) / 10}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="TotalRowNumber"><Data ss:Type="Number">${summary12Months.totalUnitsSold}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="TotalRowCurrency"><Data ss:Type="Number">${totalAvgPerHour}</Data></Cell>
    <Cell ss:StyleID="TotalRowLabel"><Data ss:Type="String">Hoạt động bình thường</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

  return content;
}

/**
 * Triggers Excel (.xlsx / .xml compatible) download in browser
 */
export function downloadExcelReport(data: AnnualReportExportData) {
  const xmlContent = generateAnnualVendorReportXml(data);
  const blob = new Blob([xmlContent], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const cleanVendor = (data.selectedVendorName || 'Vendor').replace(/[\/\s→:]/g, '_');
  const filename = `SPORTING_ONE_Annual_Sales_Report_${cleanVendor}_${data.reportYear}.xls`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
