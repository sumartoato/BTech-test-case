import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: JwtService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '15m' } });
    const config = { get: (_key: string, fallback?: unknown) => fallback } as ConfigService;
    service = new AuthService(prisma as unknown as PrismaService, jwt, config);
  });

  describe('register', () => {
    it('creates user with hashed password and lowercased email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) => ({ id: 'u1', ...data }));

      const result = await service.register({
        email: 'John@Mail.com',
        password: 'secret123',
        confirmPassword: 'secret123',
      });

      expect(result).toEqual({ id: 'u1', email: 'john@mail.com' });
      const { data } = prisma.user.create.mock.calls[0][0];
      expect(data.passwordHash).not.toBe('secret123');
      expect(await bcrypt.compare('secret123', data.passwordHash)).toBe(true);
    });

    it('rejects duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await expect(
        service.register({
          email: 'john@mail.com',
          password: 'secret123',
          confirmPassword: 'secret123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns jwt containing email and user id', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'john@mail.com',
        passwordHash: await bcrypt.hash('secret123', 4),
      });

      const { accessToken } = await service.login({
        email: 'john@mail.com',
        password: 'secret123',
      });

      const payload = jwt.verify(accessToken);
      expect(payload.sub).toBe('u1');
      expect(payload.email).toBe('john@mail.com');
    });

    it('rejects wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'john@mail.com',
        passwordHash: await bcrypt.hash('secret123', 4),
      });

      await expect(
        service.login({ email: 'john@mail.com', password: 'wrongpass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@mail.com', password: 'secret123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
