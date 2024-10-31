import { Controller, Get, Param, Query, Body, Post,Delete, UseInterceptors, UploadedFile, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExerciseService } from './exercise.service';
import { CreateExerciseDto } from './dto/exercise.dto';

@Controller('exercises')
export class ExerciseController {
  constructor(private readonly exerciseService: ExerciseService) { }

  // Tạo endpoint GET để lấy tất cả các exercises
  @Get()
  async getAllExercises() {
    return this.exerciseService.getAllExercises();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file')) // Interceptor để upload file
  async create(
    @Body() createExerciseDto: CreateExerciseDto,
    @UploadedFile() file?: Express.Multer.File, // Nhận file từ request
  ) {
    return this.exerciseService.createExercise(createExerciseDto, file);
  }

  @Get(':postId')
  async getExerciseById(@Param('postId') postId: string): Promise<CreateExerciseDto> {
    const exercise = await this.exerciseService.getExerciseByPostId(Number(postId)); // Chuyển đổi postId thành number
    return exercise; // Trả về bài tập
  }

  @Delete(':postId')
async deleteExerciseById(@Param('postId') postId: string): Promise<{ message: string }> {
    return await this.exerciseService.deleteExerciseByPostId(Number(postId));
}


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

  // // Danh sách bài tập theo body part
  // @Get('bodyparts/:body_part')
  // getExercisesByBodyPart(@Param('body_part') bodyPart: string) {
  //   return this.exerciseService.getExercisesByBodyPart(bodyPart);
  // }

  // // Danh sách bài tập theo equipment
  // @Get('equipment/:equipment')
  // getExercisesByEquipment(@Param('equipment') equipment: string) {
  //   return this.exerciseService.getExercisesByEquipment(equipment);
  // }

  // // Danh sách bài tập theo target muscle
  // @Get('targets/:target')
  // getExercisesByTarget(@Param('target') target: string) {
  //   return this.exerciseService.getExercisesByTarget(target);
  // }

  // // Kết hợp tìm kiếm theo nhiều tiêu chí
  // @Get('search')
  // searchExercises(
  //   @Query('body_part') bodyPart?: string,
  //   @Query('equipment') equipment?: string,
  //   @Query('target') target?: string,
  // ) {
  //   return this.exerciseService.searchExercises(bodyPart, equipment, target);
  // }
}
