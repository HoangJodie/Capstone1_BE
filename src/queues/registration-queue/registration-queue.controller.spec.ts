import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationQueueController } from './registration-queue.controller';
import { RegistrationQueueService } from './registration-queue.service';
import { DatabaseService } from 'src/database/database.service';

describe('RegistrationQueueController', () => {
  let controller: RegistrationQueueController;
  let queueService: RegistrationQueueService;
  let databaseService: DatabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationQueueController],
      providers: [
        RegistrationQueueService,
        {
          provide: DatabaseService,
          useValue: {
            userClass: {
              count: jest.fn(),
              create: jest.fn(),
            },
            class: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<RegistrationQueueController>(RegistrationQueueController);
    queueService = module.get<RegistrationQueueService>(RegistrationQueueService);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Thêm các test case khác ở đây
});
