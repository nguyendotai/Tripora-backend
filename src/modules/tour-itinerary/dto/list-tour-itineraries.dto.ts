import { IsNumberString } from 'class-validator';

export class ListTourItinerariesDto {
  @IsNumberString()
  tourId: string;
}
