/**
 * Global Application Configuration & Support Contact Information
 * Configured via .env environment variables for quick updates.
 */
export const APP_CONFIG = {
  SUPPORT_EMAIL: import.meta.env.VITE_SUPPORT_EMAIL || 'vuhieu27082002@gmail.com',
  SUPPORT_PHONE: import.meta.env.VITE_SUPPORT_PHONE || '0934975292',
  SUPPORT_PHONE_DISPLAY: import.meta.env.VITE_SUPPORT_PHONE_DISPLAY || '+84 93 497 5292',
  SUPPORT_ADDRESS: import.meta.env.VITE_SUPPORT_ADDRESS || 'K596 Hoàng Diệu, Đà Nẵng',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://api.sportingone.site/api/v1',
} as const;

export const {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_ADDRESS,
  API_BASE_URL,
} = APP_CONFIG;
