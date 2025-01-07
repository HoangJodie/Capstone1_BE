import { Module } from '@nestjs/common';
import { ExerciseController } from './exercise.controller';
import { ExerciseService } from './exercise.service';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  controllers: [ExerciseController],  
  providers: [ExerciseService, DatabaseService, CloudinaryService],  
})

export class ExerciseModule {}
