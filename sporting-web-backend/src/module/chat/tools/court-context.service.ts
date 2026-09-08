import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { Yard } from '../../yards/entities/yard.entity';

export interface CourtSearchResult {
  vendorId: number;
  vendorName: string;
  address: string;
  phone: string;
  openTime: string;
  closeTime: string;
  avatar?: string;
  yards: Array<{
    yardId: number;
    yardName: string;
    price: number;
    sportName?: string;
    imageUrl?: string;
  }>;
}

@Injectable()
export class CourtContextService {
  private readonly logger = new Logger(CourtContextService.name);

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepo: Repository<Vendor>,
    @InjectRepository(Yard)
    private readonly yardRepo: Repository<Yard>,
  ) {}

  /**
   * Retrieves active vendors and their courts with pricing and images for AI context injection.
   * STRICT: Only vendors with status === 'active' and ondeleted IS NULL are returned.
   * STRICT: Only yards, sport types, and images with ondeleted IS NULL are included.
   */
  async findActiveVenues(rawQuery?: string, limit = 6): Promise<CourtSearchResult[]> {
    try {
      const qb = this.vendorRepo
        .createQueryBuilder('v')
        .leftJoinAndSelect('v.yards', 'y', 'y.ondeleted IS NULL')
        .leftJoinAndSelect('y.sportType', 'st', 'st.ondeleted IS NULL')
        .leftJoinAndSelect('y.images', 'img', 'img.ondeleted IS NULL')
        .where('v.status = :status AND v.ondeleted IS NULL', { status: 'active' });

      // Extract specific search keywords if present (sport type, district, name)
      const extractedKw = this.extractSearchKeywords(rawQuery);
      if (extractedKw) {
        qb.andWhere(
          '(v.vendorName LIKE :kw OR v.vendorAddress LIKE :kw OR y.yardName LIKE :kw OR st.sportName LIKE :kw)',
          { kw: `%${extractedKw}%` },
        );
      }

      qb.orderBy('v.id', 'DESC').take(limit);

      let vendors = await qb.getMany();

      // If specific search had 0 results, fallback to fetching active venues
      if (vendors.length === 0 && extractedKw) {
        const fallbackQb = this.vendorRepo
          .createQueryBuilder('v')
          .leftJoinAndSelect('v.yards', 'y', 'y.ondeleted IS NULL')
          .leftJoinAndSelect('y.sportType', 'st', 'st.ondeleted IS NULL')
          .leftJoinAndSelect('y.images', 'img', 'img.ondeleted IS NULL')
          .where('v.status = :status AND v.ondeleted IS NULL', { status: 'active' })
          .orderBy('v.id', 'DESC')
          .take(limit);
        vendors = await fallbackQb.getMany();
      }

      return vendors
        .filter((v) => !v.ondeleted && v.status === 'active')
        .map((v) => ({
          vendorId: v.id,
          vendorName: v.vendorName,
          address: v.vendorAddress || 'Chưa cập nhật địa chỉ',
          phone: v.vendorPhone || 'Chưa cập nhật SĐT',
          openTime: v.openTime || '06:00',
          closeTime: v.closeTime || '23:00',
          avatar: v.avatar || undefined,
          yards: (v.yards || [])
            .filter((y) => !y.ondeleted && y.status !== 'inactive')
            .map((y) => {
              // STRICT: Only use yard's own uploaded images (prefer cover image), NEVER fallback to vendor avatar
              const validImages = (y.images || []).filter((img) => !img.ondeleted);
              const yardImage =
                validImages.find((img) => img.isCover)?.imageUrl ||
                validImages[0]?.imageUrl ||
                undefined;

              return {
                yardId: y.id,
                yardName: y.yardName,
                price: y.price ? Number(y.price) : 100000,
                sportName: y.sportType && !y.sportType.ondeleted ? y.sportType.sportName : undefined,
                imageUrl: yardImage,
              };
            }),
        }))
        .filter((v) => v.yards.length > 0); // Only include vendors that have active non-deleted yards
    } catch (err: any) {
      this.logger.error(`Error querying active venues: ${err.message}`);
      return [];
    }
  }

  /**
   * Builds formatted context text with proximity comparison to user's address.
   */
  async buildVenueContextText(queryText: string, userAddress?: string): Promise<string> {
    const venues = await this.findActiveVenues(queryText, 6);

    let context = '\n[DANH SÁCH CÁC SÂN THỂ THAO ĐANG HOẠT ĐỘNG TRÊN HỆ THỐNG SPORTING ONE]:\n';

    if (venues.length === 0) {
      context +=
        'Hiện tại hệ thống Sporting ONE đang cập nhật thêm các cơ sở thể thao mới. Hãy hướng dẫn người dùng theo dõi trang chủ Sporting ONE hoặc liên hệ đối tác để đăng ký mở sân.\n';
    } else {
      venues.forEach((v, idx) => {
        let proximityNote = '';
        if (userAddress && userAddress !== 'Chưa cập nhật địa chỉ') {
          const userLower = userAddress.toLowerCase();
          const venueLower = v.address.toLowerCase();

          // Check street / district / city overlap
          if (
            (userLower.includes('đà nẵng') && venueLower.includes('đà nẵng')) ||
            (userLower.includes('hà nội') && venueLower.includes('hà nội')) ||
            (userLower.includes('hồ chí minh') && venueLower.includes('hồ chí minh'))
          ) {
            if (
              (userLower.includes('hải châu') && venueLower.includes('hải châu')) ||
              (userLower.includes('hoàng diệu') && venueLower.includes('hoàng diệu')) ||
              (userLower.includes('cầu giấy') && venueLower.includes('cầu giấy'))
            ) {
              proximityNote = ' -> [⭐ RẤT GẦN KHÁCH HÀNG: Cùng khu vực / tuyến đường với địa chỉ của khách]';
            } else {
              proximityNote = ' -> [CÙNG THÀNH PHỐ VỚI KHÁCH HÀNG]';
            }
          } else if (
            (userLower.includes('đà nẵng') && venueLower.includes('bắc giang')) ||
            (userLower.includes('hà nội') && venueLower.includes('đà nẵng'))
          ) {
            proximityNote = ' -> [❌ RẤT XA: Khác thành phố/tỉnh, cách hàng trăm km]';
          }
        }

        context += `\n${idx + 1}. Cơ sở: **${v.vendorName}** (Địa chỉ: ${v.address})${proximityNote}\n`;
        if (v.yards && v.yards.length > 0) {
          v.yards.forEach((y) => {
            const formattedPrice = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(y.price);

            const cardJson = JSON.stringify({
              id: y.yardId,
              name: y.yardName,
              vendor: v.vendorName,
              address: v.address,
              hours: `${v.openTime} - ${v.closeTime}`,
              price: `${formattedPrice}/giờ`,
              sport: y.sportName || 'Bóng đá',
              image: y.imageUrl || '',
            });

            context += `   - Thẻ sân: [COURT_CARD:${cardJson}]\n`;
          });
        }
      });
    }

    context += `
[QUY TẮC HIỂN THỊ THẺ SÂN BẮT BUỘC DÀNH CHO AI]:
1. Khi gợi ý sân cho khách, bạn CHỈ CẦN CHÈN TRỰC TIẾP thẻ [COURT_CARD:{...}] vào câu trả lời.
2. TUYỆT ĐỐI KHÔNG viết chữ "Mã thẻ sân:" hoặc gõ lại tên sân và giá tiền dạng văn bản trước thẻ, vì thẻ sân [COURT_CARD:{...}] sẽ tự động hiển thị đầy đủ hình ảnh, tên sân, giá tiền và nút "Đặt sân ngay" (tự động mở modal đặt sân khi bấm).
3. Nếu bạn muốn cung cấp thêm liên kết văn bản phụ trợ cho khách đặt sân, hãy dùng định dạng [Đặt sân ngay](/yard/{yardId}?action=booking).
4. TUYỆT ĐỐI KHÔNG tư vấn bất kỳ sân bãi nào đã bị xóa hoặc ngừng hoạt động.
`;

    return context;
  }

  private extractSearchKeywords(rawText?: string): string | null {
    if (!rawText) return null;
    const text = rawText.toLowerCase();

    // Check for sport types
    if (text.includes('bóng đá') || text.includes('football') || text.includes('soccer')) return 'bóng đá';
    if (text.includes('cầu lông') || text.includes('badminton')) return 'cầu lông';
    if (text.includes('tennis') || text.includes('quần vợt')) return 'tennis';
    if (text.includes('pickleball')) return 'pickleball';
    if (text.includes('bóng rổ') || text.includes('basketball')) return 'bóng rổ';
    if (text.includes('bóng chuyền') || text.includes('volleyball')) return 'bóng chuyền';
    if (text.includes('bơi') || text.includes('swimming')) return 'bơi';

    return null;
  }
}
