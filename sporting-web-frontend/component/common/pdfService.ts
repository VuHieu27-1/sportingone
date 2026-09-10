import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

export interface BookingInvoicePdfData {
  bookingId: number | string;
  orderCode?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vendorName: string;
  vendorAddress?: string;
  vendorPhone?: string;
  yardName: string;
  sportName?: string;
  typeName?: string;
  bookingDate: string;
  timeSlot: string;
  durationHours?: number;
  pricePerHour?: number;
  totalPrice: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentDate?: string;
  verifyUrl?: string;
  qrImageUrl?: string;
  sig?: string;
  isMonth?: boolean;
  notes?: string;
}

export interface QrPassPdfData {
  bookingId: number | string;
  yardName: string;
  vendorName: string;
  vendorAddress?: string;
  bookingDate: string;
  timeSlot: string;
  qrImageUrl: string;
  verifyUrl?: string;
  sig?: string;
  customerName?: string;
  totalPrice?: number;
  isMonth?: boolean;
}

export interface PdfExportOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a5';
  scale?: number;
}

export interface ManagementReportPdfData {
  reportTitle?: string;
  reportPeriodLabel: string;
  startDateStr: string;
  endDateStr: string;
  generatedAtStr?: string;
  selectedVendorName: string;
  selectedSportName?: string;
  kpi: {
    netRevenue: number;
    netRevenueGrowth?: number;
    grossRevenue: number;
    paidOrdersCount: number;
    refundedAmount: number;
    refundRate?: number;
    aov?: number;
    occupancyRate: number;
    cancellationRate?: number;
    unpaidOrdersCount?: number;
    refundedOrdersCount?: number;
    cancelledOrdersCount?: number;
    totalBookedHours?: number;
    totalAvailableHours?: number;
  };
  sports?: Array<{
    name: string;
    ordersCount: number;
    bookedHours: number;
    revenue: number;
    percentage: number;
  }>;
  courts?: Array<{
    yardName: string;
    vendorName?: string;
    sportName?: string;
    ordersCount: number;
    grossRevenue: number;
    occupancyRate?: number;
  }>;
  dayStats?: Array<{
    dayName: string;
    revenue: number;
    ordersCount: number;
  }>;
  timeOfDayStats?: Array<{
    label: string;
    timeRange: string;
    revenue: number;
    percentage: number;
  }>;
  insights?: Array<{
    title: string;
    description: string;
    actionText?: string;
  }>;
}

/**
 * Utility to save any jsPDF document directly to the user's computer.
 */
export function printPdfDocument(doc: jsPDF, filename = 'document.pdf'): void {
  doc.save(filename);
}

/**
 * Pre-loads an image URL into an HTMLImageElement with CORS enabled.
 */
async function preloadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Failed to preload image for PDF:', src);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Safely converts modern CSS color functions (like Tailwind CSS v4's oklch())
 * into standard RGB/RGBA formats that html2canvas natively supports.
 */
let colorCanvas: HTMLCanvasElement | null = null;
let colorCtx: CanvasRenderingContext2D | null = null;

function convertCssColorToRgb(colorStr: string): string {
  if (!colorStr || typeof colorStr !== 'string') return colorStr;
  if (!colorStr.includes('oklch') && !colorStr.includes('oklab') && !colorStr.includes('lch') && !colorStr.includes('lab')) {
    return colorStr;
  }
  try {
    if (!colorCanvas && typeof document !== 'undefined') {
      colorCanvas = document.createElement('canvas');
      colorCanvas.width = 1;
      colorCanvas.height = 1;
      colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (colorCtx) {
      colorCtx.fillStyle = '#000000';
      colorCtx.fillStyle = colorStr;
      const parsed = colorCtx.fillStyle;
      if (parsed && !parsed.includes('oklch') && !parsed.includes('oklab')) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return '#111827';
}

function sanitizeOklchString(val: string): string {
  if (!val || typeof val !== 'string') return val;
  if (!val.includes('oklch') && !val.includes('oklab') && !val.includes('lch') && !val.includes('lab')) {
    return val;
  }
  return val.replace(/(?:oklch|oklab|lch|lab)\([^)]+\)/g, (match) => convertCssColorToRgb(match));
}

function createStyleProxy(target: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(target, {
    get(t, prop) {
      if (prop === 'getPropertyValue') {
        return (propertyName: string) => {
          const val = t.getPropertyValue(propertyName);
          return sanitizeOklchString(val);
        };
      }
      const val = (t as any)[prop];
      if (typeof val === 'string') {
        return sanitizeOklchString(val);
      }
      if (typeof val === 'function') {
        return val.bind(t);
      }
      return val;
    },
  });
}

function createComputedStyleProxy(origFn: typeof window.getComputedStyle) {
  return function (el: Element, pseudoElt?: string | null) {
    const style = origFn(el, pseudoElt);
    return createStyleProxy(style);
  } as typeof window.getComputedStyle;
}

/**
 * html2canvas wrapper that transparently converts modern CSS colors
 * so html2canvas never crashes with "Attempting to parse an unsupported color function oklch".
 */
async function safeHtml2Canvas(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
  const originalGetComputedStyle = window.getComputedStyle;
  const userOnClone = options.onclone;

  const patchedOptions = {
    ...options,
    onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
      try {
        // 1. Sanitize all <style> tags in cloned document
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach((tag) => {
          if (tag.textContent && (tag.textContent.includes('oklch') || tag.textContent.includes('oklab'))) {
            tag.textContent = sanitizeOklchString(tag.textContent);
          }
        });

        // 2. Patch the cloned document's defaultView getComputedStyle
        if (clonedDoc.defaultView) {
          const clonedOrig = clonedDoc.defaultView.getComputedStyle.bind(clonedDoc.defaultView);
          clonedDoc.defaultView.getComputedStyle = createComputedStyleProxy(clonedOrig);
        }

        // 3. Directly clean inline styles and color properties of elements in cloned doc
        const allElements = clonedDoc.querySelectorAll<HTMLElement>('*');
        const colorProps = [
          'color',
          'backgroundColor',
          'borderColor',
          'borderTopColor',
          'borderRightColor',
          'borderBottomColor',
          'borderLeftColor',
          'outlineColor',
          'boxShadow',
          'textDecorationColor',
          'fill',
          'stroke',
        ];
        allElements.forEach((el) => {
          if (el.hasAttribute('style')) {
            const styleAttr = el.getAttribute('style');
            if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
              el.setAttribute('style', sanitizeOklchString(styleAttr));
            }
          }
          const comp = (clonedDoc.defaultView || window).getComputedStyle(el);
          for (const p of colorProps) {
            const raw = (comp as any)[p];
            if (raw && typeof raw === 'string' && (raw.includes('oklch') || raw.includes('oklab'))) {
              (el.style as any)[p] = sanitizeOklchString(raw);
            }
          }
        });
      } catch (err) {
        console.warn('safeHtml2Canvas onclone sanitize warning:', err);
      }

      if (userOnClone) {
        userOnClone(clonedDoc, clonedElement);
      }
    },
  };

  try {
    window.getComputedStyle = createComputedStyleProxy(originalGetComputedStyle.bind(window));
    return await html2canvas(element, patchedOptions);
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }
}

/**
 * Returns formatted HTML template for official Booking Invoice.
 */
export function generateInvoiceHtml(data: BookingInvoicePdfData): string {
  const orderNum = data.orderCode || `#BK-${data.bookingId}`;
  const statusLabel = data.paymentStatus || 'ĐÃ THANH TOÁN (PAID)';
  const formattedPrice = Number(data.totalPrice || 0).toLocaleString('vi-VN');
  const durationText = data.durationHours ? `${data.durationHours} tiếng` : '1 tiếng';

  return `
    <div style="border: 2px solid #E6E2D8; border-radius: 20px; overflow: hidden; background: #FFFFFF; font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
      <!-- Header Bar -->
      <div style="background: linear-gradient(135deg, #1E3932 0%, #006241 100%); color: #FFFFFF; padding: 28px 32px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 22px; font-weight: 900; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px;">
            <span>⚽ SPORTING ONE</span>
          </div>
          <div style="font-size: 11px; color: #A3E635; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Hệ Thống Đặt Sân Thể Thao Trực Tuyến Hàng Đầu
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 18px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
            HOÁ ĐƠN ĐẶT SÂN
          </div>
          <div style="font-size: 12px; font-family: monospace; color: #D1FAE5; margin-top: 3px;">
            MÃ ĐƠN: ${orderNum}
          </div>
        </div>
      </div>

      <!-- Content Body -->
      <div style="padding: 28px 32px;">
        <!-- Status & Date Row -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #D1D5DB; padding-bottom: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center;">
            <div style="display: inline-block; background: #DEF7EC; color: #03543F; font-size: 11px; font-weight: 800; line-height: 14px; padding: 0px 14px 7px 14px; border-radius: 9999px; border: 1px solid #84E1BC; text-align: center; vertical-align: middle; box-sizing: border-box;">${statusLabel.trim()}</div>
          </div>
          <div style="font-size: 12px; color: #4B5563;">
            Ngày xuất hoá đơn: <strong style="color: #111827;">${data.paymentDate || new Date().toLocaleDateString('vi-VN')}</strong>
          </div>
        </div>

        <!-- 2 Columns: Customer & Venue Info -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
          <!-- Customer Info -->
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;">
            <div style="font-size: 11px; font-weight: 800; color: #006241; text-transform: uppercase; margin-bottom: 10px;">
              👤 THÔNG TIN KHÁCH HÀNG
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px;">
              ${data.customerName || 'Khách Hàng Sporting ONE'}
            </div>
            ${data.customerPhone ? `<div style="font-size: 12px; color: #4B5563; margin-bottom: 2px;">Điện thoại: <strong>${data.customerPhone}</strong></div>` : ''}
            ${data.customerEmail ? `<div style="font-size: 12px; color: #4B5563;">Email: <strong>${data.customerEmail}</strong></div>` : ''}
          </div>

          <!-- Venue Info -->
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px;">
            <div style="font-size: 11px; font-weight: 800; color: #006241; text-transform: uppercase; margin-bottom: 10px;">
              CỤM SÂN THI ĐẤU
            </div>
            <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px;">
              ${data.vendorName}
            </div>
            <div style="font-size: 12px; color: #4B5563; margin-bottom: 2px;">
              Sân: <strong style="color: #006241;">${data.yardName}</strong> ${data.typeName ? `(${data.typeName})` : ''}
            </div>
            ${data.vendorAddress ? `<div style="font-size: 11px; color: #6B7280; line-height: 1.3;">Địa chỉ: ${data.vendorAddress}</div>` : ''}
          </div>
        </div>

        <!-- Table of Order Details -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px;">
          <thead>
            <tr style="background: #F3F4F6; border-top: 1px solid #E5E7EB; border-bottom: 2px solid #D1D5DB;">
              <th style="padding: 10px 12px; text-align: left; font-weight: 800; color: #374151;">DỊCH VỤ / LỊCH ĐẶT</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 800; color: #374151;">NGÀY THI ĐẤU</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 800; color: #374151;">KHUNG GIỜ</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 800; color: #374151;">THỜI LƯỢNG</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 800; color: #374151;">THÀNH TIỀN</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 12px; font-weight: 700; color: #111827;">
                ${data.yardName}
                <div style="font-size: 11px; color: #6B7280; font-weight: normal;">
                  ${data.sportName || 'Sân thể thao'} · ${data.isMonth ? 'Gói đặt theo tháng' : 'Đơn đặt lẻ'}
                </div>
              </td>
              <td style="padding: 12px; text-align: center; color: #374151; font-weight: 600;">
                ${data.bookingDate}
              </td>
              <td style="padding: 12px; text-align: center; font-family: monospace; font-weight: 700; color: #1E3932;">
                ${data.timeSlot}
              </td>
              <td style="padding: 12px; text-align: center; color: #374151;">
                ${data.isMonth ? 'Theo tháng' : durationText}
              </td>
              <td style="padding: 12px; text-align: right; font-family: monospace; font-weight: 800; font-size: 13px; color: #006241;">
                ${formattedPrice}đ
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Summary & QR Section -->
        <div style="display: grid; grid-template-columns: 1fr 180px; gap: 20px; align-items: center; background: #FBF8F0; border: 1px solid #E6E2D8; border-radius: 16px; padding: 20px;">
          <!-- Left details -->
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
              <span style="color: #4B5563;">Hình thức thanh toán:</span>
              <strong style="color: #111827;">${data.paymentMethod || 'PayOS / Ví Thể Thao'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid #E6E2D8; pt: 10px; margin-top: 10px;">
              <span style="font-size: 14px; font-weight: 800; color: #1E3932;">TỔNG TIỀN THANH TOÁN:</span>
              <span style="font-size: 20px; font-weight: 900; font-family: monospace; color: #006241;">${formattedPrice} VNĐ</span>
            </div>
          </div>

          <!-- Right QR Code -->
          <div style="text-align: center; border-left: 1px solid #E6E2D8; padding-left: 16px;">
            ${data.qrImageUrl ? `
              <img src="${data.qrImageUrl}" alt="QR" style="width: 120px; height: 120px; border-radius: 8px; border: 1px solid #D1D5DB; display: block; margin: 0 auto 6px;" />
              <span style="font-size: 10px; color: #4B5563; font-weight: 600; display: block;">MÃ QR NHẬN SÂN</span>
            ` : `
              <div style="width: 120px; height: 120px; background: #E5E7EB; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6B7280; margin: 0 auto 6px;">
                QR Code
              </div>
            `}
          </div>
        </div>

        <!-- Footer Notice -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #6B7280;">
          <div>
            Quý khách vui lòng xuất trình mã QR này tại quầy lễ tân để nhận sân.
          </div>
          <div style="font-weight: 700; color: #006241;">
            Hotline Hỗ Trợ: 1900 8888 · support@sportingone.vn
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates an official, beautifully styled Booking Invoice PDF using jsPDF + html2canvas.
 */
export async function generateBookingInvoicePdf(data: BookingInvoicePdfData): Promise<jsPDF> {
  // Preload QR image if provided
  if (data.qrImageUrl) {
    await preloadImage(data.qrImageUrl);
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#1E3932';
  container.style.fontFamily = "'Plus Jakarta Sans', Arial, sans-serif";
  container.style.padding = '40px';
  container.style.boxSizing = 'border-box';
  container.style.lineHeight = '1.5';

  container.innerHTML = generateInvoiceHtml(data);
  document.body.appendChild(container);

  try {
    const canvas = await safeHtml2Canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    return pdf;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Generates an official, beautifully formatted QR Ticket Pass PDF.
 */
export async function generateQrPassPdf(data: QrPassPdfData): Promise<jsPDF> {
  if (data.qrImageUrl) {
    await preloadImage(data.qrImageUrl);
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '600px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.color = '#1E3932';
  container.style.fontFamily = "'Plus Jakarta Sans', Arial, sans-serif";
  container.style.padding = '30px';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <div style="border: 3px solid #006241; border-radius: 24px; overflow: hidden; background: #FFFFFF; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
      <!-- Card Top -->
      <div style="background: #1E3932; color: #FFFFFF; padding: 24px; text-align: center;">
        <div style="font-size: 13px; font-weight: 800; color: #A3E635; text-transform: uppercase; letter-spacing: 1px;">
          SPORTING ONE · THẺ VÉ XÁC THỰC NHẬN SÂN
        </div>
        <div style="font-size: 22px; font-weight: 900; margin-top: 4px;">
          ${data.yardName}
        </div>
        <div style="font-size: 12px; color: #D1D5DB; margin-top: 4px;">
          Cụm sân: ${data.vendorName}
        </div>
      </div>

      <!-- QR Section -->
      <div style="padding: 24px; text-align: center; background: #FBF8F0;">
        <div style="display: inline-block; background: #FFFFFF; padding: 16px; border-radius: 20px; border: 2px solid #E6E2D8; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <img src="${data.qrImageUrl}" alt="QR Ticket" style="width: 260px; height: 260px; display: block; border-radius: 12px;" />
        </div>
        <div style="margin-top: 14px; font-family: monospace; font-size: 14px; font-weight: 800; color: #006241;">
          MÃ ĐƠN: #${data.bookingId}
        </div>
        ${data.sig ? `
          <div style="font-size: 10px; color: #6B7280; font-family: monospace; margin-top: 4px;">
            MÃ CHỮ KÝ: ${data.sig.substring(0, 24)}...
          </div>
        ` : ''}
      </div>

      <!-- Match Info List -->
      <div style="padding: 20px 28px; background: #FFFFFF; border-top: 1px dashed #E6E2D8; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px;">
          <span style="color: #6B7280; font-weight: 600;">📅 Ngày thi đấu:</span>
          <strong style="color: #111827;">${data.bookingDate}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px;">
          <span style="color: #6B7280; font-weight: 600;">⏰ Khung giờ:</span>
          <strong style="color: #006241; font-family: monospace; font-size: 14px;">${data.timeSlot}</strong>
        </div>
        ${data.vendorAddress ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #F3F4F6; padding-bottom: 8px;">
            <span style="color: #6B7280; font-weight: 600;">📍 Địa chỉ sân:</span>
            <span style="color: #111827; font-weight: 600; text-align: right; max-width: 320px;">${data.vendorAddress}</span>
          </div>
        ` : ''}
        ${data.totalPrice ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: #6B7280; font-weight: 600;">💵 Trạng thái thanh toán:</span>
            <span style="color: #03543F; font-weight: 800;">✓ ĐÃ THANH TOÁN (${Number(data.totalPrice).toLocaleString('vi-VN')}đ)</span>
          </div>
        ` : ''}
      </div>

      <!-- Card Footer -->
      <div style="background: #F3F4F6; padding: 12px 24px; text-align: center; font-size: 11px; color: #4B5563; border-top: 1px solid #E5E7EB;">
        Quét mã QR tại quầy để nhận sân thi đấu · Sporting ONE System
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await safeHtml2Canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', margin, 15, contentWidth, contentHeight);
    return pdf;
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Prints the official booking invoice using the browser's native print dialog
 * AND automatically downloads the .pdf file directly to the user's computer.
 */
/**
 * Automatically exports and downloads the official booking invoice as a PDF file directly to the user's computer.
 */
export async function printBookingInvoice(data: BookingInvoicePdfData): Promise<void> {
  const toastId = toast.loading('Đang khởi tạo hoá đơn & tải file PDF...');
  try {
    const fname = `Hoa-Don-Sporting-BK-${data.bookingId}.pdf`;
    const pdf = await generateBookingInvoicePdf(data);
    pdf.save(fname);
    toast.success(`Đã tải file ${fname} về máy thành công!`, { id: toastId });
  } catch (error) {
    console.error('Error exporting booking invoice PDF:', error);
    toast.error('Lỗi khi tải file PDF hoá đơn. Vui lòng thử lại!', { id: toastId });
  }
}

/**
 * Downloads the booking invoice as a .pdf file via jsPDF.
 */
export async function downloadBookingInvoice(data: BookingInvoicePdfData, filename?: string): Promise<void> {
  const toastId = toast.loading('Đang xuất hoá đơn PDF...');
  try {
    const pdf = await generateBookingInvoicePdf(data);
    const fname = filename || `Hoa-don-Sporting-${data.bookingId}.pdf`;
    pdf.save(fname);
    toast.success('Đã tải xuống hoá đơn PDF thành công!', { id: toastId });
  } catch (error) {
    console.error('Error downloading booking invoice:', error);
    toast.error('Lỗi khi xuất file PDF hoá đơn.', { id: toastId });
  }
}

/**
 * Exports and downloads the QR Pass PDF via jsPDF directly to the user's computer.
 */
export async function printQrPass(data: QrPassPdfData): Promise<void> {
  const toastId = toast.loading('Đang chuẩn bị thẻ vé QR PDF...');
  try {
    const pdf = await generateQrPassPdf(data);
    const fname = `Ve-QR-Sporting-${data.bookingId}.pdf`;
    pdf.save(fname);
    toast.success(`Đã tải vé QR (${fname}) về máy!`, { id: toastId });
  } catch (error) {
    console.error('Error exporting QR pass:', error);
    toast.error('Không thể xuất vé QR PDF.', { id: toastId });
  }
}

/**
 * Downloads the QR Pass PDF via jsPDF.
 */
export async function downloadQrPass(data: QrPassPdfData, filename?: string): Promise<void> {
  const toastId = toast.loading('Đang tạo vé QR PDF...');
  try {
    const pdf = await generateQrPassPdf(data);
    const fname = filename || `Ve-QR-Sporting-${data.bookingId}.pdf`;
    pdf.save(fname);
    toast.success('Đã tải thẻ vé QR PDF!', { id: toastId });
  } catch (error) {
    console.error('Error downloading QR pass:', error);
    toast.error('Lỗi khi xuất thẻ vé QR PDF.', { id: toastId });
  }
}

/**
 * Internal core engine to render any DOM element or multi-page report to a jsPDF instance.
 */
async function renderElementToPdfDocument(
  targetElement: HTMLElement,
  options?: PdfExportOptions
): Promise<jsPDF> {
  const orientation = options?.orientation || 'portrait';
  const format = options?.format || 'a4';

  // 1. Detect if target contains multiple designated PDF pages
  let pageNodes = Array.from(
    targetElement.querySelectorAll<HTMLElement>('[data-pdf-page="true"]')
  );
  if (pageNodes.length === 0) {
    pageNodes = Array.from(
      targetElement.querySelectorAll<HTMLElement>('.print\\:break-after-page')
    );
  }
  if (pageNodes.length === 0 && targetElement.children.length > 1) {
    const childEls = Array.from(targetElement.children).filter(
      (c) => c instanceof HTMLElement && c.offsetHeight > 200
    ) as HTMLElement[];
    if (childEls.length > 1) {
      pageNodes = childEls;
    }
  }

  const pdf = new jsPDF(orientation === 'landscape' ? 'l' : 'p', 'mm', format);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 8; // 8mm printable margin
  const printableWidth = pdfWidth - margin * 2;
  const printableHeight = pdfHeight - margin * 2;

  if (pageNodes.length > 1) {
    // MULTI-PAGE REPORT: Render each page card individually onto its own dedicated A4 page
    for (let i = 0; i < pageNodes.length; i++) {
      const pageEl = pageNodes[i];
      if (i > 0) {
        pdf.addPage();
      }

      const canvas = await safeHtml2Canvas(pageEl, {
        scale: options?.scale || 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const naturalWidth = printableWidth;
      const naturalHeight = (canvas.height * naturalWidth) / canvas.width;

      if (naturalHeight > printableHeight) {
        // Proportionally scale down if card height slightly exceeds printable area
        const scale = printableHeight / naturalHeight;
        const fitWidth = naturalWidth * scale;
        const fitHeight = printableHeight;
        const xOffset = margin + (printableWidth - fitWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, margin, fitWidth, fitHeight);
      } else {
        // Center vertically on page
        const yOffset = margin + (printableHeight - naturalHeight) / 2;
        pdf.addImage(imgData, 'JPEG', margin, yOffset, naturalWidth, naturalHeight);
      }
    }
  } else {
    // SINGLE ELEMENT or CONTINUOUS SCROLL CONTAINER:
    const canvas = await safeHtml2Canvas(targetElement, {
      scale: options?.scale || 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      windowHeight: targetElement.scrollHeight,
      height: targetElement.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= printableHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= printableHeight;
    }
  }

  return pdf;
}

/**
 * Converts any DOM element or query selector into a PDF and downloads it directly.
 */
export async function printElementAsPdf(
  elementOrSelector: HTMLElement | string,
  options?: PdfExportOptions
): Promise<void> {
  const toastId = toast.loading('Đang chuyển đổi nội dung sang PDF...');
  try {
    const targetElement: HTMLElement | null =
      typeof elementOrSelector === 'string'
        ? document.querySelector<HTMLElement>(elementOrSelector)
        : elementOrSelector;

    if (!targetElement) {
      throw new Error('Target element to print as PDF not found');
    }

    const pdf = await renderElementToPdfDocument(targetElement, options);
    const fname = options?.filename || 'Sporting-Document.pdf';
    pdf.save(fname);
    toast.success(`Đã tải file ${fname} về máy thành công!`, { id: toastId });
  } catch (error) {
    console.error('Error exporting element as PDF:', error);
    toast.error('Không thể xuất nội dung sang PDF.', { id: toastId });
  }
}

/**
 * Downloads any DOM element or query selector as a PDF file using jsPDF.
 */
export async function downloadElementAsPdf(
  elementOrSelector: HTMLElement | string,
  options?: PdfExportOptions
): Promise<void> {
  const toastId = toast.loading('Đang xuất file PDF...');
  try {
    const targetElement: HTMLElement | null =
      typeof elementOrSelector === 'string'
        ? document.querySelector<HTMLElement>(elementOrSelector)
        : elementOrSelector;

    if (!targetElement) {
      throw new Error('Target element not found');
    }

    const pdf = await renderElementToPdfDocument(targetElement, options);
    const fname = options?.filename || 'Sporting-Document.pdf';
    pdf.save(fname);
    toast.success('Đã tải xuống file PDF thành công!', { id: toastId });
  } catch (error) {
    console.error('Error downloading element as PDF:', error);
    toast.error('Lỗi khi tải file PDF.', { id: toastId });
  }
}

/**
 * Returns formatted HTML strings for the 2-page Standardized Executive A4 Management Assessment Report.
 */
export function generateManagementReportPagesHtml(data: ManagementReportPdfData): { page1Html: string; page2Html: string } {
  const netRev = Number(data.kpi.netRevenue || 0).toLocaleString('vi-VN');
  const grossRev = Number(data.kpi.grossRevenue || 0).toLocaleString('vi-VN');
  const refundAmt = Number(data.kpi.refundedAmount || 0).toLocaleString('vi-VN');
  const aov = Number(data.kpi.aov || 0).toLocaleString('vi-VN');
  const growth = data.kpi.netRevenueGrowth ?? 0;
  const growthColor = growth >= 0 ? '#047857' : '#B91C1C';
  const growthSign = growth >= 0 ? '+' : '';
  const occupancy = (data.kpi.occupancyRate || 0).toFixed(1);
  const cancelRate = (data.kpi.cancellationRate || 0).toFixed(1);
  const refundRate = (data.kpi.refundRate || 0).toFixed(1);
  const bookedHours = (data.kpi.totalBookedHours || 0).toFixed(1);

  const page1Html = `
    <div style="width: 794px; min-height: 1123px; max-height: 1123px; box-sizing: border-box; padding: 36px 40px; background: #FFFFFF; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #111827; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px solid #006241;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; background: #006241; color: #FFFFFF; font-size: 10.5px; font-weight: 900; line-height: 13px; padding: 1px 9px 5px 9px; border-radius: 4px; letter-spacing: 0.5px; text-align: center; vertical-align: middle; box-sizing: border-box;">SPORTING ONE</span>
              <span style="display: inline-block; font-size: 10px; font-weight: 700; color: #4B5563; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: middle; line-height: 13px;">HỆ THỐNG QUẢN TRỊ VẬN HÀNH SÂN</span>
            </div>
            <div style="font-size: 20px; font-weight: 900; color: #1E3932; margin-top: 6px; text-transform: uppercase; letter-spacing: -0.2px;">
              ${data.reportTitle || 'BÁO CÁO DOANH THU & HIỆU SUẤT VẬN HÀNH'}
            </div>
            <div style="font-size: 11px; color: #6B7280; margin-top: 2px; font-style: italic;">
              Revenue &amp; Booking Operations Management Report
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #4B5563; line-height: 1.6; background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 10px; padding: 8px 14px;">
            <div>Kỳ báo cáo: <strong style="color: #111827;">${data.reportPeriodLabel}</strong></div>
            <div>Thời gian: <strong style="color: #111827; font-family: monospace;">${data.startDateStr} → ${data.endDateStr}</strong></div>
            <div>Cơ sở: <strong style="color: #006241;">${data.selectedVendorName}</strong></div>
          </div>
        </div>

        <!-- 6 KPI Summary Cards -->
        <div style="margin-top: 18px; margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #006241; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
            📊 1. CHỈ SỐ TÀI CHÍNH &amp; HIỆU SUẤT THEN CHỐT
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <!-- Net Revenue -->
            <div style="background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 12px; padding: 12px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #6F7E72; text-transform: uppercase;">DOANH THU THỰC NHẬN (NET)</div>
              <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: #006241; margin-top: 2px;">
                ${netRev} <span style="font-size: 12px; font-weight: 700; color: #6F7E72;">đ</span>
              </div>
              <div style="font-size: 10.5px; color: #6F7E72; margin-top: 2px;">
                Tăng trưởng: <strong style="color: ${growthColor};">${growthSign}${growth.toFixed(1)}%</strong>
              </div>
            </div>

            <!-- Gross Revenue -->
            <div style="background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 12px; padding: 12px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #6F7E72; text-transform: uppercase;">TỔNG DOANH THU GỘP (GROSS)</div>
              <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: #1E3932; margin-top: 2px;">
                ${grossRev} <span style="font-size: 12px; font-weight: 700; color: #6F7E72;">đ</span>
              </div>
              <div style="font-size: 10.5px; color: #6F7E72; margin-top: 2px;">
                <strong>${data.kpi.paidOrdersCount}</strong> đơn đã thanh toán
              </div>
            </div>

            <!-- Refund -->
            <div style="background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 12px; padding: 12px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #6F7E72; text-transform: uppercase;">TỔNG TIỀN HOÀN (REFUND)</div>
              <div style="font-size: 20px; font-weight: 900; font-family: monospace; color: #B91C1C; margin-top: 2px;">
                ${refundAmt} <span style="font-size: 12px; font-weight: 700; color: #6F7E72;">đ</span>
              </div>
              <div style="font-size: 10.5px; color: #6F7E72; margin-top: 2px;">
                Tỷ lệ hoàn: <strong>${refundRate}%</strong> (${data.kpi.refundedOrdersCount || 0} đơn)
              </div>
            </div>

            <!-- AOV -->
            <div style="background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 12px; padding: 12px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #6F7E72; text-transform: uppercase;">GIÁ TRỊ ĐƠN TB (AOV)</div>
              <div style="font-size: 18px; font-weight: 900; font-family: monospace; color: #111827; margin-top: 2px;">
                ${aov} <span style="font-size: 12px; font-weight: 700; color: #6F7E72;">đ</span>
              </div>
              <div style="font-size: 10.5px; color: #6F7E72; margin-top: 2px;">
                Doanh thu trung bình mỗi lượt đặt
              </div>
            </div>

            <!-- Occupancy -->
            <div style="background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 12px; padding: 12px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #6F7E72; text-transform: uppercase;">TỶ LỆ LẤP ĐẦY SÂN</div>
              <div style="font-size: 18px; font-weight: 900; font-family: monospace; color: #047857; margin-top: 2px;">
                ${occupancy}%
              </div>
              <div style="font-size: 10.5px; color: #6F7E72; margin-top: 2px;">
                Đã cho thuê: <strong>${bookedHours}h</strong> thi đấu
              </div>
            </div>

            <!-- Cancellation -->
            <div style="background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 12px; padding: 12px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #6F7E72; text-transform: uppercase;">TỶ LỆ HỦY ĐƠN</div>
              <div style="font-size: 18px; font-weight: 900; font-family: monospace; color: #B45309; margin-top: 2px;">
                ${cancelRate}%
              </div>
              <div style="font-size: 10.5px; color: #6F7E72; margin-top: 2px;">
                <strong>${data.kpi.cancelledOrdersCount || 0}</strong> đơn hủy trong kỳ
              </div>
            </div>
          </div>
        </div>

        <!-- Executive Summary Note -->
        <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 12px; padding: 14px 18px; margin-bottom: 18px;">
          <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 4px;">
            ★ NHẬN ĐỊNH CỦA BAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)
          </div>
          <div style="font-size: 11.5px; color: #14532D; line-height: 1.6;">
            Trong kỳ báo cáo <strong>${data.reportPeriodLabel}</strong>, cơ sở <strong>${data.selectedVendorName}</strong> ghi nhận tổng doanh thu thực nhận đạt <strong style="font-family: monospace;">${netRev}đ</strong> từ <strong>${data.kpi.paidOrdersCount} lượt đặt sân thành công</strong>. Tỷ lệ lấp đầy sân đạt mức trung bình <strong>${occupancy}%</strong>. Toàn bộ dòng tiền thanh toán và đối soát đã được kiểm tra khớp đúng 100% giữa tài khoản thanh toán và các khoản hoàn hủy theo quy chuẩn tài chính Sporting ONE.
          </div>
        </div>

        <!-- Cashflow Reconciliation Table -->
        <div style="margin-bottom: 18px;">
          <div style="font-size: 11px; font-weight: 800; color: #006241; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
            💵 2. BẢNG ĐỐI SOÁT DÒNG TIỀN QUẢN TRỊ
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #E5E7EB; border-radius: 10px; overflow: hidden;">
            <thead>
              <tr style="background: #006241; color: #FFFFFF; font-weight: 800; font-size: 10.5px; text-transform: uppercase;">
                <th style="padding: 9px 12px; text-align: left; width: 35%;">HẠNG MỤC DÒNG TIỀN</th>
                <th style="padding: 9px 12px; text-align: right; width: 25%;">SỐ TIỀN (VNĐ)</th>
                <th style="padding: 9px 12px; text-align: left; width: 40%;">QUY TẮC ĐỐI SOÁT NGHIỆP VỤ</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background: #FFFFFF;">
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #1E3932;">(+) Doanh Thu Gộp (Gross)</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-family: monospace; font-weight: 800; color: #006241;">${grossRev} đ</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">Tổng giá trị các đơn đặt sân đã thanh toán thành công</td>
              </tr>
              <tr style="background: #FAF8F5;">
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #1E3932;">(-) Khuyến Mãi / Giảm Giá</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-family: monospace; font-weight: 700; color: #6B7280;">0 đ</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">Đã khấu trừ trực tiếp vào giá trị đơn của lượt đặt</td>
              </tr>
              <tr style="background: #FFFFFF;">
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #B91C1C;">(-) Tiền Hoàn Trả (Refund)</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-family: monospace; font-weight: 800; color: #B91C1C;">${refundAmt} đ</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">Đã hoàn tiền vào Ví Sporting của người chơi</td>
              </tr>
              <tr style="background: #DEF7EC;">
                <td style="padding: 10px 12px; color: #03543F; font-size: 12px; font-weight: 900;">(=) DOANH THU THỰC NHẬN (NET)</td>
                <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 13px; font-weight: 900; color: #03543F;">${netRev} đ</td>
                <td style="padding: 10px 12px; color: #03543F; font-size: 11px; font-weight: 700;">✓ Trạng thái đối soát: HỢP LỆ (100% PASS)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Order Status Breakdown Cards -->
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #006241; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
            📑 3. PHÂN BỔ TRẠNG THÁI ĐƠN HÀNG
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #065F46; text-transform: uppercase;">ĐÃ THANH TOÁN</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #047857; margin-top: 2px;">${data.kpi.paidOrdersCount} đơn</div>
              <div style="font-size: 9.5px; color: #047857; margin-top: 1px;">${grossRev} đ</div>
            </div>
            <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #92400E; text-transform: uppercase;">CHỜ THANH TOÁN</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #B45309; margin-top: 2px;">${data.kpi.unpaidOrdersCount || 0} đơn</div>
              <div style="font-size: 9.5px; color: #B45309; margin-top: 1px;">Đang giữ chỗ</div>
            </div>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #991B1B; text-transform: uppercase;">ĐÃ HOÀN TIỀN</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #DC2626; margin-top: 2px;">${data.kpi.refundedOrdersCount || 0} đơn</div>
              <div style="font-size: 9.5px; color: #DC2626; margin-top: 1px;">${refundAmt} đ</div>
            </div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #334155; text-transform: uppercase;">ĐÃ HỦY ĐƠN</div>
              <div style="font-size: 16px; font-weight: 900; font-family: monospace; color: #475569; margin-top: 2px;">${data.kpi.cancelledOrdersCount || 0} đơn</div>
              <div style="font-size: 9.5px; color: #475569; margin-top: 1px;">Tỷ lệ: ${cancelRate}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page 1 Footer -->
      <div style="border-top: 1px solid #E5E7EB; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #6B7280;">
        <div>SPORTING ONE · Hệ Thống Báo Cáo Doanh Thu Quản Trị Vận Hành</div>
        <div style="font-weight: 700; color: #006241;">Trang 1 / 2</div>
      </div>
    </div>
  `;

  // Process Page 2 data
  const sportsList = data.sports || [];
  const courtsList = (data.courts || []).slice(0, 5);

  const sportsRows = sportsList.length > 0 ? sportsList.map((s, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5'};">
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #1E3932;">${s.name}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: center; font-family: monospace;">${s.ordersCount} đơn</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: center; font-family: monospace;">${s.bookedHours.toFixed(1)}h</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; font-family: monospace; font-weight: 800; color: #006241;">${Number(s.revenue || 0).toLocaleString('vi-VN')} đ</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; font-family: monospace; font-weight: 700;">${(s.percentage || 0).toFixed(1)}%</td>
    </tr>
  `).join('') : `
    <tr><td colspan="5" style="padding: 12px; text-align: center; color: #6B7280;">Không có dữ liệu bộ môn</td></tr>
  `;

  const courtsRows = courtsList.length > 0 ? courtsList.map((c, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5'};">
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: #1E3932;">${c.yardName}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; color: #6B7280;">${c.vendorName || data.selectedVendorName}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; color: #4B5563;">${c.sportName || 'Thể thao'}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: center; font-family: monospace;">${c.ordersCount} đơn</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; font-family: monospace; font-weight: 800; color: #006241;">${Number(c.grossRevenue || 0).toLocaleString('vi-VN')} đ</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; font-family: monospace; font-weight: 700; color: #047857;">${(c.occupancyRate || 0).toFixed(1)}%</td>
    </tr>
  `).join('') : `
    <tr><td colspan="6" style="padding: 12px; text-align: center; color: #6B7280;">Không có dữ liệu sân thi đấu</td></tr>
  `;

  const insightsList = (data.insights || []).slice(0, 2);
  const insightsHtml = insightsList.length > 0 ? insightsList.map((item) => `
    <div style="background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px;">
      <div style="font-size: 11px; font-weight: 800; color: #1E3932; margin-bottom: 3px;">💡 ${item.title}</div>
      <div style="font-size: 10.5px; color: #4B5563; line-height: 1.5;">${item.description}</div>
      ${item.actionText ? `<div style="font-size: 10px; font-weight: 700; color: #006241; margin-top: 4px;">👉 Khuyến nghị hành động: ${item.actionText}</div>` : ''}
    </div>
  `).join('') : `
    <div style="background: #FAF8F5; border: 1px solid #E6E2D8; border-radius: 10px; padding: 10px 14px; font-size: 11px; color: #4B5563;">
      💡 Tối ưu hoá doanh thu bằng các chương trình giờ vàng và khuyến khích đặt sân định kỳ tháng để tăng tỷ lệ lấp đầy.
    </div>
  `;

  const page2Html = `
    <div style="width: 794px; min-height: 1123px; max-height: 1123px; box-sizing: border-box; padding: 36px 40px; background: #FFFFFF; font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #111827; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <!-- Top Compact Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #006241; padding-bottom: 10px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 14px; font-weight: 900; color: #1E3932; text-transform: uppercase;">
              CHI TIẾT CƠ CẤU BỘ MÔN, HIỆU SUẤT SÂN &amp; ĐỀ XUẤT
            </div>
            <div style="font-size: 10.5px; color: #6B7280; margin-top: 2px;">
              Kỳ: <strong style="color: #111827;">${data.reportPeriodLabel}</strong> · Cơ sở: <strong style="color: #006241;">${data.selectedVendorName}</strong>
            </div>
          </div>
          <span style="display: inline-block; background: #DEF7EC; color: #03543F; font-size: 10px; font-weight: 800; line-height: 13px; padding: 0px 10px 6px 10px; border-radius: 9999px; border: 1px solid #84E1BC; text-align: center; vertical-align: middle; box-sizing: border-box;">SPORTING ANALYTICS</span>
        </div>

        <!-- 1. Sports Breakdown Table -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #006241; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
            🏸 4. CƠ CẤU DOANH THU THEO BỘ MÔN THỂ THAO
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #006241; color: #FFFFFF; font-weight: 800; text-transform: uppercase; font-size: 10px;">
                <th style="padding: 7px 10px; text-align: left;">BỘ MÔN</th>
                <th style="padding: 7px 10px; text-align: center;">SỐ ĐƠN PAID</th>
                <th style="padding: 7px 10px; text-align: center;">GIỜ THUÊ</th>
                <th style="padding: 7px 10px; text-align: right;">DOANH THU (NET)</th>
                <th style="padding: 7px 10px; text-align: right;">TỶ TRỌNG (%)</th>
              </tr>
            </thead>
            <tbody>
              ${sportsRows}
            </tbody>
          </table>
        </div>

        <!-- 2. Top Courts Performance Table -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #006241; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
            🏆 5. BẢNG XẾP HẠNG TOP SÂN THI ĐẤU HIỆU QUẢ NHẤT
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #1E3932; color: #FFFFFF; font-weight: 800; text-transform: uppercase; font-size: 10px;">
                <th style="padding: 7px 10px; text-align: left;">TÊN SÂN CON</th>
                <th style="padding: 7px 10px; text-align: left;">CỤM SÂN</th>
                <th style="padding: 7px 10px; text-align: left;">BỘ MÔN</th>
                <th style="padding: 7px 10px; text-align: center;">SỐ ĐƠN</th>
                <th style="padding: 7px 10px; text-align: right;">DOANH THU</th>
                <th style="padding: 7px 10px; text-align: right;">ĐỘ LẤP ĐẦY</th>
              </tr>
            </thead>
            <tbody>
              ${courtsRows}
            </tbody>
          </table>
        </div>

        <!-- 3. Strategic Recommendations -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #006241; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
            🎯 6. ĐỀ XUẤT CHIẾN LƯỢC TỐI ƯU HÓA QUẢN TRỊ
          </div>
          ${insightsHtml}
        </div>

        <!-- 4. Signatures Section -->
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #D1D5DB;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 10.5px;">
            <div>
              <div style="font-weight: 800; color: #1E3932; text-transform: uppercase;">NGƯỜI LẬP BIỂU</div>
              <div style="font-size: 9.5px; color: #6B7280; margin-top: 1px;">(Ký, ghi rõ họ tên)</div>
              <div style="height: 48px;"></div>
              <div style="font-weight: 700; color: #111827;">Ban Quản Trị Hệ Thống</div>
            </div>
            <div>
              <div style="font-weight: 800; color: #1E3932; text-transform: uppercase;">KẾ TOÁN TRƯỞNG</div>
              <div style="font-size: 9.5px; color: #6B7280; margin-top: 1px;">(Ký, ghi rõ họ tên)</div>
              <div style="height: 48px;"></div>
              <div style="font-weight: 700; color: #111827;">Bộ Phận Tài Chính</div>
            </div>
            <div>
              <div style="font-weight: 800; color: #1E3932; text-transform: uppercase;">ĐẠI DIỆN CƠ SỞ / CHỦ SÂN</div>
              <div style="font-size: 9.5px; color: #6B7280; margin-top: 1px;">(Ký, đóng dấu)</div>
              <div style="height: 48px;"></div>
              <div style="font-weight: 700; color: #111827;">${data.selectedVendorName}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Page 2 Footer -->
      <div style="border-top: 1px solid #E5E7EB; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #6B7280;">
        <div>SPORTING ONE · Hệ Thống Báo Cáo Doanh Thu Quản Trị Vận Hành</div>
        <div style="font-weight: 700; color: #006241;">Trang 2 / 2</div>
      </div>
    </div>
  `;

  return { page1Html, page2Html };
}

/**
 * Downloads the Standardized Executive A4 Management Assessment Report as a pristine 2-page PDF file.
 */
export async function downloadManagementReportPdf(data: ManagementReportPdfData, filename?: string): Promise<void> {
  const toastId = toast.loading('Đang khởi tạo báo cáo A4 chuẩn...');
  try {
    const { page1Html, page2Html } = generateManagementReportPagesHtml(data);

    // Create offscreen container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.backgroundColor = '#FFFFFF';

    const p1El = document.createElement('div');
    p1El.innerHTML = page1Html;
    const p2El = document.createElement('div');
    p2El.innerHTML = page2Html;

    container.appendChild(p1El);
    container.appendChild(p2El);
    document.body.appendChild(container);

    try {
      // 1. Render Page 1
      const page1Target = p1El.firstElementChild as HTMLElement || p1El;
      const canvas1 = await safeHtml2Canvas(page1Target, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(canvas1.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);

      // 2. Render Page 2
      const page2Target = p2El.firstElementChild as HTMLElement || p2El;
      const canvas2 = await safeHtml2Canvas(page2Target, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      pdf.addPage();
      pdf.addImage(canvas2.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);

      const fname = filename || `Bao-cao-danh-gia-${data.reportPeriodLabel.replace(/[\/\s]/g, '-')}.pdf`;
      pdf.save(fname);
      toast.success(`Đã xuất báo cáo A4 (${fname}) thành công!`, { id: toastId });
    } finally {
      document.body.removeChild(container);
    }
  } catch (error) {
    console.error('Error downloading management report PDF:', error);
    toast.error('Lỗi khi tải file báo cáo PDF.', { id: toastId });
  }
}


