import { IsEmail, IsEnum } from 'class-validator';
import { OrgMemberRole } from '@prisma/client';

export class CreateOrganizationMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(OrgMemberRole)
  role: OrgMemberRole;
}
