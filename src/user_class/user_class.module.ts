/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UserClassService } from './user_class.service';
import { UserClassController } from './user_class.controller';

@Module({
  imports: [],
  controllers: [UserClassController],
  providers: [DatabaseService, UserClassService],
})
export class UserClassModule {}
 