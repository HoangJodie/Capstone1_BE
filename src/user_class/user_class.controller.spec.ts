import { Test, TestingModule } from '@nestjs/testing';
import { UserClassController } from './user_class.controller';

describe('UserClassController', () => {
  let controller: UserClassController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserClassController],
    }).compile();

    controller = module.get<UserClassController>(UserClassController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
