type Identity = { id?: number; muaId?: number | null; phoneNumber?: string | null };
type Assignment = {
  userId?: number; muaId?: number; staffPhone?: string; status?: string;
  isConfirmedByStaff?: boolean; confirmedAt?: string | null;
};

export function findMyAssignment<T extends Assignment>(assignments: T[], user: Identity | null | undefined, muaId?: number): T | null {
  const matches = assignments.filter((staff) => {
    if (staff.userId != null && user?.id != null) return staff.userId === user.id;
    const ownMuaId = user?.muaId ?? muaId;
    if (staff.muaId != null && ownMuaId != null) return staff.muaId === ownMuaId;
    return Boolean(user?.phoneNumber && staff.staffPhone &&
      staff.staffPhone.replace(/\D/g, '') === user.phoneNumber.replace(/\D/g, ''));
  });
  return matches.find((staff) => staff.status === 'ACTIVE') ?? matches[0] ?? null;
}

export function canConfirmAssignment(assignment: Assignment | null | undefined): boolean {
  return assignment?.status === 'ACTIVE' &&
    (assignment.isConfirmedByStaff === false || !assignment.confirmedAt);
}
