import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateExerciseDto } from './dto/exercise.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ExerciseService {
  constructor(
    private prisma: DatabaseService,
    private cloudinaryService: CloudinaryService, // Inject CloudinaryService
  ) {}

  async getAllExercises() {
    // Lấy tất cả các bài tập
    const exercises = await this.prisma.exercisepost.findMany({
      select: {
        exercise_id: true,
        name: true,
        body_part: true,
        equipment: true,
        gif_url: true,
        target: true,
        post_id: true, // Lưu post_id để tìm các instruction và secondary muscles liên quan
      },
    });
  
    // Đối với từng bài tập, lấy các hướng dẫn và cơ phụ
    const exercisesWithDetails = await Promise.all(
      exercises.map(async (exercise) => {
        const instructions = await this.prisma.instructions.findMany({
          where: { post_id: exercise.post_id },
          select: {
            step_number: true,
            instruction: true,
          },
          orderBy: {
            step_number: 'asc', // Đảm bảo các hướng dẫn được sắp xếp theo step_number
          },
        });
  
        const secondaryMuscles = await this.prisma.secondarymuscles.findMany({
          where: { post_id: exercise.post_id },
          select: {
            muscle_name: true,
          },
        });
  
        return {
          id: exercise.post_id,
          name: exercise.name,
          bodyPart: exercise.body_part,
          equipment: exercise.equipment,
          gifUrl: exercise.gif_url,
          target: exercise.target,
          secondaryMuscles: secondaryMuscles.map((muscle) => muscle.muscle_name),
          instructions: instructions.map((instruction) => ({
            [instruction.step_number]: instruction.instruction,
          })),
        };
      })
    );
  
    return exercisesWithDetails;
  }
  
  
  async getExerciseByPostId(postId: number): Promise<CreateExerciseDto> {
    // Lấy bài tập dựa trên post_id
    const exercise = await this.prisma.exercisepost.findUnique({
      where: { post_id: postId },
      select: {
        exercise_id: true,
        name: true,
        body_part: true,
        equipment: true,
        gif_url: true,
        target: true,
        post_id: true, // Lưu post_id để tìm các instruction và secondary muscles liên quan
      },
    });
  
    if (!exercise) {
      throw new NotFoundException(`Exercise with post ID ${postId} not found`);
    }
  
    // Lấy danh sách các hướng dẫn (instructions) theo post_id
    const instructions = await this.prisma.instructions.findMany({
      where: { post_id: exercise.post_id },
      select: {
        step_number: true,
        instruction: true,
      },
      orderBy: {
        step_number: 'asc', // Đảm bảo các hướng dẫn được sắp xếp theo step_number
      },
    });
  
    // Lấy danh sách các cơ phụ (secondary muscles) theo post_id
    const secondaryMuscles = await this.prisma.secondarymuscles.findMany({
      where: { post_id: exercise.post_id },
      select: {
        muscle_name: true,
      },
    });
  
    // Trả về thông tin bài tập với hướng dẫn và cơ phụ
    return {
      post_id: exercise.post_id,
      exercise_id: exercise.exercise_id,
      name: exercise.name,
      body_part: exercise.body_part,
      equipment: exercise.equipment,
      gif_url: exercise.gif_url,
      target: exercise.target,
      secondaryMuscles: secondaryMuscles.map((muscle) => muscle.muscle_name),
      instructions: instructions.map((instruction) => ({
        [instruction.step_number]: instruction.instruction, // Định dạng instructions theo { step_number: instruction }
      })),
    };
  }
  
  

  async createExercise(data: CreateExerciseDto, file?: Express.Multer.File) {
    let gifUrl = data.gif_url;

    // Nếu có file ảnh gif trong request, upload lên Cloudinary
    if (file) {
        try {
            const uploadResult = await this.cloudinaryService.uploadImage(file);
            gifUrl = uploadResult.secure_url;
        } catch (error) {
            throw new InternalServerErrorException('Failed to upload gif image');
        }
    }

    // Bắt đầu lưu exercise chính
    const newExercise = await this.prisma.exercisepost.create({
        data: {
            exercise_id: data.exercise_id,
            name: data.name,
            body_part: data.body_part,
            equipment: data.equipment,
            target: data.target,
            gif_url: gifUrl,
        },
    });

    // Lưu instructions
    if (data.instructions && Array.isArray(data.instructions)) {
        await Promise.all(
            data.instructions.map(async (instruction, index) => {
                if (typeof instruction !== 'string' || instruction.trim() === '') {
                    throw new BadRequestException('Invalid instruction format');
                }

                await this.prisma.instructions.create({
                    data: {
                        post_id: newExercise.post_id,
                        step_number: index + 1, // Sử dụng index để tạo số thứ tự bắt đầu từ 1
                        instruction: instruction.trim(), // Lưu instruction đầy đủ
                    },
                });
            }),
        );
    }

    // Lưu secondary muscles
    if (data.secondaryMuscles && Array.isArray(data.secondaryMuscles)) {
        await Promise.all(
            data.secondaryMuscles.map((muscle) =>
                this.prisma.secondarymuscles.create({
                    data: {
                        post_id: newExercise.post_id,
                        muscle_name: muscle,
                    },
                }),
            ),
        );
    }

    return newExercise;
}



  
  
  async deleteExerciseByPostId(postId: number): Promise<{ message: string }> {
    // Kiểm tra xem bài tập có tồn tại không
    const exercise = await this.prisma.exercisepost.findUnique({
      where: { post_id: postId },
    });
  
    if (!exercise) {
      throw new NotFoundException(`Exercise with post ID ${postId} not found`);
    }

    // Xóa các instructions và secondary muscles liên quan
    await this.prisma.$transaction([
      this.prisma.instructions.deleteMany({
        where: { post_id: postId },
      }),
      this.prisma.secondarymuscles.deleteMany({
        where: { post_id: postId },
      }),
      this.prisma.exercisepost.delete({
        where: { post_id: postId },
      }),
    ]);

    return { message: `Exercise with post ID ${postId} has been deleted successfully` };
}




  // Lấy danh sách body parts
  async getDistinctBodyParts() {
    return this.prisma.exercisepost.findMany({
      distinct: ['body_part'],
      select: {
        body_part: true,
      },
    });
  }

  // Lấy danh sách equipment
  async getDistinctEquipment() {
    return this.prisma.exercisepost.findMany({
      distinct: ['equipment'],
      where: {
        equipment: { not: null }, // Loại bỏ các giá trị null
      },
      select: {
        equipment: true,
      },
    });
  }

  // Lấy danh sách target muscles
  async getDistinctTargets() {
    return this.prisma.exercisepost.findMany({
      distinct: ['target'],
      select: {
        target: true,
      },
    });
  }

  // // Lấy danh sách bài tập theo body part
  // async getExercisesByBodyPart(bodyPart: string) {
  //   return this.prisma.exercisepost.findMany({
  //     where: {
  //       body_part: bodyPart,
  //     },
  //     include: {
  //       instructions: true,       // Bao gồm hướng dẫn cho bài tập
  //       secondarymuscles: true,   // Bao gồm cơ phụ
  //     },
  //   });
  // }

  // // Lấy danh sách bài tập theo equipment
  // async getExercisesByEquipment(equipment: string) {
  //   return this.prisma.exercisepost.findMany({
  //     where: {
  //       equipment: equipment,
  //     },
  //     include: {
  //       instructions: true,
  //       secondarymuscles: true,
  //     },
  //   });
  // }

  // // Lấy danh sách bài tập theo target muscle
  // async getExercisesByTarget(target: string) {
  //   return this.prisma.exercisepost.findMany({
  //     where: {
  //       target: target,
  //     },
  //     include: {
  //       instructions: true,
  //       secondarymuscles: true,
  //     },
  //   });
  // }

  // // Tìm kiếm bài tập dựa trên nhiều tiêu chí
  // async searchExercises(bodyPart?: string, equipment?: string, target?: string) {
  //   return this.prisma.exercisepost.findMany({
  //     where: {
  //       body_part: bodyPart || undefined,
  //       equipment: equipment || undefined,
  //       target: target || undefined,
  //     },
  //     include: {
  //       instructions: true,
  //       secondarymuscles: true,
  //     },
  //   });
  // }

  async getPaginatedExercises(page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    const [exercises, total] = await Promise.all([
      this.prisma.exercisepost.findMany({
        skip,
        take: limit,
        orderBy: {
          post_id: 'asc',
        },
      }),
      this.prisma.exercisepost.count(),
    ]);

    return {
      data: exercises,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
