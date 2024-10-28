/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ClassModule } from './class/class.module';
import { ScheduleModule } from './schedule/schedule.module';
<<<<<<< Updated upstream

@Module({
  imports: [AuthModule, DatabaseModule, ClassModule, ScheduleModule],
=======
import { UserModule } from './user/user.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ExerciseModule } from './exercise/exercise.module';
import { UserClassModule } from './user_class/user_class.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,  // Làm cho ConfigService có sẵn toàn cục
    }),
    AuthModule,
    DatabaseModule,
    ClassModule,
    ScheduleModule,
    UserModule,
    CloudinaryModule,
    ExerciseModule,
    UserClassModule,
  ],
>>>>>>> Stashed changes
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
