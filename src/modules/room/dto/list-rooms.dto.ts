import { IsNumberString } from 'class-validator';

export class ListRoomsDto {
  @IsNumberString()
  propertyId: string;
}
