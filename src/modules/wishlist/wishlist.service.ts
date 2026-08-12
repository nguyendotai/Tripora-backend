import { BadRequestException, Injectable } from '@nestjs/common';
import { DestinationRepository } from '../destination/destination.repository';
import { WishlistRepository } from './wishlist.repository';

@Injectable()
export class WishlistService {
  constructor(
    private readonly wishlistRepository: WishlistRepository,
    private readonly destinationRepository: DestinationRepository,
  ) {}

  list(userId: bigint) {
    return this.wishlistRepository.findByUser(userId);
  }

  async add(userId: bigint, rawDestinationId: string) {
    const destinationId = BigInt(rawDestinationId);
    const destination = await this.destinationRepository.findById(destinationId);
    if (!destination) {
      throw new BadRequestException(`Destination not found: ${rawDestinationId}`);
    }

    const existing = await this.wishlistRepository.findOne(userId, destinationId);
    if (existing) {
      return existing;
    }

    return this.wishlistRepository.create(userId, destinationId);
  }

  async remove(userId: bigint, destinationId: bigint) {
    await this.wishlistRepository.removeByUserAndDestination(userId, destinationId);
  }
}
