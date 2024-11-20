import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ZaloPayConfig } from '../config/zalopay.config';
import axios from 'axios';
import * as CryptoJS from 'crypto-js';
import * as moment from 'moment';
import * as qs from 'qs';
import { CreateMembershipDto } from './dto/create-membership.dto';

interface CreateZaloPayOrderParams {
  amount: number;
  orderId: string;
  membershipId: number;
  description: string;
  userId: number;
}

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: DatabaseService) {}

  async createMembership(data: CreateMembershipDto) {
    return this.prisma.membership.create({
      data: {
        ...data,
        order_id: `MEM${Date.now()}${data.user_id}`
      }
    });
  }

  async createZaloPayOrder(params: CreateZaloPayOrderParams) {
    const { amount, orderId, membershipId, description, userId } = params;

    console.log('Creating ZaloPay order:', params);

    const embedData = {
      redirecturl: `${process.env.FRONTEND_URL}/payment-status?orderId=${orderId}`,
      membership_id: membershipId,
    };

    console.log('Creating order with embedData:', embedData);

    const order = {
      app_id: ZaloPayConfig.app_id,
      app_trans_id: `${moment().format('YYMMDD')}_${orderId}`,
      app_user: userId.toString(),
      app_time: Date.now(),
      item: JSON.stringify([]),
      embed_data: JSON.stringify(embedData),
      amount,
      callback_url: ZaloPayConfig.callback_url,
      description,
      bank_code: '',
    };

    const data = 
      ZaloPayConfig.app_id + '|' +
      order.app_trans_id + '|' +
      order.app_user + '|' +
      order.amount + '|' +
      order.app_time + '|' +
      order.embed_data + '|' +
      order.item;

    order['mac'] = CryptoJS.HmacSHA256(data, ZaloPayConfig.key1).toString();

    try {
      const result = await axios.post(ZaloPayConfig.endpoint, null, { 
        params: order 
      });
      console.log('ZaloPay order response:', result.data);
      return result.data;
    } catch (error) {
      console.error('ZaloPay create order error:', error);
      throw new Error('Không thể tạo đơn hàng ZaloPay');
    }
  }

  async verifyCallback(callbackData: any): Promise<boolean> {
    const mac = CryptoJS.HmacSHA256(
      callbackData.data, 
      ZaloPayConfig.key2
    ).toString();
    return mac === callbackData.mac;
  }

  async updateMembershipStatus(membershipId: number, statusId: number) {
    return await this.prisma.$transaction(async (prisma) => {
        // Kiểm tra membership tồn tại
        const membership = await prisma.membership.findUnique({
            where: { membership_id: membershipId }
        });
        
        if (!membership) {
            throw new Error(`Membership ${membershipId} not found`);
        }
        
        // Cập nhật status
        const updated = await prisma.membership.update({
            where: { membership_id: membershipId },
            data: { status_id: statusId }
        });
        
        console.log(`Membership ${membershipId} updated to status ${statusId}`);
        return updated;
    });
  }

  async checkOrderStatus(orderId: string) {
    const app_trans_id = `${moment().format('YYMMDD')}_${orderId}`;
    
    const postData = {
      app_id: ZaloPayConfig.app_id,
      app_trans_id: app_trans_id,
    };

    const data = postData.app_id + '|' + postData.app_trans_id + '|' + ZaloPayConfig.key1;
    postData['mac'] = CryptoJS.HmacSHA256(data, ZaloPayConfig.key1).toString();

    try {
      const result = await axios.post(
        'https://sb-openapi.zalopay.vn/v2/query',
        qs.stringify(postData),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const response = result.data;
      const returnCode = response.return_code;
      
      console.log('ZaloPay Query Response:', response);

      const membership = await this.prisma.membership.findFirst({
        where: { order_id: orderId }
      });
        
      if (membership && membership.status_id !== 1) {
        let statusId;
        switch(returnCode) {
          case 1:
            statusId = 1;
            break;
          case 2:
          case 3:
            statusId = 2;
            break;
          default:
            statusId = 3;
        }
        
        await this.updateMembershipStatus(
          membership.membership_id,
          statusId
        );
      }
      
      return {
        code: returnCode,
        message: response.return_message,
        isSuccess: returnCode === 1,
        isCancelled: returnCode === -2 || returnCode === -3,
        isPending: returnCode === 2 || returnCode === 3,
        membershipId: membership?.membership_id,
        statusId: membership?.status_id
      };

    } catch (error) {
      console.error('Check order status error:', error);
      throw new Error('Không thể kiểm tra trạng thái đơn hàng');
    }
  }

  async getMembershipStatus(userId: number) {
    try {
      const currentDate = new Date();
      
      // Lấy membership còn hiệu lực (đã thanh toán và chưa hết hạn)
      const membership = await this.prisma.membership.findFirst({
        where: {
          user_id: userId,
          status_id: 1,  // Đã thanh toán thành công
          end_date: {
            gt: currentDate  // Ngày hết hạn phải lớn hơn ngày hiện tại
          }
        },
        orderBy: {
          membership_id: 'desc'  // Lấy membership mới nhất
        }
      });

      if (!membership) {
        return {
          hasMembership: false,
          message: 'Người dùng không có membership còn hiệu lực'
        };
      }

      const endDate = new Date(membership.end_date);
      
      return {
        hasMembership: true,
        isActive: true, // Luôn true vì đã lọc trong query
        membershipDetails: {
          membership_id: membership.membership_id,
          membership_type: membership.membership_type,
          start_date: membership.start_date,
          end_date: membership.end_date,
          status_id: membership.status_id,
          price: Number(membership.price),
          payment_method: membership.payment_method
        },
        daysRemaining: Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24))
      };

    } catch (error) {
      console.error('Get membership status error:', error);
      throw new Error('Không thể lấy thông tin membership');
    }
  }

  async checkExistingActiveMembership(userId: number, newMembershipType: number) {
    try {
        const currentDate = new Date();
        
        // Chỉ lấy membership mới nhất, còn hiệu lực và đã kích hoạt
        const activeMembership = await this.prisma.membership.findFirst({
            where: {
                user_id: userId,
                status_id: 1,  // Chỉ lấy membership đã kích hoạt
                end_date: {
                    gt: currentDate  // Còn hiệu lực
                }
            },
            orderBy: [
                { membership_id: 'desc' }  // Lấy membership mới nhất
            ],
            select: {
                membership_id: true,
                membership_type: true,
                start_date: true,
                end_date: true,
                price: true,
                status_id: true
            }
        });

        if (!activeMembership) {
            return {
                hasActiveMembership: false,
                canPurchase: true
            };
        }

        const endDate = new Date(activeMembership.end_date);
        const daysRemaining = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));

        // Kiểm tra nếu gói mới nhỏ hơn gói hiện tại đang active
        if (newMembershipType < activeMembership.membership_type) {
            return {
                hasActiveMembership: true,
                canPurchase: false,
                activeMembership: {
                    ...activeMembership,
                    price: Number(activeMembership.price),
                    daysRemaining
                },
                message: `Bạn đang sử dụng gói membership cao hơn (Gói ${activeMembership.membership_type}). Không thể đăng ký gói thấp hơn.`
            };
        }

        // Nếu gói mới lớn hơn hoặc bằng gói hiện tại
        return {
            hasActiveMembership: true,
            canPurchase: true,
            activeMembership: {
                ...activeMembership,
                price: Number(activeMembership.price),
                daysRemaining
            },
            message: `Bạn đang có gói membership còn ${daysRemaining} ngày sử dụng. Bạn có chắc chắn muốn nâng cấp lên gói mới không?`
        };

    } catch (error) {
        console.error('Check existing membership error:', error);
        throw new Error('Không thể kiểm tra thông tin membership hiện tại');
    }
  }
} 