import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: bigint) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        role: true,
        currency: true,
        language: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(id: bigint, dto: UpdateProfileDto) {
    await this.prisma.user.update({ where: { id }, data: dto });
    return this.getById(id);
  }
}
