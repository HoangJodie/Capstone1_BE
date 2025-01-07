/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [ClassController],
  providers: [ClassService], 
  imports: [DatabaseModule, CloudinaryModule, AuthModule], 
})
export class ClassModule {}
