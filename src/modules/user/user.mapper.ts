import { User } from '@prisma/client';

export function sanitizeUser(user: User) {
  return {
    id: user.id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}
