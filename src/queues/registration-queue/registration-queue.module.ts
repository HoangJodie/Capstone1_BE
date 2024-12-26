import { Module } from '@nestjs/common';
import { RegistrationQueueService } from './registration-queue.service';
import { RegistrationQueueController } from './registration-queue.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [RegistrationQueueService],
  controllers: [RegistrationQueueController]
})
export class RegistrationQueueModule {}
