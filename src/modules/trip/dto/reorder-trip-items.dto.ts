import { ArrayNotEmpty, IsNumberString, IsArray } from 'class-validator';

export class ReorderTripItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsNumberString({}, { each: true })
  itemIds: string[];
}
