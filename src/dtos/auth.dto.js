const toUserDTO = (user) => ({
  id:           user._id,
  name:         user.name,
  email:        user.email,
  phone:        user.phone,
  consentGiven: user.consentGiven,
  role:         user.role,
  createdAt:    user.createdAt,
});

const toAuthResponseDTO = (user, token, refreshToken = null) => ({
  token,
  ...(refreshToken && { refreshToken }),
  user: toUserDTO(user),
});

module.exports = { toUserDTO, toAuthResponseDTO };
