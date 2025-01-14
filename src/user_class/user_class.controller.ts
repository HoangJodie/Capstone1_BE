  /* eslint-disable prettier/prettier */
  import { Controller, Post, Delete, Patch, Get, Param, Body, Query, NotFoundException, Req, UseGuards } from '@nestjs/common';
  import { UserClassService } from './user_class.service';
  import { HttpException, HttpStatus } from '@nestjs/common';
  import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
  import { Request } from 'express';
 

  @Controller('user-class')
  export class UserClassController {
    constructor(private readonly userClassService: UserClassService) { }

    // Endpoint to add a user to a class
    @Post()
    async addUserToClass(
      @Body() { userId, classId, statusId }: { userId: number; classId: number; statusId?: number },
    ) {
      return this.userClassService.addUserToClass(userId, classId, statusId);
    }

    //Get user list by classid
    @Get('users/:classId')
async getUsersByClassId(@Param('classId') classId: string): Promise<any> {
  try {
    const parsedClassId = parseInt(classId, 10);
    
    if (isNaN(parsedClassId)) {
      throw new HttpException('Invalid class ID format.', HttpStatus.BAD_REQUEST);
    }

    const result = await this.userClassService.getUsersByClassId(parsedClassId);
    return result;
  } catch (error) {
    console.error(`Error fetching users for class ID ${classId}:`, error);
    throw new HttpException('Unable to fetch users for this class.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

    //get number of user in a class
    @Get('count/:classId')
    async getUserCount(@Param('classId') classId: string): Promise<{ classId: string; userCount: number }> {
      const userCount = await this.userClassService.getUserCountByClassId(parseInt(classId, 10));
      return { classId, userCount };
    }

    // Endpoint to get all users across all classes
    @Get('users')
    async getAllUsers(): Promise<any[]> {
      try {
        const result = await this.userClassService.getUsersByClassId(null);
        return result.users;  // Chỉ trả về mảng users
      } catch (error) {
        console.error('Error fetching all users:', error);
        throw new HttpException('Unable to fetch users.', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    // Endpoint to retrieve all user-class associations
    @Get()
    async findAll() {
      return this.userClassService.findAll();
    }
    

    // Endpoint to find a specific user-class association
    @Get(':userId/:classId')
    async findOne(
      @Param('userId') userId: string,
      @Param('classId') classId: string,
    ) {
      const userIdInt = parseInt(userId, 10);
      const classIdInt = parseInt(classId, 10);

      const entry = await this.userClassService.findOne(userIdInt, classIdInt);
      if (!entry) {
        throw new NotFoundException('User-Class association not found');
      }
      return entry;
    }

    // New endpoint to check if the user has already joined the class
    @Get('status')
    async checkJoinStatus(
      @Query('userId') userId: string,
      @Query('classId') classId: string,
    ) {
      const userIdInt = parseInt(userId, 10);
      const classIdInt = parseInt(classId, 10);

      const entry = await this.userClassService.findOne(userIdInt, classIdInt);
      return { isJoined: !!entry }; // Return true if association exists, otherwise false
    }

    // New endpoint to get users who have joined a specific class by status
    @Get('status/:statusId')
    async findByStatus(@Param('statusId') statusId: number) {
      return this.userClassService.findByStatus(statusId);
    }

    // Endpoint to update user_class status_id
    @Patch(':userId/:classId')
    async updateStatus(
      @Param('userId') userId: string,
      @Param('classId') classId: string,
      @Body('statusId') statusId: number,
    ) {
      const updatedRecord = await this.userClassService.updateStatus(+parseInt(userId, 10), +parseInt(classId, 10), statusId);
      if (!updatedRecord) {
        throw new NotFoundException('User-Class association not found');
      }
      return updatedRecord;
    }

    // Endpoint to delete a user from a class
    @Delete()
    async deleteUserFromClass(
      @Query('userId') userId: string,
      @Query('classId') classId: string,
    ) {
      return this.userClassService.deleteUserFromClass(+parseInt(userId, 10), +parseInt(classId, 10));
    }
    
    // Thêm endpoint mới vào controller
    @Get('UserOwned')
    @UseGuards(JwtAuthGuard) 
    async getClassesByUserId(@Req() req: Request): Promise<any> {
      try {
        const userId = req.user['user_id'];
        return await this.userClassService.getClassesByUserId(userId);
      } catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }