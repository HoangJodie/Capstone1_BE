/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Post, Body, Patch, Delete, HttpException, HttpStatus, UseInterceptors, UploadedFile, InternalServerErrorException, UseGuards, Req, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ClassService } from './class.service';
import { Renamedclass } from '@prisma/client'; // Sử dụng mô hình Renamedclass
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { isValid, parseISO } from 'date-fns';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guards';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { Request } from 'express';


@Controller('classes')
export class ClassController {
  constructor(
    private readonly classService: ClassService,
    private readonly cloudinaryService: CloudinaryService // Inject CloudinaryService
  ) { }

  // Lấy tất cả các lớp và trả về kèm theo URL hình ảnh
  @Get()
  async getAllClass(): Promise<Renamedclass[]> {
    try {
      const classes = await this.classService.getAllClass();
      return classes; // Trả về danh sách các lớp kèm theo URL hình ảnh
    } catch (error) {
      console.error(error);
      throw new HttpException('Unable to fetch classes.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('paginated')
  async getClassesWithPagination(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    try {
      return await this.classService.getClassesWithPagination(page, limit);
    } catch (error) {
      throw new HttpException('Unable to fetch classes.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('owned')
@UseGuards(JwtAuthGuard) // Bảo vệ endpoint bằng guard
async getClassesOwnedByPT(@Req() req): Promise<Renamedclass[]> 
{
  const userId = req.user.user_id; // Giả sử thông tin người dùng đã được thêm vào req

  try {
    const classes = await this.classService.getClassesOwnedByPT(userId);
    console.log(`Classes returned for user ID ${userId}: ${JSON.stringify(classes)}`); // Log lớp học trả về
    return classes; // Trả về danh sách lớp học
  } catch (error) {
    console.error('Error in getClassesOwnedByPT controller:', error); // Log lỗi ở controller
    throw new HttpException('Unable to fetch classes owned by PT.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


  
  // Thêm endpoint mới sau các endpoint Get hiện có
  @Get('pt/:ptId')
  async getClassesByPT(@Param('ptId') ptId: string) {
    const id = parseInt(ptId, 10);
    if (isNaN(id)) {
      throw new HttpException('ID PT không hợp lệ.', HttpStatus.BAD_REQUEST);
    }
    try {
      const classes = await this.classService.getClassesByPT(id);
      return classes;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách lớp của PT:', error);
      throw new HttpException('Không thể lấy danh sách lớp của PT.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('info/:id')
  async getClassInfo(@Param('id') class_id: string) {
    const id = parseInt(class_id, 10);
    if (isNaN(id)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.classService.getClassInfo(id);
    } catch (error) {
      console.error(error);
      throw new HttpException('Class not found.', HttpStatus.NOT_FOUND);
    }
  }

  // Thêm endpoint mới sau các endpoint Get hiện có
  @Get('search')
  async searchClassesByName(@Query('name') name: string): Promise<any> {
    if (!name || name.trim() === '') {
      throw new HttpException('Tên tìm kiếm không được để trống', HttpStatus.BAD_REQUEST);
    }
    try {
      const classes = await this.classService.searchClassesByName(name.trim());
      return classes;
    } catch (error) {
      console.error('Lỗi khi tìm kiếm lớp:', error);
      throw new HttpException('Không thể tìm kiếm lớp.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  
  // Lấy lớp theo ID (gồm cả lịch học)
  @Get(':id')
  async getClass(@Param('id') class_id: string) {
    const id = parseInt(class_id, 10);
    if (isNaN(id)) {
      throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.classService.getClass(id);
    } catch (error) {
      console.error(error);
      throw new HttpException('Class not found.', HttpStatus.NOT_FOUND);
    }
  }

  //lấy lớp theo status_id
  @Get('status/:statusId')
  findByStatus(@Param('statusId') statusId: string) {
    return this.classService.findByStatus(+statusId);
  }

  

  @Post()
  @UseInterceptors(FileInterceptor('file')) // Sử dụng FileInterceptor để nhận file
  async addClass(
    @Body() classData: { 
      className: string; 
      classDescription: string; 
      classType: string; // Đổi thành string vì giá trị nhận được là string
      fee: string; // Đổi thành string vì giá trị nhận được là string
      startDate: string;
      endDate: string;
      pt_id: string;
      maxAttender: string;
      classSubject: string;
    },
    @UploadedFile() file: Express.Multer.File 
  ) {
    try {
      if (!file) {
        throw new HttpException('File not provided.', HttpStatus.BAD_REQUEST);
      }
  
      // Log dữ liệu đầu vào
      console.log('Received Class Data:', classData);
  
      // Upload hình ảnh lên Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(file);
      
      // Chuyển đổi chuỗi thành đối tượng Date
      const startDate = parseISO(classData.startDate);
      
      // Loại bỏ ký tự không mong muốn và chuyển đổi endDate
      const endDate = parseISO(classData.endDate.trim());
  
      // Log giá trị ngày tháng sau khi chuyển đổi
      console.log('Parsed Start Date:', startDate);
      console.log('Parsed End Date:', endDate);
  
      // Kiểm tra xem các giá trị Date có hợp lệ không
      if (!isValid(startDate) || !isValid(endDate)) {
        throw new HttpException('Invalid date provided.', HttpStatus.BAD_REQUEST);
      }
  
      // Lưu URL hình ảnh vào cơ sở dữ liệu
      const newClass = await this.classService.addClass(
        classData.className,
        classData.classDescription,
        parseInt(classData.classType), // Chuyển đổi thành số nếu cần
        parseInt(classData.fee),        // Chuyển đổi thành số nếu cần
        startDate,
        endDate,
        uploadResult.secure_url,
        parseInt(classData.pt_id),
        parseInt(classData.maxAttender),
        classData.classSubject,
      );
  
      return newClass; 
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Unable to add class.');
    }
  }


  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
@Roles('3') // Yêu cầu role là 3 (Personal Trainer)
@UseInterceptors(FileInterceptor('file')) // Sử dụng FileInterceptor để nhận file
async createClass(
  @Body() classData: {
    className: string;
    classDescription: string;
    classType: string; // Đổi thành string
    fee: string; // Đổi thành string
    startDate: string;
    endDate: string;
    maxAttender: string;
    classSubject: string;
  },
  @UploadedFile() file: Express.Multer.File,
  @Req() req: Request,
) {
  const user = req.user as { user_id: number };

  try {
    console.log('Received Class Data:', classData); // Log dữ liệu lớp học nhận được
    console.log('User ID:', user.user_id); // Log user ID

    if (!file) {
      console.error('File not provided.'); // Log nếu không có file
      throw new HttpException('File not provided.', HttpStatus.BAD_REQUEST);
    }

    // Upload hình ảnh lên Cloudinary
    const uploadResult = await this.cloudinaryService.uploadImage(file);
    console.log('Image uploaded to Cloudinary:', uploadResult); // Log kết quả upload hình ảnh

    const startDate = parseISO(classData.startDate);
    const endDate = parseISO(classData.endDate.trim());

    if (!isValid(startDate) || !isValid(endDate)) {
      console.error('Invalid date provided:', classData.startDate, classData.endDate); // Log nếu ngày không hợp lệ
      throw new HttpException('Invalid date provided.', HttpStatus.BAD_REQUEST);
    }

    const newClass = await this.classService.addClassWithOwnership(
      classData.className,
      classData.classDescription,
      parseInt(classData.classType),
      parseInt(classData.fee),
      startDate,
      endDate,
      uploadResult.secure_url,
      user.user_id,
      parseInt(classData.maxAttender),
      classData.classSubject
    );

    console.log('Class added successfully:', newClass); // Log thông tin lớp học đã thêm
    return newClass;
  } catch (error) {
    console.error('Error in createClass:', error); // Log lỗi trong quá trình tạo lớp học
    throw new InternalServerErrorException('Unable to add class.');
  }
}




@Patch(':id')
@UseInterceptors(FileInterceptor('file'))
async editClass(
  @Param('id') classId: string,
  @Body() classData: {
    className: string;
    classDescription: string;
    statusId: string;
    fee: string;
    classType: string;
    startDate: string;
    endDate: string;
    oldImageId?: string;
    pt_id: string;
    maxAttender: string;
    class_subject: string
  },
  @UploadedFile() file: Express.Multer.File
) {
  const id = parseInt(classId, 10);
  if (isNaN(id)) {
    throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
  }

  try {
    console.log('Received Class Data:', classData);
    
    const startDate = parseISO(classData.startDate.trim());
    const endDate = parseISO(classData.endDate.trim().replace(/\n/g, '')); 

    if (!isValid(startDate) || !isValid(endDate)) {
      throw new HttpException('Invalid date provided.', HttpStatus.BAD_REQUEST);
    }

    let imageUrl: string | undefined;
    let oldImageId: string | undefined;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file);
      imageUrl = uploadResult.secure_url;
      oldImageId = classData.oldImageId;
    }

    // Thêm maxAttender vào object cập nhật
    const updatedClass = await this.classService.editClass({
      class_id: id,
      class_name: classData.className,
      class_description: classData.classDescription,
      status_id: parseInt(classData.statusId),
      class_type: parseInt(classData.classType),
      fee: parseInt(classData.fee),
      start_date: startDate,
      end_date: endDate,
      image_url: imageUrl,
      oldImageId,
      pt_id: parseInt(classData.pt_id),
      maxAttender: parseInt(classData.maxAttender),
      class_subject: classData.class_subject
    });

    return updatedClass;
  } catch (error) {
    console.error(error);
    throw new HttpException('Unable to update class.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}



  // sửa status id của lớp
  @Patch(':id/status')
  async updateClassStatus(
    @Param('id') classId: string,
    @Body('statusId') statusId: number,
  ) {
    const updatedClass = await this.classService.updateStatus(+classId, statusId);
    if (!updatedClass) {
      throw new NotFoundException('Class not found');
    }
    return updatedClass;
  }

  // Xóa một lớp
  // @Delete(':id')
  // async deleteClass(@Param('id') id: string): Promise<Renamedclass> {
  //   const classId = parseInt(id, 10);
  //   if (isNaN(classId)) {
  //     throw new HttpException('Invalid class_id provided.', HttpStatus.BAD_REQUEST);
  //   }
  //   try {
  //     return await this.classService.deleteClass(classId);
  //   } catch (error) {
  //     console.error(error);
  //     throw new HttpException('Unable to delete class.', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

}
