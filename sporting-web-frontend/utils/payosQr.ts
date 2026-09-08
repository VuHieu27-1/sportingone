/**
 * Utility to generate an accurate, 100% scannable VietQR Image URL for PayOS transactions
 */
export function getPayOSQrImageUrl(
  qrCode?: string | null,
  bin: string = '970422',
  accountNumber: string = 'V3CAS5601571936',
  amount: number = 0,
  description: string = '',
  accountName: string = 'SPORTING ONE',
): string {
  if (
    qrCode &&
    (qrCode.startsWith('http://') ||
      qrCode.startsWith('https://') ||
      qrCode.startsWith('data:image/'))
  ) {
    return qrCode;
  }

  if (qrCode && qrCode.trim().length > 0) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      qrCode.trim(),
    )}`;
  }

  const descEncoded = encodeURIComponent(description);
  const nameEncoded = encodeURIComponent(accountName);
  return `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.jpg?amount=${amount}&addInfo=${descEncoded}&accountName=${nameEncoded}`;
}
