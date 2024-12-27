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

  //get number of user in a class
  async getUserCountByClassId(classId: number): Promise<number> {
    const count = await this.databaseService.user_class.count({
      where: {
        class_id: classId,
      },
    });
    return count;
  }

    // get users by class_id
  // Thay đổi phương thức getUsersByClassId
async getUsersByClassId(classId: number | null): Promise<{ pt: any | null, users: any[] }> {
  try {
    // Đầu tiên lấy thông tin về lớp và PT
    const classInfo = classId !== null ? await this.databaseService.renamedclass.findUnique({
      where: { class_id: classId },
      select: {
        pt_id: true,
        // Xóa phần pt: { ... } và thay thế bằng cách query riêng user của PT
      }
    }) : null;

    // Nếu có pt_id, lấy thông tin user của PT
    const ptInfo = classInfo?.pt_id ? await this.databaseService.user.findUnique({
      where: { user_id: classInfo.pt_id },
      select: {
        user_id: true,
        username: true,
        email: true,
        phoneNum: true,
        role_id: true,
        name: true,
      }
    }) : null;

    // Lấy danh sách user-class associations
    const userClasses = await this.databaseService.user_class.findMany({
      where: classId !== null ? { class_id: classId } : {},
      select: {
        user_id: true,
        class_id: true,
        status_id: true,
      },
    });

    if (userClasses.length === 0) {
      console.log(`No users found for class ID: ${classId}`);
      return { pt: null, users: [] };
    }

    // Lấy thông tin chi tiết của users
    const users = await Promise.all(
      userClasses.map(async (userClass) => {
        const user = await this.databaseService.user.findUnique({
          where: { user_id: userClass.user_id },
          select: {
            user_id: true,
            username: true,
            email: true,
            phoneNum: true,
            role_id: true,
            name: true,
          },
        });
        return {
          ...user,
          class_id: userClass.class_id,
          status_id: userClass.status_id,
        };
      })
    );

    // Trả về kết quả bao gồm cả thông tin PT
    return {
      pt: ptInfo || null,
      users: users,
    };
  } catch (error) {
    console.error('Error fetching users by class ID:', error);
    throw new Error('Unable to retrieve users by class ID');
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

  async getClassesByUserId(userId: number) {
    try {
      const userClasses = await this.databaseService.user_class.findMany({
        where: {
          user_id: userId
        },
        select: {
          class_id: true
        }
      });

      // Chuyển đổi kết quả thành mảng class_id
      const classIds = userClasses.map(uc => uc.class_id);
      
      return {
        userId,
        classIds
      };
    } catch (error) {
      console.error('Lỗi trong getClassesByUserId:', error);
      throw new Error(`Không thể lấy danh sách lớp học: ${error.message}`);
    }
  }

}