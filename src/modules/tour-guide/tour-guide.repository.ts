import { Injectable } from '@nestjs/common';
import { TourGuide, TourGuideStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type TourGuideWithUser = TourGuide & {
  user: { email: string; firstName: string | null; lastName: string | null };
};

@Injectable()
export class TourGuideRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: bigint): Promise<TourGuide | null> {
    return this.prisma.tourGuide.findUnique({ where: { userId } });
  }

  findById(id: bigint): Promise<TourGuide | null> {
    return this.prisma.tourGuide.findUnique({ where: { id } });
  }

  findByProviderId(providerId: bigint): Promise<TourGuideWithUser[]> {
    return this.prisma.tourGuide.findMany({
      where: { providerId },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: {
    providerId: bigint;
    userId: bigint;
    bio?: string;
    phone?: string;
  }): Promise<TourGuide> {
    return this.prisma.tourGuide.create({
      data: {
        bio: data.bio,
        phone: data.phone,
        provider: { connect: { id: data.providerId } },
        user: { connect: { id: data.userId } },
      },
    });
  }

  update(
    id: bigint,
    data: { bio?: string; phone?: string; status?: TourGuideStatus },
  ): Promise<TourGuide> {
    return this.prisma.tourGuide.update({ where: { id }, data });
  }

  remove(id: bigint): Promise<TourGuide> {
    return this.prisma.tourGuide.delete({ where: { id } });
  }
}
