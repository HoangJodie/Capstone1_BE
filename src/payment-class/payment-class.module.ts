import { Module } from '@nestjs/common';
import { PaymentClassController } from './payment-class.controller';
import { PaymentClassService } from './payment-class.service';
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
  controllers: [PaymentClassController],
  providers: [PaymentClassService, DatabaseService],
  exports: [PaymentClassService]
})
export class PaymentClassModule {} 