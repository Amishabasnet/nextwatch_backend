const toAdminUserDTO = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  consentGiven: user.consentGiven,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const toAdminUserListDTO = (users) => users.map(toAdminUserDTO);

module.exports = { toAdminUserDTO, toAdminUserListDTO };
