import { Controller, Get, Param, Query } from '@nestjs/common';
import { ExerciseService } from './exercise.service';

@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) {}

  // Danh sách body parts
  @Get('bodyparts')
  getBodyParts() {
    return this.exerciseService.getDistinctBodyParts();
  }

  // Danh sách equipment
  @Get('equipment')
  getEquipment() {
    return this.exerciseService.getDistinctEquipment();
  }

  // Danh sách target muscles
  @Get('targets')
  getTargets() {
    return this.exerciseService.getDistinctTargets();
  }

//   // Danh sách bài tập theo body part
//   @Get('bodyparts/:body_part')
//   getExercisesByBodyPart(@Param('body_part') bodyPart: string) {
//     return this.exerciseService.getExercisesByBodyPart(bodyPart);
//   }

//   // Danh sách bài tập theo equipment
//   @Get('equipment/:equipment')
//   getExercisesByEquipment(@Param('equipment') equipment: string) {
//     return this.exerciseService.getExercisesByEquipment(equipment);
//   }

//   // Danh sách bài tập theo target muscle
//   @Get('targets/:target')
//   getExercisesByTarget(@Param('target') target: string) {
//     return this.exerciseService.getExercisesByTarget(target);
//   }

//   // Kết hợp tìm kiếm theo nhiều tiêu chí
//   @Get('search')
//   searchExercises(
//     @Query('body_part') bodyPart?: string,
//     @Query('equipment') equipment?: string,
//     @Query('target') target?: string,
//   ) {
//     return this.exerciseService.searchExercises(bodyPart, equipment, target);
//   }
}
