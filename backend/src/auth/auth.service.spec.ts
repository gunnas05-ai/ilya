import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Partial<Repository<User>>>;
  let jwtService: jest.Mocked<Partial<JwtService>>;

  const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@kaptan.com',
    phone: '5550000000',
    passwordHash: '',
    fullName: 'Test User',
    role: UserRole.TASIYICI,
    isActive: true,
  };

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

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);
      const result = await service.validateUser('test@kaptan.com', '123456');
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@kaptan.com');
    });

    it('should return null when user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.validateUser('nonexistent@test.com', '123456');
      expect(result).toBeNull();
    });

    it('should return null when password is wrong', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);
      const result = await service.validateUser('test@kaptan.com', 'wrongpassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and refresh token', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);
      const result = await service.login({ email: 'test@kaptan.com', password: '123456' } as any);
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw on invalid credentials', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'bad@test.com', password: 'x' } as any),
      ).rejects.toThrow();
    });
  });
});
