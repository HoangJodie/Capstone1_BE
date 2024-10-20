import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ExerciseService {
  constructor(private prisma: DatabaseService) {}

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

//   // Lấy danh sách bài tập theo body part
//   async getExercisesByBodyPart(bodyPart: string) {
//     return this.prisma.exercisepost.findMany({
//       where: {
//         body_part: bodyPart,
//       },
//       include: {
//         instructions: true,       // Bao gồm hướng dẫn cho bài tập
//         secondarymuscles: true,   // Bao gồm cơ phụ
//       },
//     });
//   }

//   // Lấy danh sách bài tập theo equipment
//   async getExercisesByEquipment(equipment: string) {
//     return this.prisma.exercisepost.findMany({
//       where: {
//         equipment: equipment,
//       },
//       include: {
//         instructions: true,
//         secondarymuscles: true,
//       },
//     });
//   }

//   // Lấy danh sách bài tập theo target muscle
//   async getExercisesByTarget(target: string) {
//     return this.prisma.exercisepost.findMany({
//       where: {
//         target: target,
//       },
//       include: {
//         instructions: true,
//         secondarymuscles: true,
//       },
//     });
//   }

//   // Tìm kiếm bài tập dựa trên nhiều tiêu chí
//   async searchExercises(bodyPart?: string, equipment?: string, target?: string) {
//     return this.prisma.exercisepost.findMany({
//       where: {
//         body_part: bodyPart || undefined,
//         equipment: equipment || undefined,
//         target: target || undefined,
//       },
//       include: {
//         instructions: true,
//         secondarymuscles: true,
//       },
//     });
//   }
}
