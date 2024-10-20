import { Module } from '@nestjs/common';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';
import { DatabaseService } from 'src/database/database.service';

@Module({
  controllers: [ExerciseController],  // Khai báo controller
  providers: [ExerciseService, DatabaseService],  // Khai báo các service cần thiết
})

export class ExerciseModule {}
