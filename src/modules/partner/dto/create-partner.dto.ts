import { PartnerBusinessType } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePartnerDto {
  @IsString()
  @MaxLength(255)
  businessName: string;

  @IsEnum(PartnerBusinessType)
  businessType: PartnerBusinessType;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;
}
