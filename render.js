// 계약 JSON → HTML 문자열. document를 모른다. 모든 데이터 문자열은 esc()를 거친다.
export const TONE = { ok: 'ok', warn: 'warn', bad: 'bad', unknown: 'unknown', checking: 'checking', neutral: 'neutral' };
const GLYPH = { ok: '✓', warn: '!', bad: '✕', unknown: '?', checking: '…' };
const tone = t => TONE[t] ?? 'unknown';

export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const DOT_LABEL = { ok: '정상', warn: '주의', bad: '문제', unknown: '미확인', checking: '확인 중', neutral: '' };
// labeled=true면 점이 유일한 상태 표시라 스크린리더용 이름을 붙인다 (색약 대응은 값 텍스트가 맡는다)
export const dotHTML = (t, labeled = false) => labeled && DOT_LABEL[tone(t)] ? `<span class="dot ${tone(t)}" role="img" aria-label="${DOT_LABEL[tone(t)]}"></span>` : `<span class="dot ${tone(t)}"></span>`;
export const pillHTML = p => `<span class="pill ${tone(p.tone)}">${dotHTML(p.tone)}${esc(p.text)}</span>`;

export function segmentHTML(s) {
  const st = tone(s.status);
  return `<div class="seg ${st}"><div class="box">${GLYPH[st] ?? '?'}</div><div class="lab">${esc(s.label)}</div></div>`;
}
export function pathCardHTML(p) {
  const segs = p.segments.map(segmentHTML);
  segs.splice(4, 0, '<div class="segdiv"></div>');           // 4칸(집 안) | 2칸(집 밖)
  return `<section class="card path">
    <div class="chead"><b>우리 집 인터넷이 지나가는 길이에요</b><span>${esc(p.note)}</span></div>
    <div class="segments">${segs.join('')}</div>
    <div class="partition"><div class="home">내가 고칠 수 있는 구간 (집 안)</div><div class="out">기다리는 구간 (집 밖)</div></div>
    <div class="conclusion">${dotHTML(p.conclusion.tone)}<p>${esc(p.conclusion.text)}</p></div>
  </section>`;
}
export const metricRowHTML = m => `<div class="metric ${tone(m.status)}"><span class="k">${esc(m.label)}</span><span class="v">${m.before ? `<span class="was"><span class="sr">이전 값 </span>${esc(m.before)}</span><span class="arrow" aria-hidden="true">→</span><span class="sr">지금 </span>` : ''}${esc(m.value)}</span>${dotHTML(m.status, true)}</div>`;
export function metricListHTML(l) {
  const meta = l.meta ? `<span>${esc(l.meta)}</span>` : '';
  return `<div class="mlist"><div class="mhead"><b>${esc(l.title)}</b>${meta}</div>${l.rows.map(metricRowHTML).join('')}</div>`;
}
export function stepperHTML(steps) {
  return `<div class="stepper">${steps.map(s => `<div class="step-item ${esc(s.state)}"><div class="marker">${s.state === 'done' ? '✓' : ''}</div><div><div class="lab">${esc(s.label)}</div>${s.answer ? `<div class="ans">${esc(s.answer)}</div>` : ''}</div></div>`).join('')}</div>`;
}
export function stepConfirmHTML(s, index) {
  const active = s.state === 'todo';
  const dis = active ? '' : ' disabled';
  const num = s.state === 'done' ? '✓' : esc(s.num);
  return `<div class="step ${esc(s.state)}">
    <div class="head"><div class="num">${num}</div><div><div class="t">${esc(s.title)}</div><div class="h">${esc(s.hint)}</div></div></div>
    <div class="confirm"><button type="button" class="yes" data-event="step_done" data-step="${index}"${dis}>됐어요</button><button type="button" class="no" data-event="step_failed" data-step="${index}"${dis}>안 됐어요</button></div>
  </div>`;
}
export const stepInfoHTML = s => `<div class="step"><div class="head"><div class="num">${esc(s.num)}</div><div><div class="t">${esc(s.title)}</div><div class="h">${esc(s.hint)}</div></div></div></div>`;
export const answerCardHTML = (a, selected) => `<button type="button" class="answer${selected ? ' selected' : ''}" data-answer="${esc(a.id)}"><div class="ah"><div class="at">${esc(a.title)}</div><div class="chk">✓</div></div><div class="hint">${esc(a.hint)}</div></button>`;
export function headlineHTML(h) {
  return `<div class="headline">${h.pill ? pillHTML(h.pill) : ''}<h1>${esc(h.title)}</h1><p>${esc(h.body)}</p></div>`;
}
// 번호가 있는 버튼(event "call")은 tel: 링크 — 브라우저가 전화 앱으로 넘긴다. 번호를 추측하지 않으므로 tel이 없으면 링크도 없다
export const actionHTML = (b, cls) => !b ? '' : b.tel
  ? `<a class="${cls}" href="tel:${esc(b.tel)}">${esc(b.label)}</a>`
  : `<button type="button" class="${cls}" data-event="${esc(b.event)}"${b.disabled ? ' disabled' : ''}>${esc(b.label)}</button>`;
const btn = (b, cls) => actionHTML(b, `btn ${cls}`);
export function actionsHTML(a) {
  return `<div class="actions"><p class="foot">${esc(a.footnote)}</p><div class="spacer"></div>${btn(a.secondary, 'sec')}${btn(a.primary, 'pri')}</div>`;
}
export const whyAskingHTML = t => `<div class="why">${dotHTML('checking')}<p style="margin:0">${esc(t)}</p></div>`;
export const noteHTML = () => `<div class="note"><div class="row">${dotHTML('ok')}이 컴퓨터 안에서만 처리돼요</div><p>AI 모델과 지식그래프가 이미 저장돼 있어서 인터넷이 없어도 진단할 수 있어요.</p></div>`;
export const railStepsHTML = steps => `<div class="lbl">진단 단계</div>${stepperHTML(steps)}<div class="spacer"></div>${noteHTML()}`;
export function railHomeHTML(s) {
  const row = (k, v) => metricRowHTML({ label: k, value: v, status: 'ok' });
  return `<div class="lbl">우리 집 인터넷</div>
    <div>${row('통신사', s.home.isp)}${row('공유기', s.home.router)}${row('연결된 기기', s.home.devices)}${row('마지막 자동 점검', s.home.last_check)}</div>
    <div class="lbl" style="padding-top:var(--space-4)">온디바이스 SLM</div>
    <div class="slm"><div class="head"><span class="t">정보</span><div class="spacer"></div>${pillHTML({ tone: 'ok', text: s.engine.state })}</div>
      ${row('언어 모델', s.engine.model)}${row('양자화 · 크기', s.engine.quant)}${row('지식그래프', s.engine.kg)}${row('마지막 진단 응답', s.engine.last_response)}${row('서버로 보낸 요청', s.engine.server_requests)}</div>
    <div class="spacer"></div>${noteHTML()}`;
}
export function recentCardHTML(s) {
  const rows = s.recent.length
    ? s.recent.map(r => metricRowHTML({ label: r.label, value: r.when, status: r.tone })).join('')
    : '<p class="state">아직 진단 기록이 없어요. 문제가 생기면 진단을 시작해 보세요.</p>';
  return `<section class="card recent"><div class="chead"><b>최근 기록</b><button type="button" class="ghost link" data-nav="records">전체 보기</button></div>${rows}<p class="foot">${esc(s.recent_footnote)}</p></section>`;
}

// ==== W7 기록 ====
export const countRowHTML = c => `<div class="count"><span class="k">${esc(c.label)}</span><span class="v">${esc(c.value)}</span>${dotHTML(c.tone, true)}</div>`;
export function chartHTML(rail) {
  const bars = rail.chart_bars.map(b => `<div class="bar${b.peak ? ' peak' : ''}" style="height:${Math.max(3, Math.min(64, b.h))}px"></div>`).join('');
  const axis = rail.chart_axis.map(a => `<span>${esc(a)}</span>`).join('');
  return `<div class="lbl">${esc(rail.chart_title)}</div><div class="chart"><div class="bars">${bars}</div><div class="axis">${axis}</div></div><p class="foot">${esc(rail.chart_caption)}</p>`;
}
export const recordsRailHTML = rail => `<div class="lbl">${esc(rail.counts_title)}</div><div>${rail.counts.map(countRowHTML).join('')}</div><div style="padding-top:var(--space-4)">${chartHTML(rail)}</div><div class="spacer"></div>${noteHTML()}`;
export const chipHTML = c => `<span class="chip ${esc(c.tone)}">${dotHTML(c.tone === 'bad' ? 'bad' : 'ok')}<b>${esc(c.kind)}:</b> ${esc(c.text)}</span>`;
export function recordRowHTML(r, open) {
  const body = open ? `<div class="rec-body"><div class="chain">${r.chain.map((c, i) => chipHTML(c) + (i < r.chain.length - 1 ? '<span class="arrow">→</span>' : '')).join('')}</div><p class="foot">${esc(r.chain_caption)}</p></div>` : '';
  return `<div class="rec${open ? ' open' : ''}"><button type="button" class="rec-head" data-rec="${esc(r.id)}"><span class="rw">${esc(r.when)}</span><span class="rc">${esc(r.cause)}</span><span class="rf">${esc(r.fix)}</span><span class="pill ${esc(r.status.tone)}">${esc(r.status.text)}</span><span class="rt">${open ? '접기' : '펼치기'}</span></button>${body}</div>`;
}
export const closeBtnHTML = () => `<button type="button" class="iconbtn" data-nav="back" title="닫기 (Esc)" aria-label="닫기">✕</button>`;
export const recordsStageHTML = (d, openId) => `<div class="chead big"><b>${esc(d.title)}</b><div class="spacer"></div><span>${esc(d.meta)}</span>${closeBtnHTML()}</div><div class="recs">${d.records.length ? d.records.map(r => recordRowHTML(r, r.id === openId)).join('') : '<p class="state">아직 진단 기록이 없어요. 문제가 생기면 진단을 시작해 보세요.</p>'}</div><div class="spacer"></div><div class="actions"><p class="foot">${esc(d.footnote)}</p><div class="spacer"></div><button type="button" class="btn sec" data-event="export_records">${esc(d.export_label)}</button></div>`;

// ==== W8 설정 ====
export const settingsRailHTML = (d, activeId) => `<div class="lbl">설정</div><div class="secnavs">${d.sections.map(s => `<button type="button" class="secnav${s.id === activeId ? ' on' : ''}" data-secnav="${esc(s.id)}">${esc(s.title)}</button>`).join('')}</div><div class="spacer"></div><div class="note"><div class="row">${dotHTML('ok')}${esc(d.rail_note.head)}</div><p>${esc(d.rail_note.body)}</p></div>`;
export function settingControlHTML(row, val) {
  const c = row.control;
  if (c.type === 'segment') return `<div class="seg-ctrl">${c.options.map(o => `<button type="button" class="seg-opt${o.v === val ? ' on' : ''}" aria-pressed="${o.v === val ? 'true' : 'false'}" data-set="${esc(row.id)}" data-val="${esc(o.v)}">${esc(o.label)}</button>`).join('')}</div>`;
  if (c.type === 'toggle') return `<button type="button" class="toggle${val ? ' on' : ''}" role="switch" aria-checked="${val ? 'true' : 'false'}" data-set="${esc(row.id)}" data-toggle><span class="knob"></span></button>`;
  if (c.type === 'button') return `<button type="button" class="btn sec small${c.danger ? ' danger' : ''}" data-event="${esc(c.event)}">${esc(c.label)}</button>`;
  return `<span class="set-badge">${esc(c.label)}</span>`;
}
export const settingRowHTML = (row, val) => `<div class="set-row${row.danger ? ' danger' : ''}"><div class="set-txt"><div class="st">${esc(row.title)}</div><div class="sh">${esc(row.hint)}</div></div>${settingControlHTML(row, val)}</div>`;
export const settingsSectionHTML = (sec, values) => `<section class="set-sec" id="set-${esc(sec.id)}"><h2>${esc(sec.title)}</h2>${sec.subtitle ? `<p class="set-sub">${esc(sec.subtitle)}</p>` : ''}<div class="set-rows">${sec.rows.map(r => settingRowHTML(r, values[r.id])).join('')}</div></section>`;
export const settingsStageHTML = (d, values) => `<div class="chead big"><b>${esc(d.title)}</b><div class="spacer"></div><span>${esc(d.meta)}</span>${closeBtnHTML()}</div>${d.sections.map(s => settingsSectionHTML(s, values)).join('')}`;

// ==== WE1 전문가 콘솔 ====
export const expertTopbarHTML = t => `<span class="pill checking">${dotHTML('checking')}${esc(t.pill)}</span><div class="spacer"></div><span class="isp">${esc(t.model)}&nbsp;&nbsp;${esc(t.kg)}</span><span class="toggle-row">${esc(t.toggle_label)}<button type="button" class="toggle on" role="switch" aria-checked="true" data-expert-off><span class="knob"></span></button></span><button type="button" class="ghost" data-nav="settings">설정</button>`;
// 로그 속 KG id를 버튼으로(known에 있는 것만). known이 없으면 예전 출력 그대로. 눌리면 app.js가 그래프 노드를 선택한다
const KG_ID = /\b(?:symptom|cause|action|evidence|remedy)_[a-z0-9_]+/g;
const withIdRefs = (text, known) => known ? esc(text).replace(KG_ID, m => known.has(m) ? `<button type="button" class="idref" data-kg="${m}">${m}</button>` : m) : esc(text);
export const logRowHTML = (e, known) => `<div class="logrow"><span class="lt">${esc(e.time)}</span><span class="tag ${esc(e.tone)}">${esc(e.tag)}</span><span class="lx">${withIdRefs(e.text, known)}</span></div>`;
// collapsed = 사이드바처럼 접힌 상태(폭 56px 띠). 접기 버튼과 세로 이름은 늘 있고, 로그·내보내기는 #rail-log 안 → CSS가 접힌 동안 숨긴다
export const expertRailHTML = (log, known, collapsed = false) => `<button type="button" class="iconbtn rail-toggle" data-rail-toggle aria-controls="rail-log" aria-expanded="${!collapsed}" aria-label="${esc(log.title)} ${collapsed ? '펼치기' : '접기'}">${collapsed ? '›' : '‹'}</button><span class="rail-vlabel" aria-hidden="true">${esc(log.title)}</span><div class="rail-log" id="rail-log"><div class="log"><div class="lhead"><b>${esc(log.title)}</b><span>${esc(log.range)}</span></div>${log.entries.length ? log.entries.map(e => logRowHTML(e, known)).join('') : `<p class="state">${esc(log.empty_text)}</p>`}</div><div class="spacer"></div><button type="button" class="btn sec" data-event="export_log">${esc(log.export_label)}</button></div>`;
// 일반 사용자 PathCard와 같은 모습(칸 + 글리프 + 라벨), 문구는 전문 용어 유지. 라벨 있는 링크만 칸 사이에 표시.
export function topologyHTML(t) {
  const seg = n => `<div class="seg ${tone(n.tone)}"><div class="box">${GLYPH[tone(n.tone)] ?? '?'}</div><div class="lab">${esc(n.label)}</div><div class="cap">${esc(n.caption)}</div></div>`;
  const link = l => l?.label ? `<div class="seglink ${tone(l.tone)}">${esc(l.label)}</div>` : '';
  return `<section class="card path">
    <div class="chead"><b>${esc(t.title)}</b><span>${esc(t.note)}</span></div>
    <div class="segments">${t.nodes.map((n, i) => seg(n) + link(t.links[i])).join('')}</div>
    <div class="conclusion">${dotHTML(t.conclusion.tone)}<p>${esc(t.conclusion.text)}</p></div>
  </section>`;
}
export const idChipHTML = c => `<span class="chip ${esc(c.tone)} mono">${dotHTML(c.tone === 'bad' ? 'bad' : 'ok')}${esc(c.text)}</span>`;
// graph = 체인 칩 아래에 끼울 KG 카드(app.js가 kgGraphHTML로 만든 것). 빈 상태(진단 없음)엔 넣지 않는다
export function expertStageHTML(d, graph = '') {
  if (d.empty) return headlineHTML({ pill: null, title: d.empty.title, body: d.empty.body }) + `<div class="spacer"></div>${actionsHTML(d.actions)}`;
  const v = d.verdict;
  const chain = v.chain.map((c, i) => idChipHTML(c) + (i < v.chain.length - 1 ? '<span class="arrow">→</span>' : '')).join('');
  return topologyHTML(d.topology)
    + `<div class="verdict">${pillHTML(v.pill)}<span>${esc(v.meta)}</span></div><h1 class="xh1">${esc(v.title)}</h1><div class="chain">${chain}</div>${graph}`
    + `<div class="detail">${metricListHTML(d.candidates)}${metricListHTML(d.measurements)}</div><div class="spacer"></div>${actionsHTML(d.actions)}`;
}

// ==== KG 그래프: 전문가 카드(전체 + 이번 진단 경로) · 일반 시트(4칸 작은 그림) ====
// 도형은 데이터(meta.types[타입].shape·size)가 정한다 → 여기엔 타입 이름이 없다. 모르는 타입은 작은 원(12).
// 노드는 어둡게 두고 상태는 테두리 색·굵기 + 글리프 + 글자(aria·범례·목록)로 — 색만으로 구분하지 않는다. 색 매핑은 app.css의 --ink.
const r1 = v => Math.round(v * 10) / 10;
const KG_SHAPE = {
  circle: w => `<circle class="kg-s" r="${r1(w / 2)}"/>`,
  square: (w, h) => `<rect class="kg-s" x="${r1(-w / 2)}" y="${r1(-h / 2)}" width="${w}" height="${h}" rx="4"/>`,
  diamond: (w, h) => `<path class="kg-s" d="M0 ${r1(-h / 2)}L${r1(w / 2)} 0L0 ${r1(h / 2)}L${r1(-w / 2)} 0Z"/>`,
  hexagon: (w, h) => `<path class="kg-s" d="M${r1(-w / 2)} 0L${r1(-w / 4)} ${r1(-h / 2)}H${r1(w / 4)}L${r1(w / 2)} 0L${r1(w / 4)} ${r1(h / 2)}H${r1(-w / 4)}Z"/>`,
  triangle: (w, h) => `<path class="kg-s" d="M${r1(-w / 2)} ${r1(-h / 2)}L${r1(w / 2)} 0L${r1(-w / 2)} ${r1(h / 2)}Z"/>`,
};
const kgType = (meta, t) => Object.hasOwn(meta.types, t) ? meta.types[t] : { shape: null, size: [12, 12], ko: t };
const kgSize = (ty, s = 1) => ty.size.map(v => r1(v * s));
const kgShape = (ty, s = 1) => (Object.hasOwn(KG_SHAPE, ty.shape) ? KG_SHAPE[ty.shape] : KG_SHAPE.circle)(...kgSize(ty, s));
const kgGlyphX = (ty, w) => ty.shape === 'triangle' ? r1(-w / 6) : 0;       // ▶는 무게중심에 글자를 둔다
const KG_GLYPH = { ...GLYPH, out: '–' };                                     // neutral(해 볼 일)은 글리프 없음
const kgTone = t => t === 'out' ? 'out' : tone(t);                           // out = 기각된 가설 (Tone 밖의 값 하나)
const kgMarkers = (prefix, keys) => `<defs>${keys.map(k => `<marker id="${prefix}-a-${k}" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path class="kg-ah ${k}" d="M0 0L8 4L0 8Z"/></marker>`).join('')}</defs>`;
const kgBadge = (w, h, r = 7) => `<g class="kg-badge" transform="translate(${r1(w * .375)} ${r1(-h * .375)})"><circle r="${r}"/><text>!</text></g>`;
const kgMini = (ty, cls = 'kg-n') => { const [w, h] = kgSize(ty); return `<svg class="kg-mini" viewBox="${-w / 2 - 2} ${-h / 2 - 2} ${w + 4} ${h + 4}" width="${r1((w + 4) * .6)}" height="${r1((h + 4) * .6)}" aria-hidden="true"><g class="${cls}">${kgShape(ty)}</g></svg>`; };

// 전문가: KG 전체(회색) + 이번 진단 경로(path의 tone)만 색·굵은 선·글리프. 좌표는 kg.json에 이미 있다(브라우저 계산 0).
// 좌표가 없거나 KG에 없는 경로 id는 그리지 않고 아래 foot에 적는다. 출처 미확인이면 pill·SVG 안 도장·notice.
// o.view: 'focus' = 이번 경로 노드만 채택 원인을 가운데 두고 다시 배치(kg.json 좌표 안 씀): 점검 → 증상·증거 → [원인] → 조치, 기각된 가설은 원인 아래. 선은 전부 직선.
//   채택 원인이 없으면 종류별 열로. / 'all' = 전체 43개. 채택 원인이 있으면 그 원인을 가운데 두고 연결 거리(1칸, 2칸…)별 동심 타원에 놓고(이번 경로 노드는 한 부채꼴에 모음),
//   없으면 kg.json 좌표 그대로.
// 기본은 'all'(순수 함수의 옛 동작), 앱은 focus로 부른다. 전체 보기에서 경로 밖 노드의 라벨은 CSS가 숨기고(hover·선택·포커스 때만 보임) 글자 잡음을 줄인다
// 노드는 listbox의 option: 선택은 하나(aria-selected), Tab 정지점도 선택 노드 하나(로빙 tabindex). o.sel = 이전 선택, o.log = 패널의 '근거·로그'용 로그 줄
export function kgGraphHTML(kg, path = [], o = {}) {
  const { meta } = kg, T = meta.text, [W, H] = meta.view, unverified = meta.provenance !== 'team';
  const at = new Map(kg.nodes.filter(n => Number.isFinite(n.x) && Number.isFinite(n.y)).map(n => [n.id, n]));
  const tones = new Map(), missing = [];
  for (const p of path) at.has(p.id) ? tones.set(p.id, kgTone(p.tone)) : missing.push(p.id);
  const lit = id => tones.has(id) && tones.get(id) !== 'out';
  const rank = n => kgType(meta, n.type).rank ?? 99;
  const all = [...at.values()].sort((a, b) => tones.has(b.id) - tones.has(a.id) || rank(a) - rank(b) || a.id.localeCompare(b.id));   // 읽는 순서: 경로 → 타입 → id
  // 자리(pos): 전체 = kg.json 좌표. 이번 경로 = 채택 원인(hub)을 가운데 크게, 왼쪽에 hub로 들어오는 증상·증거, 그 왼쪽에 그 증거를 만든 점검, 오른쪽에 조치, 기각된 것은 hub 아래.
  // hub가 없으면(질문 화면 등) 경로 노드를 종류(rank)마다 한 열로. 어느 쪽이든 열 안은 경로 순서, 선은 직선(교차를 줄이려 점검은 이웃 증거의 높이에 맞춰 정렬)
  const focus = o.view === 'focus' && tones.size > 0, ROW = 100, TOP = 62, ids = [...tones.keys()];
  const hubN = tones.size > 0 && (ids.map(id => at.get(id)).find(n => kgType(meta, n.type).badge && tones.get(n.id) === 'bad') ?? ids.map(id => at.get(id)).find(n => kgType(meta, n.type).badge && tones.get(n.id) !== 'out'));
  const radial = !focus && !!hubN;                                                   // 전체 보기 + 채택 원인 있음 → 동심원
  const sc = id => focus ? (id === hubN?.id ? 1.7 : 1.35) : radial ? (id === hubN.id ? 1.7 : tones.has(id) ? 1.25 : .85) : 1;
  let pos = new Map(all.map(n => [n.id, { x: n.x, y: n.y }])), VH = H, heads = '';
  const dim = new Set();      // hub 아래로 내린 다른 후보 원인: 그 노드에 닿는 선은 경로 색을 쓰지 않고 옅게(진짜 경로 선과 겹쳐 엉키지 않게)
  if (focus) {
    const ko = list => [...new Set(list.map(id => kgType(meta, at.get(id).type)).sort((a, b) => a.rank - b.rank).map(t => t.ko))].join(' · ');
    const head = (x, list) => list.length ? `<text class="kg-col" x="${x}" y="26" aria-hidden="true">${esc(ko(list))}</text>` : '';
    pos = new Map();
    if (hubN) {
      const into = new Set(kg.edges.filter(e => e.t === hubN.id && tones.has(e.s)).map(e => e.s)), from = new Set(kg.edges.filter(e => e.s === hubN.id && tones.has(e.t)).map(e => e.t));
      // 기각됐거나 아직 후보인 다른 원인은 hub 아래 한 줄로 (점검 열에 섞이면 선이 엉킨다)
      const outs = ids.filter(id => id !== hubN.id && (tones.get(id) === 'out' || kgType(meta, at.get(id).type).badge));
      const left = ids.filter(id => into.has(id) && !outs.includes(id)), right = ids.filter(id => from.has(id) && !into.has(id) && !outs.includes(id));
      const far = ids.filter(id => id !== hubN.id && !left.includes(id) && !right.includes(id) && !outs.includes(id));
      const bary = id => { const ys = kg.edges.filter(e => (e.s === id && left.includes(e.t)) || (e.t === id && left.includes(e.s))).map(e => left.indexOf(e.s === id ? e.t : e.s)); return ys.length ? ys.reduce((a, b) => a + b) / ys.length : 99; };
      far.sort((a, b) => bary(a) - bary(b));
      const rows = Math.max(far.length, left.length, right.length, 1), MID = TOP + (rows - 1) / 2 * ROW, X = { far: 110, left: 300, hub: 490, right: 690 };
      const put = (list, x) => list.forEach((id, i) => pos.set(id, { x, y: r1(MID + (i - (list.length - 1) / 2) * ROW) }));
      outs.forEach(id => dim.add(id));
      put(far, X.far); put(left, X.left); put(right, X.right); pos.set(hubN.id, { x: X.hub, y: r1(MID) });
      outs.forEach((id, i) => pos.set(id, { x: r1(X.hub + (i - (outs.length - 1) / 2) * 190), y: r1(MID + ROW * 1.35) }));
      VH = Math.round(Math.max(TOP + (rows - 1) * ROW + 84, outs.length ? MID + ROW * 1.35 + 84 : 0));
      heads = head(X.far, far) + head(X.left, left) + head(X.hub, [hubN.id]) + head(X.right, right);
    } else {
      const cols = new Map();
      for (const id of ids) (cols.get(rank(at.get(id))) ?? cols.set(rank(at.get(id)), []).get(rank(at.get(id)))).push(id);
      const ranks = [...cols.keys()].sort((a, b) => a - b), CW = W / ranks.length;
      ranks.forEach((r, ci) => cols.get(r).sort((a, b) => (tones.get(a) === 'out') - (tones.get(b) === 'out')).forEach((id, ri) => pos.set(id, { x: r1(CW * (ci + .5)), y: TOP + ri * ROW })));
      VH = TOP + (Math.max(...[...cols.values()].map(c => c.length)) - 1) * ROW + 84;
      heads = ranks.map((r, ci) => head(r1(CW * (ci + .5)), cols.get(r))).join('');
    }
  }
  if (radial) {
    // 연결 거리(BFS)별 동심 타원. 1칸 원은 이번 경로 노드를 먼저(한 부채꼴), 바깥 원은 부모 각도 순서로 놓아 선이 덜 꼬인다. 전부 정렬·고정값이라 매번 같은 그림
    const nb = new Map();
    for (const e of kg.edges) if (at.has(e.s) && at.has(e.t)) { (nb.get(e.s) ?? nb.set(e.s, []).get(e.s)).push(e.t); (nb.get(e.t) ?? nb.set(e.t, []).get(e.t)).push(e.s); }
    const dist = new Map([[hubN.id, 0]]), queue = [hubN.id];
    for (let i = 0; i < queue.length; i++) for (const m of [...(nb.get(queue[i]) ?? [])].sort()) if (!dist.has(m)) { dist.set(m, dist.get(queue[i]) + 1); queue.push(m); }
    const reach = Math.max(...dist.values());
    for (const n of all) if (!dist.has(n.id)) dist.set(n.id, reach + 1);                    // 이어지지 않은 노드는 맨 바깥 원
    const HH = Math.round(H * 1.2); VH = HH;                                             // 노드가 많은 경로에서 겹치지 않게 그림을 20% 키운다
    const D = Math.max(...dist.values()), step = Math.min(78, (HH / 2 - 30 - 112) / Math.max(D - 1, 1)), ang = new Map();
    pos = new Map([[hubN.id, { x: W / 2, y: HH / 2 }]]);
    for (let k = 1; k <= D; k++) {
      const parentAng = id => { const a = (nb.get(id) ?? []).filter(m => dist.get(m) === k - 1 && ang.has(m)).map(m => ang.get(m)); return a.length ? Math.atan2(a.reduce((s, v) => s + Math.sin(v), 0), a.reduce((s, v) => s + Math.cos(v), 0)) : 0; };
      const ring = all.filter(n => dist.get(n.id) === k).sort(k === 1
        ? (a, b) => tones.has(b.id) - tones.has(a.id) || rank(a) - rank(b) || a.id.localeCompare(b.id)
        : (a, b) => parentAng(a.id) - parentAng(b.id) || a.id.localeCompare(b.id));
      const r = 112 + (k - 1) * step, a0 = k === 1 ? -Math.PI / 2 : parentAng(ring[0].id);
      ring.forEach((n, i) => { const a = a0 + 2 * Math.PI * i / ring.length; ang.set(n.id, a); pos.set(n.id, { x: r1(W / 2 + r * 1.55 * Math.cos(a)), y: r1(HH / 2 + r * Math.sin(a)) }); });
    }
    // 겹침 풀기: 경로 노드는 아래 라벨 자리까지 넉넉히, 회색 노드는 도형만. 겹치면 겹침이 작은 축으로 반씩 밀고(가운데 원인은 안 움직임), 캔버스 안에 가둔다. 240번 고정 반복
    const need = id => tones.has(id) ? [140, 80] : [40, 40], mv = [...pos.keys()].sort();
    for (let it = 0; it < 240; it++) {
      for (let i = 0; i < mv.length; i++) for (let j = i + 1; j < mv.length; j++) {
        const a = pos.get(mv[i]), b = pos.get(mv[j]), w = (need(mv[i])[0] + need(mv[j])[0]) / 2, h = (need(mv[i])[1] + need(mv[j])[1]) / 2;
        const dx = b.x - a.x || (i % 2 ? .1 : -.1), dy = b.y - a.y || .1, ox = w - Math.abs(dx), oy = h - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        const ka = mv[i] === hubN.id ? 0 : mv[j] === hubN.id ? 1 : .5, kb = 1 - ka;
        if (ox < oy) { const s = Math.sign(dx) * ox; a.x -= s * ka; b.x += s * kb; } else { const s = Math.sign(dy) * oy; a.y -= s * ka; b.y += s * kb; }
      }
      for (const id of mv) { const p = pos.get(id); p.x = Math.min(Math.max(p.x, 46), W - 46); p.y = Math.min(Math.max(p.y, 30), HH - 46); }
    }
    for (const p of pos.values()) { p.x = r1(p.x); p.y = r1(p.y); }
  }
  const nodes = all.filter(n => pos.has(n.id)), order = new Map(nodes.map((n, i) => [n.id, i])), rad = id => Math.max(...kgSize(kgType(meta, at.get(id).type), sc(id))) / 2;
  const custom = focus || radial;                                                    // 자리를 새로 잡았으면 선도 새로(kg.json의 e.d는 옛 좌표)
  const edges = kg.edges.filter(e => pos.has(e.s) && pos.has(e.t) && (custom || (e.d?.length === 4 && e.d.every(Number.isFinite)))).map(e => {
    const on = lit(e.s) && lit(e.t) && !dim.has(e.s) && !dim.has(e.t), k = on ? tones.get(e.t) : 'ctx';          // 양 끝이 다 경로면 굵게, 도착 노드 색
    const cls = `kg-e${on ? ` on ${k}` : ''}${e.prop ? ' prop' : ''}`, mk = `marker-end="url(#kgx-a-${k})"`;
    if (!custom) return { on, html: `<line class="${cls}" x1="${e.d[0]}" y1="${e.d[1]}" x2="${e.d[2]}" y2="${e.d[3]}" ${mk}/>` };
    const a = pos.get(e.s), b = pos.get(e.t), L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, ra = rad(e.s) + 2, rb = rad(e.t) + 7;   // +7: 화살촉 자리
    return { on, html: `<path class="${cls}" d="M${r1(a.x + ux * ra)} ${r1(a.y + uy * ra)}L${r1(b.x - ux * rb)} ${r1(b.y - uy * rb)}" ${mk}/>` };
  });
  // 기본 선택: 이전 선택 → 채택 원인 → 첫 경로 노드 → 첫 노드 (항상 하나, 지금 그려진 노드 중에서)
  const selId = pos.has(o.sel) ? o.sel : (nodes.find(n => kgType(meta, n.type).badge && tones.get(n.id) === 'bad') ?? nodes[0])?.id;
  const node = n => {
    const ty = kgType(meta, n.type), [w, h] = kgSize(ty, sc(n.id)), t = tones.get(n.id), adopted = ty.badge && t === 'bad', sel = n.id === selId, ps = pos.get(n.id);
    const aria = [`${ty.ko}: ${n.name}`, t && meta.states[t], adopted && T.adopted, n.proposed && T.proposed].filter(Boolean).join(', ');
    const glyph = t && KG_GLYPH[t] ? `<text class="kg-gl" x="${kgGlyphX(ty, w)}">${KG_GLYPH[t]}</text>` : '';
    // 기각(out) 라벨은 두 번: 선을 가리는 배경색 테두리는 장식 없는 뒤 글자(kg-halo)에만 — 취소선에 테두리가 붙으면 글자 가운데를 지운다
    // 이번 경로 보기는 잘리지 않은 이름을 두 줄까지 (전체 보기는 kg_build가 겹침 0으로 잡은 짧은 라벨)
    const lines = focus ? kgLines(n.name) : [n.label ?? n.name];
    const label = cls => `<text class="kg-l${cls}" y="${h / 2 + 14}">${lines.map((l, i) => `<tspan x="0" dy="${i ? 15 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
    return `<g class="kg-n${t ? ` on ${t}` : ''}${n.proposed ? ' prop' : ''}${sel ? ' sel' : ''}" transform="translate(${ps.x} ${ps.y})" role="option" aria-selected="${sel}" tabindex="${sel ? 0 : -1}" data-kg="${esc(n.id)}" data-o="${order.get(n.id)}" aria-label="${esc(aria)}"><title>${esc(n.name)} · ${esc(n.id)}</title>${kgShape(ty, sc(n.id))}`
      + `<g aria-hidden="true"><circle class="kg-ring" r="${r1(Math.max(w, h) / 2 + 7)}"/>${glyph}${adopted ? kgBadge(w, h) : ''}${t === 'out' ? label(' kg-halo') : ''}${label('')}</g></g>`;
  };
  const svg = `<svg class="kg-svg${focus ? ' focus' : ''}" viewBox="0 0 ${W} ${VH}" role="listbox" aria-labelledby="kg-h"${unverified ? ' aria-describedby="kg-note"' : ''}>`
    + kgMarkers('kgx', ['ctx', ...Object.keys(TONE)]) + heads
    + `<g aria-hidden="true">${edges.filter(e => !e.on).map(e => e.html).join('')}${edges.filter(e => e.on).map(e => e.html).join('')}</g>`
    + [...nodes].sort((a, b) => tones.has(a.id) - tones.has(b.id)).map(node).join('')       // 그리는 순서: 회색 먼저, 이번 경로 노드가 위 (키보드 순서는 data-o)
    + (unverified ? `<text class="kg-stamp" x="12" y="${VH - 5}" aria-hidden="true">${esc(T.stamp)}</text>` : '') + '</svg>';
  // 범례: 도형은 전부, 나머지는 지금 그림에 있는 것만 (점선·! 배지·취소선·경로의 상태)
  const used = new Set(tones.values()), drawn = [...at.values()];
  const legend = Object.values(meta.types).sort((a, b) => a.rank - b.rank).map(ty => `<span>${kgMini(ty)}${esc(ty.ko)}</span>`).join('')
    + (drawn.some(n => n.proposed) ? `<span><svg class="kg-mini" width="22" height="10" aria-hidden="true"><line class="kg-e prop" x1="1" y1="5" x2="21" y2="5"/></svg>${esc(T.legend_proposed)}</span>` : '')
    + (drawn.some(n => kgType(meta, n.type).badge && tones.get(n.id) === 'bad') ? `<span><svg class="kg-mini" viewBox="-8 -8 16 16" width="16" height="16" aria-hidden="true"><g class="kg-badge"><circle r="7"/><text>!</text></g></svg>${esc(T.legend_badge)}</span>` : '')
    + (used.has('out') ? `<span>${esc(T.legend_out)}</span>` : '')
    // 상태 견본엔 종류 도형을 안 쓴다(원이면 '증상'으로 읽힘): 경로 선과 같은 색 선 + 글리프. 해 볼 일(neutral)은 선만
    + Object.keys(meta.states).filter(k => k !== 'out' && used.has(k)).map(k => `<span><svg class="kg-mini" width="28" height="12" aria-hidden="true"><g class="kg-n on ${k}"><line class="kg-e on ${k}" x1="1" y1="6" x2="13" y2="6"/>${KG_GLYPH[k] ? `<text class="kg-gl" x="21" y="6">${KG_GLYPH[k]}</text>` : ''}</g></svg>${esc(meta.states[k])}</span>`).join('');
  const counts = String(T.counts ?? '').replace(/\{(\w+)\}/g, (m, k) => meta.counts?.[k] ?? m);
  const vbtn = (v, text) => `<button type="button" class="seg-opt${(focus ? 'focus' : 'all') === v ? ' on' : ''}" data-kg-view="${v}" aria-pressed="${(focus ? 'focus' : 'all') === v}">${esc(text)}</button>`;
  const toggle = T.view_focus ? `<div class="kg-view" role="group" aria-label="${esc(T.view_aria)}">${vbtn('focus', T.view_focus)}${vbtn('all', T.view_all)}</div>` : '';
  return `<section class="card kg"><div class="chead"><b id="kg-h">${esc(T.title)}</b>${unverified ? pillHTML({ tone: 'unknown', text: T.badge }) : ''}<div class="spacer"></div>${toggle}<span>${esc(counts)}</span></div>`
    + `${svg}<div class="kg-legend">${legend}${T.quiet_hint && !focus ? `<span class="kg-quiet">${esc(T.quiet_hint)}</span>` : ''}</div>`
    + `<div class="kg-panel" id="kg-panel">${kgPanelHTML(kg, selId, path, o.log)}</div>`
    + (unverified ? `<p class="foot" id="kg-note">${esc(T.notice)}</p>` : '')
    + (missing.length ? `<p class="foot">${esc(T.missing)} ${esc(missing.join(', '))}</p>` : '') + '</section>';
}

// 선택 노드 패널(높이 고정): 머리(이름·id·상태) + 종류 | 들어오는 관계 | 나가는 관계 | 근거·로그. 이웃은 버튼(data-kg) → 그 노드 선택
// 머리만 aria-live: 화살표로 옮길 때마다 패널 전체를 읽으면 시끄럽다(노드 자체의 aria-label이 이미 읽힌다)
export function kgPanelHTML(kg, id, path = [], log = []) {
  const { meta } = kg, T = meta.text, n = kg.nodes.find(x => x.id === id);
  if (!n) return `<p class="kg-hint">${esc(T.panel_hint)}</p>`;
  const ty = kgType(meta, n.type), p = path.find(x => x.id === id), t = p && kgTone(p.tone);
  const name = new Map(kg.nodes.map(x => [x.id, x.name]));
  const rel = (e, other) => `<li><span class="rel">${esc(meta.relations?.[e.r] ?? e.r)}</span><button type="button" class="idref nb" data-kg="${esc(other)}">${esc(name.get(other) ?? other)}</button></li>`;
  const list = items => items.length ? `<ul>${items.join('')}</ul>` : '<p class="none">—</p>';
  const logs = log.filter(e => String(e.text).includes(id));
  const refs = (n.refs ?? []).map(r => `<li><span class="rel">${esc(r.kind)}</span>${esc(r.text)}</li>`)
    .concat(logs.map(e => `<li><span class="rel">${esc(e.time)} ${esc(e.tag)}</span>${esc(e.text)}</li>`));
  return `<div class="kg-ph" aria-live="polite">${kgMini(ty)}<b>${esc(n.name)}</b><code>${esc(n.id)}</code>`
    + (t ? pillHTML({ tone: t === 'out' ? 'unknown' : t, text: meta.states[t] ?? t }) : '')
    + (n.proposed ? `<span class="chip">${esc(T.proposed)}</span>` : '') + `</div>`
    + `<div class="kg-pc"><div><h4>${esc(T.kind)}</h4><p>${esc(ty.ko)}</p></div>`
    + `<div><h4>${esc(T.in)}</h4>${list(kg.edges.filter(e => e.t === id).map(e => rel(e, e.s)))}</div>`
    + `<div><h4>${esc(T.out)}</h4>${list(kg.edges.filter(e => e.s === id).map(e => rel(e, e.t)))}</div>`
    + `<div><h4>${esc(T.refs)}</h4>${list(refs)}</div></div>`;
}

// 일반 모드 입구: screens.json의 graph_link가 있는 화면에만 (없으면 빈 문자열). 라임 주버튼이 아니라 고스트 링크
export const kgLinkHTML = label => label ? `<button type="button" class="ghost link" data-event="kg_general">${esc(label)}</button>` : '';
// 그림 라벨: 괄호 앞까지(전체 문장은 아래 목록에), 띄어쓰기 기준 10자에서 한 번 끊어 최대 2줄
// 이름을 한 줄 w자 안팎으로 나눠 최대 2줄(띄어쓰기 기준, 한 낱말이 길면 그 자리에서 자름). 넘치면 끝에 …
function kgLines(s, w = 11) {
  const out = [];
  for (const word of String(s).split(/\s+/).filter(Boolean)) {
    const last = out.length - 1;
    if (last >= 0 && out[last].length + 1 + word.length <= w) out[last] += ` ${word}`;
    else for (let i = 0; i < word.length || i === 0; i += w) out.push(word.slice(i, i + w));
  }
  return out.length > 2 ? [out[0], `${out.slice(1).join(' ').slice(0, w + 3)}…`] : out;
}
function kgWrap(s) {
  const words = s.split('(')[0].trim().split(/\s+/);
  let a = '';
  while (words.length && (!a || a.length + 1 + words[0].length <= 10)) a += (a ? ' ' : '') + words.shift();
  const b = words.join(' ');
  return b ? [a, b.length > 11 ? `${b.slice(0, 10)}…` : b] : [a];
}
// 일반: 겪은 일 → 확인한 것 → 원인 → 할 일 (plain이 있는 타입을 rank 순서로). 같은 도형을 크게, 도형 안엔 상태 글리프, 번호는 왼쪽 위 배지.
// 쉬운 말(plain)이 없는 노드는 안 나온다. id·점수·관계명 없음. 칸마다 최대 2개 + 아니었던 원인 줄 최대 2개, 모두 7개까지.
// 그림 번호 = 아래 <ol> 번호 (그림은 role=img, 같은 내용을 글로). 채택 원인은 크게 + 그 칸 배경을 살짝 밝게.
// 선: 이웃한 두 칸 사이에서 KG에 실제 관계가 있는 것끼리만(없는 노드는 가장 가까운 줄과) 부드러운 곡선으로 — 전부 잇던 옛 방식은 X자로 엉켰다. 칸 안 순서는 이어진 앞 칸 순서를 따라 선이 안 꼬이게.
export function kgGeneralHTML(kg, path = []) {
  const { meta } = kg, T = meta.text, CW = 200, ROW = 154, TOP = 78;
  const byId = new Map(kg.nodes.map(n => [n.id, n]));
  const cols = Object.keys(meta.types).filter(k => meta.types[k].plain).sort((a, b) => meta.types[a].rank - meta.types[b].rank);
  const items = path.map(p => ({ n: byId.get(p.id), t: kgTone(p.tone) })).filter(i => i.n?.plain && cols.includes(i.n.type));
  const foot = `<p class="foot">${esc(T.plain_foot)}</p>`;
  if (!items.length) return `<p class="state">${esc(T.plain_empty)}</p>${foot}`;
  // path 순서 = 가설이 처음 나온 순서 → 칸마다 뒤쪽(지금 결론에 가까운) 2개 + 아니었던 원인 2개.
  // 7개를 넘으면 두 개 찬 칸의 오래된 쪽을 앞 칸부터 뺀다(채택 원인은 남김) — 사용자가 직접 기각한 원인이 먼저 사라지지 않게
  const adopted = i => meta.types[i.n.type].badge && i.t === 'bad';
  const cand = cols.map(c => items.filter(i => i.n.type === c && i.t !== 'out').slice(-2));
  const outAll = items.filter(i => i.t === 'out' && meta.types[i.n.type].badge).slice(-2);
  for (const m of cand) if (m.length > 1 && cand.flat().length + outAll.length > 7) m.splice(adopted(m[0]) ? 1 : 0, 1);
  const kept = cand.flat().slice(0, 7), pick = [...kept, ...outAll.slice(Math.max(0, kept.length + outAll.length - 7))];
  const main = cols.map(c => pick.filter(i => i.n.type === c && i.t !== 'out')), outs = pick.filter(i => i.t === 'out');
  const filled = main.filter(m => m.length);                                  // 빈 칸은 건너뛰고 이웃한 칸끼리 잇는다
  const related = (a, b) => kg.edges.some(e => (e.s === a.n.id && e.t === b.n.id) || (e.s === b.n.id && e.t === a.n.id));
  const near = (i, from, to) => to[Math.min(to.length - 1, Math.round(i * (to.length - 1) / Math.max(from.length - 1, 1)))];
  const links = [];
  filled.slice(1).forEach((m, k) => {
    const L = filled[k], pairs = [];
    for (const a of L) for (const b of m) if (related(a, b)) pairs.push([a, b]);
    L.forEach((a, i) => { if (!pairs.some(p => p[0] === a)) pairs.push([a, near(i, L, m)]); });         // 이어진 곳이 없는 노드는 가장 가까운 줄과
    m.forEach((b, j) => { if (!pairs.some(p => p[1] === b)) pairs.push([near(j, m, L), b]); });
    m.sort((x, y) => { const bc = i => { const p = pairs.filter(q => q[1] === i).map(q => L.indexOf(q[0])); return p.length ? p.reduce((u, v) => u + v) / p.length : 0; }; return bc(x) - bc(y); });   // 앞 칸 순서를 따라
    links.push(...pairs);
  });
  const shown = [...main.flat(), ...outs];                                     // 번호 = 그려진 순서(칸 → 위에서 아래) = 아래 목록 순서
  const maxN = Math.max(1, ...main.map(m => m.length)), bottom = TOP + (maxN - 1) * ROW + 134, outY = bottom + 40;   // 134: 가장 큰 노드(채택 원인) 아래 이름 2줄 + 설명까지
  const sc = i => adopted(i) ? 2.3 : 1.9, rad = i => Math.max(...kgSize(kgType(meta, i.n.type), sc(i))) / 2;
  main.forEach((m, c) => m.forEach((i, j) => Object.assign(i, { x: CW / 2 + c * CW, y: TOP + (maxN - 1) * ROW / 2 + (j - (m.length - 1) / 2) * ROW })));
  outs.forEach((i, j) => Object.assign(i, { x: CW / 2 + (j + 1) * CW, y: outY }));
  const W = CW * cols.length, H = outs.length ? outY + 92 : bottom;
  const curve = ([a, b]) => {
    const x1 = a.x + rad(a) + 3, y1 = a.y, x2 = b.x - rad(b) - 10, y2 = b.y, mx = (x1 + x2) / 2;
    return `<path class="kg-e on ${b.t}" d="M${r1(x1)} ${r1(y1)}C${r1(mx)} ${r1(y1)} ${r1(mx)} ${r1(y2)} ${r1(x2)} ${r1(y2)}" marker-end="url(#kgg-a-${b.t})"/>`;
  };
  const side = i => i.t !== 'out' && i.n.side && T[`side_${i.n.side}`];
  const node = i => {
    const k = shown.indexOf(i), ty = kgType(meta, i.n.type), [w, h] = kgSize(ty, sc(i)), lines = kgWrap(i.n.plain), y0 = r1(h / 2 + 22);
    const glyph = KG_GLYPH[i.t] ? `<text class="kg-gl" x="${kgGlyphX(ty, w)}">${KG_GLYPH[i.t]}</text>` : '';
    return `<g class="kg-n on ${i.t}" transform="translate(${r1(i.x)} ${r1(i.y)})">${kgShape(ty, sc(i))}${glyph}`
      + `<g class="kg-numb" transform="translate(${r1(-w / 2)} ${r1(-h / 2)})"><circle r="11"/><text class="kg-num">${k + 1}</text></g>`
      + (adopted(i) ? kgBadge(w, h, 10) : '')
      + `<text class="kg-l" y="${y0}">${lines.map((l, j) => `<tspan x="0" dy="${j ? 19 : 0}">${esc(l)}</tspan>`).join('')}</text>`
      + (side(i) ? `<text class="kg-side" y="${y0 + lines.length * 19 + 2}">${esc(side(i))}</text>` : '') + '</g>';
  };
  const heads = cols.map((c, k) => `<text class="kg-col" x="${CW / 2 + k * CW}" y="24">${esc(meta.types[c].plain)}</text>`).join('')
    + (outs.length ? `<text class="kg-col" x="${CW / 2}" y="${outY + 5}">${esc(`${meta.types[outs[0].n.type].plain} · ${meta.states.out ?? ''}`)}</text>` : '');
  const ci = cols.findIndex(c => meta.types[c].badge), band = ci >= 0 && main[ci].length ? `<rect class="kg-band" x="${ci * CW + 8}" y="38" width="${CW - 16}" height="${(outs.length ? outY - 18 : bottom) - 44}" rx="16"/>` : '';
  // 상태 글자: 타입 쪽(plain_states, 예: 증거가 ok면 "지금은 괜찮아요")을 먼저, 없으면 공통. 괄호 대신 ' · ' (쉬운 말에 괄호가 이미 있어 두 번 겹치지 않게)
  const word = i => meta.types[i.n.type].plain_states?.[i.t] ?? meta.states[i.t];
  const li = i => `<li>${esc(meta.types[i.n.type].plain)} — ${esc(i.n.plain)}${word(i) ? ` · ${esc(word(i))}` : ''}${side(i) ? `. ${esc(side(i))}` : ''}</li>`;
  return `<svg class="kg-svg kg-plain" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T.plain_aria)}">${kgMarkers('kgg', Object.keys(TONE))}${band}${heads}${links.map(curve).join('')}${shown.map(node).join('')}</svg>`
    + `<ol class="kg-list">${shown.map(li).join('')}</ol>${foot}`;
}

// ==== 시트(<dialog>): 라이선스 목록, 표시등 위치 그림 ====
export const sheetHTML = (title, body) => `<div class="chead big"><b id="sheet-title">${esc(title)}</b><div class="spacer"></div><button type="button" class="iconbtn" data-event="close_sheet" aria-label="닫기">✕</button></div>${body}`;
export const licensesHTML = items => `<div class="lic">${items.map(i => `<div class="metric ok"><span class="k">${esc(i.name)}<small>${esc(i.use)}</small></span><span class="v">${esc(i.license)}</span></div>`).join('')}</div>`;
// 공유기 그림: 안테나 2개 + 본체(윗면·앞면) + 앞면의 아이콘과 표시등. 기종 공통으로 "보통 이렇게 생겼다"까지만 말한다. 사진이 생기면 <img>로 교체.
export function ledGuideHTML() {
  const ink = 'fill:none;stroke:var(--text-muted);stroke-width:1.6;stroke-linecap:round';
  const ICON = {
    power: x => `<path d="M${x - 4.5} 121 a6.5 6.5 0 1 0 9 0" style="${ink}"/><path d="M${x} 117 v7" style="${ink}"/>`,
    globe: x => `<circle cx="${x}" cy="125" r="7.5" style="${ink}"/><ellipse cx="${x}" cy="125" rx="3.2" ry="7.5" style="${ink}"/><path d="M${x - 7.5} 125 h15" style="${ink}"/>`,
    wifi: x => `<path d="M${x - 9} 122 a12.5 12.5 0 0 1 18 0" style="${ink}"/><path d="M${x - 5.5} 126.5 a7.5 7.5 0 0 1 11 0" style="${ink}"/><circle cx="${x}" cy="131" r="1.4" style="fill:var(--text-muted)"/>`,
    lan: x => `<rect x="${x - 7.5}" y="118" width="15" height="10" rx="1.5" style="${ink}"/><path d="M${x} 128 v4 M${x - 5} 132 h10" style="${ink}"/>`,
  };
  const col = (x, icon, label, on, hi) => `${ICON[icon](x)}<circle class="led" cx="${x}" cy="150" r="5" style="fill:${on ? 'var(--success)' : 'var(--bg-input)'};stroke:var(--border-strong)"/>`
    + (hi ? `<rect x="${x - 27}" y="109" width="54" height="54" rx="9" style="fill:none;stroke:var(--accent);stroke-width:2"/>` : '')
    + `<text x="${x}" y="196" text-anchor="middle" style="fill:${hi ? 'var(--accent)' : 'var(--text-muted)'};font:${hi ? 700 : 400} 13px var(--font-ui)">${label}</text>`;
  const antenna = (x, deg) => `<rect x="${x - 5}" y="14" width="10" height="76" rx="5" transform="rotate(${deg} ${x} 88)" style="fill:var(--bg-input);stroke:var(--border-strong)"/>`;
  return `<svg viewBox="0 0 440 226" role="img" aria-label="공유기 그림. 안테나가 두 개 달린 납작한 상자 앞면에 표시등이 네 개 있고, 왼쪽에서 두 번째, 지구본 모양 아래의 불이 인터넷 표시등이에요." style="width:100%;height:auto">
    ${antenna(84, -9)}${antenna(356, 9)}
    <path d="M56 84 H384 L412 104 H28 Z" style="fill:var(--bg-input);stroke:var(--border-strong);stroke-linejoin:round"/>
    <path d="M150 92 h140 M142 98 h156" style="stroke:var(--border-strong);stroke-width:1.5;stroke-linecap:round"/>
    <rect x="28" y="104" width="384" height="64" rx="10" style="fill:var(--bg-base);stroke:var(--border-strong)"/>
    <path d="M62 168 v6 h22 v-6 M356 168 v6 h22 v-6" style="fill:none;stroke:var(--border-strong)"/>
    ${col(95, 'power', '전원', true)}${col(180, 'globe', '인터넷', true, true)}${col(265, 'wifi', '와이파이', true)}${col(350, 'lan', 'LAN', false)}
    <text x="180" y="216" text-anchor="middle" style="fill:var(--accent);font:400 12px var(--font-ui)">이 불을 봐주세요</text>
  </svg>
  <p class="foot" style="margin:0 0 var(--space-2)">지구본 모양이거나 Internet · WAN이라고 적혀 있어요. 공유기 앞면이나 윗면에 있어요.</p>
  <div class="lic"><div class="metric ok"><span class="k">흰색·초록색·파란색 등으로 켜져 있어요</span><span class="v">켜져 있어요</span></div><div class="metric bad"><span class="k">불이 없거나 빨간색이에요</span><span class="v">꺼져 있어요</span></div></div>
  <p class="foot">기종마다 순서와 모양이 조금씩 달라요. 전원 표시등은 빨간색이 정상인 기종도 있고, 안테나가 안 보이는 기종도 있어요. 못 찾겠으면 "잘 모르겠어요"를 골라도 돼요.</p>`;
}
