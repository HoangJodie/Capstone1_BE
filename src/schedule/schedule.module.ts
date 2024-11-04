import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService],
  imports: [DatabaseModule, AuthModule], // Đảm bảo đã import DatabaseModule
})
export class ScheduleModule {}
