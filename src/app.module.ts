import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ClassModule } from './class/class.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [AuthModule, DatabaseModule, ClassModule, ScheduleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
