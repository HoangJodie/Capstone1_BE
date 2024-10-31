/* eslint-disable prettier/prettier */
import { Controller, Post, Delete, Get, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { UserClassService } from './user_class.service';

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
    // Convert to integers
    const userIdInt = parseInt(userId, 10);
    const classIdInt = parseInt(classId, 10);

    // Pass integers to the service
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



  // New endpoint to get users who have joined a specific class
  @Get('users/:classId')
  async getUsersInClass(@Param('classId') classId: number) {
    return this.userClassService.getUsersByClassId(classId);
  }

  // Endpoint to delete a user from a class
  @Delete(':id')
  async deleteUserFromClass(
    @Query('userId') userId: number,
    @Query('classId') classId: number,
  ) {
    return this.userClassService.deleteUserFromClass(userId, classId);
  }
}
