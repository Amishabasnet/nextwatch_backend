// Unit tests for AuthService.
 

jest.mock('../models/User');
jest.mock('../config/jwt');

const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const AuthService = require('../services/authService');
const {
  UnauthorizedError,
  TooManyRequestsError,
} = require('../errors/appError');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthService.register', () => {
  test('creates a new user and returns an auth response with tokens', async () => {
    const createdUser = {
      _id: 'user123',
      name: 'Aarav Shrestha',
      email: 'aarav@example.com',
      phone: '',
      role: 'user',
      consentGiven: true,
      createdAt: new Date(),
    };

    User.findOne.mockResolvedValue(null); // no existing account with this email
    User.create.mockResolvedValue(createdUser);
    User.findByIdAndUpdate.mockResolvedValue(createdUser);
    generateToken.mockReturnValue('access-token');
    generateRefreshToken.mockReturnValue('refresh-token');

    const result = await AuthService.register({
      name: 'Aarav Shrestha',
      email: 'aarav@example.com',
      password: 'Password123',
      consentGiven: true,
    });

    expect(User.findOne).toHaveBeenCalledWith({ email: 'aarav@example.com' });
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'aarav@example.com', consentGiven: true })
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
      $push: { refreshTokens: 'refresh-token' },
    });
    expect(result.token).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.email).toBe('aarav@example.com');
  });

  test('throws UnauthorizedError when the email is already registered', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing-user' });

    await expect(
      AuthService.register({
        name: 'Aarav Shrestha',
        email: 'aarav@example.com',
        password: 'Password123',
      })
    ).rejects.toThrow(UnauthorizedError);

    expect(User.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  const buildUserQuery = (user) => ({
    select: jest.fn().mockResolvedValue(user),
  });

  test('throws UnauthorizedError when no account exists for the email', async () => {
    User.findOne.mockReturnValue(buildUserQuery(null));

    await expect(
      AuthService.login({ email: 'ghost@example.com', password: 'whatever' })
    ).rejects.toThrow(UnauthorizedError);
  });

  test('throws TooManyRequestsError when the account is already locked', async () => {
    const lockedUser = {
      isLocked: jest.fn().mockReturnValue(true),
      lockUntil: new Date(Date.now() + 5 * 60 * 1000),
    };
    User.findOne.mockReturnValue(buildUserQuery(lockedUser));

    await expect(
      AuthService.login({ email: 'locked@example.com', password: 'whatever' })
    ).rejects.toThrow(TooManyRequestsError);
  });

  test('registers a failed attempt and throws UnauthorizedError on wrong password', async () => {
    const user = {
      isLocked: jest.fn().mockReturnValue(false),
      comparePassword: jest.fn().mockResolvedValue(false),
      registerFailedLogin: jest.fn().mockResolvedValue(undefined),
      failedLoginAttempts: 2,
    };
    User.findOne.mockReturnValue(buildUserQuery(user));

    await expect(
      AuthService.login({ email: 'user@example.com', password: 'wrong-password' })
    ).rejects.toThrow(UnauthorizedError);

    expect(user.registerFailedLogin).toHaveBeenCalledTimes(1);
  });

  test('locks the account once failed attempts reach MAX_LOGIN_ATTEMPTS', async () => {
    const user = {
      isLocked: jest
        .fn()
        .mockReturnValueOnce(false) // pre-check, before the failed attempt
        .mockReturnValueOnce(true), // post-check, right after registerFailedLogin
      comparePassword: jest.fn().mockResolvedValue(false),
      registerFailedLogin: jest.fn().mockResolvedValue(undefined),
      lockUntil: new Date(Date.now() + 15 * 60 * 1000),
    };
    User.findOne.mockReturnValue(buildUserQuery(user));

    await expect(
      AuthService.login({ email: 'user@example.com', password: 'wrong-password' })
    ).rejects.toThrow(TooManyRequestsError);
  });

  test('throws UnauthorizedError when the account is suspended', async () => {
    const user = {
      isLocked: jest.fn().mockReturnValue(false),
      comparePassword: jest.fn().mockResolvedValue(true),
      status: 'suspended',
    };
    User.findOne.mockReturnValue(buildUserQuery(user));

    await expect(
      AuthService.login({ email: 'suspended@example.com', password: 'correct' })
    ).rejects.toThrow(UnauthorizedError);
  });

  test('logs in successfully, clears lockout state, and returns fresh tokens', async () => {
    const user = {
      _id: 'user123',
      status: 'active',
      isLocked: jest.fn().mockReturnValue(false),
      comparePassword: jest.fn().mockResolvedValue(true),
      registerSuccessfulLogin: jest.fn().mockResolvedValue(undefined),
    };
    User.findOne.mockReturnValue(buildUserQuery(user));
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ refreshTokens: ['old-token'] }),
    });
    User.findByIdAndUpdate.mockResolvedValue(user);
    generateToken.mockReturnValue('new-access-token');
    generateRefreshToken.mockReturnValue('new-refresh-token');

    const result = await AuthService.login({ email: 'user@example.com', password: 'correct' });

    expect(user.registerSuccessfulLogin).toHaveBeenCalledTimes(1);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
      $set: { refreshTokens: ['old-token', 'new-refresh-token'] },
    });
    expect(result.token).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
  });
});

describe('AuthService.refresh', () => {
  test('throws UnauthorizedError when no refresh token is supplied', async () => {
    await expect(AuthService.refresh(undefined)).rejects.toThrow(UnauthorizedError);
    expect(verifyRefreshToken).not.toHaveBeenCalled();
  });

  test('detects refresh-token reuse, wipes all stored tokens, and throws', async () => {
    verifyRefreshToken.mockReturnValue({ id: 'user123' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user123', refreshTokens: ['some-other-token'] }),
    });
    User.findByIdAndUpdate.mockResolvedValue({});

    await expect(AuthService.refresh('stolen-token')).rejects.toThrow(UnauthorizedError);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
      $set: { refreshTokens: [] },
    });
  });
});

describe('AuthService.logout', () => {
  test('removes only the refresh token belonging to the current device', async () => {
    User.findByIdAndUpdate.mockResolvedValue({});

    await AuthService.logout('user123', 'device-a-token');

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
      $pull: { refreshTokens: 'device-a-token' },
    });
  });
});

describe('AuthService.changePassword', () => {
  test('throws UnauthorizedError when the current password is incorrect', async () => {
    const user = {
      comparePassword: jest.fn().mockResolvedValue(false),
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    await expect(
      AuthService.changePassword('user123', {
        currentPassword: 'wrong',
        newPassword: 'NewPassword123',
      })
    ).rejects.toThrow(UnauthorizedError);
  });
});