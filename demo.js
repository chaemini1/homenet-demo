// 서버 없는 데모: app/mock-server/main.py의 동작을 옮긴 것. main.py를 고치면 여기도 고친다.
// 같은지는 test_parity.py(응답 모양·데모 빌드)와 test_demo_intent.py(세부 질문 흐름·기록)가 확인한다. 측정 관련 동작은 예시 데이터라 일부러 다르다.
// now·newId는 테스트가 고정값을 넣으려고 받는다 (파이썬 쪽은 main._now·main.uuid를 같은 값으로 바꾼다).
const clock = (d = new Date()) => d.toTimeString().slice(0, 8);   // "HH:MM:SS GMT…" 앞 8자 = 24시간제 현지 시각 (datetime.now().strftime("%H:%M:%S"))
const hex8 = () => [...crypto.getRandomValues(new Uint8Array(4))].map(b => b.toString(16).padStart(2, '0')).join('');   // uuid4().hex[:8] 모양. randomUUID는 http://내IP 에서 없음

// ── 자유 입력 세부 질문 (서버의 WIFI_INTENT_FLOW_ENABLED=1·WIFI_KG_ENABLED=1과 같은 동작) ──
// 분류: wifi_intent_classifier.py와 같은 계산. 점수표는 demo_build.py가 뽑은 intent_model.json (학습 결과 그대로)
// 흐름: intent_flow.py, KG 답: kg_bridge.py + kg_answers.json (Neo4j에 1,050가지 조합을 미리 물어 둔 답). 고치면 test_demo_intent.py가 서버와 비교한다
const cps = s => [...s];                                                       // 파이썬 len·슬라이스는 코드포인트 단위
// 파이썬 f"{c:.1%}": c*100을 소수 한 자리로. 정확히 반인 값은 짝수 쪽 (toFixed는 올림이라 0.0125가 1.3%가 된다)
export const scoreText = c => {
  const v = c * 100, tie = Number.isInteger(v * 4) && !Number.isInteger(v * 2);   // 2진수로 정확히 반인 값은 x.25·x.75뿐 (v*4는 오차 없이 계산된다)
  const f = Math.floor(v * 10);
  return `${tie ? ((f % 2 ? f + 1 : f) / 10).toFixed(1) : v.toFixed(1)}%`;   // 그 밖에는 toFixed와 파이썬이 같은 쪽으로 반올림한다
};
export function intentClassifier(M) {
  const vocab = new Map(Object.entries(M.vocab));                             // 객체 그대로 쓰면 'constructor' 같은 조각이 걸린다
  const short = Object.entries(M.shorthand).sort((a, b) => cps(b[0]).length - cps(a[0]).length);   // 파이썬 sorted(..., reverse=True)도 안정 정렬
  const normalize = t => short.reduce((n, [a, b]) => n.split(a).join(b), t.toLowerCase().split(/\s+/).filter(Boolean).join(' '));
  const grams = t => {                                                         // sklearn char_wb: 낱말 앞뒤에 빈칸을 붙여 2~5글자 조각
    const out = [];
    for (const word of t.toLowerCase().split(/\s+/).filter(Boolean)) {
      const w = cps(` ${word} `);
      for (let n = 2; n <= 5; n++) {
        let o = 0;
        out.push(w.slice(o, o + n).join(''));
        while (o + n < w.length) { o++; out.push(w.slice(o, o + n).join('')); }
        if (o === 0) break;
      }
    }
    return out;
  };
  const uninformative = t => {
    const compact = t.replace(/\s+/g, '');
    return (compact.match(/[가-힣A-Za-z0-9]/g) ?? []).length < 3 || new Set(cps(compact)).size === 1;
  };
  const slowWithoutScope = t => M.slow_markers.some(m => t.includes(m)) && !M.scope_markers.some(m => t.includes(m));
  const round6 = x => Number(x.toFixed(6));
  return text => {
    const t = normalize(text), len = cps(t).length;
    if (len < 2 || len > 500) return null;                                     // 서버는 ValueError → intent_flow가 성의 없는 입력으로 다룬다
    const counts = new Map();
    for (const g of grams(t)) if (vocab.has(g)) { const i = vocab.get(g); counts.set(i, (counts.get(i) ?? 0) + 1); }
    const idx = [...counts.keys()].sort((a, b) => a - b);                      // sklearn은 조각 번호 순으로 더한다
    const x = idx.map(i => (1 + Math.log(counts.get(i))) * M.idf[i]);          // sublinear_tf, idf
    const norm = Math.sqrt(x.reduce((a, v) => a + v * v, 0));
    const xs = norm > 0 ? x.map(v => v / norm) : x;
    const jll = M.classes.map((_, c) => idx.reduce((a, i, k) => a + xs[k] * M.logp[c][i], 0) + M.prior[c]);
    const top = Math.max(...jll), lse = Math.log(jll.reduce((a, v) => a + Math.exp(v - top), 0)) + top;
    const top3 = M.classes.map((id, c) => [id, Math.exp(jll[c] - lse)]).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([id, p]) => ({ symptom_id: id, label: M.labels[id], confidence: round6(p) }));
    const [first, second = { confidence: 0 }] = top3, reasons = [];
    if (uninformative(t) || !idx.length) reasons.push('uninformative_input');
    if (slowWithoutScope(t)) reasons.push('slow_scope_missing');
    if (first.confidence <= M.low) reasons.push('confidence_at_or_below_20_percent');
    if (first.confidence - second.confidence < M.margin) reasons.push('top_candidates_too_close');
    return { model: M.model, top3, needs_clarification: reasons.length > 0,
             clarification: reasons.length ? { ...(reasons.includes('slow_scope_missing') ? M.slow_scope : M.ambiguous), reasons } : null };
  };
}

const TEXT_KEYS = ['followup_WFU14', 'followup_WFU14_retry', 'followup_intent_choice'];
const HEADLINE = { pill: null, title: '어떤 점이 불편한가요?', body: null };
const EXAMPLES = ['와이파이는 연결됐는데 인터넷이 안 돼요', '랜선은 빠른데 와이파이만 느려요', '다른 기기는 되는데 제 폰만 연결이 안 돼요', '랜선도 와이파이도 전부 인터넷이 안 됩니다'];
const CHOICE_LABELS = { slow_media_or_download: '영상이나 다운로드만 유난히 느림', wired_ok_wifi_slow: '랜선은 빠르고 Wi-Fi만 느림', room_specific_slow: '특정 방에서만 느리거나 끊김',
  far_room_only: '먼 방에서만 느리거나 끊김', all_devices_offline: '유선·Wi-Fi 기기 모두 인터넷 안 됨', not_sure: '잘 모르겠음' };
const VALID = new Set(Array.from({ length: 25 }, (_, i) => `WFS${String(i + 1).padStart(2, '0')}`));
const inputBox = (box, s, submit) => ({ ...box, value: s.text ?? '', examples: EXAMPLES, submit });

function intentNext(s, key, event, value, destination, source, classify) {   // intent_flow.next_key
  if (destination === 'scanning') for (const k of Object.keys(s)) if (k.startsWith('_intent_')) delete s[k];
  if (destination === 'followup_entry') return 'followup_WFU14';
  if (key === 'followup_intent_choice' && event === 'back' && s._intent_all) { delete s._intent_all; return key; }   // 나머지 증상 목록에서 이전: 분류 후보로
  if (event !== 'answer' || !TEXT_KEYS.includes(key)) return destination;
  if (value !== 'text') {
    delete s._intent_error;
    if (key === 'followup_intent_choice' && value === 'none' && !s._intent_all) return intentRest(s, source);
    return key === 'followup_intent_choice' ? destination : 'followup_WFU14_end';
  }
  delete s._intent_all;
  if (!classify) { s._intent_error = true; return 'followup_WFU14_end'; }
  const result = classify(s.text) ?? { needs_clarification: true, clarification: { reasons: ['uninformative_input'] } };
  delete s._intent_error;
  const clar = result.clarification ?? {};
  if ((clar.reasons ?? []).includes('uninformative_input')) {
    if (!s._intent_retried) { s._intent_retried = true; return 'followup_WFU14_retry'; }
    return 'followup_WFU14_end';
  }
  const ranked = (result.top3 ?? []).filter(c => VALID.has(c.symptom_id) && Object.hasOwn(source, 'followup_' + c.symptom_id))
    .map(c => ({ id: c.symptom_id, symptom_id: c.symptom_id, label: c.label, score: c.confidence >= 0.01 ? scoreText(c.confidence) : '1% 미만' }));
  const intent = { input_title: '증상 설명', title: '비슷한 증상', score_label: '설명과 비슷한 정도' };
  let choices;
  if (result.needs_clarification === false) {
    choices = ranked.length ? [...ranked, { id: 'none', symptom_id: null, label: '이 중에 없음' }] : [];
  } else {
    intent.ranked = ranked.map(c => ({ id: c.id, title: c.label, score: c.score }));
    intent.note = { tone: 'warn', text: '쓴 설명만으로는 증상을 하나로 정하기 어렵습니다.' };
    intent.question = clar.question ?? null;
    choices = clar.choices ?? [];
  }
  if (!choices.length) return 'followup_WFU14_end';
  const page = structuredClone(source.followup_intent_choice);
  Object.assign(page, { headline: HEADLINE, text_input: inputBox(source.followup_WFU14.text_input, s, '다시 찾기'), intent, answers: [] });
  page.actions.footnote = '';
  const routes = {};
  for (const c of choices) {
    const target = VALID.has(c.symptom_id) ? 'followup_' + c.symptom_id : 'followup_WFU14_end';
    if (!Object.hasOwn(source, target) || Object.hasOwn(routes, c.id)) throw new Error('분류 추가 질문의 연결이 잘못되었습니다.');
    page.answers.push({ id: c.id, title: CHOICE_LABELS[c.id] ?? c.label, ...('score' in c ? { score: c.score } : {}) });
    routes[c.id] = target;
  }
  routes.text = 'followup_intent_choice';
  s._intent_screen = page; s._intent_routes = routes;
  return 'followup_intent_choice';
}

function intentRest(s, source) {                                                // intent_flow._rest: 이 중에 없음 → 나머지 증상
  const page = structuredClone(s._intent_screen), shown = new Set(page.answers.map(a => a.id));
  const ids = [...VALID].filter(id => !shown.has(id) && Object.hasOwn(source, 'followup_' + id));
  page.intent = { input_title: '증상 설명', title: '나머지 증상' };
  page.answers = ids.map(id => ({ id, title: source['followup_' + id].headline.title }));
  s._intent_all = page;
  return 'followup_intent_choice';
}
const intentPage = s => s._intent_all ?? s._intent_screen;                      // intent_flow._page
const intentRoutes = s => s._intent_all                                         // intent_flow.table: 목록의 연결은 목록에서, 분류 후보 연결은 그대로 둔다
  ? { ...Object.fromEntries(s._intent_all.answers.map(a => [a.id, 'followup_' + a.id])), text: 'followup_intent_choice' } : s._intent_routes ?? {};

function intentPaint(s, p) {                                                    // intent_flow.paint
  const key = s.key;
  if (key.startsWith('followup_') && !TEXT_KEYS.includes(key) && (s.stack ?? []).some(k => TEXT_KEYS.includes(k)))
    for (const step of p.rail.steps) if (step.state === 'current') step.edit = '설명 수정';   // 글을 쓴 뒤의 화면: 쓴 설명으로 한 번에 돌아가는 링크
  if (key === 'followup_intent_choice' && intentPage(s)) {
    for (const n of ['headline', 'answers', 'text_input', 'intent']) p[n] = structuredClone(intentPage(s)[n]);
    p.actions.footnote = intentPage(s).actions.footnote;
  }
  if (key === 'followup_WFU14' || key === 'followup_WFU14_retry') {
    const retry = key === 'followup_WFU14_retry';
    Object.assign(p, { headline: structuredClone(HEADLINE), answers: [], text_input: inputBox(p.text_input, retry ? s : {}, '비슷한 증상 찾기') });
    p.intent = { input_title: '증상 설명', title: '비슷한 증상',
      ...(retry ? { note: { tone: 'warn', text: '비슷한 증상을 찾지 못함. 기기와 하려던 일을 덧붙여 다시 찾기를 권장함.' } } : {}),
      empty: null };   // 빈 칸 안내는 칸 제목이 대신하고, 다시 할 일은 노란 상자에 함께 (11/17 사용자)
    p.actions.footnote = '';
    p.actions.primary = null;
  }
  if (key === 'followup_WFU14_end') {
    if (s._intent_error) p.headline.body = '입력 분류 정보를 불러오지 못했습니다. 원인은 확정하지 않았습니다.';
    else if (s.answer_id === 'text') p.headline.body = '쓴 설명만으로는 증상을 정하지 못했습니다.';
  }
  return p;
}

function kgRemember(s, previous, event, value) {                               // kg_bridge.remember
  const active = [...(s.stack ?? []), s.key], answers = s._kg_answers ?? {};
  if (event === 'answer' && previous.startsWith('followup_')) answers[previous] = value;
  s._kg_answers = Object.fromEntries(Object.entries(answers).filter(([k]) => active.includes(k)));
  if (s.key === 'scanning') { delete s._kg_answers; delete s._kg_cache; }
}

const answerTitle = (screens, key, id) => screens[key]?.answers?.find(a => a.id === id)?.title ?? null;

// main.py _followup_log: 세부 질문 화면에 들어간 시점의 로그 줄 (입력·분류 / 선택 / 기기·KG)
function followupLog(s, key, screens) {
  if (key === 'followup_intent_choice' && s._intent_screen) {
    const page = s._intent_screen, ranked = page.intent.ranked?.length ? page.intent.ranked : page.answers.filter(a => a.score);
    return [{ tag: '입력', tone: 'neutral', text: s.text ?? '' },
      ...(ranked.length ? [{ tag: '분류', tone: 'neutral', text: ranked.map(a => `${a.id} ${a.score}`).join(', ') }] : [])];
  }
  if (key.startsWith('followup_WFS') && Object.hasOwn(screens, key)) return [{ tag: '선택', tone: 'neutral', text: screens[key].headline.title }];
  if (key === 'followup_done' && s._kg_cache) {
    const [q, device, system] = s._kg_cache.signature;
    const names = [device && answerTitle(screens, 'followup_WFU12', device), system && answerTitle(screens, 'followup_WFU13', system)].filter(Boolean);
    const causes = s._kg_cache.result.symptoms.flatMap(sym => sym.candidates), actions = causes.flatMap(c => c.actions);
    let text = `${q}: 원인 ${causes.length}, 조치 ${actions.length}`;
    if (device && system) text += `, 절차 ${actions.reduce((n, a) => n + a.procedures.length, 0)}`;
    return [...(names.length ? [{ tag: '기기', tone: 'neutral', text: names.join(', ') }] : []), { tag: 'KG', tone: 'ok', text }];
  }
  return [];
}

export function kgOverview(K, screens) {                                           // kg_bridge.overview (Neo4j 대신 미리 물어 둔 답)
  const causes = new Map();
  for (let i = 1; i <= 25; i++) {
    const sid = `WFS${String(i).padStart(2, '0')}`;
    for (const symptom of K.answers[K.index[`${sid}||`]].symptoms) for (const cause of symptom.candidates) {
      if (!causes.has(cause.label)) causes.set(cause.label, { name: cause.label, symptoms: [], conditions: cause.conditions, actions: cause.actions });
      causes.get(cause.label).symptoms.push({ id: sid, title: screens[`followup_${sid}`].headline.title });
    }
  }
  return { source: 'saved', causes: [...causes.values()] };
}

export function kgApply(s, p, K, screens = null) {                                      // kg_bridge.apply (Neo4j 조회 대신 미리 물어 둔 답)
  if (s.key !== 'followup_done') return p;
  const seeds = new Set([...Array.from({ length: 15 }, (_, i) => `followup_WFQ${String(i + 1).padStart(2, '0')}`), ...[...VALID].map(v => 'followup_' + v)]);
  const q = [...(s.stack ?? []), s.key].reverse().find(k => seeds.has(k))?.slice('followup_'.length);
  if (!q) return p;
  const ans = s._kg_answers ?? {};
  let device = ans.followup_WFU12 ?? '', system = ans.followup_WFU13 ?? '';
  if (!/^DEV0[1-5]$/.test(device)) device = '';
  if (!/^OS0[1-6]$/.test(system)) system = '';
  const at = K && q.startsWith('WFS') ? K.index[`${q}|${device}|${system}`] : undefined;
  if (at === undefined) {                                                      // 서버의 조회 실패와 같은 화면
    delete s._kg_cache;                                                        // kg_bridge와 같게: 앞서 성공한 답을 로그가 읽지 않게
    p.headline = { pill: null, title: '지식 정보를 불러오지 못함', body: '측정 결과는 그대로 유지됨. 로컬 Neo4j 실행 상태와 접속 설정 확인 필요.' };
    return p;
  }
  const result = K.answers[at], rows = [];
  const row = (label, value) => rows.push({ label, value, status: 'unknown' });
  for (const symptom of result.symptoms) for (const cause of symptom.candidates) {
    row('원인 후보', cause.label);
    for (const c of cause.conditions) row('확인할 조건', c);
    for (const a of cause.actions) {
      row('확인·조치', a.label);
      if (device && system) for (const pr of a.procedures) {
        const scope = pr.applicability.join(' / ');
        row('상세 절차 · ' + pr.label, pr.description + (scope ? ' 적용 조건: ' + scope : ''));
      }
    }
  }
  if (!rows.length) row('추가 확인 필요', '연결된 원인 후보가 없습니다. 정상이라는 뜻은 아닙니다.');
  const sources = result.sources.map(x => ({ label: [x.publisher, x.title].filter(Boolean).join(' · '), url: x.url ?? null, kind: 'official' }));
  if (sources.length) rows.push({ label: '참고 자료', value: '위 안내에 관련된 문서입니다.', status: 'unknown', sources });
  const body = q.startsWith('WFS') && Number(q.slice(3)) >= 16 ? '공식 문서 출처가 아직 없는 프로젝트 설계 초안임.' : null;   // kg_bridge와 같게: 초안 증상일 때만
  p.headline = { pill: null, title: '가능한 원인과 확인 방법', body };
  p.evidence = { title: 'KG 조회 결과', rows };
  s._kg_cache = { signature: [q, device, system], result };                   // kg_bridge와 같게: 전문가 로그의 KG 줄이 읽는다
  if (screens && Object.hasOwn(screens, 'followup_' + q)) p.kg_path = {             // kg_bridge.kg_path
    input: [...(s.stack ?? []), s.key].some(k => TEXT_KEYS.includes(k)) ? s.text ?? null : null,
    symptom: screens['followup_' + q].headline.title,
    device: device ? answerTitle(screens, 'followup_WFU12', device) : null,
    os: system ? answerTitle(screens, 'followup_WFU13', system) : null,
  };
  return p;
}

// 진단 기록은 이 브라우저에 남긴다 (11/17 회의: 원인별 건수가 실제로 쌓이게). 노드(테스트)에는 window가 없어 메모리만 쓰고,
// 저장소를 막아 둔 브라우저도 이번 방문 동안 메모리만 쓴다. 서버(main.py)는 서버 메모리에 둔다
const RECORDS_KEY = 'homenet.records';
const AT = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;   // 끝낸 시각 "YYYY-MM-DDTHH:MM"
const storedRecords = () => {
  try {
    const v = JSON.parse(globalThis.window?.localStorage.getItem(RECORDS_KEY) ?? 'null');
    return Array.isArray(v) ? v.filter(r => AT.test(r?._at) && !Number.isNaN(Date.parse(r._at.slice(0, 10))) && r.status && Array.isArray(r.chain)) : null;   // 손으로 고친 값·다른 형식은 버린다
  } catch { return null; }
};
const saveRecords = v => { try { globalThis.window?.localStorage.setItem(RECORDS_KEY, JSON.stringify(v)); } catch { /* 저장 불가면 이번 방문만 */ } };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// main.py _record_when·_public_record: 끝낸 시각(_at)을 지금과 비교해 "오늘 14:32"·"어제"·"3일 전"을 만들고, _at은 내보내지 않는다
export const recordWhen = (r, today = new Date()) => {
  const days = Math.round((Date.parse(ymd(today)) - Date.parse(r._at.slice(0, 10))) / 864e5);
  return `${days <= 0 ? '오늘' : days === 1 ? '어제' : `${days}일 전`} ${r._at.slice(11, 16)}`;   // 기기 시계가 뒤로 가 미래 날짜가 되면 "오늘"
};
const publicRecord = ({ _at, ...r }) => ({ ...r, at: _at, when: recordWhen({ _at }) });   // at: 내보내기 파일에 실제 날짜가 남게
// main.py _followup_record: 세부 질문으로 끝난 진단은 사용자가 고른 증상으로 센다(KG의 원인 후보 순서는 가능성 순위가 아님).
// 원인 후보는 기록을 펼쳤을 때 보인다(최대 3개). 증상을 모르면 원인 미확정
export function followupRecord(p) {
  const symptom = p.kg_path?.symptom;
  if (!symptom) return { cause: '원인 미확정', fix: '추가 확인 필요', recent_label: '세부 질문으로 원인을 정하지 못함',
    status: { tone: 'unknown', text: '판단 불가' },
    chain: [{ kind: '관찰', text: '세부 질문', tone: 'unknown' }, { kind: '원인', text: '원인 미확정', tone: 'unknown' }] };
  const causes = [...new Set((p.evidence?.rows ?? []).filter(r => r.label === '원인 후보').map(r => r.value))];
  const chain = [{ kind: '증상', text: symptom, tone: 'bad' }, ...causes.slice(0, 3).map(c => ({ kind: '원인 후보', text: c, tone: 'unknown' }))];
  if (!causes.length) return { cause: symptom, fix: '추가 확인 필요', recent_label: `${symptom}, 원인을 정하지 못함`, status: { tone: 'unknown', text: '판단 불가' }, chain };
  return { cause: symptom, fix: `원인 후보 ${causes.length}개 확인`, recent_label: `${symptom}, 원인 후보 ${causes.length}개 안내받음`,
    status: { tone: 'unknown', text: '확인 필요' }, chain };
}

// intent: 새 세부 질문을 쓸지. 점수표가 있으면 켠다 (공개 데모). 플래그를 끈 서버와 비교하는 test_parity는 false로 부른다
export function createServer(F, { now = clock, newId = hex8, intent = Boolean(F['intent_model.json']) } = {}) {
  const classify = intent && F['intent_model.json'] ? intentClassifier(F['intent_model.json']) : null;
  const load = name => structuredClone(F[name]);          // 파이썬은 매번 파일을 새로 읽는다 → 복제로 같은 효과 (빼면 픽스처가 오염됨)
  let RECORDS = null, LAST = null;
  const SESSIONS = new Map();
  // 매번 저장소부터 읽는다: 다른 탭에서 지운 기록(= 동의 철회)이 이 탭의 사본으로 되살아나지 않게. 저장소를 못 쓰면 메모리
  const records = () => (RECORDS = storedRecords() ?? RECORDS ?? load('records.json').records);
  const has = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);   // `in`은 'constructor'·'toString'도 참
  class HttpError { constructor(status, body) { this.status = status; this.body = body; } }
  const fail = (status, code, message) => { throw new HttpError(status, { error: { code, message } }); };
  const invalid = field => { throw new HttpError(422, { detail: [{ loc: ['body', field] }] }); };   // 422 본문은 계약 밖(A-2) — 패리티는 상태 코드만 본다
  const isObj = b => b !== null && typeof b === 'object' && !Array.isArray(b);                     // pydantic: 본문이 null·배열·숫자면 422

  function getStatus(check = true) {
    const s = load('status.json');
    if (!check) {
      Object.assign(s, load('status_unchecked.json'));
      for (const v of Object.values(s.by_isp ?? {})) if (v.home) v.home = { ...s.home, isp: v.home.isp };
    }
    s.recent = records().slice(0, 3).map(r => ({ label: r.recent_label, when: recordWhen(r), tone: r.status.tone }));
    return s;
  }
  function getRecords() {
    const x = load('records.json'), recs = records(), n = new Map();
    for (const r of recs) n.set(r.cause, (n.get(r.cause) ?? 0) + 1);             // Map = 처음 나온 순서 (Counter와 같음)
    x.rail.counts = [...n].sort((a, b) => b[1] - a[1])                          // 안정 정렬 → 동률은 처음 나온 순서 (most_common과 같음)
      .map(([c, k]) => ({ label: c, value: String(k), tone: x.rail.count_tones[c] ?? 'warn' }));
    const hours = Array(24).fill(0);                                              // 시간대별 발생: 끝낸 시각의 시마다 센다 (main.py와 같은 내림)
    for (const r of recs) hours[Number(r._at.slice(11, 13))]++;
    const top = Math.max(0, ...hours);
    x.rail.chart_bars = hours.map(k => ({ h: k ? Math.floor(36 * k / top) : 0, peak: top > 0 && k === top }));
    x.meta = x.meta.split('{n}').join(String(recs.length));
    x.records = recs.map(r => ({ ...publicRecord(r), chain_caption: x.chain_caption }));
    return x;
  }
  function getExpert(session) {
    const x = load('expert.json');
    if (session && !SESSIONS.has(session)) fail(404, 'SESSION_NOT_FOUND', `세션 ${session} 없음`);   // A-5: 없는 세션에 남의 마지막 진단을 주지 않는다. 빈 값('?session=')은 안 준 것
    const s = session ? SESSIONS.get(session) : LAST;
    if (!s) return { topbar: x.topbar, log: { ...x.log, range: '', entries: [] }, empty: x.idle, actions: { ...x.actions, secondary: null } };
    const fill = o => JSON.parse(JSON.stringify(o).split('{answer}').join(s.answer ?? ''));   // 파이썬도 따옴표를 이스케이프하지 않는다 — 답 제목에 " 가 들어가면 양쪽 다 깨진다
    const qs = load('screens.json');
    const entries = s.history.flatMap(([key, time]) => (has(x.fragments, key) ? fill(x.fragments[key]) : key.startsWith('followup_') ? followupLog(s, key, qs) : []).map(e => ({ time, ...e })));   // 세부 질문 줄은 쓴 글이 들어 있어 fill을 거치지 않는다 (main.py와 같음)
    const hist = s.history.map(([key]) => key), tones = new Map();             // Map = 넣은 순서, 덮어써도 자리 유지 (파이썬 dict와 같음)
    const seg = hist.slice(Math.max(0, hist.lastIndexOf('scanning')));         // restart·back → scanning이면 거기서부터 새 경로 (로그는 계속 쌓임)
    seg.forEach((key, i) => {
      const answered = key === 'question_outside' && i + 1 < seg.length;       // 이 구간에서 답한 질문 → 고른 답이 표시등 증거의 상태를 정한다
      for (const p of [...(has(x.path, key) ? x.path[key] : []), ...(answered && has(x.path_answer, s.answer_id) ? x.path_answer[s.answer_id] : [])]) {
        if (p.tone !== 'out') tones.set(p.id, p.tone);
        else if (tones.has(p.id)) tones.set(p.id, 'out');                        // 기각: 이미 경로에 있는 가설만 흐리게 남긴다
      }
    });
    const body = hist.findLast(k => has(x.screens, k));                        // 본문: 전문가 데이터가 있는 가장 최근 화면 (main.py와 같은 shortcut)
    return { topbar: x.topbar, log: { ...x.log, range: `${entries[0].time} → ${entries.at(-1).time}`, entries }, ...fill(x.screens[body]),
             path: [...tones].map(([id, tone]) => ({ id, tone })), actions: x.actions };
  }
  function payload(scenario, key, i) {
    const p = load('screens.json')[key];
    if (p.screen === 'steps') {
      p.steps.forEach((st, j) => { st.state = j < i ? 'failed' : j === i ? 'todo' : 'upcoming'; });
      p.rail.steps[2].answer = `${i + 1} / ${p.steps.length} 단계`;
      p.path.note = p.step_note.split('{n}').join(String(i + 1)); delete p.step_note;
    }
    const ctx = load('scenarios.json')[scenario].followup_context;
    if (ctx && key.startsWith('followup_')) { p.rail.steps[0].answer = ctx.rail_answer; p.path = ctx.path; }   // main.py와 같음 (load가 매번 새 사본)
    return p;
  }
  const reply = (id, s) => {
    let p = payload(s.scenario, s.key, s.step_index);
    if (intent) p = kgApply(s, intentPaint(s, p), F['kg_answers.json'], F['screens.json']);   // main.py _session_payload와 같은 순서: paint → KG
    return { session_id: id, scenario: s.scenario, payload: p };
  };

  function start(body) {
    if (!isObj(body)) invalid('body');
    const scenario = body.scenario === undefined ? 'wifi' : body.scenario;     // 없으면 기본값, null은 422 (pydantic Literal)
    if (!['wifi', 'outside', 'normal', 'followup'].includes(scenario)) invalid('scenario');
    const first = load('scenarios.json')[scenario].start, id = newId();       // 422 검사가 id 발급보다 먼저 (파이썬은 검증을 통과해야 함수가 불린다)
    SESSIONS.set(id, { scenario, key: first, step_index: 0, history: [[first, now()]], stack: [] });   // stack = 지나온 길 ('이전'용)
    return reply(id, SESSIONS.get(id));
  }
  function advance(id, body) {                                                   // 순서: 본문 422 → 세션 404 → finish → 전이
    if (!isObj(body)) invalid('body');
    const { event, value = null, text = null } = body;
    if (typeof event !== 'string') invalid('event');                             // pydantic 2는 숫자를 str로 바꿔 주지 않는다
    if (value !== null && typeof value !== 'string') invalid('value');
    if (text !== null && typeof text !== 'string') invalid('text');
    const s = SESSIONS.get(id);
    if (!s) fail(404, 'SESSION_NOT_FOUND', `세션 ${id} 없음`);
    if (event === 'finish') {                                                    // 어느 화면에서든 통과 (현행 A-4)
      SESSIONS.delete(id); LAST = s;
      const r = reply(id, s), t = load('records.json').templates[s.key];
      const rec = s.key === 'followup_done' ? followupRecord(r.payload) : t && Object.keys(t).length ? t : null;   // 파이썬 `if t:` — 빈 dict는 거짓
      const d = new Date();   // 시계는 한 번만 읽는다(두 번 읽으면 자정에 하루 어긋남). 테스트가 넣은 now는 d를 무시한다
      if (rec) { records().unshift({ id, _at: `${ymd(d)}T${now(d).slice(0, 5)}`, ...rec }); saveRecords(RECORDS); }
      return r;
    }
    const key = s.key, screens = load('screens.json');
    if (intent && intentPage(s)) screens.followup_intent_choice = structuredClone(intentPage(s));   // intent_flow.screens
    const scen = load('scenarios.json')[key.startsWith('followup_') ? 'followup' : s.scenario];   // main.py와 같음: 세부 질문은 어느 흐름에서 왔든 followup 전이표
    const table = intent && key === 'followup_intent_choice' ? { answer: intentRoutes(s), back: '@prev' } : scen.transitions[key] ?? {};   // intent_flow.table
    const box = screens[key].text_input;
    if (text !== null || (box && value === 'text')) {                          // 사용자가 쓴 글: 길이·빈칸 검사 (main.py와 같음, 글자 수는 파이썬 len처럼 코드포인트)
      if (!(box && event === 'answer' && value === 'text' && (text ?? '').trim() && [...text].length <= box.max))
        fail(422, 'INVALID_TEXT', '입력 가능한 글 답변과 길이를 확인해 주세요.');   // 오류 문구는 main.py와 같게(화면 안 내부 이름을 보이지 않는다)
      s.text = text.trim();                                                      // 목업은 분류하지 않고 저장만 (분류는 백엔드)
    }
    if (event === 'step_failed' && has(table, 'exhausted')) {                   // 조치 화면: 다음 단계로, 다 해봤으면 exhausted로
      s.step_index += 1;
      if (s.step_index >= screens[key].steps.length) {   // main.py와 같음: '이전'이 조치 화면으로, 새 세부 질문이면 글 입력부터(next_key)
        s.stack.push(key); [s.key, s.step_index] = [intent ? intentNext(s, key, event, value, table.exhausted, screens, classify) : table.exhausted, 0];
      }
    } else if (has(table, event) && event !== 'exhausted' && event !== 'vague') {
      let nxt = table[event];
      if (nxt !== null && typeof nxt === 'object') {                             // 사람의 답에 따라 갈라지는 전이
        if (!has(nxt, value)) fail(409, 'INVALID_EVENT', '현재 질문의 답변을 선택해 주세요.');
        nxt = nxt[value];
      }
      if (intent) nxt = intentNext(s, key, event, value, nxt, screens, classify);   // main.py: 전이를 정한 뒤 intent_flow.next_key
      if (nxt === '@prev') nxt = s.stack.pop();                                  // 세부 질문의 '이전': 지나온 길을 한 칸 되돌린다
      else {
        const g = scen.guard, walked = [...s.stack, key];                         // KG 규칙: 같은 질문 재방문·분류 질문 8개 초과 → WFU14 (main.py와 같음)
        if (g && g.questions.includes(nxt) && (walked.includes(nxt) || walked.filter(k => g.questions.includes(k)).length >= g.max)) nxt = g.to;
        if (nxt !== key) s.stack.push(key);
      }
      [s.key, s.step_index] = [nxt, 0];
    } else fail(409, 'INVALID_EVENT', '현재 화면에서 허용되지 않는 동작입니다.');
    if (event === 'answer') { s.answer = screens[key].answers?.find(a => a.id === value)?.title ?? (value || ''); s.answer_id = value; }   // 방금 답한 질문 화면에서 답 이름을 찾는다
    if (s.key !== key) s.history.push([s.key, now()]);                          // 자기 전이(call·records)는 이력에 안 쌓인다
    if (intent) kgRemember(s, key, event, value);
    return reply(id, s);
  }
  function route(method, path, body) {
    const u = new URL(path, 'http://demo'), p = u.pathname, m = p.match(/^\/diagnose\/([^/]+)\/advance$/);
    if (method === 'GET' && p === '/status') {
      const value = u.searchParams.getAll('check').at(-1)?.toLowerCase(), yes = ['true', '1', 'on', 'yes', 't', 'y'], no = ['false', '0', 'off', 'no', 'f', 'n'];
      if (value !== undefined && !yes.includes(value) && !no.includes(value)) invalid('check');
      return getStatus(!no.includes(value));
    }
    if (method === 'GET' && p === '/records') return getRecords();
    if (method === 'POST' && p === '/records/clear') { RECORDS = []; saveRecords(RECORDS); return { cleared: true }; }
    if (method === 'GET' && p === '/settings') return load('settings.json');
    if (method === 'GET' && p === '/kg') return load('kg.json');
    if (method === 'GET' && p === '/kg/all') return kgOverview(F['kg_answers.json'], F['screens.json']);
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
