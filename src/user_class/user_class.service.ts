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

  // Retrieve user-class associations by status_id
  async findByStatus(statusId: number) {
    return this.databaseService.user_class.findMany({ where: { status_id: statusId } });
  }

  // Method to check if a user is already joined in a class (new)
  async getStatus(userId: number, classId: number): Promise<{ isJoined: boolean }> {
    const entry = await this.findOne(userId, classId);
    return { isJoined: !!entry }; // Return true if association exists, otherwise false
  }

  // Fetch users who are in a specific class
async getUsersByClassId(classId: number) {
  // Fetching user-class associations for the given classId
  const userClasses = await this.databaseService.user_class.findMany({
    where: { class_id: classId }, // Use the database service to find associations
  });

  // If there are no associations, return an empty array
  if (!userClasses.length) return [];

  // Extract user IDs from the associations
  const userIds = userClasses.map(userClass => userClass.user_id);

  // Fetch users based on user IDs
  const users = await this.databaseService.user.findMany({
    where: { user_id: { in: userIds } }, // Change 'id' to 'user_id' or the correct field name
  });

  // Map users to include only necessary data
  return users.map(user => ({
    userId: user.user_id, // Change 'id' to 'user_id' or the correct field name
    username: user.username,
    role_id: user.role_id,
  }));
}

// Update the status_id of a specific user-class association
async updateStatus(userId: number, classId: number, statusId: number) {
  const updatedRecord = await this.databaseService.user_class.update({
    where: {
      user_id_class_id: {
        user_id: userId,
        class_id: classId,
      },
    },
    data: {
      status_id: statusId,
    },
  });
  return updatedRecord;
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