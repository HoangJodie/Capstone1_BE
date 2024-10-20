/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  controllers: [ClassController],
  providers: [ClassService], // Cung cấp GoogleDriveService ở đây
  imports: [DatabaseModule, CloudinaryModule], // Đảm bảo đã import DatabaseModule
})
export class ClassModule {}
