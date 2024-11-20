import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { DatabaseService } from '../database/database.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService, DatabaseService],
  exports: [PaymentService]
})
export class PaymentModule {} 