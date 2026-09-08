import toast from 'react-hot-toast';
import { BackendBooking } from '../services/bookingService';
import { formatTimeAMPM } from './dateUtils';

/**
 * Helper function to draw rounded rectangles on HTML5 Canvas.
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Helper function to wrap text neatly on HTML5 Canvas without overflow.
 */
function drawWrappedTextRight(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  lines.forEach((l, i) => {
    ctx.fillText(l, x, y + i * lineHeight);
  });

  return lines.length;
}

/**
 * Generates a high-precision, elegant HTML5 Canvas PNG ticket pass.
 */
export async function generateQrTicketCanvas(
  booking: BackendBooking,
  verifyUrl: string,
  qrImageUrl: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject('Canvas context 2D is not available');
      return;
    }

    // High resolution canvas dimensions (800 x 1120 px)
    const width = 800;
    const height = 1140;
    canvas.width = width;
    canvas.height = height;

    // Background color (Soft warm cream)
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(0, 0, width, height);

    const margin = 36;
    const cardW = width - margin * 2;
    const cardH = height - margin * 2;

    // Main Card background (White pass)
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
    drawRoundRect(ctx, margin, margin, cardW, cardH, 32);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Outer card border
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#E6E2D8';
    drawRoundRect(ctx, margin, margin, cardW, cardH, 32);
    ctx.stroke();

    // ----------------------------------------------------
    // 1. HEADER BANNER SECTION
    // ----------------------------------------------------
    const headerH = 135;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(margin + 32, margin);
    ctx.arcTo(margin + cardW, margin, margin + cardW, margin + headerH, 32);
    ctx.lineTo(margin + cardW, margin + headerH);
    ctx.lineTo(margin, margin + headerH);
    ctx.arcTo(margin, margin, margin + 32, margin, 32);
    ctx.closePath();

    // Gradient background for Header
    const grad = ctx.createLinearGradient(margin, margin, margin + cardW, margin + headerH);
    grad.addColorStop(0, '#1E3932');
    grad.addColorStop(1, '#07241C');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Header Logo & Title
    ctx.fillStyle = '#FBF8F0';
    ctx.font = '900 26px sans-serif';
    ctx.fillText('SPORTING ONE PLATFORM', margin + 32, margin + 54);

    ctx.fillStyle = '#34D399'; // Emerald 400
    ctx.font = '700 13px monospace';
    ctx.fillText('THẺ VÉ GIỮ LỊCH SÂN THỂ THAO CHÍNH THỨC', margin + 32, margin + 86);

    // Booking ID badge (Top right pill)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    drawRoundRect(ctx, margin + cardW - 165, margin + 35, 135, 46, 23);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, margin + cardW - 165, margin + 35, 135, 46, 23);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MÃ ĐƠN', margin + cardW - 97.5, margin + 53);
    ctx.font = '900 18px monospace';
    ctx.fillText(`#${booking.id}`, margin + cardW - 97.5, margin + 72);
    ctx.textAlign = 'left';

    // Extract booking data
    const yardId = booking.yard?.id || (booking as any).yardId;
    const isYardDeleted = Boolean((booking.yard as any)?.ondeleted || !booking.yard);
    const rawYardName = booking.yard?.yardName;
    const yardName = rawYardName
      ? rawYardName
      : yardId
        ? `Sân #${yardId}`
        : 'Sân không khả dụng';
    const vendorName =
      (booking.yard?.vendor as any)?.vendorName ||
      (booking.yard?.vendor as any)?.name ||
      'Cụm Sân Thể Thao';
    const vendorAddress =
      (booking.yard?.vendor as any)?.vendorAddress ||
      (booking.yard?.vendor as any)?.address ||
      'Chưa cập nhật địa chỉ';
    const typeName = booking.yard?.typeYard?.typeName || 'Sân tiêu chuẩn';
    const sportName = booking.yard?.sportType?.sportName || 'Thể Thao';

    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const durationHours = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    );
    const pricePerHour = Number(booking.yard?.price || 0);
    const totalPrice =
      booking.priced && Number(booking.priced) > 0
        ? Number(booking.priced)
        : pricePerHour * durationHours;

    const dateStr = start.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const startTimeStr = formatTimeAMPM(start);
    const endTimeStr = formatTimeAMPM(end);

    // ----------------------------------------------------
    // 2. ENLARGED PROMINENT QR CODE SECTION (340x340px)
    // ----------------------------------------------------
    const qrSize = 340;
    const qrX = margin + (cardW - qrSize) / 2;
    const qrY = margin + headerH + 35;

    // White QR Container with Border & Shadow
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 20;
    drawRoundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 28);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#006241';
    ctx.lineWidth = 4;
    drawRoundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 28);
    ctx.stroke();

    // Load QR Image onto Canvas
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = qrImageUrl;

    img.onload = () => {
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // ----------------------------------------------------
      // 3. TICKET TEAR DASHED SEPARATOR LINE
      // ----------------------------------------------------
      const dividerY = qrY + qrSize + 40;

      ctx.save();
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(margin + 20, dividerY);
      ctx.lineTo(margin + cardW - 20, dividerY);
      ctx.stroke();
      ctx.restore();

      // Left & Right Ticket Edge Cutouts (Classic Event Ticket notches)
      ctx.fillStyle = '#F4F1EA';
      ctx.beginPath();
      ctx.arc(margin, dividerY, 14, -Math.PI / 2, Math.PI / 2, false);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(margin + cardW, dividerY, 14, Math.PI / 2, -Math.PI / 2, false);
      ctx.fill();

      // Border lines for notches
      ctx.strokeStyle = '#E6E2D8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(margin, dividerY, 14, -Math.PI / 2, Math.PI / 2, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(margin + cardW, dividerY, 14, Math.PI / 2, -Math.PI / 2, false);
      ctx.stroke();

      // ----------------------------------------------------
      // 4. DETAILED COURT INFORMATION TABLE
      // ----------------------------------------------------
      let infoY = dividerY + 40;
      const leftColX = margin + 36;
      const rightColX = margin + cardW - 36;
      const maxValW = 430;

      function drawDetailRow(
        label: string,
        value: string,
        isHighlight = false,
        customColor = '#1E3932'
      ): number {
        ctx!.fillStyle = '#6F7E72';
        ctx!.font = '600 14px sans-serif';
        ctx!.fillText(label, leftColX, infoY);

        ctx!.fillStyle = isHighlight ? '#006241' : customColor;
        ctx!.font = isHighlight ? 'bold 16px sans-serif' : 'bold 15px sans-serif';
        ctx!.textAlign = 'right';

        const linesCount = drawWrappedTextRight(ctx!, value, rightColX, infoY, maxValW, 22);
        ctx!.textAlign = 'left';

        const rowStep = Math.max(38, linesCount * 22 + 14);
        infoY += rowStep;
        return rowStep;
      }

      drawDetailRow('Trạng thái đơn:', '✓ ĐÃ THANH TOÁN', true);
      drawDetailRow('Cơ sở / Cụm sân:', vendorName);
      drawDetailRow('Sân thi đấu:', `${yardName} (${typeName})`, true);
      drawDetailRow('Môn thể thao:', sportName);
      drawDetailRow('Ngày thi đấu:', dateStr);
      drawDetailRow('Khung giờ thi đấu:', `${startTimeStr} - ${endTimeStr} (${durationHours} tiếng)`);
      drawDetailRow('Địa chỉ sân:', vendorAddress);

      // Total Price Box Container
      const priceBoxY = infoY + 4;
      ctx.fillStyle = '#FBF8F0';
      drawRoundRect(ctx, leftColX - 8, priceBoxY - 14, cardW - 56, 52, 16);
      ctx.fill();

      ctx.strokeStyle = '#E6E2D8';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, leftColX - 8, priceBoxY - 14, cardW - 56, 52, 16);
      ctx.stroke();

      ctx.fillStyle = '#6F7E72';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('Tổng tiền đã thanh toán:', leftColX + 12, priceBoxY + 18);

      ctx.fillStyle = '#006241';
      ctx.font = '900 22px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${totalPrice.toLocaleString('vi-VN')}đ`, rightColX - 12, priceBoxY + 19);
      ctx.textAlign = 'left';

      // ----------------------------------------------------
      // 5. FOOTER NOTICE BOX
      // ----------------------------------------------------
      const footerY = height - margin - 75;
      ctx.fillStyle = '#1E3932';
      drawRoundRect(ctx, margin + 24, footerY, cardW - 48, 55, 18);
      ctx.fill();

      ctx.fillStyle = '#FBF8F0';
      ctx.font = '500 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Vui lòng xuất trình thẻ vé QR này tại quầy lễ tân khi đến nhận sân.',
        width / 2,
        footerY + 23
      );
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#34D399';
      ctx.fillText(
        'Hotline hỗ trợ 24/7: 1900 6868 · www.sporting.vn',
        width / 2,
        footerY + 43
      );

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject('Failed to load QR code image for ticket canvas.');
    };
  });
}

/**
 * Triggers automatic browser PNG download of the full HTML5 Canvas QR Ticket.
 */
export async function downloadQrTicketImage(
  booking: BackendBooking,
  verifyUrl: string,
  qrImageUrl: string
) {
  const toastId = toast.loading('Đang vẽ thẻ QR & Thông tin sân bằng HTML5 Canvas...');
  try {
    const dataUrl = await generateQrTicketCanvas(booking, verifyUrl, qrImageUrl);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `SportingONE_VeDatSan_#${booking.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã tải thành công thẻ QR kèm thông tin sân thi đấu (PNG)!', {
      id: toastId,
    });
  } catch (err) {
    console.error(err);
    toast.error('Không thể tạo ảnh vé QR. Vui lòng thử lại!', { id: toastId });
  }
}
