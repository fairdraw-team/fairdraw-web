// 백엔드 없이 연습하는 가짜 API (NEXT_PUBLIC_USE_MOCK=true 일 때 사용)
// 브라우저 localStorage에 저장해서 페이지를 이동하거나 새로고침해도 유지됩니다.
import seed from '@/mocks/events.json';
import type {
  EventItem,
  Section,
  Team,
  TeamMember,
  EventStats,
  EventEntry,
  EntriesPageResponse,
  SealInfo,
} from '@/types/api';
import { ApiError } from './api';

const KEY_EVENTS = 'fairdraw-mock-events';
const KEY_TEAMS = 'fairdraw-mock-teams';
const KEY_ENTRIES = 'fairdraw-mock-entries';
const KEY_SEALS = 'fairdraw-mock-seals';

// 초대 코드용 32자 문자열 (헷갈리는 0, O, 1, I 배제)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return result;
}

// SHA-256 해시 시뮬레이션 (가짜 64자리 헥스 문자열 생성)
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
  return saved ? JSON.parse(saved) : (seed as EventItem[]);
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

  // 초기 시드 v2 데이터 생성 (30건의 연습용 응모 명단)
  if (entries.length === 0 && eventId) {
    const names = ['김민준', '이서연', '박도윤', '정하은', '최지우', '강서준', '조유진', '윤건우', '장수아', '임시우', '한지아', '오태양', '서채원', '신예준', '권나은', '황도현', '안소율', '송준서', '전다은', '홍승우', '유하린', '고우진', '문지민', '손지안', '배현우', '백소은', '허준혁', '남지윤', '심태윤', '노하윤'];
    entries = names.map((name, idx) => ({
      id: `entry-${idx + 1}`,
      userId: `user-${idx + 1}`,
      userName: name,
      userPhone: `010-****-${String(1000 + idx * 37).slice(-4)}`,
      sectionName: idx % 3 === 0 ? 'VIP 스탠딩' : idx % 3 === 1 ? 'R석 지정석' : 'S석 일반석',
      ballotCount: 3,
      isTeam: idx % 4 === 0,
      teamId: idx % 4 === 0 ? `team-${Math.floor(idx / 4) + 1}` : null,
      createdAt: new Date(Date.now() - (30 - idx) * 3600000).toISOString(),
      status: 'active',
    }));
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

function findEvent(events: EventItem[], id: string): EventItem {
  const ev = events.find((e) => e.id === id);
  if (!ev) throw new ApiError('NOT_FOUND', '해당 공연 정보를 찾을 수 없습니다.', 404);
  return ev;
}

function checkDates(ev: EventItem) {
  const t = [ev.entryStartAt, ev.entryEndAt, ev.paymentDeadlineAt, ev.eventAt].map((d) =>
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
  await new Promise((r) => setTimeout(r, 150)); // 네트워크 레이턴시
  const events = loadEvents();
  const data = body ? JSON.parse(body) : {};
  const [cleanPath, queryStr] = path.split('?');
  const query = new URLSearchParams(queryStr ?? '');
  const isTrashQuery = query.get('trash') === 'true';

  const parts = cleanPath.split('/').filter(Boolean); // ['api', ...]

  // ==========================================
  // 1. 관객용 공개 공연 목록: GET /api/public/events
  // ==========================================
  if (parts[0] === 'api' && parts[1] === 'public' && parts[2] === 'events') {
    if (parts[4] === 'seal' && method === 'GET') {
      const seals = loadSeals();
      const seal = seals[parts[3]];
      if (!seal) throw new ApiError('SEAL_NOT_FOUND', '명단 봉인 정보가 아직 등록되지 않았습니다.', 404);
      return seal as T;
    }
    if (method === 'GET') {
      return events.filter((e) => e.status === 'open' && !e.deletedAt) as T;
    }
  }

  // ==========================================
  // 2. 연석 팀 관련 API: /api/teams
  // ==========================================
  if (parts[0] === 'api' && parts[1] === 'teams') {
    const teams = loadTeams();

    // 2-1. 팀 만들기: POST /api/teams
    if (!parts[2] && method === 'POST') {
      const { eventId, sectionId } = data;
      const targetEvent = findEvent(events, eventId);
      const section = targetEvent.sections?.find((s) => s.id === sectionId);

      const teamId = crypto.randomUUID();
      const inviteCode = generateInviteCode();
      const newTeam: Team = {
        id: teamId,
        eventId,
        eventTitle: targetEvent.title,
        sectionId,
        sectionName: section?.name ?? '기본 구역',
        maxMembers: targetEvent.maxTeamSize || 2,
        leaderId: 'user-leader-me',
        inviteCode,
        status: 'forming',
        createdAt: new Date().toISOString(),
        members: [
          {
            id: crypto.randomUUID(),
            userId: 'user-leader-me',
            userName: '나 (팀장)',
            userPhone: '010-1234-5678',
            isLeader: true,
            joinedAt: new Date().toISOString(),
          },
        ],
      };

      teams.push(newTeam);
      saveTeams(teams);

      // 팀장 응모 명단 자동 생성
      const entries = loadEntries(eventId);
      entries.push({
        id: crypto.randomUUID(),
        userId: 'user-leader-me',
        userName: '나 (팀장)',
        userPhone: '010-1234-5678',
        sectionName: newTeam.sectionName ?? '지정 구역',
        ballotCount: targetEvent.ballotsPerUser || 3,
        isTeam: true,
        teamId: newTeam.id,
        createdAt: new Date().toISOString(),
        status: 'active',
      });
      saveEntries(entries);

      return newTeam as T;
    }

    // 2-2. 팀 합류하기: POST /api/teams/join
    if (parts[2] === 'join' && method === 'POST') {
      const code = (data.code || '').trim().toUpperCase();
      const team = teams.find((t) => t.inviteCode?.toUpperCase() === code);

      if (!team || team.status === 'dissolved') {
        throw new ApiError('INVALID_CODE', '초대 코드를 다시 확인해 주시기 바랍니다.', 404);
      }
      if (team.members.length >= team.maxMembers) {
        throw new ApiError('TEAM_FULL', '해당 팀은 정원이 마감되었습니다.', 400);
      }

      const newMember: TeamMember = {
        id: crypto.randomUUID(),
        userId: 'user-member-me',
        userName: '동행자 (나)',
        userPhone: '010-9876-5432',
        isLeader: false,
        joinedAt: new Date().toISOString(),
      };

      team.members.push(newMember);
      if (team.members.length >= team.maxMembers) {
        team.status = 'completed';
      }
      saveTeams(teams);

      // 팀원 응모 명단 자동 추가
      const entries = loadEntries(team.eventId);
      const ev = events.find((e) => e.id === team.eventId);
      entries.push({
        id: crypto.randomUUID(),
        userId: 'user-member-me',
        userName: '동행자 (나)',
        userPhone: '010-9876-5432',
        sectionName: team.sectionName ?? '지정 구역',
        ballotCount: ev?.ballotsPerUser || 3,
        isTeam: true,
        teamId: team.id,
        createdAt: new Date().toISOString(),
        status: 'active',
      });
      saveEntries(entries);

      return team as T;
    }

    const teamId = parts[2];
    const team = teams.find((t) => t.id === teamId);

    // 2-3. 팀 정보 조회: GET /api/teams/{id}
    if (teamId && !parts[3] && method === 'GET') {
      if (!team) throw new ApiError('NOT_FOUND', '해당 팀 정보를 찾을 수 없습니다.', 404);
      return team as T;
    }

    // 2-4. 팀 탈퇴 또는 해체: DELETE /api/teams/{id}/members/me
    if (teamId && parts[3] === 'members' && parts[4] === 'me' && method === 'DELETE') {
      if (!team) throw new ApiError('NOT_FOUND', '해당 팀 정보를 찾을 수 없습니다.', 404);
      // 팀장인 경우 전체 팀 해체 처리
      team.status = 'dissolved';
      team.members = [];
      saveTeams(teams);

      // 응모 명단에서도 취소 처리
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

  // ==========================================
  // 3. 주최자 및 공통 공연 API: /api/events
  // ==========================================
  if (parts[0] !== 'api' || parts[1] !== 'events') {
    throw new ApiError('NOT_IMPLEMENTED', `지원하지 않는 경로입니다: ${path}`, 501);
  }

  // 3-1. 휴지통 비우기
  if (parts[2] === 'trash' && parts[3] === 'empty' && method === 'DELETE') {
    const remaining = events.filter((e) => !e.deletedAt);
    saveEvents(remaining);
    return undefined as T;
  }

  // 3-2. 공연 목록 조회 및 신규 등록
  if (!parts[2]) {
    if (method === 'GET') {
      if (isTrashQuery) return events.filter((e) => Boolean(e.deletedAt)) as T;
      return events.filter((e) => !e.deletedAt) as T;
    }
    if (method === 'POST') {
      const ev: EventItem = {
        ...data,
        id: crypto.randomUUID(),
        status: 'draft',
        sections: [],
        deletedAt: null,
      };
      checkDates(ev);
      saveEvents([...events, ev]);
      return ev as T;
    }
  }

  const id = parts[2];
  const sub = parts[3];

  // 3-3. 휴지통 복구
  if (sub === 'restore' && method === 'POST') {
    const ev = findEvent(events, id);
    ev.deletedAt = null;
    saveEvents(events);
    return ev as T;
  }

  // 3-4. 영구 삭제
  if (sub === 'permanent' && method === 'DELETE') {
    saveEvents(events.filter((e) => e.id !== id));
    return undefined as T;
  }

  const ev = findEvent(events, id);

  // 3-5. 단일 공연 상세 조회
  if (!sub && method === 'GET') {
    return ev as T;
  }

  // 3-6. 휴지통으로 이동 (삭제)
  if (!sub && method === 'DELETE') {
    if (ev.status === 'open') {
      throw new ApiError(
        'FORBIDDEN',
        '현재 응모가 진행 중인 공연은 공정 추첨 무결성 보호를 위해 삭제할 수 없습니다. 먼저 공연을 취소(마감)해 주세요.',
        403,
      );
    }
    ev.deletedAt = new Date().toISOString();
    saveEvents(events);
    return undefined as T;
  }

  // 3-7. 공연 정보 수정
  if (!sub && method === 'PATCH') {
    Object.assign(ev, data);
    checkDates(ev);
    saveEvents(events);
    return ev as T;
  }

  // 3-8. 구역 추가
  if (sub === 'sections' && method === 'POST') {
    if (ev.sections?.some((s) => s.name === data.name)) {
      throw new ApiError('SECTION_NAME_TAKEN', '동일한 이름의 구역이 이미 등록되어 있습니다.', 409);
    }
    const section: Section = { id: crypto.randomUUID(), ...data };
    ev.sections = [...(ev.sections ?? []), section];
    saveEvents(events);
    return section as T;
  }

  // 3-9. 스태프 등록
  if (sub === 'staff' && method === 'POST') {
    return { eventId: id, phone: data.phone } as T;
  }

  // ==========================================
  // 4. 주최자 실시간 응모 통계: GET /api/events/{id}/stats
  // ==========================================
  if (sub === 'stats' && method === 'GET') {
    const entries = loadEntries(id);
    const activeEntries = entries.filter((e) => e.status === 'active');
    const teams = loadTeams().filter((t) => t.eventId === id && t.status !== 'dissolved');

    const sections = ev.sections && ev.sections.length > 0 ? ev.sections : [
      { id: 'sec-1', name: 'VIP 스탠딩', capacity: 50, price: ev.price },
      { id: 'sec-2', name: 'R석 지정석', capacity: 100, price: ev.price },
      { id: 'sec-3', name: 'S석 일반석', capacity: 150, price: ev.price },
    ];

    const sectionStats = sections.map((sec) => {
      const secEntries = activeEntries.filter(
        (e) => e.sectionName === sec.name || e.sectionName.includes(sec.name),
      );
      const ballotCount = secEntries.reduce((sum, e) => sum + e.ballotCount, 0);
      const ratioNum = sec.capacity > 0 ? (ballotCount / sec.capacity).toFixed(1) : '0.0';
      return {
        sectionId: sec.id,
        sectionName: sec.name,
        capacity: sec.capacity,
        entryCount: secEntries.length,
        ballotCount,
        ratio: `${ratioNum} : 1`,
      };
    });

    const totalBallots = activeEntries.reduce((sum, e) => sum + e.ballotCount, 0);

    const stats: EventStats = {
      eventId: id,
      totalEntries: activeEntries.length,
      totalBallots,
      totalTeams: teams.length,
      cancelledEntries: entries.filter((e) => e.status === 'cancelled').length,
      sectionStats,
    };

    return stats as T;
  }

  // ==========================================
  // 5. 응모자 명단 페이징: GET /api/events/{id}/entries?page=0&size=20
  // ==========================================
  if (sub === 'entries' && method === 'GET') {
    const entries = loadEntries(id);
    const page = parseInt(query.get('page') || '0', 10);
    const size = parseInt(query.get('size') || '20', 10);
    const start = page * size;
    const paginated = entries.slice(start, start + size);

    const response: EntriesPageResponse = {
      entries: paginated,
      total: entries.length,
      page,
      size,
      hasMore: start + size < entries.length,
    };

    return response as T;
  }

  // ==========================================
  // 6. 마감 및 명단 봉인: POST /api/events/{id}/close
  // ==========================================
  if (sub === 'close' && method === 'POST') {
    if (ev.status !== 'open') {
      throw new ApiError('EVENT_NOT_OPEN', '진행 중(응모 중)인 공연만 마감하고 봉인할 수 있습니다.', 400);
    }

    const entries = loadEntries(id).filter((e) => e.status === 'active');
    const totalBallots = entries.reduce((sum, e) => sum + e.ballotCount, 0);
    const sealedAt = new Date().toISOString();
    const hash = generateSha256Hex(`${id}-${sealedAt}-${totalBallots}-${entries.length}`);

    const sealInfo: SealInfo = {
      eventId: id,
      hash,
      sealedAt,
      totalBallots,
      totalEntries: entries.length,
    };

    const seals = loadSeals();
    seals[id] = sealInfo;
    saveSeals(seals);

    ev.status = 'closed';
    saveEvents(events);

    return sealInfo as T;
  }

  // 3-10. 명단 봉인 정보 조회: GET /api/events/{id}/seal
  if (sub === 'seal' && method === 'GET') {
    const seals = loadSeals();
    const seal = seals[id];
    if (!seal) throw new ApiError('SEAL_NOT_FOUND', '명단 봉인 정보가 아직 등록되지 않았습니다.', 404);
    return seal as T;
  }

  throw new ApiError('NOT_IMPLEMENTED', `지원하지 않는 요청입니다: ${method} ${path}`, 501);
}
