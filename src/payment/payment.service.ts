import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ZaloPayConfig } from '../config/zalopay.config';
import axios from 'axios';
import * as CryptoJS from 'crypto-js';
import * as moment from 'moment';
import * as qs from 'qs';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateMembershipTypeDto } from './dto/create-membership-type.dto';
import { UpdateMembershipTypeDto } from './dto/update-membership-type.dto';

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
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 7);
    
    // Kiểm tra xem đã có membership pending cùng loại chưa
    const pendingMembership = await this.prisma.membership.findFirst({
        where: {
            user_id: data.user_id,
            membership_type: data.membership_type,
            status_id: 2 // Pending Payment
        }
    });

    // Nếu đã có membership pending cùng loại, xóa nó đi
    if (pendingMembership) {
        await this.prisma.membership.delete({
            where: {
                membership_id: pendingMembership.membership_id
            }
        });
    }
    
    // Lấy thông tin membership type
    const membershipType = await this.prisma.membership_description.findUnique({
        where: {
            membership_type: data.membership_type
        }
    });

    if (!membershipType) {
        throw new Error('Membership type not found');
    }

    // Kiểm tra xem có membership active cùng loại không
    const activeMembership = await this.prisma.membership.findFirst({
        where: {
            user_id: data.user_id,
            membership_type: data.membership_type,
            status_id: 1,
            end_date: {
                gt: currentDate
            }
        },
        orderBy: {
            end_date: 'desc'
        }
    });

    const quantity = data.quantity || 1;
    const totalMonths = membershipType.duration * quantity;
    const totalPrice = Number(membershipType.price) * quantity;

    let startDate: Date;
    let endDate: Date;

    if (activeMembership) {
        // Nếu có membership active cùng loại, extend từ ngày kết thúc
        startDate = new Date(activeMembership.start_date);
        endDate = new Date(activeMembership.end_date);
        endDate.setMonth(endDate.getMonth() + totalMonths);
    } else {
        // Nếu không có membership active cùng loại
        // Kiểm tra xem có membership active khác loại không
        const otherActiveMembership = await this.prisma.membership.findFirst({
            where: {
                user_id: data.user_id,
                status_id: 1,
                end_date: {
                    gt: currentDate
                }
            },
            orderBy: {
                end_date: 'desc'
            }
        });

        if (otherActiveMembership) {
            // Nếu có membership active khác loại, bắt đầu sau khi nó kết thúc
            startDate = new Date(otherActiveMembership.end_date);
            endDate = new Date(startDate);
            endDate.setMonth(startDate.getMonth() + totalMonths);
        } else {
            // Nếu không có membership active nào, bắt đầu từ ngày hiện tại
            startDate = currentDate;
            endDate = new Date(currentDate);
            endDate.setMonth(currentDate.getMonth() + totalMonths);
        }
    }

    // Đảm bảo ngày cuối tháng được tính đúng
    endDate.setDate(endDate.getDate() - 1);

    const transactionDate = new Date();
    transactionDate.setHours(transactionDate.getHours() + 7);

    // Tạo membership mới
    const newMembership = await this.prisma.membership.create({
        data: {
            ...data,
            start_date: startDate,
            end_date: endDate,
            order_id: `MEM${Date.now()}${data.user_id}`,
            quantity: quantity,
            price: totalPrice,
            transaction_date: transactionDate,
            status_id: 2 // Luôn bắt đầu với status Pending Payment
        }
    });

    // Tạo timeout để tự động chuy���n sang failed sau 15 phút
    setTimeout(async () => {
        try {
            const membership = await this.prisma.membership.findUnique({
                where: { membership_id: newMembership.membership_id }
            });

            if (membership && membership.status_id === 2) {
                const status = await this.checkOrderStatus(membership.order_id);
                if (status.isPending) {
                    await this.updateMembershipStatus(
                        membership.membership_id,
                        3 // Failed
                    );
                    console.log(`Membership ${membership.membership_id} timeout and marked as failed`);
                }
            }
        } catch (error) {
            console.error(`Error handling membership timeout ${newMembership.membership_id}:`, error);
        }
    }, 15 * 60 * 1000); // 15 phút

    return newMembership;
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
      throw new Error('Cannot create ZaloPay order');
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
        
      if (membership && membership.status_id === 2) { // Chỉ xử lý nếu đang ở trạng thái pending
        let statusId;
        
        // Xử lý các trường hợp trả về từ ZaloPay
        switch(returnCode) {
          case 1: // Thanh toán thành công
            statusId = 1;
            break;
          case 2: // Đang xử lý
          case 3: // Đang chờ thanh toán
            statusId = 2;
            break;
          case -1: // ZaloPay đang bảo trì
          case -2: // Order không tồn tại
          case -3: // Order đã bị hủy
          case -4: // Order đã hết hạn
          case -5: // Order đã được thanh toán
          case -6: // Order bị từ chối
          case -7: // Order thất bại
            statusId = 3;
            break;
          default:
            statusId = 3;
        }
        
        // Cập nhật trạng thái membership
        if (statusId !== 2) { // Chỉ cập nhật nếu không phải đang pending
          await this.updateMembershipStatus(
            membership.membership_id,
            statusId
          );
        }
      }
      
      return {
        code: returnCode,
        message: response.return_message,
        isSuccess: returnCode === 1,
        isCancelled: returnCode === -2 || returnCode === -3 || returnCode === -4,
        isPending: returnCode === 2 || returnCode === 3,
        membershipId: membership?.membership_id,
        statusId: membership?.status_id
      };

    } catch (error) {
      console.error('Check order status error:', error);
      // Nếu có lỗi khi gọi API, cũng chuyển sang status failed
      const membership = await this.prisma.membership.findFirst({
        where: { order_id: orderId }
      });
      
      if (membership && membership.status_id === 2) {
        await this.updateMembershipStatus(
          membership.membership_id,
          3 // Failed
        );
      }
      
      throw new Error('Cannot check order status');
    }
  }

  // Thêm helper method để lấy thời gian hiện tại theo GMT+7
  private getCurrentDateInGMT7(): Date {
    const date = new Date();
    date.setHours(date.getHours() + 7);
    return date;
  }

  // Sửa phương thức getMembershipStatus để phản ánh logic mới
  async getMembershipStatus(userId: number) {
    try {
        const currentDate = this.getCurrentDateInGMT7();
        
        const membership = await this.prisma.membership.findFirst({
            where: {
                user_id: userId,
                status_id: 1, // Chỉ lấy membership đã thanh toán
                start_date: {
                    lte: currentDate
                },
                end_date: {
                    gt: currentDate
                }
            },
            orderBy: {
                membership_id: 'desc'
            }
        });

        if (!membership) {
            return {
                hasMembership: false,
                message: 'User has no active membership'
            };
        }

        const endDate = new Date(membership.end_date);
        
        return {
            hasMembership: true,
            isActive: true,
            membershipDetails: {
                membership_id: membership.membership_id,
                membership_type: membership.membership_type,
                start_date: membership.start_date,
                end_date: membership.end_date,
                status_id: membership.status_id,
                price: Number(membership.price),
                payment_method: membership.payment_method,
                quantity: membership.quantity,
                transaction_date: membership.transaction_date
            },
            daysRemaining: Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24))
        };

    } catch (error) {
        console.error('Get membership status error:', error);
        throw new Error('Cannot get membership information');
    }
  }

  // Sửa phương thức checkExistingActiveMembership
  async checkExistingActiveMembership(userId: number, newMembershipType: number) {
    try {
        const currentDate = this.getCurrentDateInGMT7();
        
        const [activeMembership, pendingMembership] = await Promise.all([
            this.prisma.membership.findFirst({
                where: {
                    user_id: userId,
                    status_id: 1,
                    end_date: {
                        gt: currentDate
                    }
                },
                orderBy: [
                    { membership_id: 'desc' }
                ],
                select: {
                    membership_id: true,
                    membership_type: true,
                    start_date: true,
                    end_date: true,
                    price: true,
                    status_id: true,
                    transaction_date: true
                }
            }),
            this.prisma.membership.findFirst({
                where: {
                    user_id: userId,
                    status_id: 4, // Trạng thái chờ kích hoạt
                    start_date: {
                        gt: currentDate
                    }
                },
                orderBy: [
                    { start_date: 'asc' }
                ]
            })
        ]);

        // Luôn cho phép mua
        const response = {
            hasActiveMembership: !!activeMembership,
            canPurchase: true,
            message: '',
            activeMembership: null,
            pendingMembership: null
        };

        if (activeMembership) {
            const endDate = new Date(activeMembership.end_date);
            const daysRemaining = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
            
            response.activeMembership = {
                ...activeMembership,
                price: Number(activeMembership.price),
                daysRemaining
            };

            if (newMembershipType === activeMembership.membership_type) {
                response.message = `You have ${daysRemaining} days remaining on your current membership. The duration will be added to your current plan.`;
            } else {
                response.message = `You have ${daysRemaining} days remaining on your current membership. The new plan will be activated after the current plan expires.`;
            }
        }

        if (pendingMembership) {
            response.pendingMembership = {
                membership_type: pendingMembership.membership_type,
                start_date: pendingMembership.start_date,
                end_date: pendingMembership.end_date
            };
        }

        return response;

    } catch (error) {
        console.error('Check existing membership error:', error);
        throw new Error('Cannot check current membership information');
    }
  }

  // Sửa phương thức activatePendingMemberships
  @Cron('0 0 * * *') // Chạy hàng ngày lúc 00:00 GMT+7
  async activatePendingMemberships() {
    try {
        const currentDate = this.getCurrentDateInGMT7();
        
        // Lấy các membership đang chờ kích hoạt và đến hạn kích hoạt
        const pendingMemberships = await this.prisma.membership.findMany({
            where: {
                status_id: 4,
                start_date: {
                    lte: currentDate
                }
            }
        });

        for (const membership of pendingMemberships) {
            await this.prisma.membership.update({
                where: {
                    membership_id: membership.membership_id
                },
                data: {
                    status_id: 1
                }
            });
        }
    } catch (error) {
        console.error('Activate pending memberships error:', error);
    }
  }

  async getAllMembershipTypes() {
    const memberships = await this.prisma.membership_description.findMany({
        select: {
            membership_type: true,
            name: true,
            description: true,
            price: true,
            duration: true
        }
    });

    return memberships.map(membership => ({
        ...membership,
        description: membership.description.split(',').map(desc => desc.trim())
    }));
  }

  // Sửa phương thức getMembershipHistory
  async getMembershipHistory(userId: number) {
    try {
        const currentDate = this.getCurrentDateInGMT7();
        
        const memberships = await this.prisma.membership.findMany({
            where: {
                user_id: userId,
                status_id: {
                    in: [1, 4]  // Chỉ lấy những membership đã active hoặc pending activation
                }
            },
            orderBy: [
                { transaction_date: 'asc' }  // Sắp xếp theo ngày giao dịch từ cũ đến mới (asc)
            ]
        });

        const membershipTypes = await this.prisma.membership_description.findMany();
        const membershipTypeMap = new Map(
            membershipTypes.map(type => [type.membership_type, type.name])
        );

        return memberships.map(membership => {
            const isActive = membership.status_id === 1 && 
                           new Date(membership.start_date) <= currentDate && 
                           new Date(membership.end_date) > currentDate;

            const daysRemaining = isActive ? 
                Math.ceil((new Date(membership.end_date).getTime() - currentDate.getTime()) / (1000 * 3600 * 24)) : 
                0;

            return {
                membership_id: membership.membership_id,
                membership_type: membership.membership_type,
                membership_name: membershipTypeMap.get(membership.membership_type) || 'Unknown',
                start_date: membership.start_date,
                end_date: membership.end_date,
                price: Number(membership.price),
                status_id: membership.status_id,
                payment_method: membership.payment_method,
                quantity: membership.quantity,
                order_id: membership.order_id,
                transaction_date: membership.transaction_date,
                isActive: isActive,
                status: this.getMembershipStatusText(membership, currentDate),
                daysRemaining: daysRemaining
            };
        });

    } catch (error) {
        console.error('Get membership history error:', error);
        throw new Error('Cannot get membership history');
    }
  }

  // Sửa phương thức getMembershipStatusText
  private getMembershipStatusText(membership: any, currentDate: Date): string {
    if (membership.status_id === 4) {
        return 'Pending Activation';
    }
    
    const startDate = new Date(membership.start_date);
    const endDate = new Date(membership.end_date);
    currentDate = this.getCurrentDateInGMT7();
    
    if (currentDate < startDate) {
        return 'Not Started';
    }
    
    if (currentDate > endDate) {
        return 'Expired';
    }
    
    if (membership.status_id === 1 && currentDate >= startDate && currentDate <= endDate) {
        return 'Active';
    }
    
    return 'Unknown';
  }

  // Sửa phương thức getMembershipBillDetail
  async getMembershipBillDetail(membershipId: number, userId: number) {
    try {
        // Lấy thông tin membership và membership type
        const [membership, membershipType] = await Promise.all([
            this.prisma.membership.findFirst({
                where: {
                    membership_id: membershipId,
                    user_id: userId  // Đảm bảo user chỉ xem được bill của họ
                }
            }),
            this.prisma.membership_description.findMany()
        ]);

        if (!membership) {
            throw new Error('Membership not found');
        }

        // Tìm thông tin loại membership
        const typeInfo = membershipType.find(
            type => type.membership_type === membership.membership_type
        );

        if (!typeInfo) {
            throw new Error('Membership type information not found');
        }

        // Tính toán thời hạn
        const totalMonths = typeInfo.duration * (membership.quantity || 1);
        
        return {
            bill_info: {
                membership_id: membership.membership_id,
                order_id: membership.order_id,
                transaction_date: membership.transaction_date,
                payment_method: membership.payment_method,
                status: this.getMembershipStatusText(membership, this.getCurrentDateInGMT7())
            },
            membership_info: {
                name: typeInfo.name,
                type: membership.membership_type,
                unit_price: Number(typeInfo.price),
                quantity: membership.quantity || 1,
                total_price: Number(membership.price),
                duration: {
                    months: totalMonths,
                    start_date: membership.start_date,
                    end_date: membership.end_date
                }
            },
            payment_status: {
                status_id: membership.status_id,
                status_text: this.getPaymentStatusText(membership.status_id)
            }
        };

    } catch (error) {
        console.error('Get membership bill detail error:', error);
        throw new Error('Cannot get bill details');
    }
  }

  private getPaymentStatusText(statusId: number): string {
    switch (statusId) {
        case 1:
            return 'Paid';
        case 2:
            return 'Pending Payment';
        case 3:
            return 'Payment Failed';
        case 4:
            return 'Pending Activation';
        default:
            return 'Unknown';
    }
  }

  // Thêm cron job để kiểm tra các giao dịch pending quá hạn
  @Cron(CronExpression.EVERY_MINUTE)
  async checkExpiredPendingMemberships() {
    try {
        const currentDate = this.getCurrentDateInGMT7();
        
        // Lấy tất cả membership đang pending và đã tạo quá 15 phút
        const expiredTime = new Date(currentDate.getTime() - 15 * 60 * 1000); // 15 phút trước
        
        const expiredMemberships = await this.prisma.membership.findMany({
            where: {
                status_id: 2, // Pending Payment
                transaction_date: {
                    lt: expiredTime
                }
            }
        });

        console.log(`Found ${expiredMemberships.length} expired pending memberships`);

        // Kiểm tra từng membership với ZaloPay và cập nhật status
        for (const membership of expiredMemberships) {
            try {
                // Kiểm tra trạng thái với ZaloPay
                const status = await this.checkOrderStatus(membership.order_id);
                
                // Nếu vẫn đang pending sau 15 phút, chuyển sang failed
                if (status.isPending) {
                    await this.updateMembershipStatus(
                        membership.membership_id,
                        3 // Failed
                    );
                    console.log(`Membership ${membership.membership_id} expired and marked as failed`);
                }
                
            } catch (error) {
                console.error(`Error checking membership ${membership.membership_id}:`, error);
                // Nếu có lỗi khi kiểm tra, cũng chuyển sang failed
                await this.updateMembershipStatus(
                    membership.membership_id,
                    3 // Failed
                );
            }
        }
    } catch (error) {
        console.error('Check expired memberships error:', error);
    }
  }

  // Lấy chi tiết một membership type
  async getMembershipTypeById(membershipType: number) {
    const type = await this.prisma.membership_description.findUnique({
        where: { membership_type: membershipType }
    });

    if (!type) {
        throw new Error('Membership type not found');
    }

    return {
        ...type,
        description: type.description.split(',').map(desc => desc.trim())
    };
  }

  // Tạo membership type mới
  async createMembershipType(createDto: CreateMembershipTypeDto) {
    // Kiểm tra xem membership type đã tồn tại chưa
    const existingType = await this.prisma.membership_description.findUnique({
        where: { membership_type: createDto.membership_type }
    });

    if (existingType) {
        throw new Error('Membership type already exists');
    }

    // Chuyển mảng description thành chuỗi
    const descriptionString = createDto.description.join(', ');

    const newType = await this.prisma.membership_description.create({
        data: {
            membership_type: createDto.membership_type,
            name: createDto.name,
            description: descriptionString,
            price: createDto.price,
            duration: createDto.duration
        }
    });

    return {
        ...newType,
        description: newType.description.split(',').map(desc => desc.trim())
    };
  }

  // Cập nhật membership type
  async updateMembershipType(
      membershipType: number,
      updateDto: UpdateMembershipTypeDto
  ) {
    // Kiểm tra xem membership type có tồn tại không
    const existingType = await this.prisma.membership_description.findUnique({
        where: { membership_type: membershipType }
    });

    if (!existingType) {
        throw new Error('Membership type not found');
    }

    // Xử lý description nếu có trong updateDto
    let descriptionString;
    if (updateDto.description) {
        descriptionString = updateDto.description.join(', ');
    }

    const updatedType = await this.prisma.membership_description.update({
        where: { membership_type: membershipType },
        data: {
            name: updateDto.name,
            description: descriptionString,
            price: updateDto.price,
            duration: updateDto.duration
        }
    });

    return {
        ...updatedType,
        description: updatedType.description.split(',').map(desc => desc.trim())
    };
  }

  // Xóa membership type
  async deleteMembershipType(membershipType: number) {
    // Kiểm tra xem có membership nào đang sử dụng type này không
    const existingMemberships = await this.prisma.membership.findFirst({
        where: { 
            membership_type: membershipType,
            status_id: {
                in: [1, 2, 4] // Active, Pending Payment, Pending Activation
            }
        }
    });

    if (existingMemberships) {
        throw new Error('Cannot delete membership type that is in use');
    }

    await this.prisma.membership_description.delete({
        where: { membership_type: membershipType }
    });
  }
} 