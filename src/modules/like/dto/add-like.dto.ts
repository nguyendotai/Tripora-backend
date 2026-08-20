import { IsNumberString } from 'class-validator';

export class AddLikeDto {
  @IsNumberString()
  postId: string;
}
