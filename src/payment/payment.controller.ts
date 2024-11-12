import { Controller, Post, Body, Req, Get, Query, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-payment')
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Req() req,
    @Body() body: { membershipType: number; amount: number }
  ) {
    const userId = req.user.user_id;
    const ipAddr = req.ip || '127.0.0.1';
    
    return this.paymentService.createPaymentUrl(
      userId,
      body.membershipType,
      body.amount,
      ipAddr
    );
  }

  @Get('vnpay-return')
  async vnpayReturn(@Query() query: any) {
    return this.paymentService.processPaymentReturn(query);
  }
} 