/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserClassService {
  constructor(private readonly databaseService: DatabaseService) {}

 // Add a user to a class
 async addUserToClass(userId: number, classId: number, statusId?: number) {
  // Ensure the data is correctly assigned
  return this.databaseService.user_class.create({
    data: {
      user_id: userId,     
      class_id: classId,   
      status_id: statusId || 1, // Default to "Pending" if status_id is not provided
    },
  });
}

  // Fetch all user-class associations
  async findAll() {
    return this.databaseService.user_class.findMany();
  }

  // Find a specific user-class association by user and class IDs
  async findOne(userId: number, classId: number) {
    const entry = await this.databaseService.user_class.findUnique({
      where: {
        user_id_class_id: {
          user_id: userId,
          class_id: classId,
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('User-Class association not found');
    }

    return entry;
  }

  // Delete a user from a class
  async deleteUserFromClass(userId: number, classId: number) {
    const existingEntry = await this.databaseService.user_class.findUnique({
      where: {
        user_id_class_id: {
          user_id: userId,
          class_id: classId,
        },
      },
    });

    if (!existingEntry) {
      throw new NotFoundException('User-Class association not found');
    }

    return this.databaseService.user_class.delete({
      where: {
        user_id_class_id: {
          user_id: userId,
          class_id: classId,
        },
      },
    });
  }
}