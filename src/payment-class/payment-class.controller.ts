import { 
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Get,
  Param,
  Req,
  BadRequestException
} from '@nestjs/common';
import { PaymentClassService } from './payment-class.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';

@Controller('payment-class')
export class PaymentClassController {
  constructor(
    private readonly paymentClassService: PaymentClassService,
    private readonly authService: AuthService,
    private readonly prisma: DatabaseService
  ) {}

  @Post('create-class-payment')
  @UseGuards(JwtAuthGuard)
  async createClassPayment(
    @Body()
    paymentData: {
      user_id: number;
      class_id: number;
      amount_paid: number;
    },
    @Req() req: Request
  ) {
    try {
      // Xác thực token
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new HttpException(
          'Không tìm thấy access token',
          HttpStatus.UNAUTHORIZED
        );
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decodedToken = await this.authService.verifyToken(token);
        
        if (!decodedToken || decodedToken.user_id !== paymentData.user_id) {
          throw new HttpException(
            'Token không hợp lệ hoặc không khớp với user_id',
            HttpStatus.UNAUTHORIZED
          );
        }

        // Tạo giao dịch với trạng thái pending
        const transaction = await this.paymentClassService.createClassTransaction({
          ...paymentData,
          status_id: 2, // Pending
          payment_method: 'zalopay'
        });

        // Tạo đơn hàng ZaloPay
        const zaloPayOrder = await this.paymentClassService.createZaloPayOrder({
          amount: Number(transaction.amount_paid),
          orderId: transaction.order_id,
          transactionId: transaction.class_transaction_id,
          description: `Thanh toán lớp học #${transaction.class_id}`,
          userId: transaction.user_id
        });

        return {
          transaction,
          payment: zaloPayOrder
        };

      } catch (jwtError) {
        throw new HttpException(
          'Token không hợp lệ',
          HttpStatus.UNAUTHORIZED
        );
      }

    } catch (error) {
      console.error('Create class payment error:', error);
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
      const isValid = await this.paymentClassService.verifyCallback(callbackData);
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
      
      // Cập nhật trạng thái giao dịch
      if (callbackData.type === 1) { // Thanh toán thành công
        await this.paymentClassService.updateTransactionStatus(
          embedData.transaction_id,
          1 // Success
        );
      } else {
        await this.paymentClassService.updateTransactionStatus(
          embedData.transaction_id,
          3 // Failed
        );
      }

      return {
        return_code: callbackData.type,
        return_message: callbackData.type === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Callback error:', error);
      return {
        return_code: -3,
        return_message: 'internal server error'
      };
    }
  }

  @Get('check-status/:orderId')
  @UseGuards(JwtAuthGuard) 
  async checkPaymentStatus(@Param('orderId') orderId: string) {
    try {
      const status = await this.paymentClassService.checkOrderStatus(orderId);
      return status;
    } catch (error) {
      console.error('Check payment status error:', error);
      throw new HttpException(
        'Không thể kiểm tra trạng thái đơn hàng',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 