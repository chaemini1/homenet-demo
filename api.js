// 서버와 말하는 유일한 파일. 화면 코드는 fetch를 모른다.
// 데모 빌드(tools/build-static.py)는 <html data-mode="demo">를 박는다 → fetch 대신 demo.js가 같은 계약으로 답한다(API 요청 0회).
// 자동 감지(서버가 안 되면 데모로)는 하지 않는다: 서버 고장을 그럴듯한 예시 화면으로 덮는 침묵 실패가 되기 때문.
export let demoBroken = false;   // true면 app.js가 재시도 버튼을 새로고침으로 바꾼다
const demo = document.documentElement.dataset.mode === 'demo'
  && Promise.all([import('./demo.js?v=b189bc4a'), import('./fixtures.js?v=b189bc4a')])
    // 브라우저가 실패한 import를 기억해서 다시 시도로는 안 풀린다 → 새로고침 안내 (demoBroken)
    .catch(() => { demoBroken = true; throw new Error('데모 파일을 받지 못했어요. 새로고침(F5) 해 주세요'); })
    .then(([d, f]) => d.createServer(f.default));

export const getStatus = () => call('/status');
export const getRecords = () => call('/records');
export const clearRecords = () => call('/records/clear', {});
export const getSettings = () => call('/settings');
export const getKg = () => call('/kg');
export const getExpert = sessionId => call(sessionId ? `/expert?session=${encodeURIComponent(sessionId)}` : '/expert');
export const startDiagnosis = (scenario = 'wifi') => call('/diagnose/start', { scenario });
export const advance = (sessionId, event, value = null) => call(`/diagnose/${encodeURIComponent(sessionId)}/advance`, { event, value });

async function call(path, body) {
  if (demo) {
    const r = (await demo).handle(body === undefined ? 'GET' : 'POST', path, body);
    const b = JSON.parse(JSON.stringify(r.body));   // 선을 한 번 지난 것처럼 복사: 화면 코드가 데모 서버 상태를 직접 못 건드리게
    if (r.status !== 200) throw toError(r.status, b);
    return b;
  }
  // 서버나 와이파이가 멈추면 await가 영영 안 끝나 이후 클릭이 전부 무시된다 → 8초에 끊고 오류로 보여 준다
  const opts = { signal: AbortSignal.timeout(8000) };
  if (body !== undefined) Object.assign(opts, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const r = await fetch(path, opts);
    if (!r.ok) throw toError(r.status, await r.json().catch(() => null));
    return await r.json();
  } catch (e) {
    if (e.name === 'TimeoutError') throw new Error('서버 응답이 없어요');
    throw e;
  }
}

// 계약 오류 {"error":{"code","message"}} → Error(message); 그 형식이 아니면 "HTTP <status>"
function toError(status, b) { const err = new Error(b?.error?.message ?? `HTTP ${status}`); err.status = status; return err; }
