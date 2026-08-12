import { IsNumberString } from 'class-validator';

export class AddWishlistItemDto {
  @IsNumberString()
  destinationId: string;
}
