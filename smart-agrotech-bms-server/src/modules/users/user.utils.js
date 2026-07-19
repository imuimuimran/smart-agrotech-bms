export const sanitizeUser = (user) => ({
  id: user._id,

  publicId: user.publicId,

  name: user.name,

  email: user.email,

  phone: user.phone,

  role: user.role,

  status: user.status,

  profileImage: user.profileImage,

  createdAt: user.createdAt,

  updatedAt: user.updatedAt,
});