import { OrgMemberRole } from '@prisma/client';

// V7 vong 2 — full 5 domain (Hotel/Tour/Experience/Transport/Flight) da migrate sang
// OrganizationMemberService.requireMembership cho CRUD san pham. V7 vong 4 them 'finance:view'
// cho Finance Staff. V7 vong 5 them 'booking:view' cho Booking Staff — truoc do "Provider xem
// Booking" (GET .../provider ca 5 domain) van dung thang providerRepository.findByUserId (pattern
// cu, chi Owner goi duoc), chua migrate cung dot voi CRUD o vong 2.
export type Permission =
  | 'property:manage'
  | 'tour:manage'
  | 'experience:manage'
  | 'transport:manage'
  | 'flight:manage'
  | 'member:manage'
  | 'member:view'
  | 'finance:view'
  | 'booking:view';

const MANAGE_PERMISSIONS: Permission[] = [
  'property:manage',
  'tour:manage',
  'experience:manage',
  'transport:manage',
  'flight:manage',
  'member:manage',
  'member:view',
  'finance:view',
  'booking:view',
];

export const ROLE_PERMISSIONS: Record<OrgMemberRole, Set<Permission>> = {
  OWNER: new Set(MANAGE_PERMISSIONS),
  MANAGER: new Set(MANAGE_PERMISSIONS),
  BOOKING_STAFF: new Set(['member:view', 'booking:view']),
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
