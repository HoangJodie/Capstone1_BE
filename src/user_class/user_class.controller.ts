/* eslint-disable prettier/prettier */
import { Controller, Post, Delete, Get, Param, Body, Query, NotFoundException } from '@nestjs/common';
import { UserClassService } from './user_class.service';

@Controller('user-class')
export class UserClassController {
  constructor(private readonly userClassService: UserClassService) {}

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
  async findOne(@Param('userId') userId: number, @Param('classId') classId: number) {
    const entry = await this.userClassService.findOne(userId, classId);
    if (!entry) {
      throw new NotFoundException('User-Class association not found');
    }
    return entry;
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