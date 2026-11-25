// 백엔드 없이 연습하는 가짜 API (NEXT_PUBLIC_USE_MOCK=true 일 때 사용)
// 브라우저 localStorage에 저장해서 페이지를 이동하거나 새로고침해도 유지됩니다.
import seed from '@/mocks/events.json';
import drawInfoMock from '@/mocks/draw.json';
import paymentStatsSeed from '@/mocks/payment-stats.json';
import type {
  DrawInfo,
  EntriesPageResponse,
  EventEntry,
  EventItem,
  EventStats,
  PaymentStats,
  ScanResult,
  ScanSummary,
  SealInfo,
  Section,
  Team,
  TeamMember,
} from '@/types/api';
import { ApiError } from './api';

const KEY_EVENTS = 'fairdraw-mock-events';
const KEY_TEAMS = 'fairdraw-mock-teams';
const KEY_ENTRIES = 'fairdraw-mock-entries';
const KEY_SEALS = 'fairdraw-mock-seals';
const KEY_PAY_STATS = 'fairdraw-mock-payment-stats';
const KEY_SCANNED = 'fairdraw-mock-scanned-codes';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

function generateSha256Hex(seedStr: string): string {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return (
    hex +
    'a9f84c3b2e1d0f5e7c8b9a1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f'.slice(
      hex.length,
      64,
    )
  );
}

function loadEvents(): EventItem[] {
  const saved = localStorage.getItem(KEY_EVENTS);
  return saved ? JSON.parse(saved) : (seed as unknown as EventItem[]);
}

function saveEvents(events: EventItem[]) {
  localStorage.setItem(KEY_EVENTS, JSON.stringify(events));
}

function loadTeams(): Team[] {
  const saved = localStorage.getItem(KEY_TEAMS);
  return saved ? JSON.parse(saved) : [];
}

function saveTeams(teams: Team[]) {
  localStorage.setItem(KEY_TEAMS, JSON.stringify(teams));
}

function loadEntries(eventId?: string): EventEntry[] {
  const saved = localStorage.getItem(KEY_ENTRIES);
  let entries: EventEntry[] = saved ? JSON.parse(saved) : [];

  if (entries.length === 0 && eventId) {
    const names = [
      '김민지', '이준호', '박지훈', '정하은', '최지우', '강서준', '조유진', '윤건우', '장수아', '임시우',
      '한지아', '오태양', '서채원', '신예준', '권나은', '황도현', '안소율', '송준서', '전다은', '홍승우',
      '유하린', '고우진', '문지민', '손지안', '배현우', '백소은', '허준혁', '남지윤', '심태윤', '노하윤',
    ];
    entries = names.map((name, idx) => {
      const secName = idx % 3 === 0 ? 'VIP석' : idx % 3 === 1 ? 'R석' : 'S석';
      return {
        id: `entry-${idx + 1}`,
        realName: name,
        phone: `***-****-${String(1000 + idx * 37).slice(-4)}`,
        allocations: [
          {
            sectionId: `sec-${(idx % 3) + 1}`,
            sectionName: secName,
            ballots: 3,
          },
        ],
        ballots: 3,
        status: 'active',
        teamId: idx % 4 === 0 ? `team-${Math.floor(idx / 4) + 1}` : null,
        createdAt: new Date(Date.now() - (30 - idx) * 3600000).toISOString(),
      };
    });
    localStorage.setItem(KEY_ENTRIES, JSON.stringify(entries));
  }
  return entries;
}

function saveEntries(entries: EventEntry[]) {
  localStorage.setItem(KEY_ENTRIES, JSON.stringify(entries));
}

function loadSeals(): Record<string, SealInfo> {
  const saved = localStorage.getItem(KEY_SEALS);
  return saved ? JSON.parse(saved) : {};
}

function saveSeals(seals: Record<string, SealInfo>) {
  localStorage.setItem(KEY_SEALS, JSON.stringify(seals));
}

function loadPaymentStatsMap(): Record<string, PaymentStats> {
  const saved = localStorage.getItem(KEY_PAY_STATS);
  return saved ? JSON.parse(saved) : {};
}

function savePaymentStatsMap(map: Record<string, PaymentStats>) {
  localStorage.setItem(KEY_PAY_STATS, JSON.stringify(map));
}

function findEvent(events: EventItem[], id: string): EventItem {
  const ev = events.find((e) => e.id === id);
  if (!ev) throw new ApiError('NOT_FOUND', '해당 공연 정보를 찾을 수 없습니다.', 404);
  return ev;
}

function checkDates(ev: EventItem) {
  if (!ev.entryOpensAt || !ev.entryClosesAt || !ev.paymentDueAt || !ev.startsAt) return;
  const t = [ev.entryOpensAt, ev.entryClosesAt, ev.paymentDueAt, ev.startsAt].map((d) =>
    new Date(d).getTime(),
  );
  if (!(t[0] < t[1] && t[1] < t[2] && t[2] < t[3])) {
    throw new ApiError(
      'INVALID_DATES',
      '응모 시작 < 응모 마감 < 결제 마감 < 공연 일시 순서여야 합니다.',
      400,
    );
  }
}

export async function mockFetch<T>(path: string, method: string, body?: string): Promise<T> {
  await new Promise((r) => setTimeout(r, 120));
  const events = loadEvents();
  const data = body ? JSON.parse(body) : {};
  const [cleanPath, queryStr] = path.split('?');
  const query = new URLSearchParams(queryStr ?? '');
  const parts = cleanPath.split('/').filter(Boolean); // ['api', ...]

  // 1. 공개 API: /api/public/events
  if (parts[0] === 'api' && parts[1] === 'public' && parts[2] === 'events') {
    const eventId = parts[3];
    if (eventId && parts[4] === 'seal' && method === 'GET') {
      const seals = loadSeals();
      const seal = seals[eventId] ?? {
        eventId,
        rosterHash: '3fa98e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c21',
        sealedAt: '2026-11-20T09:00:00Z',
        ballotCount: 90,
        sections: [{ sectionId: 'sec-a', name: 'A', ballots: 90 }],
      };
      return seal as T;
    }
    if (eventId && !parts[4] && method === 'GET') {
      return findEvent(events, eventId) as T;
    }
    if (!eventId && method === 'GET') {
      return events.filter((e) => e.status !== 'draft') as T;
    }
  }

  // 2. 연석 팀 API: /api/teams
  if (parts[0] === 'api' && parts[1] === 'teams') {
    const teams = loadTeams();

    // POST /api/teams
    if (!parts[2] && method === 'POST') {
      const { eventId, sectionId } = data;
      const targetEvent = findEvent(events, eventId);
      const section = targetEvent.sections?.find((s) => s.id === sectionId);

      const teamId = crypto.randomUUID();
      const inviteCode = generateInviteCode();
      const maxSize = targetEvent.maxTeamSize || 2;
      const newTeam: Team = {
        id: teamId,
        eventId,
        sectionId,
        sectionName: section?.name ?? '기본 구역',
        leaderId: 'user-leader-me',
        inviteCode,
        maxSize,
        full: false,
        members: [
          {
            profileId: 'user-leader-me',
            realName: '나 (팀장)',
            leader: true,
          },
        ],
      };

      teams.push(newTeam);
      saveTeams(teams);

      const entries = loadEntries(eventId);
      entries.push({
        id: crypto.randomUUID(),
        realName: '나 (팀장)',
        phone: '***-****-5678',
        allocations: [
          {
            sectionId,
            sectionName: newTeam.sectionName,
            ballots: targetEvent.ballotsPerUser || 3,
          },
        ],
        ballots: targetEvent.ballotsPerUser || 3,
        status: 'active',
        teamId: newTeam.id,
        createdAt: new Date().toISOString(),
      });
      saveEntries(entries);

      return newTeam as T;
    }

    // POST /api/teams/join
    if (parts[2] === 'join' && method === 'POST') {
      const code = (data.code || '').trim().toUpperCase();
      const team = teams.find((t) => t.inviteCode?.toUpperCase() === code);

      if (!team) {
        throw new ApiError('INVALID_CODE', '초대 코드를 다시 확인해 주시기 바랍니다.', 404);
      }
      if (team.full || team.members.length >= team.maxSize) {
        throw new ApiError('TEAM_FULL', '해당 팀은 정원이 마감되었습니다.', 400);
      }

      const newMember: TeamMember = {
        profileId: 'user-member-me',
        realName: '동행자 (나)',
        leader: false,
      };

      team.members.push(newMember);
      if (team.members.length >= team.maxSize) {
        team.full = true;
      }
      saveTeams(teams);

      const entries = loadEntries(team.eventId);
      const ev = events.find((e) => e.id === team.eventId);
      entries.push({
        id: crypto.randomUUID(),
        realName: '동행자 (나)',
        phone: '***-****-5432',
        allocations: [
          {
            sectionId: team.sectionId,
            sectionName: team.sectionName,
            ballots: ev?.ballotsPerUser || 3,
          },
        ],
        ballots: ev?.ballotsPerUser || 3,
        status: 'active',
        teamId: team.id,
        createdAt: new Date().toISOString(),
      });
      saveEntries(entries);

      return team as T;
    }

    const teamId = parts[2];
    const team = teams.find((t) => t.id === teamId);

    // GET /api/teams/{id}
    if (teamId && !parts[3] && method === 'GET') {
      if (!team) throw new ApiError('NOT_FOUND', '해당 팀 정보를 찾을 수 없습니다.', 404);
      return team as T;
    }

    // DELETE /api/teams/{id}/members/me
    if (teamId && parts[3] === 'members' && parts[4] === 'me' && method === 'DELETE') {
      if (!team) throw new ApiError('NOT_FOUND', '해당 팀 정보를 찾을 수 없습니다.', 404);
      const nextTeams = teams.filter((t) => t.id !== teamId);
      saveTeams(nextTeams);

      const entries = loadEntries(team.eventId);
      entries.forEach((ent) => {
        if (ent.teamId === team.id) {
          ent.status = 'cancelled';
        }
      });
      saveEntries(entries);

      return { message: '성공적으로 팀이 해체되었습니다.' } as T;
    }
  }

  // 3. 티켓 스캔 판정 API: POST /api/tickets/scan (FB-4)
  if (parts[0] === 'api' && parts[1] === 'tickets' && parts[2] === 'scan' && method === 'POST') {
    const code = String(data.code ?? '').trim();
    const segs = code.split('.');
    if (segs.length !== 3 || segs[0] !== 'FD1') {
      const invalidRes: ScanResult = {
        result: 'invalid',
        sectionName: null,
        scannedAt: new Date().toISOString(),
        holderName: null,
        message: '우리 티켓의 QR이 아닙니다',
      };
      return invalidRes as T;
    }
    if (segs[2] === '000000' || segs[1] === 'expired') {
      const expiredRes: ScanResult = {
        result: 'invalid',
        sectionName: null,
        scannedAt: new Date().toISOString(),
        holderName: null,
        message: '시간이 지난 QR입니다. 티켓 화면을 직접 보여 달라고 하세요',
      };
      return expiredRes as T;
    }

    const scannedRaw = localStorage.getItem(KEY_SCANNED);
    const scannedMap: Record<string, string> = scannedRaw ? JSON.parse(scannedRaw) : {};
    const ticketId = segs[1];

    if (scannedMap[ticketId]) {
      const dupRes: ScanResult = {
        result: 'duplicate',
        sectionName: 'A',
        scannedAt: scannedMap[ticketId],
        holderName: '홍*동',
        message: '이미 입장한 티켓입니다',
      };
      return dupRes as T;
    }

    const nowIso = new Date().toISOString();
    scannedMap[ticketId] = nowIso;
    localStorage.setItem(KEY_SCANNED, JSON.stringify(scannedMap));

    const okRes: ScanResult = {
      result: 'ok',
      sectionName: 'A',
      scannedAt: nowIso,
      holderName: '홍*동',
      message: '입장 확인',
    };
    return okRes as T;
  }

  // 4. 주최자 및 공통 공연 API: /api/events
  if (parts[0] !== 'api' || parts[1] !== 'events') {
    throw new ApiError('NOT_IMPLEMENTED', `지원하지 않는 경로입니다: ${path}`, 501);
  }

  if (!parts[2]) {
    if (method === 'GET') {
      return events as T;
    }
    if (method === 'POST') {
      const ev = {
        ...data,
        id: crypto.randomUUID(),
        status: 'draft',
        sections: [],
      } as EventItem;
      checkDates(ev);
      saveEvents([...events, ev]);
      return ev as T;
    }
  }

  const id = parts[2];
  const sub = parts[3];
  const sub2 = parts[4];
  const ev = findEvent(events, id);

  if (!sub && method === 'GET') {
    return ev as T;
  }

  if (!sub && method === 'PATCH') {
    Object.assign(ev, data);
    checkDates(ev);
    saveEvents(events);
    return ev as T;
  }

  if (sub === 'sections' && method === 'POST') {
    if (ev.sections?.some((s) => s.name === data.name)) {
      throw new ApiError('SECTION_NAME_TAKEN', '동일한 이름의 구역이 이미 등록되어 있습니다.', 409);
    }
    const section: Section = { id: crypto.randomUUID(), ...data };
    ev.sections = [...(ev.sections ?? []), section];
    saveEvents(events);
    return section as T;
  }

  if (sub === 'staff' && method === 'POST') {
    return { eventId: id, phone: data.phone } as T;
  }

  // GET /api/events/{id}/stats (P-4)
  if (sub === 'stats' && method === 'GET') {
    const entries = loadEntries(id);
    const activeEntries = entries.filter((e) => e.status === 'active');
    const teams = loadTeams().filter((t) => t.eventId === id);

    const sections =
      ev.sections && ev.sections.length > 0
        ? ev.sections
        : [
            { id: 'sec-1', name: 'VIP석', capacity: 50, price: ev.price },
            { id: 'sec-2', name: 'R석', capacity: 100, price: ev.price },
            { id: 'sec-3', name: 'S석', capacity: 150, price: ev.price },
          ];

    const sectionStats = sections.map((sec) => {
      const secEntries = activeEntries.filter((e) =>
        e.allocations.some(
          (a) => a.sectionName === sec.name || a.sectionName.includes(sec.name),
        ),
      );
      const ballots = secEntries.reduce((sum, e) => sum + e.ballots, 0);
      const ratio = sec.capacity > 0 ? Number((ballots / sec.capacity).toFixed(1)) : 0;
      return {
        sectionId: sec.id,
        name: sec.name,
        capacity: sec.capacity,
        applicants: secEntries.length,
        ballots,
        ratio,
      };
    });

    const totalBallots = activeEntries.reduce((sum, e) => sum + e.ballots, 0);

    const stats: EventStats = {
      eventId: id,
      status: ev.status,
      totalApplicants: activeEntries.length,
      totalBallots,
      teamCount: teams.length,
      cancelledCount: entries.filter((e) => e.status === 'cancelled').length,
      sections: sectionStats,
    };

    return stats as T;
  }

  // GET /api/events/{id}/entries (P-4)
  if (sub === 'entries' && !sub2 && method === 'GET') {
    const entries = loadEntries(id);
    const page = parseInt(query.get('page') || '0', 10);
    const size = parseInt(query.get('size') || '20', 10);
    const start = page * size;
    const paginated = entries.slice(start, start + size);

    const response: EntriesPageResponse = {
      content: paginated,
      page,
      size,
      totalElements: entries.length,
      totalPages: Math.max(1, Math.ceil(entries.length / size)),
    };

    return response as T;
  }

  // POST /api/events/{id}/close (P-4, P-5)
  if (sub === 'close' && method === 'POST') {
    if (ev.status !== 'open') {
      throw new ApiError('EVENT_NOT_OPEN', '진행 중(응모 중)인 공연만 마감하고 봉인할 수 있습니다.', 400);
    }

    const entries = loadEntries(id).filter((e) => e.status === 'active');
    const totalBallots = entries.reduce((sum, e) => sum + e.ballots, 0);
    const sealedAt = new Date().toISOString();
    const rosterHash = generateSha256Hex(`${id}-${sealedAt}-${totalBallots}-${entries.length}`);

    const sealInfo: SealInfo = {
      eventId: id,
      rosterHash,
      sealedAt,
      ballotCount: totalBallots,
      sections: (ev.sections ?? []).map((s) => ({
        sectionId: s.id,
        name: s.name,
        ballots: Math.floor(totalBallots / Math.max(1, (ev.sections ?? []).length)),
      })),
    };

    const seals = loadSeals();
    seals[id] = sealInfo;
    saveSeals(seals);

    ev.status = 'closed';
    saveEvents(events);

    return sealInfo as T;
  }

  // POST /api/events/{id}/draw (FB-1)
  if (sub === 'draw' && !sub2 && method === 'POST') {
    if (ev.status === 'drawn' || ev.status === 'paying' || ev.status === 'done') {
      throw new ApiError('ALREADY_DRAWN', '이미 추첨이 완료된 공연입니다.', 409);
    }
    if (ev.status !== 'closed') {
      throw new ApiError('EVENT_NOT_CLOSED', '먼저 응모를 마감하세요', 400);
    }
    ev.status = 'drawn';
    saveEvents(events);
    return { ...drawInfoMock, eventId: id } as unknown as DrawInfo as T;
  }

  // POST /api/events/{id}/payment/open (FB-2)
  if (sub === 'payment' && sub2 === 'open' && method === 'POST') {
    if (ev.status === 'paying' || ev.status === 'done') {
      throw new ApiError('ALREADY_PAYING', '이미 결제를 연 공연입니다', 409);
    }
    if (ev.status !== 'drawn') {
      throw new ApiError('EVENT_NOT_DRAWN', '먼저 추첨을 진행하세요', 400);
    }
    ev.status = 'paying';
    saveEvents(events);

    const pMap = loadPaymentStatsMap();
    const initialStats: PaymentStats = {
      ...(paymentStatsSeed as PaymentStats),
      eventId: id,
      status: 'paying',
      paymentDueAt: ev.paymentDueAt,
    };
    pMap[id] = initialStats;
    savePaymentStatsMap(pMap);
    return initialStats as T;
  }

  // GET /api/events/{id}/payment/stats (FB-3)
  if (sub === 'payment' && sub2 === 'stats' && method === 'GET') {
    const pMap = loadPaymentStatsMap();
    const stats: PaymentStats = pMap[id] ?? {
      ...(paymentStatsSeed as PaymentStats),
      eventId: id,
      status: ev.status,
      paymentDueAt: ev.paymentDueAt,
    };
    return stats as T;
  }

  // POST /api/events/{id}/payment/process (FB-3)
  if (sub === 'payment' && sub2 === 'process' && method === 'POST') {
    if (ev.status !== 'paying') {
      throw new ApiError('EVENT_NOT_PAYING', '결제 진행 중인 공연이 아닙니다.', 400);
    }
    const pMap = loadPaymentStatsMap();
    const current: PaymentStats = pMap[id] ?? {
      ...(paymentStatsSeed as PaymentStats),
      eventId: id,
      status: ev.status,
      paymentDueAt: ev.paymentDueAt,
    };

    const nextSections = current.sections.map((sec) => {
      if (sec.pending > 0 && sec.waitlistLeft > 0) {
        return {
          ...sec,
          expired: sec.expired + 1,
          succeeded: sec.succeeded + 1,
          waitlistLeft: sec.waitlistLeft - 1,
        };
      }
      if (sec.pending > 0) {
        return {
          ...sec,
          pending: 0,
          expired: sec.expired + sec.pending,
        };
      }
      return sec;
    });

    const hasPending = nextSections.some((s) => s.pending > 0);
    const nextStatus = hasPending ? 'paying' : 'done';
    if (nextStatus === 'done') {
      ev.status = 'done';
      saveEvents(events);
    }

    const updated: PaymentStats = {
      ...current,
      status: nextStatus,
      sections: nextSections,
    };
    pMap[id] = updated;
    savePaymentStatsMap(pMap);
    return updated as T;
  }

  // GET /api/events/{id}/scan/summary (FB-4)
  if (sub === 'scan' && sub2 === 'summary' && method === 'GET') {
    const scannedRaw = localStorage.getItem(KEY_SCANNED);
    const scannedMap: Record<string, string> = scannedRaw ? JSON.parse(scannedRaw) : {};
    const enteredCount = Object.keys(scannedMap).length;
    const summary: ScanSummary = {
      eventId: id,
      eventTitle: ev.title,
      issued: Math.max(2, enteredCount),
      entered: enteredCount,
    };
    return summary as T;
  }

  throw new ApiError('NOT_IMPLEMENTED', `지원하지 않는 요청입니다: ${method} ${path}`, 501);
}
