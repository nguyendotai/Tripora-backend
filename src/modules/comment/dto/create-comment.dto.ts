import { IsNumberString, IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsNumberString()
  postId: string;

  @IsString()
  @MinLength(1)
  content: string;
}
