import { Controller,Post,Body,HttpException,HttpStatus,UseGuards,Get,Param,Req,BadRequestException,Query,Put,Delete} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { DatabaseService } from '../database/database.service';
import { CreateMembershipTypeDto } from './dto/create-membership-type.dto';
import { UpdateMembershipTypeDto } from './dto/update-membership-type.dto';

@Controller('payment')
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly authService: AuthService,
        private readonly prisma: DatabaseService
    ) { }

    // API thanh toán membership
    @Post('create-membership')
    @UseGuards(JwtAuthGuard)
    async createMembershipPayment(
        @Body()
        paymentData: {
            user_id: number;
            membership_type: number;
            price: number;
            start_date: Date;
            end_date: Date;
        },
        @Req() req: Request
    ) {
        try {
            // Lấy token từ header
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                throw new HttpException(
                    'Không tìm thấy access token',
                    HttpStatus.UNAUTHORIZED
                );
            }

            const token = authHeader.split(' ')[1];
            
            try {
                // Verify token và đợi kết quả
                const decodedToken = await this.authService.verifyToken(token);
                
                if (!decodedToken || decodedToken.user_id !== paymentData.user_id) {
                    throw new HttpException(
                        'Token không hợp lệ hoặc không khớp với user_id',
                        HttpStatus.UNAUTHORIZED
                    );
                }

                // Tạo membership với trạng thái pending
                const membership = await this.paymentService.createMembership({
                    ...paymentData,
                    status_id: 2, // Pending
                    payment_method: 'zalopay'
                });

                // Tạo đơn hàng ZaloPay
                const zaloPayOrder = await this.paymentService.createZaloPayOrder({
                    amount: Number(membership.price),
                    orderId: membership.order_id,
                    membershipId: membership.membership_id,
                    description: `Thanh toán membership #${membership.membership_id}`,
                    userId: membership.user_id
                });

                return {
                    membership,
                    payment: zaloPayOrder
                };

            } catch (jwtError) {
                throw new HttpException(
                    'Token không hợp lệ',
                    HttpStatus.UNAUTHORIZED
                );
            }

        } catch (error) {
            console.error('Create membership payment error:', error);
            throw new HttpException(
                'Không thể tạo đơn hàng',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('callback')
    async handleCallback(@Body() callbackData: any) {
        try {
            console.log('Received ZaloPay callback with data:', JSON.stringify(callbackData, null, 2));
            
            // Verify chữ ký
            const isValid = await this.paymentService.verifyCallback(callbackData);
            console.log('Callback signature verification:', isValid);
            
            if (!isValid) {
                console.error('Invalid MAC signature');
                return {
                    return_code: -1,
                    return_message: 'mac not equal'
                };
            }

            // Parse data
            const callbackDataJson = JSON.parse(callbackData.data);
            const embedData = JSON.parse(callbackDataJson.embed_data);
            
            console.log('Parsed callback data:', {
                type: callbackData.type,
                app_trans_id: callbackDataJson.app_trans_id,
                embedData
            });

            // Cập nhật trạng thái membership
            if (callbackData.type === 1) { // Thanh toán thành công
                console.log('Payment successful, updating membership status to 1');
                const updatedMembership = await this.paymentService.updateMembershipStatus(
                    embedData.membership_id,
                    1 // Success
                );
                console.log('Updated membership:', updatedMembership);
            } else { 
                console.log('Payment failed, updating membership status to 3');
                await this.paymentService.updateMembershipStatus(
                    embedData.membership_id,
                    3 // Failed
                );
            }

            // Trả về kết quả cho ZaloPay
            return {
                return_code: callbackData.type,
                return_message: callbackData.type === 1 ? 'success' : 'failed',
                redirect_url: `${process.env.FRONTEND_URL}/payment-status?orderId=${callbackDataJson.app_trans_id}`
            };
        } catch (error) {
            console.error('Callback error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            return {
                return_code: -3,
                return_message: 'internal server error',
                redirect_url: `${process.env.FRONTEND_URL}/payment-status?error=true`
            };
        }
    }

    @Get('check-status/:orderId')
    @UseGuards(JwtAuthGuard)
    async checkPaymentStatus(@Param('orderId') orderId: string) {
        try {
            console.log('Checking payment status for order:', orderId);
            
            const status = await this.paymentService.checkOrderStatus(orderId);
            
            console.log('Payment status result:', status);
            
            // Nếu thanh toán bị hủy hoặc thất bại, cập nhật trạng thái membership
            if (status.isCancelled) {
                console.log('Payment was cancelled, updating membership status');
                
                // Tìm membership dựa trên orderId
                const membership = await this.prisma.membership.findFirst({
                    where: { order_id: orderId }
                });
                
                console.log('Found membership:', membership);
                
                if (membership) {
                    const updatedMembership = await this.paymentService.updateMembershipStatus(
                        membership.membership_id,
                        3 // Failed/Cancelled status
                    );
                    console.log('Updated membership status:', updatedMembership);
                }
            }

            return status;
        } catch (error) {
            console.error('Check payment status error:', error);
            throw new HttpException(
                'Không thể kiểm tra trạng thái đơn hàng',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // API test
    @Post('test-create')
    async testCreateOrder() {
        try {
            const membership = await this.paymentService.createMembership({
                user_id: 1, // Test user ID
                membership_type: 1,
                start_date: new Date(),
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                price: 100000,
                status_id: 2,
                payment_method: 'zalopay'
            });

            const zaloPayOrder = await this.paymentService.createZaloPayOrder({
                amount: Number(membership.price),
                orderId: membership.order_id,
                membershipId: membership.membership_id,
                description: `Test - Thanh toán membership #${membership.membership_id}`,
                userId: membership.user_id
            });

            return {
                membership,
                payment: zaloPayOrder
            };
        } catch (error) {
            console.error('Test create order error:', error);
            throw new HttpException(
                'Không thể tạo đơn hàng test',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('check-payment/:orderId')
    async checkPaymentAndRedirect(@Param('orderId') orderId: string) {
        try {
            console.log('Checking final payment status for order:', orderId);
            
            // Tìm membership dựa trên orderId
            const membership = await this.prisma.membership.findFirst({
                where: { order_id: orderId }
            });
            
            if (!membership) {
                throw new BadRequestException('Không tìm thấy đơn hàng');
            }

            // Kiểm tra trạng thái với ZaloPay
            const status = await this.paymentService.checkOrderStatus(orderId);
            console.log('Payment status from ZaloPay:', status);

            // Trả về đầy đủ thông tin để frontend xử lý
            return {
                success: status.isSuccess,
                status: status.code,
                message: status.message,
                membership_status: membership.status_id,
                redirect_url: status.isSuccess 
                    ? process.env.FRONTEND_URL 
                    : process.env.FRONTEND_URL_FAILED
            };

        } catch (error) {
            console.error('Check payment and redirect error:', error);
            throw new HttpException(
                'Không thể kiểm tra trạng thái thanh toán',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('debug-order/:orderId')
    async debugOrder(@Param('orderId') orderId: string) {
        try {
            // Kiểm tra membership trong database
            const membership = await this.prisma.membership.findFirst({
                where: { order_id: orderId }
            });
            
            // Kiểm tra trạng thái với ZaloPay
            const zaloPayStatus = await this.paymentService.checkOrderStatus(orderId);
            
            return {
                membership,
                zaloPayStatus
            };
        } catch (error) {
            console.error('Debug order error:', error);
            throw error;
        }
    }

    @Get('membership-status')
    @UseGuards(JwtAuthGuard)
    async getMembershipStatus(@Req() req: Request) {
        try {
            // Lấy user_id từ JWT token đã được decode trong JwtAuthGuard
            const user = (req as any).user;
            if (!user || !user.user_id) {
                throw new HttpException(
                    'Không thể xác thực người dùng',
                    HttpStatus.UNAUTHORIZED
                );
            }

            // Lấy thông tin membership
            const membershipStatus = await this.paymentService.getMembershipStatus(user.user_id);
            return membershipStatus;

        } catch (error) {
            console.error('Get membership status error:', error);
            throw new HttpException(
                'Không thể lấy thông tin membership',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('check-existing-membership')
    @UseGuards(JwtAuthGuard)
    async checkExistingMembership(
        @Req() req: Request,
        @Query('membership_type') membershipType: string
    ) {
        try {
            const user = (req as any).user;
            if (!user || !user.user_id) {
                throw new HttpException(
                    'Không thể xác thực người dùng',
                    HttpStatus.UNAUTHORIZED
                );
            }

            if (!membershipType || isNaN(Number(membershipType))) {
                throw new HttpException(
                    'Vui lòng cung cấp loại membership hợp lệ',
                    HttpStatus.BAD_REQUEST
                );
            }

            const result = await this.paymentService.checkExistingActiveMembership(
                user.user_id,
                Number(membershipType)
            );
            return result;

        } catch (error) {
            console.error('Check existing membership error:', error);
            throw new HttpException(
                'Không thể kiểm tra membership hiện tại',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('membership-types')
    async getAllMembershipTypes() {
        try {
            const membershipTypes = await this.paymentService.getAllMembershipTypes();
            return membershipTypes;
        } catch (error) {
            console.error('Get membership types error:', error);
            throw new HttpException(
                'Không thể lấy thông tin các loại membership',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('membership-history')
    @UseGuards(JwtAuthGuard)
    async getMembershipHistory(@Req() req: Request) {
        try {
            const user = (req as any).user;
            if (!user || !user.user_id) {
                throw new HttpException(
                    'Không thể xác thực người dùng',
                    HttpStatus.UNAUTHORIZED
                );
            }

            const history = await this.paymentService.getMembershipHistory(user.user_id);
            return history;

        } catch (error) {
            console.error('Get membership history error:', error);
            throw new HttpException(
                'Không thể lấy lịch sử membership',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('bill-detail/:membershipId')
    @UseGuards(JwtAuthGuard)
    async getMembershipBillDetail(
        @Param('membershipId') membershipId: string,
        @Req() req: Request
    ) {
        try {
            const user = (req as any).user;
            if (!user || !user.user_id) {
                throw new HttpException(
                    'Không thể xác thực người dùng',
                    HttpStatus.UNAUTHORIZED
                );
            }

            if (!membershipId || isNaN(Number(membershipId))) {
                throw new HttpException(
                    'Membership ID không hợp lệ',
                    HttpStatus.BAD_REQUEST
                );
            }

            const billDetail = await this.paymentService.getMembershipBillDetail(
                Number(membershipId),
                user.user_id
            );
            return billDetail;

        } catch (error) {
            console.error('Get bill detail error:', error);
            throw new HttpException(
                error.message || 'Không thể lấy thông tin chi tiết hóa đơn',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // API lấy chi tiết một membership type
    @Get('admin/membership-types/:id')
    @UseGuards(JwtAuthGuard)
    async getMembershipTypeById(@Param('id') id: string) {
        try {
            const membershipType = await this.paymentService.getMembershipTypeById(
                Number(id)
            );
            return membershipType;
        } catch (error) {
            console.error('Get membership type error:', error);
            throw new HttpException(
                'Không thể lấy thông tin gói membership',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // API tạo membership type mới
    @Post('admin/membership-types')
    @UseGuards(JwtAuthGuard)
    async createMembershipType(@Body() createDto: CreateMembershipTypeDto) {
        try {
            const newMembershipType = await this.paymentService.createMembershipType(
                createDto
            );
            return newMembershipType;
        } catch (error) {
            console.error('Create membership type error:', error);
            throw new HttpException(
                'Không thể tạo gói membership mới',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // API cập nhật membership type
    @Put('admin/membership-types/:id')
    @UseGuards(JwtAuthGuard)
    async updateMembershipType(
        @Param('id') id: string,
        @Body() updateDto: UpdateMembershipTypeDto
    ) {
        try {
            const updatedMembershipType = await this.paymentService.updateMembershipType(
                Number(id),
                updateDto
            );
            return updatedMembershipType;
        } catch (error) {
            console.error('Update membership type error:', error);
            throw new HttpException(
                'Không thể cập nhật gói membership',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    // API xóa membership type
    @Delete('admin/membership-types/:id')
    @UseGuards(JwtAuthGuard)
    async deleteMembershipType(@Param('id') id: string) {
        try {
            await this.paymentService.deleteMembershipType(Number(id));
            return {
                message: 'Xóa gói membership thành công'
            };
        } catch (error) {
            console.error('Delete membership type error:', error);
            throw new HttpException(
                'Không thể xóa gói membership',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}