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

  @Post('create-momo-payment')
  @UseGuards(JwtAuthGuard)
  async createMomoPayment(
    @Req() req,
    @Body() body: { membershipType: number; amount: number }
  ) {
    const userId = req.user.user_id;
    return this.paymentService.createMomoPayment(
      userId,
      body.membershipType,
      body.amount
    );
  }

  @Post('momo-notify')
  async momoNotify(@Body() body: any) {
    return this.paymentService.processMomoCallback(body);
  }

  @Get('momo-return')
  async momoReturn(@Query() query: any) {
    return this.paymentService.processMomoCallback(query);
  }

  @Post('check-momo-transaction')
  async checkMomoTransaction(@Body('orderId') orderId: string) {
    return this.paymentService.checkMomoTransaction(orderId);
  }
} 