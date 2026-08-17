import { OrgMemberRole } from '@prisma/client';

// Vong 1 (V7) — chi chua permission code da dung toi (Property + quan ly Member). Vong sau se
// them dan permission cho tung domain khac ('tour:manage', 'vehicle:manage', ...) dung luc
// domain do duoc migrate sang OrganizationMemberService.requireMembership.
export type Permission = 'property:manage' | 'member:manage' | 'member:view';

export const ROLE_PERMISSIONS: Record<OrgMemberRole, Set<Permission>> = {
  OWNER: new Set(['property:manage', 'member:manage', 'member:view']),
  MANAGER: new Set(['property:manage', 'member:manage', 'member:view']),
  BOOKING_STAFF: new Set(['member:view']),
  FINANCE_STAFF: new Set(['member:view']),
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
