// 백엔드와 주고받는 데이터 모양 (Fair Draw 1~2주차 전체 범위)
// ⚠️ Swagger(https://fairdraw-api.vercel.app/swagger-ui/index.html) 규격과 일치하도록 관리합니다.

export type EventStatus = 'draft' | 'open' | 'closed' | 'drawn' | 'paying' | 'done';

export interface MyEntryAllocation {
  sectionId: string;
  sectionName: string;
  ballots: number;
}

export interface MyEntry {
  id: string;
  eventId: string;
  status: string;
  teamId: string | null;
  createdAt: string;
  totalBallots: number;
  allocations: MyEntryAllocation[];
}

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
  paymentDueAt?: string;
}

export type EventInput = Omit<EventItem, 'id' | 'status' | 'sections'>;

export interface SectionInput {
  name: string;
  capacity: number;
  price: number | null;
}

// 2주차: 연석 팀(Team) 모델
export interface TeamMember {
  profileId: string;
  realName: string;
  leader: boolean;
}

export interface Team {
  id: string;
  eventId: string;
  sectionId: string;
  sectionName: string;
  leaderId: string;
  inviteCode: string;
  maxSize: number;
  full: boolean;
  members: TeamMember[];
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

// --- 3주차: 추첨 결과 및 검증 타입 ---

export interface MyDrawResult {
  eventId: string;
  result: 'won' | 'waitlisted' | 'lost';
  sectionId: string | null;
  sectionName: string | null;
  waitlistRank: number | null;
  teamId: string | null;
  ballotIds: string[];
}

export interface DrawSectionStat {
  sectionId: string;
  name: string;
  capacity: number;
  ballots: number;
  won: number;
  waitlisted: number;
}

export interface DrawInfo {
  eventId: string;
  rosterHash: string;
  sealedAt: string;
  ballotCount: number;
  seed: string;
  drawnAt: string;
  drawnAtMillis: number;
  sections: DrawSectionStat[];
}

export interface PublicBallot {
  order: number;
  ballotId: string;
  sectionName: string;
  result: 'won' | 'waitlisted' | null;
}

export interface PublicBallotsResponse {
  eventId: string;
  ballots: PublicBallot[];
}
// --- 4주차: 예매, 결제, 티켓 타입 ---

export interface MyBooking {
  bookingId: string;
  eventId: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  sectionName: string;
  amount: number;
  payDueAt: string;
  source: 'draw' | 'succession';
  paidAt: string | null;
}

export interface PaymentPrepare {
  paymentId: string;
  amount: number;
  orderName: string;
  storeId: string;
  channelKey: string;
}

export interface PaymentComplete {
  paymentId: string;
  status: 'paid';
  bookingId: string;
  eventId: string;
}

export interface MyTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  sectionName: string;
  startsAt: string;
  code: string; // 40글자 16진수 비밀값
  status: 'valid' | 'used' | 'void';
  usedAt: string | null;
}