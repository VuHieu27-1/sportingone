import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';

export interface UserContextData {
  userId: number;
  username: string;
  fullName: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  address?: string;
  walletBalance: number;
  upcomingBookings: Array<{
    bookingId: number;
    yardName: string;
    vendorName: string;
    startTime: Date;
    endTime: Date;
    status: string;
    priced: number;
  }>;
  recentBookings: Array<{
    yardName: string;
    vendorName: string;
    startTime: Date;
  }>;
}

@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  /**
   * Loads complete user profile, wallet balance, and booking history
   */
  async getUserContext(userId: number | null): Promise<UserContextData | null> {
    if (!userId) return null;

    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: {
          detailUser: true,
          addresses: true,
          wallet: true,
        },
      });

      if (!user) return null;

      const walletBalance = user.wallet ? Number(user.wallet.balance) : 0;
      const defaultAddress =
        user.addresses?.find((a) => a.isDefault)?.address ||
        user.addresses?.[0]?.address ||
        'Chưa cập nhật địa chỉ';

      // Fetch upcoming bookings (from today onwards)
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const upcoming = await this.bookingRepo.find({
        where: {
          user: { id: userId },
          startTime: MoreThanOrEqual(now),
        },
        relations: {
          yard: {
            vendor: true,
          },
        },
        order: { startTime: 'ASC' },
        take: 5,
      });

      // Fetch recent past bookings to understand user sports preference
      const recent = await this.bookingRepo.find({
        where: {
          user: { id: userId },
        },
        relations: {
          yard: {
            vendor: true,
          },
        },
        order: { id: 'DESC' },
        take: 3,
      });

      return {
        userId: user.id,
        username: user.username,
        fullName: user.detailUser?.name || user.username,
        phone: user.detailUser?.phone || undefined,
        gender: user.detailUser?.gender || undefined,
        birthday: user.detailUser?.birthday ? String(user.detailUser.birthday) : undefined,
        address: defaultAddress,
        walletBalance,
        upcomingBookings: upcoming.map((b) => ({
          bookingId: b.id,
          yardName: b.yard?.yardName || 'Sân thể thao',
          vendorName: b.yard?.vendor?.vendorName || 'Cơ sở Sporting',
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status || 'Chờ xác nhận',
          priced: b.priced ? Number(b.priced) : 0,
        })),
        recentBookings: recent.map((b) => ({
          yardName: b.yard?.yardName || 'Sân thể thao',
          vendorName: b.yard?.vendor?.vendorName || 'Cơ sở Sporting',
          startTime: b.startTime,
        })),
      };
    } catch (err: any) {
      this.logger.error(`Error loading user context for ID ${userId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Formats user context into a natural system prompt section
   */
  async buildUserContextPrompt(userId: number | null): Promise<string> {
    const data = await this.getUserContext(userId);
    if (!data) {
      return `
[THÔNG TIN NGƯỜI DÙNG]:
- Khách vãng lai (Chưa đăng nhập). Hãy tư vấn lịch sự, gợi ý sân theo yêu cầu và khuyến khích đăng nhập để hưởng ưu đãi.
`;
    }

    const formattedBalance = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(data.walletBalance);

    let prompt = `
[THÔNG TIN TÀI KHOẢN NGƯỜI DÙNG ĐANG CHAT]:
- Tên khách hàng: ${data.fullName}
- Vị trí/Địa chỉ của khách: ${data.address}
- Số dư trong ví Sporting: ${formattedBalance}
`;

    if (data.upcomingBookings.length > 0) {
      prompt += '- Lịch sân sắp đá/chơi: ' + data.upcomingBookings.map((b) => `${b.yardName} (${b.vendorName})`).join(', ') + '\n';
    }

    prompt += `
[QUY TẮC CÁ NHÂN HÓA BẮT BUỘC CHO AI]:
1. Luôn chào khách hàng bằng tên thân mật "${data.fullName}".
2. Dựa vào địa chỉ "${data.address}" để ưu tiên gợi ý các sân gần khu vực này trước, không hỏi lại vị trí nếu khách đã có địa chỉ.
3. Khi hướng dẫn thanh toán, nói rõ ràng thành câu tự nhiên: "Hiện tại số dư ví của bạn là ${formattedBalance}. Bạn có thể thanh toán trực tiếp qua ví hoặc quét mã VietQR khi đặt sân nhé!". TUYỆT ĐỐI KHÔNG in tiêu đề kỹ thuật thô kệch.
`;

    return prompt;
  }
}
