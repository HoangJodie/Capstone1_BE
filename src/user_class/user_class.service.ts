/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class UserClassService {
  constructor(private readonly databaseService: DatabaseService) { }

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
    // Chuyển đổi userId và classId thành số nguyên nếu cần
    const userIdInt = parseInt(userId.toString(), 10);
    const classIdInt = parseInt(classId.toString(), 10);

    return this.databaseService.user_class.findUnique({
      where: {
        user_id_class_id: {
          user_id: userIdInt,
          class_id: classIdInt,
        },
      },
    });
  }

  // get users by classid
  async getUsersByClassId(classId: number | null): Promise<any[]> {
    try {
      // Step 1: Get user IDs from `user_class` table based on `classId`
      const userClasses = await this.databaseService.user_class.findMany({
        where: classId !== null ? { class_id: classId } : {}, // Apply class_id filter only if provided
        select: {
          user_id: true,
          class_id: true,
          status_id: true,
        },
      });
  
      // If no users are associated with the class (or any class if `classId` is null), return an empty array
      if (userClasses.length === 0) {
        console.log(`No users found for class ID: ${classId}`);
        return [];
      }
  
      // Step 2: Extract user IDs from the `userClasses` result
      const userIds = userClasses.map(userClass => userClass.user_id);
  
      // Step 3: Fetch user details based on the retrieved user IDs and include `class_id` and `status_id`
      const users = await this.databaseService.user.findMany({
        where: {
          user_id: { in: userIds },
        },
        select: {
          user_id: true,
          username: true,
          email: true,
          phoneNum: true,
          role_id: true,
        },
      });
      
  
      // Map the user details with the class information
      const result = users.map(user => {
        const userClassInfo = userClasses.find(uc => uc.user_id === user.user_id);
        return {
          ...user,
          class_id: userClassInfo ? userClassInfo.class_id : null,
          status_id: userClassInfo ? userClassInfo.status_id : null,
        };
      });
  
      return result;
    } catch (error) {
      console.error(`Error in getUsersByClassId service for class ID ${classId}:`, error);
      throw new Error('Failed to fetch users for the class.');
    }
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