import { IsNumberString } from 'class-validator';

export class AddFollowDto {
  @IsNumberString()
  followingId: string;
}
