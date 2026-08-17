import { IsEnum } from 'class-validator';
import { OrgMemberRole } from '@prisma/client';

export class UpdateOrganizationMemberDto {
  @IsEnum(OrgMemberRole)
  role: OrgMemberRole;
}
