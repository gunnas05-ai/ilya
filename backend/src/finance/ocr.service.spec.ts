import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from './ocr.service';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OcrDocument } from './ocr-document.entity';

describe('OcrService', () => {
  let service: OcrService;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockOcrRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: getRepositoryToken(OcrDocument), useValue: mockOcrRepo },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
