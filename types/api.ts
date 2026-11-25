// 백엔드와 주고받는 데이터 모양 (Fair Draw 1~4주차 전체 범위)
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
  startsAt: string; // 공연 일시 "2026-12-20T19:00:00+09:00"
  entryOpensAt: string; // 응모 시작
  entryClosesAt: string; // 응모 마감
  paymentDueAt: string; // 결제 마감
  // 프론트A 기존 파일(origin/main) 미수정 호환용 필드
  eventAt: string;
  entryStartAt: string;
  entryEndAt: string;
  paymentDeadlineAt: string;
  price: number;
  ballotsPerUser: number; // 1인당 제비 수 (기본 3)
  maxTeamSize: number; // 최대 연석 인원 (기본 2)
  status: EventStatus;
  sections?: Section[];
}

export interface EventInput {
  title: string;
  venue: string;
  posterUrl?: string;
  startsAt: string;
  entryOpensAt: string;
  entryClosesAt: string;
  paymentDueAt: string;
  price: number;
  ballotsPerUser: number;
  maxTeamSize: number;
}

export interface SectionInput {
  name: string;
  capacity: number;
  price: number | null;
}

// 2주차 & P-4: 연석 팀(Team) 모델 (백엔드 TeamDtos 규격)
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
  inviteCode: string | null;
  maxSize: number;
  full: boolean;
  members: TeamMember[];
}

// 2주차 & P-4: 주최자 실시간 통계 및 응모자 명단 모델 (백엔드 EntryDtos 규격)
export interface SectionStat {
  sectionId: string;
  name: string;
  capacity: number;
  applicants: number;
  ballots: number;
  ratio: number; // 숫자(예: 3.2)라서 ": 1"은 화면이 붙임
}

export interface EventStats {
  eventId: string;
  status: EventStatus;
  totalApplicants: number;
  totalBallots: number;
  teamCount: number;
  cancelledCount: number;
  sections: SectionStat[];
}

export interface EventEntry {
  id: string;
  realName: string;
  phone: string;
  allocations: MyEntryAllocation[];
  ballots: number;
  status: string;
  teamId: string | null;
  createdAt: string;
}

export interface EntriesPageResponse {
  content: EventEntry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// 2주차 & P-4: 공정 추첨 명단 봉인(Seal) 모델 (백엔드 DrawDtos 규격)
export interface SealSection {
  sectionId: string;
  name: string;
  ballots: number;
}

export interface SealInfo {
  eventId: string;
  rosterHash: string;
  sealedAt: string;
  ballotCount: number;
  sections: SealSection[];
}

// 백엔드 공통 에러 모양: {"code":"PHONE_TAKEN","message":"이미 가입된 번호입니다"}
export interface ApiErrorBody {
  code: string;
  message: string;
}

// --- 3주차 & FB-1: 추첨 결과 및 검증 타입 ---

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

export interface DrawResultRow {
  entryId: string;
  realName: string;
  phone: string;
  sectionName: string;
  result: 'won' | 'waitlisted' | 'lost';
  waitlistRank: number | null;
  teamId: string | null;
}

export interface DrawResultPage {
  content: DrawResultRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// --- 4주차: 예매, 결제, 티켓, 주최자 결제 현황, 스캔 타입 ---

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

// FB-3: 주최자 결제 현황 통계 및 예매 명단
export interface PaymentSectionStat {
  sectionId: string;
  name: string;
  capacity: number;
  paid: number;
  pending: number;
  expired: number;
  succeeded: number;
  waitlistLeft: number;
}

export interface PaymentStats {
  eventId: string;
  status: EventStatus;
  paymentDueAt: string;
  issued: number;
  entered: number;
  sections: PaymentSectionStat[];
}

export interface BookingRow {
  bookingId: string;
  realName: string;
  phone: string;
  sectionName: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  payDueAt: string;
  source: 'draw' | 'succession';
  paidAt: string | null;
}

export interface BookingPage {
  content: BookingRow[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// FB-4: 스태프/주최자 입장 스캔 요약 및 판정 응답
export interface ScanSummary {
  eventId: string;
  eventTitle: string;
  issued: number;
  entered: number;
}

export interface ScanResult {
  result: 'ok' | 'duplicate' | 'invalid';
  sectionName: string | null;
  scannedAt: string;
  holderName: string | null;
  message: string;
}
