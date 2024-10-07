/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [ClassController],
  providers: [ClassService],
  imports: [DatabaseModule], // Đảm bảo đã import DatabaseModule
})
export class ClassModule {}
