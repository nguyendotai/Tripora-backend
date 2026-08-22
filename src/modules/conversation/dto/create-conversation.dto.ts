import { IsNumberString, IsString, MinLength } from 'class-validator';

export class CreateConversationDto {
  @IsNumberString()
  providerId: string;

  @IsString()
  @MinLength(1)
  message: string;
}
