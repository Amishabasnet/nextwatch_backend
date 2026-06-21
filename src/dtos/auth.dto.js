const toUserDTO = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  consentGiven: user.consentGiven,
  role: user.role,
  createdAt: user.createdAt,
});

const toAuthResponseDTO = (user, token) => ({
  token,
  user: toUserDTO(user),
});

module.exports = { toUserDTO, toAuthResponseDTO };
