// 백엔드와 주고받는 데이터 모양 (Fair Draw 1~2주차 전체 범위)
// ⚠️ Swagger(https://fairdraw-api.vercel.app/swagger-ui/index.html) 규격과 일치하도록 관리합니다.

export type EventStatus = 'draft' | 'open' | 'closed' | 'drawn' | 'paying' | 'done';

export interface Section {
  id: string;
  name: string;
  capacity: number;
  price: number | null; // 비어 있으면 공연 기본 가격 사용
}

export interface EventItem {
  id: string;
  title: string;
  venue: string;
  posterUrl?: string; // 공연 대표 포스터 이미지
  eventAt: string; // 공연 일시 "2026-12-20T19:00:00+09:00"
  entryStartAt: string; // 응모 시작
  entryEndAt: string; // 응모 마감
  paymentDeadlineAt: string; // 결제 마감
  price: number;
  ballotsPerUser: number; // 1인당 제비 수 (기본 3)
  maxTeamSize: number; // 최대 연석 인원 (기본 2)
  status: EventStatus;
  sections?: Section[];
  deletedAt?: string | null; // 휴지통 삭제 일시 (있으면 휴지통 보관 상태)
}

export type EventInput = Omit<EventItem, 'id' | 'status' | 'sections'>;

export interface SectionInput {
  name: string;
  capacity: number;
  price: number | null;
}

// 2주차: 연석 팀(Team) 모델
export interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  isLeader: boolean;
  joinedAt: string;
}

export interface Team {
  id: string;
  eventId: string;
  eventTitle?: string;
  sectionId: string;
  sectionName?: string;
  maxMembers: number;
  leaderId: string;
  inviteCode?: string; // 팀장에게만 제공 (6글자)
  members: TeamMember[];
  status: 'forming' | 'completed' | 'dissolved';
  createdAt: string;
}

// 2주차: 주최자 실시간 통계 및 응모자 명단 모델
export interface SectionStat {
  sectionId: string;
  sectionName: string;
  capacity: number;
  entryCount: number;
  ballotCount: number;
  ratio: string; // 경쟁률 예: "3.2 : 1"
}

export interface EventStats {
  eventId: string;
  totalEntries: number; // 총 응모 인원
  totalBallots: number; // 총 투입된 제비 수
  totalTeams: number; // 연석 팀 수
  cancelledEntries: number; // 취소된 응모 수
  sectionStats: SectionStat[];
}

export interface EventEntry {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  sectionName: string;
  ballotCount: number;
  isTeam: boolean;
  teamId?: string | null;
  createdAt: string;
  status: 'active' | 'cancelled';
}

export interface EntriesPageResponse {
  entries: EventEntry[];
  total: number;
  page: number;
  size: number;
  hasMore: boolean;
}

// 2주차: 공정 추첨 명단 봉인(Seal) 모델
export interface SealInfo {
  eventId: string;
  hash: string; // SHA-256 64자리 지문
  sealedAt: string; // 봉인 시각
  totalBallots: number; // 봉인된 총 제비 수
  totalEntries: number; // 봉인된 총 응모 건수
}

// 백엔드 공통 에러 모양: {"code":"PHONE_TAKEN","message":"이미 가입된 번호입니다"}
export interface ApiErrorBody {
  code: string;
  message: string;
}
