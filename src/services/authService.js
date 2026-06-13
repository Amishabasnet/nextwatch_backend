const UserRepository = require('../repositories/userRepository');
const { generateToken } = require('../config/jwt');
const { toAuthResponseDTO, toUserDTO } = require('../dtos/auth.dto');
const { ConflictError, UnauthorizedError } = require('../errors/AppError');

const AuthService = {
  async register({ name, email, password, consentGiven }) {
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already in use');
    }

    const user = await UserRepository.create({
      name,
      email,
      password,
      consentGiven: !!consentGiven,
      consentDate: consentGiven ? new Date() : undefined,
    });

    const token = generateToken({ id: user._id });
    return toAuthResponseDTO(user, token);
  },

  async login({ email, password }) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = generateToken({ id: user._id });
    return toAuthResponseDTO(user, token);
  },

  async getProfile(userId) {
    const user = await UserRepository.findById(userId);
    return toUserDTO(user);
  },

  async updateProfile(userId, data) {
    const user = await UserRepository.findByIdAndUpdate(userId, data);
    return toUserDTO(user);
  },
};

module.exports = AuthService;
