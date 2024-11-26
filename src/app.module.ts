/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';  // Thêm import này
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ClassModule } from './class/class.module';
import { ScheduleModule } from './schedule/schedule.module';
import { UserModule } from './user/user.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ExerciseModule } from './exercise/exercise.module';
import { UserClassModule } from './user_class/user_class.module';
import { PaymentModule } from './payment/payment.module';
import { PaymentClassModule } from './payment-class/payment-class.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,  // Làm cho ConfigService có sẵn toàn cục
    }),
    AuthModule,
    DatabaseModule,
    ClassModule,
    ScheduleModule,
    UserModule,
    CloudinaryModule,
    ExerciseModule,
    UserClassModule,
    PaymentModule,
    PaymentClassModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
