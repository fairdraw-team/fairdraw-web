const ORDER = ['draft', 'open', 'closed', 'drawn', 'paying', 'done'] as const;

export type EventStatus = (typeof ORDER)[number];

export function isAtLeast(status: EventStatus, target: EventStatus): boolean {
  return ORDER.indexOf(status) >= ORDER.indexOf(target);
}