export interface VerifyResult {
  rosterOk: boolean;
  seedOk: boolean;
  orderOk: boolean;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyDraw(
  info: { rosterHash: string; seed: string; drawnAtMillis: number },
  ballots: { order: number; ballotId: string }[],
): Promise<VerifyResult> {
  const ids = ballots.map((b) => b.ballotId);

  // 1) 명단 지문: 제비 id를 글자 오름차순 정렬 → 줄바꿈('\n')으로 이어 붙임 → SHA-256
  const rosterOk =
    (await sha256Hex([...ids].sort().join('\n'))) === info.rosterHash;

  // 2) 시드: 봉인 해시 + ":" + 추첨 시각(밀리초)
  const seedOk =
    (await sha256Hex(`${info.rosterHash}:${info.drawnAtMillis}`)) === info.seed;

  // 3) 순서: 제비마다 SHA-256(시드:제비id)를 구해 그 값 순으로 정렬
  const keyed = await Promise.all(
    ids.map(async (id) => ({
      id,
      key: await sha256Hex(`${info.seed}:${id}`),
    })),
  );
  keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const published = [...ballots].sort((a, b) => a.order - b.order);
  const orderOk =
    keyed.length === published.length &&
    keyed.every((k, i) => k.id === published[i].ballotId);

  return { rosterOk, seedOk, orderOk };
}