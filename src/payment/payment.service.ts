import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'qs';
import { format } from 'date-fns';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: DatabaseService,
    private configService: ConfigService
  ) {}

  // Tạo URL thanh toán VNPay
  async createPaymentUrl(
    userId: number,
    membershipType: number,
    amount: number,
    ipAddr: string
  ) {
    const tmnCode = this.configService.get('VNPAY_TMN_CODE');
    const secretKey = this.configService.get('VNPAY_HASH_SECRET');
    const vnpUrl = this.configService.get('VNPAY_URL');
    const returnUrl = this.configService.get('VNPAY_RETURN_URL');

    const date = new Date();
    const createDate = format(date, 'yyyyMMddHHmmss');
    const orderId = format(date, 'HHmmss');

    // Tạo membership record với trạng thái pending
    const membership = await this.prisma.membership.create({
      data: {
        user_id: userId,
        membership_type: membershipType,
        price: amount,
        status_id: 2, // Pending
        start_date: new Date(),
        end_date: this.calculateEndDate(membershipType),
      },
    });

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan membership ID: ${membership.membership_id}`,
      vnp_OrderType: 'membership',
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    const signData = querystring.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');
    vnpParams['vnp_SecureHash'] = signed;

    const paymentUrl = `${vnpUrl}?${querystring.stringify(vnpParams, { encode: false })}`;
    
    return {
      url: paymentUrl,
      membershipId: membership.membership_id,
    };
  }

  // Xử lý callback từ VNPay
  async processPaymentReturn(vnpayParams: any) {
    const secureHash = vnpayParams['vnp_SecureHash'];
    const orderInfo = vnpayParams['vnp_OrderInfo'];
    const responseCode = vnpayParams['vnp_ResponseCode'];
    
    // Verify hash
    delete vnpayParams['vnp_SecureHash'];
    delete vnpayParams['vnp_SecureHashType'];
    
    const secretKey = this.configService.get('VNPAY_HASH_SECRET');
    const signData = querystring.stringify(vnpayParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');

    if(secureHash !== signed) {
      throw new BadRequestException('Invalid signature');
    }

    // Lấy membership_id từ orderInfo
    const membershipId = parseInt(orderInfo.split(':')[1].trim());

    if(responseCode === '00') {
      // Thanh toán thành công
      await this.prisma.membership.update({
        where: { membership_id: membershipId },
        data: { status_id: 1 } // Active
      });
      return { success: true };
    } else {
      // Thanh toán thất bại
      await this.prisma.membership.update({
        where: { membership_id: membershipId },
        data: { status_id: 3 } // Failed
      });
      return { success: false };
    }
  }

  private calculateEndDate(membershipType: number): Date {
    const endDate = new Date();
    switch(membershipType) {
      case 1: // 1 tháng
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 2: // 3 tháng
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 3: // 6 tháng
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case 4: // 12 tháng
        endDate.setMonth(endDate.getMonth() + 12);
        break;
      default:
        throw new BadRequestException('Invalid membership type');
    }
    return endDate;
  }
} 