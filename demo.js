// 서버 없는 데모: app/mock-server/main.py의 동작을 그대로 옮긴 것. main.py를 고치면 여기도 — test_parity.py가 두 쪽을 비교한다.
// now·newId는 테스트가 고정값을 넣으려고 받는다 (파이썬 쪽은 main._now·main.uuid를 같은 값으로 바꾼다).
const clock = () => new Date().toTimeString().slice(0, 8);   // "HH:MM:SS GMT…" 앞 8자 = 24시간제 현지 시각 (datetime.now().strftime("%H:%M:%S"))
const hex8 = () => [...crypto.getRandomValues(new Uint8Array(4))].map(b => b.toString(16).padStart(2, '0')).join('');   // uuid4().hex[:8] 모양. randomUUID는 http://내IP 에서 없음

export function createServer(F, { now = clock, newId = hex8 } = {}) {
  const load = name => structuredClone(F[name]);          // 파이썬은 매번 파일을 새로 읽는다 → 복제로 같은 효과 (빼면 픽스처가 오염됨)
  let RECORDS = null, LAST = null;
  const SESSIONS = new Map();
  const records = () => (RECORDS ??= load('records.json').records);
  const has = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);   // `in`은 'constructor'·'toString'도 참
  class HttpError { constructor(status, body) { this.status = status; this.body = body; } }
  const fail = (status, code, message) => { throw new HttpError(status, { error: { code, message } }); };
  const invalid = field => { throw new HttpError(422, { detail: [{ loc: ['body', field] }] }); };   // 422 본문은 계약 밖(A-2) — 패리티는 상태 코드만 본다
  const isObj = b => b !== null && typeof b === 'object' && !Array.isArray(b);                     // pydantic: 본문이 null·배열·숫자면 422

  function getStatus() {
    const s = load('status.json');
    s.recent = records().slice(0, 3).map(r => ({ label: r.recent_label, when: r.when, tone: r.status.tone }));
    return s;
  }
  function getRecords() {
    const x = load('records.json'), recs = records(), n = new Map();
    for (const r of recs) n.set(r.cause, (n.get(r.cause) ?? 0) + 1);             // Map = 처음 나온 순서 (Counter와 같음)
    x.rail.counts = [...n].sort((a, b) => b[1] - a[1])                          // 안정 정렬 → 동률은 처음 나온 순서 (most_common과 같음)
      .map(([c, k]) => ({ label: c, value: String(k), tone: x.rail.count_tones[c] ?? 'ok' }));
    if (!recs.length) for (const b of x.rail.chart_bars) Object.assign(b, { h: 0, peak: false });
    x.meta = x.meta.split('{n}').join(String(recs.length));
    x.records = recs.map(r => ({ ...r, chain_caption: x.chain_caption }));
    return x;
  }
  function getExpert(session) {
    const x = load('expert.json');
    if (session && !SESSIONS.has(session)) fail(404, 'SESSION_NOT_FOUND', `세션 ${session} 없음`);   // A-5: 없는 세션에 남의 마지막 진단을 주지 않는다. 빈 값('?session=')은 안 준 것
    const s = session ? SESSIONS.get(session) : LAST;
    if (!s) return { topbar: x.topbar, log: { ...x.log, range: '', entries: [] }, empty: x.idle, actions: { ...x.actions, secondary: null } };
    const fill = o => JSON.parse(JSON.stringify(o).split('{answer}').join(s.answer ?? ''));   // 파이썬도 따옴표를 이스케이프하지 않는다 — 답 제목에 " 가 들어가면 양쪽 다 깨진다
    const entries = s.history.flatMap(([key, time]) => fill(x.fragments[key]).map(e => ({ time, ...e })));
    const hist = s.history.map(([key]) => key), tones = new Map();             // Map = 넣은 순서, 덮어써도 자리 유지 (파이썬 dict와 같음)
    const seg = hist.slice(Math.max(0, hist.lastIndexOf('scanning')));         // restart·back → scanning이면 거기서부터 새 경로 (로그는 계속 쌓임)
    seg.forEach((key, i) => {
      const answered = key === 'question_outside' && i + 1 < seg.length;       // 이 구간에서 답한 질문 → 고른 답이 표시등 증거의 상태를 정한다
      for (const p of [...(has(x.path, key) ? x.path[key] : []), ...(answered && has(x.path_answer, s.answer_id) ? x.path_answer[s.answer_id] : [])]) {
        if (p.tone !== 'out') tones.set(p.id, p.tone);
        else if (tones.has(p.id)) tones.set(p.id, 'out');                        // 기각: 이미 경로에 있는 가설만 흐리게 남긴다
      }
    });
    return { topbar: x.topbar, log: { ...x.log, range: `${entries[0].time} → ${entries.at(-1).time}`, entries }, ...fill(x.screens[s.key]),
             path: [...tones].map(([id, tone]) => ({ id, tone })), actions: x.actions };
  }
  function payload(key, i) {
    const p = load('screens.json')[key];
    if (p.screen === 'steps') {
      p.steps.forEach((st, j) => { st.state = j < i ? 'failed' : j === i ? 'todo' : 'upcoming'; });
      p.rail.steps[2].answer = `${i + 1} / ${p.steps.length} 단계`;
      p.path.note = p.step_note.split('{n}').join(String(i + 1)); delete p.step_note;
    }
    return p;
  }
  const reply = (id, s) => ({ session_id: id, scenario: s.scenario, payload: payload(s.key, s.step_index) });

  function start(body) {
    if (!isObj(body)) invalid('body');
    const scenario = body.scenario === undefined ? 'wifi' : body.scenario;     // 없으면 기본값, null은 422 (pydantic Literal)
    if (scenario !== 'wifi' && scenario !== 'outside') invalid('scenario');
    const first = load('scenarios.json')[scenario].start, id = newId();       // 422 검사가 id 발급보다 먼저 (파이썬은 검증을 통과해야 함수가 불린다)
    SESSIONS.set(id, { scenario, key: first, step_index: 0, history: [[first, now()]] });
    return reply(id, SESSIONS.get(id));
  }
  function advance(id, body) {                                                   // 순서: 본문 422 → 세션 404 → finish → 전이
    if (!isObj(body)) invalid('body');
    const { event, value = null } = body;
    if (typeof event !== 'string') invalid('event');                             // pydantic 2는 숫자를 str로 바꿔 주지 않는다
    if (value !== null && typeof value !== 'string') invalid('value');
    const s = SESSIONS.get(id);
    if (!s) fail(404, 'SESSION_NOT_FOUND', `세션 ${id} 없음`);
    if (event === 'finish') {                                                    // 어느 화면에서든 통과 (현행 A-4)
      SESSIONS.delete(id); LAST = s;
      const t = load('records.json').templates[s.key];
      if (t && Object.keys(t).length) records().unshift({ id, when: `오늘 ${s.history.at(-1)[1].slice(0, 5)}`, ...t });   // 파이썬 `if t:` — 빈 dict는 거짓
      return reply(id, s);
    }
    const table = load('scenarios.json')[s.scenario].transitions[s.key] ?? {}, key = s.key;
    if (event === 'step_failed' && has(table, 'exhausted')) {                   // 조치 화면: 다음 단계로, 다 해봤으면 exhausted로
      s.step_index += 1;
      if (s.step_index >= load('screens.json')[key].steps.length) [s.key, s.step_index] = [table.exhausted, 0];
    } else if (has(table, event) && event !== 'exhausted') {
      let nxt = table[event];
      if (nxt !== null && typeof nxt === 'object') {                             // 사람의 답에 따라 갈라지는 전이
        if (!has(nxt, value)) fail(409, 'INVALID_EVENT', `'${key}' 화면의 답은 [${Object.keys(nxt).map(k => `'${k}'`).join(', ')}] 중 하나여야 해요`);   // 파이썬 list repr
        nxt = nxt[value];
      }
      [s.key, s.step_index] = [nxt, 0];
    } else fail(409, 'INVALID_EVENT', `'${key}' 화면에서는 '${event}' 이벤트를 받을 수 없어요`);
    if (event === 'answer') { s.answer = load('screens.json').question_outside.answers.find(a => a.id === value)?.title ?? (value || ''); s.answer_id = value; }
    if (s.key !== key) s.history.push([s.key, now()]);                          // 자기 전이(call·records)는 이력에 안 쌓인다
    return reply(id, s);
  }
  function route(method, path, body) {
    const u = new URL(path, 'http://demo'), p = u.pathname, m = p.match(/^\/diagnose\/([^/]+)\/advance$/);
    if (method === 'GET' && p === '/status') return getStatus();
    if (method === 'GET' && p === '/records') return getRecords();
    if (method === 'POST' && p === '/records/clear') { RECORDS = []; return { cleared: true }; }
    if (method === 'GET' && p === '/settings') return load('settings.json');
    if (method === 'GET' && p === '/kg') return load('kg.json');
    if (method === 'GET' && p === '/expert') return getExpert(u.searchParams.get('session'));
    if (method === 'POST' && p === '/diagnose/start') return start(body);
    if (method === 'POST' && m) return advance(decodeURIComponent(m[1]), body);
    fail(404, 'NOT_FOUND', `${method} ${p} 없음`);                               // 파이썬은 정적 서빙이 받는 자리. 앱은 부르지 않는다
  }
  return {
    handle(method, path, body) {
      try { return { status: 200, body: route(method, path, body) }; }
      catch (e) { if (e instanceof HttpError) return { status: e.status, body: e.body }; throw e; }   // 프로그래밍 오류는 삼키지 않는다
    },
  };
}
