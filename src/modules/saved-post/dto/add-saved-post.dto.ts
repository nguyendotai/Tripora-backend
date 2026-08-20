import { IsNumberString } from 'class-validator';

export class AddSavedPostDto {
  @IsNumberString()
  postId: string;
}
