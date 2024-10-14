import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ClassModule } from './class/class.module';
import { ScheduleModule } from './schedule/schedule.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [AuthModule, DatabaseModule, ClassModule, ScheduleModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
