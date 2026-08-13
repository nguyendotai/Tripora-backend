import { PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RoomStatus } from '@prisma/client';
import { CreateRoomDto } from './create-room.dto';

export class UpdateRoomDto extends PartialType(
  OmitType(CreateRoomDto, ['propertyId'] as const),
) {
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
