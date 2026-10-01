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

// ==== KG 그래프: 전문가 카드(이번 경로 칩 / 전체 타일) · 일반 시트(4칸 칩 그림) ====
// 모양은 팀장님 예시(Figma Graph Visualization UI Kit · Impact Analysis)를 따른다: 색을 꽉 채운 면 + 검은 글씨·아이콘, 이름은 노드 안에,
// 영향 없음은 옅은 회색 면, 문제 경로만 상태색 면. 상태는 색만으로 구분하지 않는다: 면 색 + 글리프(✕ ✓ … ?) + 글자(aria·범례·목록).
// 일반 모드 칩의 실루엣과 종류 아이콘은 meta.types[타입].shape가 정한다. 전문가 타일은 사각형 + 종류별 아이콘·크기다.
//   circle=알약, square=둥근 사각형, diamond=평행사변형, hexagon=육각형 끝, triangle=화살표 끝. 모르는 도형은 둥근 사각형. 도형마다 아이콘도 하나씩(KG_ICON)
const r1 = v => Math.round(v * 10) / 10;
const kgSil = (shape, w, h) => {
  const x = r1(-w / 2), y = r1(-h / 2), X = r1(w / 2), Y = r1(h / 2), c = r1(Math.min(h * .3, 14)), p = r1(h / 2), q = 4;
  switch (shape) {
    case 'circle': return `M${r1(x + p)} ${y}H${r1(X - p)}A${p} ${p} 0 0 1 ${r1(X - p)} ${Y}H${r1(x + p)}A${p} ${p} 0 0 1 ${r1(x + p)} ${y}Z`;
    case 'diamond': return `M${r1(x + c)} ${y}H${X}L${r1(X - c)} ${Y}H${x}Z`;
    case 'hexagon': return `M${r1(x + c)} ${y}H${r1(X - c)}L${X} 0L${r1(X - c)} ${Y}H${r1(x + c)}L${x} 0Z`;
    case 'triangle': return `M${x} ${y}H${r1(X - c)}L${X} 0L${r1(X - c)} ${Y}H${x}Z`;
    default: return `M${r1(x + q)} ${y}H${r1(X - q)}Q${X} ${y} ${X} ${r1(y + q)}V${r1(Y - q)}Q${X} ${Y} ${r1(X - q)} ${Y}H${r1(x + q)}Q${x} ${Y} ${x} ${r1(Y - q)}V${r1(y + q)}Q${x} ${y} ${r1(x + q)} ${y}Z`;
  }
};
const KG_ICON = {                                                            // 16×16, 선 아이콘(면 색 위 검은 선)
  circle: 'M8 1.8a6.2 6.2 0 1 0 0 12.4a6.2 6.2 0 1 0 0-12.4M8 4.8v3.8M8 11.1v.1',      // 느낌표 원
  square: 'M7 2.6a4.4 4.4 0 1 0 0 8.8a4.4 4.4 0 1 0 0-8.8M10.2 10.2L13.6 13.6',       // 돋보기
  diamond: 'M3 13V8.5M8 13V3M13 13V6.5',                                              // 막대
  hexagon: 'M9.2 1.6L3.6 9h4.1l-.9 5.4L12.4 7H8.3z',                                    // 번개
  triangle: 'M2.8 8h9.4M8.4 4l3.8 4-3.8 4',                                           // 화살표
};
const kgIcon = (shape, x, y, k = 1) => `<path class="kg-ic" transform="translate(${r1(x)} ${r1(y)}) scale(${k})" d="${KG_ICON[shape] ?? KG_ICON.square}"/>`;
// 칩(이름이 안에): 실루엣 + 왼쪽 아이콘 + 이름(최대 두 줄) + 오른쪽 상태 글리프. 실루엣의 기울어진·둥근 끝을 피해 안쪽 여백을 두고,
// 글자 자리(아이콘 오른쪽 ~ 글리프 왼쪽)에 들어가는 글자 수만큼만 줄바꿈한다(넘치면 …). inner는 aria-hidden 묶음에 넣는다
function kgChip(shape, w, h, text, glyph, big = false) {
  const c = Math.min(h * .3, 14), slant = shape === 'diamond' || shape === 'hexagon' ? c * .8 : 0, cap = shape === 'circle' ? h / 4 : 0;
  const padL = 12 + slant + cap, padR = 12 + slant + cap + (shape === 'triangle' ? c * .8 : 0);
  const ix = -w / 2 + padL, tx = ix + 24, lh = big ? 16.5 : 15;
  const lines = kgLines(text, Math.max(4, Math.floor((w / 2 - padR - 10 - tx) / (big ? 15 : 14.2)))), y0 = -(lines.length - 1) * lh / 2;
  return { s: `<path class="kg-s" d="${kgSil(shape, w, h)}"/>`,
    inner: kgIcon(shape, ix, -8) + `<text class="kg-t${big ? ' big' : ''}" x="${r1(tx)}" y="${r1(y0)}">${lines.map((l, i) => `<tspan x="${r1(tx)}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('')}</text>`
      + (glyph ? `<text class="kg-gl" x="${r1(w / 2 - padR)}">${glyph}</text>` : '') };
}
// 전문가 타일: 원인 허브는 크고, 주변 노드는 작다. 종류 아이콘·이름은 사각 타일 안에, 상태는 모서리에.
function kgTile(ty, w, h, glyph) {
  const k = w >= 60 ? 1.1 : .65;
  return { s: `<path class="kg-s" d="${kgSil('square', w, h)}"/>`,
    inner: kgIcon(ty.shape, -8 * k, -8 * k - h * .13, k) + `<text class="kg-kind${w >= 60 ? ' big' : ''}" y="${r1(h * .28)}">${esc(ty.ko)}</text>`
      + (glyph ? `<text class="kg-gl sm" x="${r1(w / 2 + 4)}" y="${r1(h / 2 - 2)}">${glyph}</text>` : '') };
}
// 곡선(순차 배치): 왼쪽 → 오른쪽으로 수평으로 나가 수평으로 들어가는 S자. 같은 칸이면 세로 직선. ahw·bhw = 반폭, gap = 화살촉 자리
const kgCurve = (a, ahw, ahh, b, bhw, bhh, gap = 8) => {
  if (Math.abs(b.x - a.x) < 1) { const d = b.y >= a.y ? 1 : -1; return `M${a.x} ${r1(a.y + d * ahh)}L${b.x} ${r1(b.y - d * (bhh + gap))}`; }
  const d = b.x > a.x ? 1 : -1, x1 = a.x + d * ahw, x2 = b.x - d * (bhw + gap), mx = (x1 + x2) / 2;
  return `M${r1(x1)} ${r1(a.y)}C${r1(mx)} ${r1(a.y)} ${r1(mx)} ${r1(b.y)} ${r1(x2)} ${r1(b.y)}`;
};
// 직선(유기적 배치): 두 사각형의 경계 사이. gap = 화살촉 자리
const kgLine = (a, ahw, ahh, b, bhw, bhh, gap = 8) => {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, big = 1e9;
  const ta = Math.min(ahw / (Math.abs(ux) || 1 / big), ahh / (Math.abs(uy) || 1 / big)) + 2, tb = Math.min(bhw / (Math.abs(ux) || 1 / big), bhh / (Math.abs(uy) || 1 / big)) + gap;
  return `M${r1(a.x + ux * ta)} ${r1(a.y + uy * ta)}L${r1(b.x - ux * tb)} ${r1(b.y - uy * tb)}`;
};
const kgType = (meta, t) => Object.hasOwn(meta.types, t) ? meta.types[t] : { shape: null, size: [12, 12], ko: t };
const KG_GLYPH = { ...GLYPH, out: '–' };                                     // neutral(해 볼 일)은 글리프 없음
const kgTone = t => t === 'out' ? 'out' : tone(t);                           // out = 기각된 가설 (Tone 밖의 값 하나)
const kgMarkers = (prefix, keys) => `<defs>${keys.map(k => `<marker id="${prefix}-a-${k}" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto"><path class="kg-ah ${k}" d="M0 0L8 4L0 8Z"/></marker>`).join('')}</defs>`;
// 배지: 흰 원 + 검은 경고 삼각형(예시와 같은 모양). 채택 원인의 오른쪽 위 모서리에 걸친다
const kgBadgeInner = r => `<circle r="${r}"/><path class="tri" d="M0 ${r1(-r * .52)}L${r1(r * .56)} ${r1(r * .44)}H${r1(-r * .56)}Z"/><path class="ex" d="M0 ${r1(-r * .18)}v${r1(r * .3)}M0 ${r1(r * .28)}v.1"/>`;
const kgBadge = (w, h, r = 10) => `<g class="kg-badge" transform="translate(${r1(w / 2 - 4)} ${r1(-h / 2 + 4)})">${kgBadgeInner(r)}</g>`;
const kgMini = ty => `<svg class="kg-mini" viewBox="-14 -12 28 24" width="28" height="24" aria-hidden="true"><g class="kg-n on neutral"><path class="kg-s" d="${kgSil('square', 26, 22)}"/>${kgIcon(ty.shape, -6, -6, .75)}</g></svg>`;


// 전문가: kg.json의 힘 기반 네트워크 배치를 그대로 쓴다. 보기·진단·선택이 바뀌어도 노드 위치는 같다.
// 좌표가 없거나 KG에 없는 경로 id는 그리지 않고 아래 foot에 적는다. 출처 미확인이면 pill·SVG 안 도장·notice.
// o.view: 기본 'all' = 전체 네트워크, 'focus' = 전체를 유지하며 경로 밖을 흐리게. 경로 밖 이름은 hover·선택·포커스 때 표시.
// 노드는 listbox의 option: 선택은 하나(aria-selected), Tab 정지점도 선택 노드 하나(로빙 tabindex). o.sel = 이전 선택, o.log = 패널의 '근거·로그'용 로그 줄
export function kgGraphHTML(kg, path = [], o = {}) {
  const { meta } = kg, T = meta.text, [W, H] = meta.view, unverified = meta.provenance !== 'team';
  const at = new Map(kg.nodes.filter(n => Number.isFinite(n.x) && Number.isFinite(n.y)).map(n => [n.id, n]));
  const tones = new Map(), missing = [];
  for (const p of path) at.has(p.id) ? tones.set(p.id, kgTone(p.tone)) : missing.push(p.id);
  const lit = id => tones.has(id) && tones.get(id) !== 'out';
  const rank = n => kgType(meta, n.type).rank ?? 99;
  const all = [...at.values()].sort((a, b) => tones.has(b.id) - tones.has(a.id) || rank(a) - rank(b) || a.id.localeCompare(b.id));   // 읽는 순서: 경로 → 타입 → id
  const focus = o.view === 'focus' && tones.size > 0;
  const pos = new Map(all.map(n => [n.id, { x: n.x, y: n.y }]));
  const dims = id => { const [w, h] = kgType(meta, at.get(id).type).size; return { w, h }; };
  const nodes = all, order = new Map(nodes.map((n, i) => [n.id, i]));
  const edges = kg.edges.filter(e => pos.has(e.s) && pos.has(e.t)).map(e => {
    const on = lit(e.s) && lit(e.t), k = on ? tones.get(e.t) : 'ctx';          // 양 끝이 다 경로면 굵게, 도착 노드 색
    const cls = `kg-e${on ? ` on ${k}` : ''}${e.prop ? ' prop' : ''}`, mk = `marker-end="url(#kgx-a-${k})"`;
    const a = pos.get(e.s), b = pos.get(e.t), da = dims(e.s), db = dims(e.t);
    const d = kgLine(a, da.w / 2, da.h / 2, b, db.w / 2, db.h / 2);
    return { on, html: `<path class="${cls}" d="${d}" ${mk}/>` };
  });
  // 기본 선택: 이전 선택 → 채택 원인 → 첫 경로 노드 → 첫 노드 (항상 하나, 지금 그려진 노드 중에서)
  const selId = pos.has(o.sel) ? o.sel : (nodes.find(n => kgType(meta, n.type).badge && tones.get(n.id) === 'bad') ?? nodes[0])?.id;
  const node = n => {
    const ty = kgType(meta, n.type), t = tones.get(n.id), adopted = ty.badge && t === 'bad', sel = n.id === selId, ps = pos.get(n.id), d = dims(n.id);
    const aria = [`${ty.ko}: ${n.name}`, t && meta.states[t], adopted && T.adopted, n.proposed && T.proposed].filter(Boolean).join(', ');
    const glyph = t && KG_GLYPH[t] ? KG_GLYPH[t] : '';
    const body = kgTile(ty, d.w, d.h, glyph);
    // 기각(out) 라벨은 두 번: 선을 가리는 배경색 테두리는 장식 없는 뒤 글자(kg-halo)에만 — 취소선에 테두리가 붙으면 글자 가운데를 지운다
    const tx = cls => `<text class="kg-l${cls}" y="${d.h / 2 + 14}">${esc(n.label ?? n.name)}</text>`;
    const label = (t === 'out' ? tx(' kg-halo') : '') + tx('');
    return `<g class="kg-n${t ? ` on ${t}` : ''}${n.proposed ? ' prop' : ''}${sel ? ' sel' : ''}" transform="translate(${ps.x} ${ps.y})" role="option" aria-selected="${sel}" tabindex="${sel ? 0 : -1}" data-kg="${esc(n.id)}" data-o="${order.get(n.id)}" aria-label="${esc(aria)}"><title>${esc(n.name)} · ${esc(n.id)}</title>${body.s}`
      + `<g aria-hidden="true"><path class="kg-ring" d="${kgSil('square', d.w + 10, d.h + 10)}"/>${body.inner}${adopted ? kgBadge(d.w, d.h) : ''}${label}</g></g>`;
  };
  const svg = `<svg class="kg-svg${focus ? ' focus' : ''}" viewBox="0 0 ${W} ${H}" role="listbox" aria-labelledby="kg-h"${unverified ? ' aria-describedby="kg-note"' : ''}>`
    + kgMarkers('kgx', ['ctx', ...Object.keys(TONE)])
    + `<g aria-hidden="true">${edges.filter(e => !e.on).map(e => e.html).join('')}${edges.filter(e => e.on).map(e => e.html).join('')}</g>`
    + [...nodes].sort((a, b) => tones.has(a.id) - tones.has(b.id)).map(node).join('')       // 그리는 순서: 회색 먼저, 이번 경로 노드가 위 (키보드 순서는 data-o)
    + (unverified ? `<text class="kg-stamp" x="12" y="${H - 5}" aria-hidden="true">${esc(T.stamp)}</text>` : '') + '</svg>';
  // 범례: 도형(실루엣+아이콘)은 전부, 나머지는 지금 그림에 있는 것만 (점선·! 배지·취소선·경로의 상태)
  const used = new Set(tones.values()), drawn = [...at.values()];
  const legend = Object.values(meta.types).sort((a, b) => a.rank - b.rank).map(ty => `<span>${kgMini(ty)}${esc(ty.ko)}</span>`).join('')
    + (drawn.some(n => n.proposed) ? `<span><svg class="kg-mini" width="22" height="10" aria-hidden="true"><line class="kg-e prop" x1="1" y1="5" x2="21" y2="5"/></svg>${esc(T.legend_proposed)}</span>` : '')
    + (drawn.some(n => kgType(meta, n.type).badge && tones.get(n.id) === 'bad') ? `<span><svg class="kg-mini" viewBox="-11 -11 22 22" width="22" height="22" aria-hidden="true"><g class="kg-badge">${kgBadgeInner(9)}</g></svg>${esc(T.legend_badge)}</span>` : '')
    + (used.has('out') ? `<span>${esc(T.legend_out)}</span>` : '')
    + (T.legend_gray && drawn.some(n => !tones.has(n.id)) ? `<span><svg class="kg-mini" width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true"><circle class="kg-gray" r="4"/></svg>${esc(T.legend_gray)}</span>` : '')
    // 상태 견본: 상태색 면(작은 알약) + 글리프. 해 볼 일(neutral)은 글리프 없음
    + Object.keys(meta.states).filter(k => k !== 'out' && used.has(k)).map(k => `<span><svg class="kg-mini" width="32" height="14" viewBox="0 0 32 14" aria-hidden="true"><g class="kg-n on ${k}"><rect class="kg-s" x="1" y="1" width="30" height="12" rx="6"/>${KG_GLYPH[k] ? `<text class="kg-gl sm" x="16" y="7.5">${KG_GLYPH[k]}</text>` : ''}</g></svg>${esc(meta.states[k])}</span>`).join('');
  const counts = String(T.counts ?? '').replace(/\{(\w+)\}/g, (m, k) => meta.counts?.[k] ?? m);
  const vbtn = (v, text) => `<button type="button" class="seg-opt${(focus ? 'focus' : 'all') === v ? ' on' : ''}" data-kg-view="${v}" aria-pressed="${(focus ? 'focus' : 'all') === v}">${esc(text)}</button>`;
  const toggle = T.view_focus ? `<div class="kg-view" role="group" aria-label="${esc(T.view_aria)}">${vbtn('all', T.view_all)}${vbtn('focus', T.view_focus)}</div>` : '';
  return `<section class="card kg"><div class="chead"><b id="kg-h">${esc(T.title)}</b>${unverified ? pillHTML({ tone: 'unknown', text: T.badge }) : ''}<div class="spacer"></div>${toggle}<span>${esc(counts)}</span></div>`
    + `<div class="kg-scroll">${svg}</div><div class="kg-legend">${legend}${T.quiet_hint ? `<span class="kg-quiet">${esc(T.quiet_hint)}</span>` : ''}</div>`
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
// 일반: 겪은 일 → 확인한 것 → 원인 → 할 일 (plain이 있는 타입을 rank 순서로). 같은 실루엣의 칩(이름이 안에)으로, 번호는 왼쪽 위 흰 배지.
// 쉬운 말(plain)이 없는 노드는 안 나온다. id·점수·관계명 없음. 칸마다 최대 2개 + 아니었던 원인 줄 최대 2개, 모두 7개까지.
// 그림 번호 = 아래 <ol> 번호 (그림은 role=img, 같은 내용을 글로). 채택 원인은 크게 + 그 칸 배경을 살짝 밝게.
// 선: 이웃한 두 칸 사이에서 KG에 실제 관계가 있는 것끼리만(없는 노드는 가장 가까운 줄과) 부드러운 곡선으로 — 전부 잇던 옛 방식은 X자로 엉켰다. 칸 안 순서는 이어진 앞 칸 순서를 따라 선이 안 꼬이게.
export function kgGeneralHTML(kg, path = []) {
  const { meta } = kg, T = meta.text, CW = 240, ROW = 112, TOP = 84;
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
  const maxN = Math.max(1, ...main.map(m => m.length)), bottom = TOP + (maxN - 1) * ROW + 84, outY = bottom + 44;
  const dims = i => adopted(i) ? { w: 220, h: 68 } : { w: 196, h: 56 };
  main.forEach((m, c) => m.forEach((i, j) => Object.assign(i, { x: CW / 2 + c * CW, y: TOP + (maxN - 1) * ROW / 2 + (j - (m.length - 1) / 2) * ROW })));
  outs.forEach((i, j) => Object.assign(i, { x: CW / 2 + (j + 1) * CW, y: outY }));
  const W = CW * cols.length, H = outs.length ? outY + 88 : bottom;
  const curve = ([a, b]) => { const da = dims(a), db = dims(b); return `<path class="kg-e on ${b.t}" d="${kgCurve(a, da.w / 2, da.h / 2, b, db.w / 2, db.h / 2, 10)}" marker-end="url(#kgg-a-${b.t})"/>`; };
  const side = i => i.t !== 'out' && i.n.side && T[`side_${i.n.side}`];
  const node = i => {
    const k = shown.indexOf(i), ty = kgType(meta, i.n.type), d = dims(i), big = adopted(i);
    const chip = kgChip(ty.shape, d.w, d.h, i.n.plain.split('(')[0].trim(), KG_GLYPH[i.t] ?? '', big);
    return `<g class="kg-n on ${i.t}" transform="translate(${r1(i.x)} ${r1(i.y)})">${chip.s}<g aria-hidden="true">${chip.inner}</g>`
      + `<g class="kg-numb" transform="translate(${r1(-d.w / 2 + 6)} ${r1(-d.h / 2 + 4)})"><circle r="11"/><text class="kg-num">${k + 1}</text></g>`
      + (big ? kgBadge(d.w, d.h) : '')
      + (side(i) ? `<text class="kg-side" y="${r1(d.h / 2 + 18)}">${esc(side(i))}</text>` : '') + '</g>';
  };
  const heads = cols.map((c, k) => `<text class="kg-col" x="${CW / 2 + k * CW}" y="26">${esc(meta.types[c].plain)}</text>`).join('')
    + (outs.length ? `<text class="kg-col" x="${CW / 2}" y="${outY + 5}">${esc(`${meta.types[outs[0].n.type].plain} · ${meta.states.out ?? ''}`)}</text>` : '');
  const ci = cols.findIndex(c => meta.types[c].badge), band = ci >= 0 && main[ci].length ? `<rect class="kg-band" x="${ci * CW + 8}" y="40" width="${CW - 16}" height="${(outs.length ? outY - 18 : bottom) - 46}" rx="16"/>` : '';
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
