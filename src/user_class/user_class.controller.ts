/* eslint-disable prettier/prettier */
import { Controller, Post, Delete, Patch, Get, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { UserClassService } from './user_class.service';
import { HttpException, HttpStatus } from '@nestjs/common';

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
  async getUsersByClassId(@Param('classId') classId: string): Promise<any[]> {
    try {
      // Parse classId to an integer
      const parsedClassId = parseInt(classId, 10);
      
      if (isNaN(parsedClassId)) {
        throw new HttpException('Invalid class ID format.', HttpStatus.BAD_REQUEST);
      }

      const users = await this.userClassService.getUsersByClassId(parsedClassId);
      return users;
    } catch (error) {
      console.error(`Error fetching users for class ID ${classId}:`, error);
      throw new HttpException('Unable to fetch users for this class.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Endpoint to get all users across all classes
  @Get('users')
  async getAllUsers(): Promise<any[]> {
    try {
      // Call a service method that fetches all users without a specific class filter
      const users = await this.userClassService.getUsersByClassId(null); // Passing null or undefined as classId
      return users;
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
    const updatedRecord = await this.userClassService.updateStatus(+userId, +classId, statusId);
    if (!updatedRecord) {
      throw new NotFoundException('User-Class association not found');
    }
    return updatedRecord;
  }

  // Endpoint to delete a user from a class
  @Delete()
  async deleteUserFromClass(
    @Query('userId') userId: number,
    @Query('classId') classId: number,
  ) {
    return this.userClassService.deleteUserFromClass(userId, classId);
  }
}