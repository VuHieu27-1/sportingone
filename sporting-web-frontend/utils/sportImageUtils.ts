export const SPORT_IMAGE_MAP: Record<string, string> = {
  BÓNG_BÀN: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=800&q=80',
  BÓNG_ĐÁ: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
  CẦU_LÔNG: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
  TENNIS: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=800&q=80',
  PICKLEBALL: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80',
  BÓNG_RỔ: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
  BÓNG_CHUYỀN: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=80',
  BƠI_LỘI: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80',
  GOLF: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=800&q=80',
  BILLIARDS: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
  GYM: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  BOXING: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80',
  RUNNING: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
  DEFAULT: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80',
};

/**
 * Retrieves standard thumbnail image URL for a sport category.
 */
export function getSportImageUrl(sportName?: string): string {
  const name = (sportName || '').toUpperCase();

  if (name.includes('BÀN') || name.includes('TABLE TENNIS') || name.includes('PING PONG') || name.includes('PINGPONG')) {
    return SPORT_IMAGE_MAP.BÓNG_BÀN;
  }
  if (name.includes('BÓNG ĐÁ') || name.includes('FOOTBALL') || name.includes('SOCCER') || name.includes('ĐÁ BÓNG')) {
    return SPORT_IMAGE_MAP.BÓNG_ĐÁ;
  }
  if (name.includes('CẦU LÔNG') || name.includes('BADMINTON')) {
    return SPORT_IMAGE_MAP.CẦU_LÔNG;
  }
  if (name.includes('TENNIS') || name.includes('QUẦN VỢT')) {
    return SPORT_IMAGE_MAP.TENNIS;
  }
  if (name.includes('PICKLEBALL')) {
    return SPORT_IMAGE_MAP.PICKLEBALL;
  }
  if (name.includes('BÓNG RỔ') || name.includes('BASKETBALL')) {
    return SPORT_IMAGE_MAP.BÓNG_RỔ;
  }
  if (name.includes('BÓNG CHUYỀN') || name.includes('VOLLEYBALL')) {
    return SPORT_IMAGE_MAP.BÓNG_CHUYỀN;
  }
  if (name.includes('BƠI') || name.includes('SWIMMING')) {
    return SPORT_IMAGE_MAP.BƠI_LỘI;
  }
  if (name.includes('GOLF')) {
    return SPORT_IMAGE_MAP.GOLF;
  }
  if (name.includes('BIDA') || name.includes('BILLIARDS') || name.includes('SNOOKER') || name.includes('POOL')) {
    return SPORT_IMAGE_MAP.BILLIARDS;
  }
  if (name.includes('GYM') || name.includes('FITNESS') || name.includes('THỂ HÌNH')) {
    return SPORT_IMAGE_MAP.GYM;
  }
  if (name.includes('BOXING') || name.includes('VÕ') || name.includes('MARTIAL')) {
    return SPORT_IMAGE_MAP.BOXING;
  }
  if (name.includes('CHẠY') || name.includes('RUNNING') || name.includes('ĐIỀN KINH')) {
    return SPORT_IMAGE_MAP.RUNNING;
  }

  return SPORT_IMAGE_MAP.DEFAULT;
}
