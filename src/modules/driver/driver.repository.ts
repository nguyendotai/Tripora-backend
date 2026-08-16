import { Injectable } from '@nestjs/common';
import { Driver, DriverStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DriverRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: bigint): Promise<Driver | null> {
    return this.prisma.driver.findFirst({ where: { id, deletedAt: null } });
  }

  findByProviderId(providerId: bigint): Promise<Driver[]> {
    return this.prisma.driver.findMany({
      where: { providerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: {
    providerId: bigint;
    name: string;
    phone?: string;
    licenseNumber?: string;
  }): Promise<Driver> {
    return this.prisma.driver.create({
      data: {
        name: data.name,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
        provider: { connect: { id: data.providerId } },
      },
    });
  }

  update(
    id: bigint,
    data: { name?: string; phone?: string; licenseNumber?: string; status?: DriverStatus },
  ): Promise<Driver> {
    return this.prisma.driver.update({ where: { id }, data });
  }

  /** Soft delete — go phan cong khoi moi Booking dang tro toi Driver nay truoc (khong de FK "ma"). */
  async softDelete(id: bigint): Promise<Driver> {
    await this.prisma.transportBooking.updateMany({
      where: { driverId: id },
      data: { driverId: null },
    });
    return this.prisma.driver.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
