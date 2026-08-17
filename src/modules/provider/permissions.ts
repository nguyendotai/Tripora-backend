import { OrgMemberRole } from '@prisma/client';

// V7 vong 2 — full 5 domain (Hotel/Tour/Experience/Transport/Flight) da migrate sang
// OrganizationMemberService.requireMembership. V7 vong 4 them 'finance:view' cho Finance Staff
// (truoc do khong co permission nao ngoai member:view — chua co trang chuc nang thuc su).
export type Permission =
  | 'property:manage'
  | 'tour:manage'
  | 'experience:manage'
  | 'transport:manage'
  | 'flight:manage'
  | 'member:manage'
  | 'member:view'
  | 'finance:view';

const MANAGE_PERMISSIONS: Permission[] = [
  'property:manage',
  'tour:manage',
  'experience:manage',
  'transport:manage',
  'flight:manage',
  'member:manage',
  'member:view',
  'finance:view',
];

export const ROLE_PERMISSIONS: Record<OrgMemberRole, Set<Permission>> = {
  OWNER: new Set(MANAGE_PERMISSIONS),
  MANAGER: new Set(MANAGE_PERMISSIONS),
  BOOKING_STAFF: new Set(['member:view']),
  FINANCE_STAFF: new Set(['member:view', 'finance:view']),
};

/** Role thap khong duoc thao tac role cao hon/ngang hang — chan leo thang quyen khi moi/xoa member. */
export function canManageRole(
  actorRole: OrgMemberRole,
  targetRole: OrgMemberRole,
): boolean {
  if (actorRole === 'OWNER') return true;
  if (actorRole === 'MANAGER') {
    return targetRole === 'BOOKING_STAFF' || targetRole === 'FINANCE_STAFF';
  }
  return false;
}
