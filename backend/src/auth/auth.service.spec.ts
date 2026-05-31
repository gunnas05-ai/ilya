import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let jwtService: any;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@kaptan.com',
    phone: '5550000000',
    passwordHash: '',
    fullName: 'Test User',
    role: UserRole.TASIYICI,
    isActive: true,
  } as User;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue(mockUser),
      save: jest.fn().mockResolvedValue(mockUser),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    mockUser.passwordHash = await bcrypt.hash('123456', 10);
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.login('test@kaptan.com', '123456');
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw on user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.login('bad@test.com', 'x')).rejects.toThrow();
    });

    it('should throw on wrong password', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      await expect(service.login('test@kaptan.com', 'wrongpassword')).rejects.toThrow();
    });

    it('should throw when password is empty', async () => {
      await expect(service.login('test@kaptan.com', '')).rejects.toThrow();
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const dto = {
        email: 'new@kaptan.com', phone: '5551112233', password: 'test123',
        fullName: 'New User', uiRole: 'TASIYICI' as any,
        kvkkAccepted: true, termsAccepted: true,
      };
      const result = await service.register(dto);
      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
    });

    it('should throw on duplicate email', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      const dto = {
        email: 'test@kaptan.com', phone: '5550000000', password: 'test123',
        fullName: 'Dup User', uiRole: 'TASIYICI' as any,
        kvkkAccepted: true, termsAccepted: true,
      };
      await expect(service.register(dto)).rejects.toThrow();
    });
  });
});
