import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { MailLog, MailStatus } from './entities/mail-log.entity';
import { SendMailDto } from './dto/send-mail.dto';
import { getVietnamDate } from '../../common/utils/date.util';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectRepository(MailLog)
    private readonly mailLogRepository: Repository<MailLog>,
  ) { }

  private getTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  /**
   * Executes send Mail operation.
   */
  async sendMail(sendMailDto: SendMailDto): Promise<MailLog> {
    const { toEmail, subject, mailType, htmlContent } = sendMailDto;
    const from =
      process.env.SMTP_FROM || '"Sporting Web" <no-reply@sportingweb.com>';

    let status = MailStatus.SENT;
    let errorMessage: string | undefined = undefined;

    try {
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!user || !pass || user === 'your_email@gmail.com') {
        this.logger.warn(
          `SMTP credentials (SMTP_USER/SMTP_PASS) are not configured in .env. Mail to ${toEmail} skipped.`,
        );
        status = MailStatus.FAILED;
        errorMessage =
          'SMTP credentials (SMTP_USER/SMTP_PASS) are not configured in .env';
      } else {
        const transporter = this.getTransporter();
        await transporter.sendMail({
          from,
          to: toEmail,
          subject,
          html: htmlContent,
        });
        this.logger.log(`Email sent successfully to ${toEmail} [${mailType}]`);
      }
    } catch (error) {
      status = MailStatus.FAILED;
      errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send email to ${toEmail} [${mailType}]: ${errorMessage}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    const mailLog = this.mailLogRepository.create({
      toEmail,
      subject,
      mailType,
      status,
      errorMessage,
    });

    return this.mailLogRepository.save(mailLog);
  }

  async sendVerificationEmail(
    toEmail: string,
    username: string,
    token: string,
  ): Promise<MailLog> {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const verifyLink = `${appUrl}/api/v1/register-user/verify-link?email=${encodeURIComponent(toEmail)}&token=${encodeURIComponent(token)}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #4f46e5; text-align: center;">Xác thực địa chỉ Email của bạn</h2>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Sporting Web</strong>. Để hoàn tất đăng ký, vui lòng sử dụng mã xác thực bên dưới hoặc bấm trực tiếp vào nút xác thực.</p>
        
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; background: #eef2ff; padding: 12px 24px; border-radius: 6px;">
            ${token}
          </div>
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyLink}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Xác thực ngay
          </a>
        </div>

        <p style="font-size: 13px; color: #6b7280; text-align: center;">Hoặc dán đường link sau vào trình duyệt: <br/> <a href="${verifyLink}">${verifyLink}</a></p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
      </div>
    `;

    return this.sendMail({
      toEmail,
      subject: '[Sporting Web] Xác thực địa chỉ Email đăng ký tài khoản',
      mailType: 'REGISTER_VERIFICATION',
      htmlContent,
    });
  }

  async sendForgotPasswordEmail(
    toEmail: string,
    username: string,
    token: string,
  ): Promise<MailLog> {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #dc2626; text-align: center;">Yêu cầu Đặt lại Mật khẩu</h2>
        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>Sporting Web</strong>. Mã xác thực OTP của bạn là:</p>
        
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #dc2626; background: #fef2f2; padding: 12px 24px; border-radius: 6px;">
            ${token}
          </div>
        </div>

        <p style="font-size: 13px; color: #6b7280; text-align: center;">Mã xác thực này có hiệu lực trong 10 phút. Nếu người dùng gọi lại nút gửi lại mã (Resend), mã cũ sẽ bị vô hiệu hóa.</p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">Nếu bạn không thực hiện yêu cầu này, vui lòng bảo mật tài khoản và bỏ qua email này.</p>
      </div>
    `;

    return this.sendMail({
      toEmail,
      subject: '[Sporting Web] Mã xác thực đặt lại mật khẩu',
      mailType: 'FORGOT_PASSWORD_VERIFICATION',
      htmlContent,
    });
  }

  async sendBookingConfirmationEmail(
    toEmail: string,
    username: string,
    bookingDetails: {
      id: number;
      yardName: string;
      vendorName?: string;
      startTime: string;
      endTime: string;
      priced: number;
      verifyUrl: string;
    },
  ): Promise<MailLog> {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(bookingDetails.verifyUrl)}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1E3932; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 16px; padding: 24px; background-color: #FBF8F0;">
        <div style="text-align: center; border-bottom: 2px solid #006241; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #006241; margin: 0;">SPORTING ONE PLATFORM</h2>
          <p style="font-size: 14px; color: #6F7E72; margin: 4px 0 0 0;">Xác Nhận Đặt Sân & Mã QR Thi Đấu</p>
        </div>

        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Thanh toán của bạn cho đơn đặt sân <strong>#${bookingDetails.id}</strong> đã thành công! Dưới đây là mã QR và thông tin chi tiết trận đấu của bạn:</p>

        <div style="background-color: #ffffff; border: 1px solid #E6E2D8; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Mã đơn:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #006241;">#${bookingDetails.id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Sân thi đấu:</td>
              <td style="padding: 6px 0; font-weight: bold;">${bookingDetails.yardName}</td>
            </tr>
            ${bookingDetails.vendorName ? `<tr><td style="padding: 6px 0; color: #6F7E72;">Cụm sân (Vendor):</td><td style="padding: 6px 0; font-weight: bold;">${bookingDetails.vendorName}</td></tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Khung giờ:</td>
              <td style="padding: 6px 0; font-weight: bold;">${bookingDetails.startTime} - ${bookingDetails.endTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Chi phí thanh toán:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #006241;">${Number(bookingDetails.priced).toLocaleString('vi-VN')} Xu / VNĐ</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <img src="${qrImageUrl}" alt="Mã QR Đặt Sân #${bookingDetails.id}" style="width: 200px; height: 200px; border: 3px solid #006241; border-radius: 12px; padding: 6px; background-color: #ffffff;" />
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${bookingDetails.verifyUrl}" style="background-color: #006241; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 50px; display: inline-block;">
            Xem Link Xác Thực QR
          </a>
        </div>

        <p style="font-size: 12px; color: #6F7E72; text-align: center;">
          Vui lòng chụp màn hình hoặc xuất trình mã QR này cho Quản lý / Chủ sân khi đến nhận sân thi đấu.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">Đây là email tự động từ hệ thống Sporting ONE. Vui lòng không trả lời email này.</p>
      </div>
    `;

    return this.sendMail({
      toEmail,
      subject: `[Sporting ONE] Mã QR & Xác Nhận Đặt Sân Thành Công #${bookingDetails.id}`,
      mailType: 'BOOKING_CONFIRMATION',
      htmlContent,
    });
  }

  async sendBookingMonthConfirmationEmail(
    toEmail: string,
    username: string,
    bookingDetails: {
      id: number;
      yardName: string;
      vendorName?: string;
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      bookingType?: string;
      priced: number;
      verifyUrl: string;
    },
  ): Promise<MailLog> {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(bookingDetails.verifyUrl)}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1E3932; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 16px; padding: 24px; background-color: #FBF8F0;">
        <div style="text-align: center; border-bottom: 2px solid #006241; padding-bottom: 16px; margin-bottom: 20px;">
          <h2 style="color: #006241; margin: 0;">SPORTING ONE PLATFORM</h2>
          <p style="font-size: 14px; color: #6F7E72; margin: 4px 0 0 0;">Xác Nhận Đặt Sân Theo Tháng & Mã QR</p>
        </div>

        <p>Xin chào <strong>${username}</strong>,</p>
        <p>Thanh toán của bạn cho gói đặt sân theo tháng <strong>#BM-${bookingDetails.id}</strong> đã thành công! Dưới đây là mã QR và thông tin chi tiết gói đặt sân của bạn:</p>

        <div style="background-color: #ffffff; border: 1px solid #E6E2D8; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Mã gói đặt tháng:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #006241;">#BM-${bookingDetails.id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Sân thi đấu:</td>
              <td style="padding: 6px 0; font-weight: bold;">${bookingDetails.yardName}</td>
            </tr>
            ${bookingDetails.vendorName ? `<tr><td style="padding: 6px 0; color: #6F7E72;">Cụm sân (Vendor):</td><td style="padding: 6px 0; font-weight: bold;">${bookingDetails.vendorName}</td></tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Thời hạn gói:</td>
              <td style="padding: 6px 0; font-weight: bold;">${bookingDetails.startDate} đến ${bookingDetails.endDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Khung giờ chơi hàng ngày:</td>
              <td style="padding: 6px 0; font-weight: bold;">${bookingDetails.startTime} - ${bookingDetails.endTime}</td>
            </tr>
            ${bookingDetails.bookingType ? `<tr><td style="padding: 6px 0; color: #6F7E72;">Loại gói:</td><td style="padding: 6px 0; font-weight: bold;">${bookingDetails.bookingType}</td></tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #6F7E72;">Tổng chi phí:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #006241;">${Number(bookingDetails.priced).toLocaleString('vi-VN')} Xu / VNĐ</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <img src="${qrImageUrl}" alt="Mã QR Đặt Sân Tháng #BM-${bookingDetails.id}" style="width: 200px; height: 200px; border: 3px solid #006241; border-radius: 12px; padding: 6px; background-color: #ffffff;" />
        </div>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${bookingDetails.verifyUrl}" style="background-color: #006241; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 50px; display: inline-block;">
            Xem Link Xác Thực QR
          </a>
        </div>

        <p style="font-size: 12px; color: #6F7E72; text-align: center;">
          Vui lòng chụp màn hình hoặc xuất trình mã QR này cho Quản lý / Chủ sân khi đến nhận sân thi đấu trong suốt thời hạn gói.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center;">Đây là email tự động từ hệ thống Sporting ONE. Vui lòng không trả lời email này.</p>
      </div>
    `;

    return this.sendMail({
      toEmail,
      subject: `[Sporting ONE] Mã QR & Xác Nhận Đặt Sân Theo Tháng Thành Công #BM-${bookingDetails.id}`,
      mailType: 'BOOKING_CONFIRMATION',
      htmlContent,
    });
  }

  /**
   * Shared helper function to verify Token / OTP for any Entity (RegisterUser, ForgotPassword...)
   * Performs check for record existence, expiration (UTC+7 timezone), and token code matching.
   */
  async verifyToken<T extends { expiresAt?: Date; verificationToken: string }>(
    record: T | null,
    inputToken: string,
    onExpired?: (record: T) => Promise<void> | void,
    notFoundMessage = 'No pending verification record found',
  ): Promise<T> {
    if (!record) {
      throw new NotFoundException(notFoundMessage);
    }

    const now = getVietnamDate();
    if (record.expiresAt && now > record.expiresAt) {
      if (onExpired) {
        await onExpired(record);
      }
      throw new BadRequestException(
        'Verification token has expired. Status updated.',
      );
    }

    if (record.verificationToken !== inputToken) {
      throw new BadRequestException(
        'Invalid verification token. Please try again.',
      );
    }

    return record;
  }

  /**
   * Retrieves All information.
   */
  async findAll(): Promise<MailLog[]> {
    return this.mailLogRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves One information.
   */
  async findOne(id: number): Promise<MailLog> {
    const mailLog = await this.mailLogRepository.findOne({ where: { id } });
    if (!mailLog) {
      throw new NotFoundException(`MailLog with ID ${id} not found`);
    }
    return mailLog;
  }
}
