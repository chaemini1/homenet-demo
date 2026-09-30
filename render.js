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
export const logRowHTML = e => `<div class="logrow"><span class="lt">${esc(e.time)}</span><span class="tag ${esc(e.tone)}">${esc(e.tag)}</span><span class="lx">${esc(e.text)}</span></div>`;
export const expertRailHTML = log => `<div class="log"><div class="lhead"><b>${esc(log.title)}</b><span>${esc(log.range)}</span></div>${log.entries.length ? log.entries.map(logRowHTML).join('') : `<p class="state">${esc(log.empty_text)}</p>`}</div><div class="spacer"></div><button type="button" class="btn sec" data-event="export_log">${esc(log.export_label)}</button>`;
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
// ponytail: role=list(읽기 전용 그림). 노드 선택·키보드 이동·패널은 U4c에서 listbox로
export function kgGraphHTML(kg, path = []) {
  const { meta } = kg, T = meta.text, [W, H] = meta.view, unverified = meta.provenance !== 'team';
  const at = new Map(kg.nodes.filter(n => Number.isFinite(n.x) && Number.isFinite(n.y)).map(n => [n.id, n]));
  const tones = new Map(), missing = [];
  for (const p of path) at.has(p.id) ? tones.set(p.id, kgTone(p.tone)) : missing.push(p.id);
  const lit = id => tones.has(id) && tones.get(id) !== 'out';
  const edges = kg.edges.filter(e => at.has(e.s) && at.has(e.t) && e.d?.length === 4 && e.d.every(Number.isFinite)).map(e => {
    const on = lit(e.s) && lit(e.t), k = on ? tones.get(e.t) : 'ctx';          // 양 끝이 다 경로면 굵게, 도착 노드 색
    return { on, html: `<line class="kg-e${on ? ` on ${k}` : ''}${e.prop ? ' prop' : ''}" x1="${e.d[0]}" y1="${e.d[1]}" x2="${e.d[2]}" y2="${e.d[3]}" marker-end="url(#kgx-a-${k})"/>` };
  });
  const rank = n => kgType(meta, n.type).rank ?? 99;
  const nodes = [...at.values()].sort((a, b) => tones.has(b.id) - tones.has(a.id) || rank(a) - rank(b) || a.id.localeCompare(b.id));   // 읽는 순서: 경로 → 타입 → id
  const node = n => {
    const ty = kgType(meta, n.type), [w, h] = kgSize(ty), t = tones.get(n.id), adopted = ty.badge && t === 'bad';
    const aria = [`${ty.ko}: ${n.name}`, t && meta.states[t], adopted && T.adopted, n.proposed && T.proposed].filter(Boolean).join(', ');
    const glyph = t && KG_GLYPH[t] ? `<text class="kg-gl" x="${kgGlyphX(ty, w)}">${KG_GLYPH[t]}</text>` : '';
    // 기각(out) 라벨은 두 번: 선을 가리는 배경색 테두리는 장식 없는 뒤 글자(kg-halo)에만 — 취소선에 테두리가 붙으면 글자 가운데를 지운다
    const label = cls => `<text class="kg-l${cls}" y="${h / 2 + 12}">${esc(n.label ?? n.name)}</text>`;
    return `<g class="kg-n${t ? ` on ${t}` : ''}${n.proposed ? ' prop' : ''}" transform="translate(${n.x} ${n.y})" role="listitem" aria-label="${esc(aria)}"><title>${esc(n.name)} · ${esc(n.id)}</title>${kgShape(ty)}`
      + `<g aria-hidden="true">${glyph}${adopted ? kgBadge(w, h) : ''}${t === 'out' ? label(' kg-halo') : ''}${label('')}</g></g>`;
  };
  const svg = `<svg class="kg-svg" viewBox="0 0 ${W} ${H}" role="list" aria-labelledby="kg-h"${unverified ? ' aria-describedby="kg-note"' : ''}>`
    + kgMarkers('kgx', ['ctx', ...Object.keys(TONE)])
    + `<g aria-hidden="true">${edges.filter(e => !e.on).map(e => e.html).join('')}${edges.filter(e => e.on).map(e => e.html).join('')}</g>`
    + nodes.map(node).join('')
    + (unverified ? `<text class="kg-stamp" x="12" y="${H - 5}" aria-hidden="true">${esc(T.stamp)}</text>` : '') + '</svg>';
  // 범례: 도형은 전부, 나머지는 지금 그림에 있는 것만 (점선·! 배지·취소선·경로의 상태)
  const used = new Set(tones.values()), drawn = [...at.values()];
  const legend = Object.values(meta.types).sort((a, b) => a.rank - b.rank).map(ty => `<span>${kgMini(ty)}${esc(ty.ko)}</span>`).join('')
    + (drawn.some(n => n.proposed) ? `<span><svg class="kg-mini" width="22" height="10" aria-hidden="true"><line class="kg-e prop" x1="1" y1="5" x2="21" y2="5"/></svg>${esc(T.legend_proposed)}</span>` : '')
    + (drawn.some(n => kgType(meta, n.type).badge && tones.get(n.id) === 'bad') ? `<span><svg class="kg-mini" viewBox="-8 -8 16 16" width="16" height="16" aria-hidden="true"><g class="kg-badge"><circle r="7"/><text>!</text></g></svg>${esc(T.legend_badge)}</span>` : '')
    + (used.has('out') ? `<span>${esc(T.legend_out)}</span>` : '')
    // 상태 견본엔 종류 도형을 안 쓴다(원이면 '증상'으로 읽힘): 경로 선과 같은 색 선 + 글리프. 해 볼 일(neutral)은 선만
    + Object.keys(meta.states).filter(k => k !== 'out' && used.has(k)).map(k => `<span><svg class="kg-mini" width="28" height="12" aria-hidden="true"><g class="kg-n on ${k}"><line class="kg-e on ${k}" x1="1" y1="6" x2="13" y2="6"/>${KG_GLYPH[k] ? `<text class="kg-gl" x="21" y="6">${KG_GLYPH[k]}</text>` : ''}</g></svg>${esc(meta.states[k])}</span>`).join('');
  const counts = String(T.counts ?? '').replace(/\{(\w+)\}/g, (m, k) => meta.counts?.[k] ?? m);
  return `<section class="card kg"><div class="chead"><b id="kg-h">${esc(T.title)}</b>${unverified ? pillHTML({ tone: 'unknown', text: T.badge }) : ''}<div class="spacer"></div><span>${esc(counts)}</span></div>`
    + `${svg}<div class="kg-legend">${legend}</div>`
    + (unverified ? `<p class="foot" id="kg-note">${esc(T.notice)}</p>` : '')
    + (missing.length ? `<p class="foot">${esc(T.missing)} ${esc(missing.join(', '))}</p>` : '') + '</section>';
}

// 일반 모드 입구: screens.json의 graph_link가 있는 화면에만 (없으면 빈 문자열). 라임 주버튼이 아니라 고스트 링크
export const kgLinkHTML = label => label ? `<button type="button" class="ghost link" data-event="kg_general">${esc(label)}</button>` : '';
// 그림 라벨: 괄호 앞까지(전체 문장은 아래 목록에), 띄어쓰기 기준 10자에서 한 번 끊어 최대 2줄
function kgWrap(s) {
  const words = s.split('(')[0].trim().split(/\s+/);
  let a = '';
  while (words.length && (!a || a.length + 1 + words[0].length <= 10)) a += (a ? ' ' : '') + words.shift();
  const b = words.join(' ');
  return b ? [a, b.length > 11 ? `${b.slice(0, 10)}…` : b] : [a];
}
// 일반: 겪은 일 → 확인한 것 → 원인 → 할 일 (plain이 있는 타입을 rank 순서로). 같은 도형을 1.6배로, 도형 안엔 번호.
// 쉬운 말(plain)이 없는 노드는 안 나온다. id·점수·관계명 없음. 칸마다 최대 2개 + 아니었던 원인 줄 최대 2개, 모두 7개까지.
// 그림 번호 = 아래 <ol> 번호 (그림은 role=img, 같은 내용을 글로).
export function kgGeneralHTML(kg, path = []) {
  const { meta } = kg, T = meta.text, S = 1.6, CW = 190, GAP = 112, TOP = 70;
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
  const kept = cand.flat().slice(0, 7), shown = [...kept, ...outAll.slice(Math.max(0, kept.length + outAll.length - 7))];
  const main = cols.map(c => shown.filter(i => i.n.type === c && i.t !== 'out')), outs = shown.filter(i => i.t === 'out');
  const maxN = Math.max(1, ...main.map(m => m.length)), bottom = TOP + (maxN - 1) * GAP + 90, outY = bottom + 34;
  main.forEach((m, c) => m.forEach((i, j) => Object.assign(i, { x: CW / 2 + c * CW, y: TOP + (maxN - 1) * GAP / 2 + (j - (m.length - 1) / 2) * GAP })));
  outs.forEach((i, j) => Object.assign(i, { x: CW / 2 + (j + 1) * CW, y: outY }));
  const W = CW * cols.length, H = outs.length ? outY + 74 : bottom;
  const rad = i => Math.max(...kgSize(kgType(meta, i.n.type), S)) / 2;
  const arrow = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, ua = (rad(a) + 4) / d, ub = (rad(b) + 8) / d;
    return `<line class="kg-e on flow" x1="${r1(a.x + dx * ua)}" y1="${r1(a.y + dy * ua)}" x2="${r1(b.x - dx * ub)}" y2="${r1(b.y - dy * ub)}" marker-end="url(#kgg-a-flow)"/>`;
  };
  const filled = main.filter(m => m.length);                                  // 빈 칸은 건너뛰고 이웃한 칸끼리 잇는다
  const arrows = filled.slice(1).flatMap((m, k) => filled[k].flatMap(a => m.map(b => arrow(a, b))));
  const side = i => i.t !== 'out' && i.n.side && T[`side_${i.n.side}`];
  const node = (i, k) => {
    const ty = kgType(meta, i.n.type), [w, h] = kgSize(ty, S), lines = kgWrap(i.n.plain), y0 = r1(h / 2 + 20);
    return `<g class="kg-n on ${i.t}" transform="translate(${r1(i.x)} ${r1(i.y)})">${kgShape(ty, S)}<text class="kg-num" x="${kgGlyphX(ty, w)}">${k + 1}</text>`
      + (adopted(i) ? kgBadge(w, h, 9) : '')
      + `<text class="kg-l" y="${y0}">${lines.map((l, j) => `<tspan x="0" dy="${j ? 18 : 0}">${esc(l)}</tspan>`).join('')}</text>`
      + (side(i) ? `<text class="kg-side" y="${y0 + lines.length * 18}">${esc(side(i))}</text>` : '') + '</g>';
  };
  const heads = cols.map((c, k) => `<text class="kg-col" x="${CW / 2 + k * CW}" y="22">${esc(meta.types[c].plain)}</text>`).join('')
    + (outs.length ? `<text class="kg-col" x="${CW / 2}" y="${outY + 5}">${esc(`${meta.types[outs[0].n.type].plain} · ${meta.states.out ?? ''}`)}</text>` : '');
  // 상태 글자: 타입 쪽(plain_states, 예: 증거가 ok면 "지금은 괜찮아요")을 먼저, 없으면 공통. 괄호 대신 ' · ' (쉬운 말에 괄호가 이미 있어 두 번 겹치지 않게)
  const word = i => meta.types[i.n.type].plain_states?.[i.t] ?? meta.states[i.t];
  const li = i => `<li>${esc(meta.types[i.n.type].plain)} — ${esc(i.n.plain)}${word(i) ? ` · ${esc(word(i))}` : ''}${side(i) ? `. ${esc(side(i))}` : ''}</li>`;
  return `<svg class="kg-svg kg-plain" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T.plain_aria)}">${kgMarkers('kgg', ['flow'])}${heads}${arrows.join('')}${shown.map(node).join('')}</svg>`
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
