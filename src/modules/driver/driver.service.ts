import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProviderStatus, ProviderType } from '@prisma/client';
import { ProviderRepository } from '../provider/provider.repository';
import { TransportBookingRepository } from '../transport-booking/transport-booking.repository';
import { TransportRouteRepository } from '../transport-route/transport-route.repository';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverRepository } from './driver.repository';

@Injectable()
export class DriverService {
  constructor(
    private readonly driverRepository: DriverRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly transportBookingRepository: TransportBookingRepository,
    private readonly transportRouteRepository: TransportRouteRepository,
  ) {}

  async create(userId: bigint, dto: CreateDriverDto) {
    const provider = await this.getOwnedApprovedTransportProvider(userId);
    return this.driverRepository.create({
      providerId: provider.id,
      name: dto.name,
      phone: dto.phone,
      licenseNumber: dto.licenseNumber,
    });
  }

  async listMine(userId: bigint) {
    const provider = await this.getOwnedApprovedTransportProvider(userId);
    return this.driverRepository.findByProviderId(provider.id);
  }

  async update(userId: bigint, driverId: bigint, dto: UpdateDriverDto) {
    const driver = await this.getOwnedDriver(userId, driverId);
    return this.driverRepository.update(driver.id, dto);
  }

  async remove(userId: bigint, driverId: bigint) {
    const driver = await this.getOwnedDriver(userId, driverId);
    return this.driverRepository.softDelete(driver.id);
  }

  /** Gan/go 1 Driver cho 1 Booking cu the — driverId rong = go phan cong. */
  async assign(userId: bigint, dto: AssignDriverDto) {
    const provider = await this.getOwnedApprovedTransportProvider(userId);

    const bookingId = BigInt(dto.bookingId);
    const booking = await this.transportBookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const route = await this.transportRouteRepository.findById(booking.routeId);
    if (!route || route.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this booking');
    }

    if (!dto.driverId) {
      return this.transportBookingRepository.assignDriver(bookingId, null);
    }

    const driverId = BigInt(dto.driverId);
    const driver = await this.driverRepository.findById(driverId);
    if (!driver || driver.providerId !== provider.id) {
      throw new NotFoundException('Driver not found');
    }

    return this.transportBookingRepository.assignDriver(bookingId, driverId);
  }

  private async getOwnedApprovedTransportProvider(userId: bigint) {
    const provider = await this.providerRepository.findByUserId(userId);
    if (
      !provider ||
      provider.status !== ProviderStatus.APPROVED ||
      provider.type !== ProviderType.TRANSPORT
    ) {
      throw new ForbiddenException('You need an approved transport operator profile to do this');
    }
    return provider;
  }

  private async getOwnedDriver(userId: bigint, driverId: bigint) {
    const provider = await this.getOwnedApprovedTransportProvider(userId);
    const driver = await this.driverRepository.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    if (driver.providerId !== provider.id) {
      throw new ForbiddenException('You do not own this driver');
    }
    return driver;
  }
}
