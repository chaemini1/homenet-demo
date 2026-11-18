// 계약 JSON → HTML 문자열. document를 모른다. 모든 데이터 문자열은 esc()를 거친다.
export const TONE = { ok: 'ok', warn: 'warn', bad: 'bad', unknown: 'unknown', checking: 'checking', neutral: 'neutral' };
const GLYPH = { ok: '✓', warn: '!', bad: '✕', unknown: '?', checking: '…' };
const tone = t => TONE[t] ?? 'unknown';

export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const DOT_LABEL = { ok: '정상', warn: '주의', bad: '문제', unknown: '미확인', checking: '확인 중', neutral: '' };
export const dotHTML = t => `<span class="dot ${tone(t)}"></span>`;
export const pillHTML = p => `<span class="pill ${tone(p.tone)}">${esc(p.text)}</span>`;

// 경로 칸 그림: 무엇인지 알아보게 하는 장식. 상태는 옆 글리프가 맡는다 (색만으로 구분하지 않게)
const SEG_ICON = {
  pc: '<rect x="3" y="4" width="14" height="9" rx="1.5"/><path d="M7.5 16.5h5M10 13v3.5"/>',
  wifi: '<path d="M3 8a10 10 0 0 1 14 0M5.5 10.8a6.5 6.5 0 0 1 9 0M8 13.6a3 3 0 0 1 4 0M10 16.3h.01"/>',
  router: '<rect x="2.5" y="10.5" width="15" height="6" rx="1.5"/><path d="M6 10.5V4M14 10.5V4"/><circle cx="6" cy="13.5" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none"/>',
  wall: '<rect x="4" y="2.5" width="12" height="15" rx="1.5"/><circle cx="10" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M7.5 15h5"/>',   // 세워 둔 모뎀: 앞면 표시등 세로 줄 (안테나 달린 공유기와 구분)
  isp: '<path d="M10 8v9M7 17l3-9 3 9M8 14h4M6.6 3.6a4.5 4.5 0 0 0 0 5.8M13.4 3.6a4.5 4.5 0 0 1 0 5.8"/><circle cx="10" cy="6.5" r="1.3" fill="currentColor" stroke="none"/>',   // 전파를 내보내는 통신 탑
  internet: '<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c2.2 2 3.2 4.5 3.2 7s-1 5-3.2 7c-2.2-2-3.2-4.5-3.2-7s1-5 3.2-7z"/>',
};
export function segmentHTML(s) {
  const st = tone(s.status), ic = SEG_ICON[s.key];
  const icon = ic ? `<svg class="seg-ic" viewBox="0 0 20 20" aria-hidden="true">${ic}</svg>` : '';
  return `<div class="seg ${st}"><div class="box">${icon}${GLYPH[st] ?? '?'}</div><div class="lab">${esc(s.label)}</div></div>`;
}
export function pathCardHTML(p) {
  const segs = p.segments.map(segmentHTML);
  segs.splice(4, 0, '<div class="segdiv"></div>');           // 4칸(집 안) | 2칸(집 밖)
  return `<section class="card path">
    <div class="chead"><b>우리 집 인터넷 경로</b><span>${esc(p.note)}</span></div>
    <div class="segments">${segs.join('')}</div>
    <div class="partition"><div class="home">집 안</div><div class="out">집 밖</div></div>
    <div class="conclusion ${tone(p.conclusion.tone)}"><p>${esc(p.conclusion.text)}</p></div>
  </section>`;
}
// long: 측정값이 아니라 문장인 값(KG 원인·조치 등). 휴대폰에서 값을 이름 아래 한 줄 전체로 내린다(app.css)
export const metricRowHTML = m => `<div class="metric ${tone(m.status)}${[...String(m.value ?? '')].length > 20 ? ' long' : ''}"><span class="k">${esc(m.label)}</span><span class="v">${m.before ? `<span class="was"><span class="sr">이전 값 </span>${esc(m.before)}</span><span class="arrow" aria-hidden="true">→</span><span class="sr">지금 </span>` : ''}${esc(m.value)}${DOT_LABEL[tone(m.status)] ? `<span class="sr"> (${DOT_LABEL[tone(m.status)]})</span>` : ''}</span></div>`;   // 상태는 값 글자의 색과 낱말이 맡는다(끝의 점은 같은 말을 두 번 해서 11/17에 뺐다). 실서버 값("12 ms", "—")엔 상태 낱말이 없어 스크린리더용으로만 붙인다
// 근거 출처: 행에 sources가 있을 때만 그 행 바로 아래에 그린다. 응답에서 온 주소라 https://만 링크로 만든다.
const SOURCE_KIND = { official: '공식 문서 요약', applied: '프로젝트 적용' };
const sourceHTML = s => {
  const name = /^https:\/\//.test(s.url ?? '')
    ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}<span class="sr"> (새 탭에서 열림)</span></a>`
    : `<span>${esc(s.label)}</span>`;
  return `<li><span class="msrc-kind">${esc(SOURCE_KIND[s.kind] ?? s.kind)}</span>${name}</li>`;
};
const sourcesHTML = list => list?.length ? `<ul class="msrc" aria-label="근거 출처">${list.map(sourceHTML).join('')}</ul>` : '';
export function metricListHTML(l) {
  if (!l) return '';                                    // 정상 결과처럼 후보 목록이 없는 화면
  const meta = l.meta ? `<span>${esc(l.meta)}</span>` : '';
  const note = l.rows.some(m => m.sources?.length) ? '<p class="msrc-note">출처는 참고용이며 실제 측정 결과와 별개입니다.</p>' : '';
  return `<div class="mlist"><div class="mhead"><b>${esc(l.title)}</b>${meta}</div>${l.rows.map(m => metricRowHTML(m) + sourcesHTML(m.sources)).join('')}${note}</div>`;
}
export function stepperHTML(steps) {
  return `<div class="stepper">${steps.map(s => `<div class="step-item ${esc(s.state)}"><div class="marker">${s.state === 'done' ? '✓' : ''}</div><div><div class="lab">${esc(s.label)}</div>${s.answer ? `<div class="ans">${esc(s.answer)}</div>` : ''}${s.edit ? `<button type="button" class="ghost link edit" data-event="edit_text">${esc(s.edit)}</button>` : ''}</div></div>`).join('')}</div>`;
}
// KG 경로: evidence.rows(원인 후보 → 조건·조치·상세 절차 순서)를 원인 후보마다 가지로 묶는다. 참고 자료 등 나머지 행은 나무 아래에 목록 모양 그대로
// evidence.rows → 원인 후보마다 [원인, 조건·조치·절차…] 묶음과 그 밖의 줄(참고 자료)
const kgGroups = rows => {
  const causes = [], rest = [];
  for (const m of rows) {
    if (m.label === '원인 후보') causes.push([m]);
    else if (causes.length && (m.label === '확인할 조건' || m.label === '확인·조치' || m.label.startsWith('상세 절차 · '))) causes.at(-1).push(m);
    else rest.push(m);
  }
  return { causes, rest };
};
const kgRestHTML = rest => rest.map(m => metricRowHTML(m) + sourcesHTML(m.sources)).join('') + (rest.some(m => m.sources?.length) ? '<p class="msrc-note">출처는 참고용이며 실제 측정 결과와 별개입니다.</p>' : '');
export function kgPathHTML(path, evidence) {
  let n = 0;   // 나타나는 순번: 위에서부터 차례로 보이게 한다 (app.css .kp-node의 animation-delay)
  const node = (cls, k, v, extra = '') => `<li class="kp-node ${cls}" style="--i:${n++}"><span class="k">${esc(k)}</span><span class="v">${esc(v)}${extra}</span></li>`;
  const query = [path.device && `기기 ${path.device}`, path.os && `운영체제 ${path.os}`].filter(Boolean).join(' · ');
  const { causes, rest } = kgGroups(evidence.rows);
  const step = m => m.label.startsWith('상세 절차 · ') ? ['상세 절차', `${m.label.slice(8)}: ${m.value}`] : [m.label, m.value];
  // head를 tree보다 먼저 만든다: node()가 부르는 순서대로 나타나는 순번을 매긴다
  const head = (path.input ? node('lv0 input', '입력한 설명', `“${path.input}”`) : '') + node('lv0' + (causes.length ? '' : ' last'), '증상', path.symptom, query ? `<span class="q">${esc(query)}</span>` : '');
  const tree = causes.map(([c, ...kids], i) => {   // last: 마지막 원인 후보 → 줄기가 그 점에서 끝난다 (CSS)
    const last = i === causes.length - 1 ? ' last' : '';
    return node('lv1' + last, c.label, c.value) + kids.map(m => node('lv2' + last, ...step(m))).join('');
  }).join('');
  return `<div class="mlist kgpath"><div class="mhead"><b>KG 경로</b>${path.input ? '<span>증상까지는 분류기, 그 뒤는 KG입니다.</span>' : ''}</div><ol class="kp-tree" style="--step:${Math.min(180, Math.round(1500 / n))}ms">${head}${tree}</ol>${kgRestHTML(rest)}</div>`;
}
// 전문가 KG(이번 진단, Y14a): 증상 후보 → 원인 → 조건 → 조치 → 절차 열. 원인 후보 하나가 한 줄.
// 고른 증상·절차는 강조색, 고르지 않은 분류 후보는 흐리게(선 없음). 선은 글자 끝에서 다음 열까지, 원인이 둘 이상이면 갈래(.br).
// DOM 순서 = 읽는 순서: 열 머리 → 고른 증상 → 원인 줄들 → 고르지 않은 후보. 자리는 grid-area로 따로 정한다
export function kgColumnsHTML(path, evidence, ranked = []) {
  const { causes, rest } = kgGroups(evidence.rows);
  const picked = ranked.find(a => a.title === path.symptom) ?? { title: path.symptom };
  const others = ranked.filter(a => a !== picked);
  const sub = a => [a.id, a.score, a === picked && ranked.length > 1 && '고름'].filter(Boolean).join(', ');
  const kv = (t, s, cls = '') => `<span class="kv${cls}">${esc(t).replace(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+/g, '<span class="nw">$&</span>')}${s ? `<small>${esc(s)}</small>` : ''}</span>`;   // 좁은 열에서 Wi-Fi가 Wi-/Fi로 끊기지 않게
  const cell = (row, col, html, cls = '') => `<div class="kc c${col}${cls}" style="grid-area:${row + 2}/${col}">${html}</div>`;
  const heads = [ranked.length > 1 ? '증상 후보' : '증상', '원인', '조건', '조치', path.os ? `절차 (${path.os})` : '절차'].map(h => `<div class="kh">${esc(h)}</div>`).join('');
  const rows = causes.map(([c, ...kids], i) => {
    const pick = l => kids.find(m => m.label === l)?.value ?? '';
    const procs = kids.filter(m => m.label.startsWith('상세 절차 · ')).map(m => kv(m.label.slice(8), (m.value.split(' 적용 조건: ')[1] ?? '').split(' · ').join(', '), ' on'));
    const cols = [kv(c.value), pick('확인할 조건') && kv(pick('확인할 조건')), pick('확인·조치') && kv(pick('확인·조치')), procs.join('')];
    const br = causes.length > 1 ? ` br${i === 0 ? ' top' : ''}${i === causes.length - 1 ? ' end' : ''}` : '';
    const html = cols.map((h, k) => h || (k === 3 ? kv('절차 없음', '', ' none') : ''));   // 절차 노드가 없으면 글자만, 조치에서 선은 긋지 않는다
    return html.map((h, k) => h ? cell(i, k + 2, (k === 0 && br ? '<i class="kt"></i>' : '') + h, (k === 0 ? br : '') + (k < 3 && cols[k + 1] ? ' ln' : '')) : '').join('');
  }).join('');
  const q = path.input ? `<p class="kgc-q">“${esc(path.input)}”${path.device || path.os ? `<small>${esc([path.device, path.os].filter(Boolean).join(', '))}</small>` : ''}</p>` : '';
  return `<section class="card kg kgc-card" aria-labelledby="kg-h"><div class="chead"><b id="kg-h">지식그래프</b><span>이번 진단</span></div>${q}`
    + `<div class="kgc-scroll"><div class="kgc">${heads}${cell(0, 1, kv(picked.title, sub(picked), ' on'), causes.length ? ' ln' : '')}${rows}`
    + others.map((a, j) => cell(j + 1, 1, kv(a.title, sub(a)), ' dim')).join('') + `</div></div>${kgRestHTML(rest)}</section>`;
}
export function stepConfirmHTML(s, index) {
  const active = s.state === 'todo';
  const dis = active ? '' : ' disabled';
  const num = s.state === 'done' ? '✓' : esc(s.num);
  return `<div class="step ${esc(s.state)}">
    <div class="head"><div class="num">${num}</div><div><div class="t">${esc(s.title)}</div><div class="h">${esc(s.hint)}</div></div></div>
    <div class="confirm"><button type="button" class="yes" data-event="step_done" data-step="${index}"${dis}>해결됨</button><button type="button" class="no" data-event="step_failed" data-step="${index}"${dis}>해결 안 됨</button></div>
  </div>`;
}
export const stepInfoHTML = s => `<div class="step"><div class="head"><div class="num">${esc(s.num)}</div><div><div class="t">${esc(s.title)}</div><div class="h">${esc(s.hint)}</div></div></div></div>`;
export const answerCardHTML = (a, selected, rank) => `<button type="button" class="answer${selected ? ' selected' : ''}" data-answer="${esc(a.id)}" aria-pressed="${!!selected}"><div class="ah">${a.score ? `<span class="rank" aria-hidden="true">${rank}</span>` : ''}<div class="at">${esc(a.title)}</div>${a.score ? `<span class="score">${esc(a.score)}</span>` : ''}<div class="chk" aria-hidden="true">✓</div></div>${a.hint ? `<div class="hint">${esc(a.hint)}</div>` : ''}</button>`;
// 열 수는 답 개수로 고른다: 마지막 줄에 카드 한 장만 남지 않게 (4장 2×2, 7·8장 4열, 그 밖은 최대 3열). 959px 아래는 CSS가 1열로 쌓는다
const ANSWER_COLS = { 4: 2, 7: 4, 8: 4 };
// 글로 받는 답(KG WFU14). 글자 수는 서버처럼 코드포인트로 센다
export const textInputHTML = (box, text = '') => `<div class="text-answer"><textarea id="answer-text" rows="3" maxlength="${esc(box.max)}" placeholder="${esc(box.placeholder)}" aria-label="설명 입력" aria-describedby="answer-count">${esc(text)}</textarea><div class="count" id="answer-count">${[...text].length}/${esc(box.max)}자</div></div>`;
// 자유 입력 분류 화면: 왼쪽에 글 입력·예시 문장·찾기 버튼, 오른쪽에 분류 결과(순위와 점수). 고르는 것은 answers, 보여 주기만 하는 것은 intent.ranked
export function intentHTML(p, text = '', selected) {
  const box = p.text_input, it = p.intent, ranked = it.ranked ?? [], scored = ranked.length || p.answers.some(a => a.score);
  return `<div class="intent"><section class="card" aria-labelledby="intent-in-h"><div class="chead"><b id="intent-in-h">${esc(it.input_title)}</b></div>${textInputHTML(box, text)}`
    + `<div class="examples" role="group" aria-labelledby="intent-ex-h"><span id="intent-ex-h">예시 문장</span>${(box.examples ?? []).map(x => `<button type="button" class="example" data-example="${esc(x)}">${esc(x)}</button>`).join('')}</div>`
    + `<button type="button" class="btn ${p.answers.length ? 'sec' : 'pri'}" data-event="classify"${text.trim() ? '' : ' disabled'}>${esc(box.submit)}</button></section>`
    + `<section class="card" aria-labelledby="intent-out-h"><div class="chead"><b id="intent-out-h">${esc(it.title)}</b>${scored && it.score_label ? `<span>${esc(it.score_label)}</span>` : ''}</div>`
    + (ranked.length ? `<ol class="ranked">${ranked.map((r, i) => `<li><span class="rank" aria-hidden="true">${i + 1}</span><span class="at">${esc(r.title)}</span><span class="score">${esc(r.score)}</span></li>`).join('')}</ol>` : '')
    + (it.note ? `<p class="intent-note ${tone(it.note.tone)}">${esc(it.note.text)}</p>` : '')
    + (it.empty ? `<p class="state">${esc(it.empty)}</p>` : '')
    + (it.question ? `<p class="intent-q">${esc(it.question)}</p>` : '')
    + (p.answers.length ? `<div class="answers" style="--cols:1">${p.answers.map((a, i) => answerCardHTML(a, a.id === selected, i + 1)).join('')}</div>` : '')
    + '</section></div>';
}
export const answersHTML = (list, selected) => `<div class="answers" style="--cols:${ANSWER_COLS[list.length] ?? Math.min(list.length, 3)}">${list.map(a => answerCardHTML(a, a.id === selected)).join('')}</div>`;
export function headlineHTML(h) {
  return `<div class="headline">${h.pill ? pillHTML(h.pill) : ''}<h1>${esc(h.title)}</h1>${h.body ? `<p>${esc(h.body)}</p>` : ''}</div>`;
}
// 용어 설명(11/17 회의): 결과 화면에서 낯선 용어에 마우스를 올리거나 누르면 뜻이 뜬다(app.js). 설명은 개조식 한두 문장
export const GLOSSARY = [
  ['dBm', '와이파이 신호 세기 단위. 0에 가까울수록 강하고, -70보다 낮으면 약한 편임.'],
  ['공유기', '인터넷 하나를 여러 기기가 나눠 쓰게 해 주는 장비. 와이파이도 공유기에서 나옴.'],
  ['모뎀', '통신사 회선을 집 안에서 쓰는 인터넷 신호로 바꿔 주는 장비. 공유기와 한 기기로 된 경우도 있음.'],
  ['DNS', '사이트 이름(예: naver.com)을 실제 접속 주소로 바꿔 주는 기능. 문제가 생기면 연결돼 있어도 사이트가 열리지 않음.'],
  ['DHCP', '공유기가 기기마다 IP 주소를 자동으로 나눠 주는 기능임.'],
  ['IP', '네트워크에서 기기마다 붙는 주소. 보통 공유기가 자동으로 나눠 줌.'],
  ['WAN', '공유기에서 바깥(모뎀이나 벽 단자) 쪽으로 이어지는 연결. 공유기 뒷면에 이름이나 색이 다른 단자 하나로 되어 있음.'],
  ['게이트웨이', '기기가 인터넷으로 나갈 때 처음 거치는 장비. 집에서는 보통 공유기임.'],
  ['SSID', '와이파이 이름. 와이파이 목록에 보이는 이름임.'],
  ['대역', '와이파이가 쓰는 전파 구간. 2.4GHz는 멀리 가지만 느리고, 5GHz는 빠르지만 벽에 약함.'],
  ['채널', '같은 대역 안에서 나눠 쓰는 좁은 전파 구간. 옆집 와이파이와 겹치면 느려질 수 있음.'],
  ['간섭', '다른 와이파이나 전자레인지 같은 기기의 전파가 겹쳐 신호를 방해하는 현상임.'],
  ['어댑터', '기기 안에서 와이파이 전파를 주고받는 부품임.'],
  ['드라이버', '운영체제가 기기의 무선 부품을 쓸 수 있게 해 주는 프로그램임.'],
  ['패킷', '인터넷으로 주고받는 데이터를 잘게 나눈 조각. 조각이 사라지면 영상·통화가 끊기거나 버벅일 수 있음.'],
];
// 다른 낱말의 일부는 건너뛴다: 영문은 IPv6·SSIDs·TCP/IP, 대역은 대역폭(뜻이 다르다)
const TERM_RE = GLOSSARY.map(([w]) => new RegExp(/^[A-Za-z]+$/.test(w) ? `(?<![A-Za-z0-9/])${w}(?![A-Za-z0-9])` : w === '대역' ? '대역(?!폭)' : w));
// 용어 뒤에 붙은 조사와 닫는 괄호·문장 부호: 단추와 한 덩어리로 묶어 그 사이에서 줄이 바뀌지 않게 한다 (단추는 keep-all이 묶지 못한다)
const TERM_TAIL = /^(?:에서|으로|까지|보다|[와과의를을이가은는로에도만])?[)\].,]*/;
// html 문자열에서 태그 밖 글자만 본다(속성은 건드리지 않음). 용어마다 처음 나온 자리 하나에만 붙이고, 제목(h1)·버튼·링크 안은 건너뛴다.
// 설명은 단추 바로 뒤의 숨은 글(aria-describedby)이고, 보일 때는 app.js가 그 글을 단추 옆에 띄운다
export function termsHTML(html) {
  const used = new Set(); let inside = 0;
  return html.split(/(<[^>]*>)/).map(part => {
    if (part.startsWith('<')) { const m = part.match(/^<(\/?)(h1|button|a)\b/i); if (m) inside += m[1] ? -1 : 1; return part; }
    let out = '', rest = part;
    while (!inside && rest) {
      let hit = null;
      TERM_RE.forEach((re, i) => { const m = used.has(i) ? null : re.exec(rest); if (m && (!hit || m.index < hit.at)) hit = { at: m.index, text: m[0], i }; });
      if (!hit) break;
      used.add(hit.i);
      const after = rest.slice(hit.at + hit.text.length), tail = after.match(TERM_TAIL)[0];
      out += `${rest.slice(0, hit.at)}<span class="term-w"><button type="button" class="term" aria-describedby="term-${hit.i}">${hit.text}</button><span id="term-${hit.i}" class="term-d" role="tooltip" hidden>${esc(GLOSSARY[hit.i][1])}</span>${tail}</span>`;
      rest = after.slice(tail.length);
    }
    return out + rest;
  }).join('');
}
// 번호가 있는 버튼(event "call")은 tel: 링크 — 브라우저가 전화 앱으로 넘긴다. 번호를 추측하지 않으므로 tel이 없으면 링크도 없다
export const actionHTML = (b, cls) => !b ? '' : b.tel
  ? `<a class="${cls}" href="tel:${esc(b.tel)}">${esc(b.label)}</a>`
  : `<button type="button" class="${cls}" data-event="${esc(b.event)}"${b.disabled ? ' disabled' : ''}>${esc(b.label)}</button>`;
const btn = (b, cls) => actionHTML(b, `btn ${cls}`);
export function actionsHTML(a, cls = '') {
  return `<div class="actions${cls ? ' ' + cls : ''}"><p class="foot">${esc(a.footnote)}</p><div class="spacer"></div>${btn(a.secondary, 'sec')}${btn(a.primary, 'pri')}</div>`;
}
// lead: 휴대폰에서 경로 카드를 숨길 때 그 결론 문장을 이 상자 맨 위에 보인다(.why-lead는 560px 아래에서만 보임)
export const whyAskingHTML = (t, lead) => `<div class="why"><div>${lead ? `<p class="why-lead">${esc(lead)}</p>` : ''}<p style="margin:0">${esc(t)}</p></div></div>`;
// 휴대폰 질문 화면: 왼쪽 '진단 단계' 목록 대신 한 줄 진행 막대 (.progress는 560px 아래에서만 보임)
export function progressHTML(steps) {
  const at = (steps.findIndex(s => s.state === 'current') + 1) || steps.filter(s => s.state === 'done').length;
  return `<div class="progress"><div class="ph"><span>진단 진행</span><b>${at} / ${steps.length}</b></div><div class="bar">${steps.map(s => `<i class="${esc(s.state)}"></i>`).join('')}</div></div>`;
}
export const noteHTML = () => `<div class="note demo-note"><div class="row">예시 데이터로 보는 중</div><p>실제 장비를 측정하지 않습니다.</p></div>`;
export const railStepsHTML = steps => `<div class="lbl">진단 단계</div>${stepperHTML(steps)}<div class="spacer"></div>${noteHTML()}`;
export function railHomeHTML(s) {
  const row = (k, v) => metricRowHTML({ label: k, value: v, status: 'neutral' });
  return `<div class="lbl">우리 집 인터넷</div>
    <div>${row('통신사', s.home.isp)}${row('공유기', s.home.router)}${row('연결된 기기', s.home.devices)}${row('마지막 확인', s.home.last_check)}</div>
    <div class="spacer"></div>${noteHTML()}`;
}
export function recentCardHTML(s) {
  const rows = s.recent.length
    ? s.recent.map(r => metricRowHTML({ label: r.label, value: r.when, status: r.tone })).join('')
    : '<p class="state">아직 진단 기록이 없습니다. 문제가 생기면 진단을 시작하면 됩니다.</p>';
  return `<section class="card recent"><div class="chead"><b>최근 기록</b><button type="button" class="ghost link" data-nav="records">전체 보기</button></div>${rows}<p class="foot">${esc(s.recent_footnote)}</p></section>`;
}

// ==== W7 기록 ====
export const countRowHTML = c => `<div class="count"><span class="k">${esc(c.label)}</span><span class="v">${esc(c.value)}</span></div>`;   // 11/18: 장식 점 뺌(건수는 숫자로 충분)
export function chartHTML(rail) {
  const bars = rail.chart_bars.map(b => `<div class="bar${b.peak ? ' peak' : ''}" style="height:${Math.max(3, Math.min(64, b.h))}px"></div>`).join('');
  const axis = rail.chart_axis.map(a => `<span>${esc(a)}</span>`).join('');
  return `<div class="lbl">${esc(rail.chart_title)}</div><div class="chart"><div class="bars">${bars}</div><div class="axis">${axis}</div></div><p class="foot">${esc(rail.chart_caption)}</p>`;
}
export const recordsRailHTML = rail => `<div class="lbl">${esc(rail.counts_title)}</div><div>${rail.counts.map(countRowHTML).join('')}</div><div style="padding-top:var(--space-4)">${chartHTML(rail)}</div><div class="spacer"></div>${noteHTML()}`;
// 기록 = 선으로 나눈 표 한 줄(11/18: 카드·알약 배지·칩을 걷어 냄. 팀 요청 "백준 정답 화면처럼"). 펼치면 진단 단계 이름과 내용 목록
export function recordRowHTML(r, open) {
  const body = open ? `<div class="rec-body"><dl>${r.chain.map(c => `<div class="${esc(c.tone)}"><dt>${esc(c.kind)}</dt><dd>${esc(c.text)}</dd></div>`).join('')}</dl>${r.chain_caption ? `<p class="foot">${esc(r.chain_caption)}</p>` : ''}</div>` : '';
  return `<div class="rec${open ? ' open' : ''}"><button type="button" class="rec-head" data-rec="${esc(r.id)}" aria-expanded="${open}"><span class="rw">${esc(r.when)}</span><span class="rc">${esc(r.cause)}</span><span class="rf">${esc(r.fix)}</span><span class="rs ${esc(r.status.tone)}">${esc(r.status.text)}</span><span class="rt" aria-hidden="true"></span></button>${body}</div>`;
}
const recColsHTML = cols => `<div class="rec-cols" aria-hidden="true">${['rw', 'rc', 'rf', 'rs'].map((c, i) => `<span class="${c}">${esc(cols[i])}</span>`).join('')}<span class="rt"></span></div>`;
export const closeBtnHTML = () => `<button type="button" class="iconbtn" data-nav="back" title="닫기 (Esc)" aria-label="닫기">✕</button>`;
export const recordsStageHTML = (d, openId, demo = false) => `<div class="chead big"><b>${esc(d.title)}</b><div class="spacer"></div><span>${esc(d.meta)}</span>${closeBtnHTML()}</div><div class="recs">${d.records.length ? (d.columns ? recColsHTML(d.columns) : '') + d.records.map(r => recordRowHTML(r, r.id === openId)).join('') : '<p class="state">아직 진단 기록이 없습니다. 문제가 생기면 진단을 시작하면 됩니다.</p>'}</div><div class="spacer"></div><div class="actions"><p class="foot">${esc(demo ? d.demo_footnote ?? d.footnote : d.footnote)}</p><div class="spacer"></div><button type="button" class="btn sec" data-event="export_records">${esc(d.export_label)}</button></div>`;

// ==== W8 설정 ====
export const settingsRailHTML = (d, activeId) => `<div class="lbl">설정</div><div class="secnavs">${d.sections.map(s => `<button type="button" class="secnav${s.id === activeId ? ' on' : ''}" data-secnav="${esc(s.id)}">${esc(s.title)}</button>`).join('')}</div><div class="spacer"></div><div class="note"><div class="row">${esc(d.rail_note.head)}</div><p>${esc(d.rail_note.body)}</p></div>`;
export function settingControlHTML(row, val) {
  const c = row.control;
  if (c.type === 'segment') return `<div class="seg-ctrl">${c.options.map(o => `<button type="button" class="seg-opt${o.v === val ? ' on' : ''}" aria-pressed="${o.v === val ? 'true' : 'false'}" data-set="${esc(row.id)}" data-val="${esc(o.v)}">${esc(o.label)}</button>`).join('')}</div>`;
  if (c.type === 'toggle') return `<button type="button" class="toggle${val ? ' on' : ''}" role="switch" aria-label="${esc(row.title ?? row.id)}" aria-checked="${val ? 'true' : 'false'}" data-set="${esc(row.id)}" data-toggle><span class="knob"></span></button>`;
  if (c.type === 'button') return `<button type="button" class="btn sec small${c.danger ? ' danger' : ''}" data-event="${esc(c.event)}">${esc(c.label)}</button>`;
  return `<span class="set-badge">${esc(c.label)}</span>`;
}
export const settingRowHTML = (row, val) => `<div class="set-row${row.danger ? ' danger' : ''}"><div class="set-txt"><div class="st">${esc(row.title)}</div><div class="sh">${esc(row.hint)}</div></div>${settingControlHTML(row, val)}</div>`;
export function settingsSectionHTML(sec, values, demo = false) {
  const subtitle = demo ? sec.demo_subtitle ?? sec.subtitle : sec.subtitle;
  return `<section class="set-sec" id="set-${esc(sec.id)}"><h2>${esc(sec.title)}</h2>${subtitle ? `<p class="set-sub">${esc(subtitle)}</p>` : ''}<div class="set-rows">${sec.rows.map(r => settingRowHTML(r, values[r.id])).join('')}</div></section>`;
}
export const settingsStageHTML = (d, values, demo = false) => `<div class="chead big"><b>${esc(d.title)}</b><div class="spacer"></div><span>${esc(demo ? d.demo_meta ?? d.meta : d.meta)}</span>${closeBtnHTML()}</div>${d.sections.map(s => settingsSectionHTML(s, values, demo)).join('')}`;

// ==== WE1 전문가 콘솔 ====
export const expertTopbarHTML = t => `<span class="pill checking">${dotHTML('checking')}${esc(t.pill)}</span><div class="spacer"></div><span class="isp">${esc(t.model)}&nbsp;&nbsp;${esc(t.kg)}</span><span class="toggle-row">${esc(t.toggle_label)}<button type="button" class="toggle on" role="switch" aria-checked="true" aria-label="${esc(t.toggle_label)}" data-expert-off><span class="knob"></span></button></span><button type="button" class="ghost" data-nav="settings">설정</button>`;
// 로그 속 KG id를 버튼으로(known에 있는 것만). known이 없으면 예전 출력 그대로. 눌리면 app.js가 그래프 노드를 선택한다
const KG_ID = /\b(?:symptom|cause|action|evidence|remedy)_[a-z0-9_]+/g;
const withIdRefs = (text, known) => known ? esc(text).replace(KG_ID, m => known.has(m) ? `<button type="button" class="idref" data-kg="${m}">${m}</button>` : m) : esc(text);
export const logRowHTML = (e, known) => `<div class="logrow"><span class="lt">${esc(e.time)}</span><span class="tag ${esc(e.tone)}">${esc(e.tag)}</span><span class="lx">${withIdRefs(e.text, known)}</span></div>`;
// 왼쪽 칸 접기 버튼 + 접혔을 때 보이는 세로 이름. nameHTML은 이미 esc한 글, controls는 전문가 로그만 쓴다
const railToggle = (nameHTML, collapsed, controls = '') => `<button type="button" class="iconbtn rail-toggle" data-rail-toggle${controls} aria-expanded="${!collapsed}" aria-label="${nameHTML} ${collapsed ? '펼치기' : '접기'}">${collapsed ? '›' : '‹'}</button><span class="rail-vlabel" aria-hidden="true">${nameHTML}</span>`;
// 홈·진단·기록의 왼쪽 칸도 접는다: 맨 앞 이름(.lbl)을 버튼 이름으로 쓴다. 이름으로 시작하지 않는 칸(전문가 로그)은 그대로 둔다
export const foldableRailHTML = (rail, collapsed = false) => rail.replace(/^<div class="lbl">([^<]*)<\/div>/, (lbl, nameHTML) => railToggle(nameHTML, collapsed) + lbl);
// collapsed = 사이드바처럼 접힌 상태(폭 56px 띠). 접기 버튼과 세로 이름은 늘 있고, 로그·내보내기는 #rail-log 안 → CSS가 접힌 동안 숨긴다
export const expertRailHTML = (log, known, collapsed = false) => `${railToggle(esc(log.title), collapsed, ' aria-controls="rail-log"')}<div class="rail-log" id="rail-log"><div class="log"><div class="lhead"><b>${esc(log.title)}</b><span>${esc(log.range)}</span></div>${log.entries.length ? log.entries.map(e => logRowHTML(e, known)).join('') : `<p class="state">${esc(log.empty_text)}</p>`}</div><div class="spacer"></div><button type="button" class="btn sec" data-event="export_log">${esc(log.export_label)}</button></div>`;
// 전문가 연결 경로: 일반 모드 경로 카드와 같은 방향(내 컴퓨터 → 인터넷). 데이터는 바깥(인터넷)부터 오므로 뒤집는다 — links[i]는 nodes[i]↔nodes[i+1].
// 칸 = 상태 글리프 + 이름 + 측정값(한 칸 안에). 칸 사이엔 늘 선, 문제 구간은 선 색·점선 + 선 위 라벨. 일반 모드 .seg와 CSS를 나눈다
export function topologyHTML(t) {
  const nodes = [...t.nodes].reverse(), links = [...t.links].reverse();
  const node = n => `<div class="tnode ${tone(n.tone)}"><div class="tn-h"><span class="tn-g">${GLYPH[tone(n.tone)] ?? '?'}</span><b>${esc(n.label)}</b></div><div class="tn-c">${esc(n.caption)}</div></div>`;
  const link = l => `<div class="tlink ${tone(l?.tone)}${l?.dashed ? ' dashed' : ''}${l?.label ? ' has' : ''}">${l?.label ? `<span>${esc(l.label)}</span>` : ''}</div>`;
  return `<section class="card path topo">
    <div class="chead"><b>${esc(t.title)}</b><span>${esc(t.note)}</span></div>
    <div class="tchain">${nodes.map((n, i) => node(n) + (i < nodes.length - 1 ? link(links[i]) : '')).join('')}</div>
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
function kgChip(shape, w, h, text, glyph, big = false, icon = shape) {   // icon: 아이콘은 종류대로, 실루엣(shape)만 바꿀 때
  const c = Math.min(h * .3, 14), slant = shape === 'diamond' || shape === 'hexagon' ? c * .8 : 0, cap = shape === 'circle' ? h / 4 : 0;
  const padL = 12 + slant + cap, padR = 12 + slant + cap + (shape === 'triangle' ? c * .8 : 0);
  const ix = -w / 2 + padL, tx = ix + 24, lh = big ? 16.5 : 15;
  const lines = kgLines(text, Math.max(4, Math.floor((w / 2 - padR - 10 - tx) / (big ? 15 : 14.2)))), y0 = -(lines.length - 1) * lh / 2;
  return { s: `<path class="kg-s" d="${kgSil(shape, w, h)}"/>`,
    inner: kgIcon(icon, ix, -8) + `<text class="kg-t${big ? ' big' : ''}" x="${r1(tx)}" y="${r1(y0)}">${lines.map((l, i) => `<tspan x="${r1(tx)}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join('')}</text>`
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
export const kgLine = (a, ahw, ahh, b, bhw, bhh, gap = 8) => {
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


// 전문가: kg.json의 힘 기반 배치로 시작하며, 드래그한 메모리 좌표도 같은 방식으로 그린다. 보기·선택 때 재배치하지 않는다.
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
    return { on, html: `<path class="${cls}" d="${d}" data-s="${esc(e.s)}" data-t="${esc(e.t)}" ${mk}/>` };
  });
  // 기본 선택: 이전 선택 → 채택 원인 → 첫 경로 노드 → 첫 노드 (항상 하나, 지금 그려진 노드 중에서)
  const selId = pos.has(o.sel) ? o.sel : (nodes.find(n => kgType(meta, n.type).badge && tones.get(n.id) === 'bad') ?? nodes[0])?.id;
  const node = n => {
    const ty = kgType(meta, n.type), t = tones.get(n.id), adopted = ty.badge && t === 'bad', sel = n.id === selId, ps = pos.get(n.id), d = dims(n.id);
    const aria = [`${ty.ko}: ${n.name}`, t && meta.states[t], adopted && T.adopted, n.proposed && T.proposed].filter(Boolean).join(', ');
    const glyph = t && KG_GLYPH[t] ? KG_GLYPH[t] : '';
    const body = kgTile(ty, d.w, d.h, glyph);
    // 기각(out) 라벨은 두 번: 선을 가리는 배경색 테두리는 장식 없는 뒤 글자(kg-halo)에만 — 취소선에 테두리가 붙으면 글자 가운데를 지운다
    const lines = kgLines(n.label ?? n.name, 11).map(l => l.length > 11 ? `${l.slice(0, 10).trimEnd()}…` : l);
    const tx = cls => `<text class="kg-l${cls}" y="${d.h / 2 + 18}">${lines.map((l, i) => `<tspan x="0" dy="${i ? 14 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
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
  const { meta } = kg, T = meta.text, CW = 262, ROW = 112, TOP = 84;
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
  // 결론(채택 원인)이 있으면 같은 칸의 다른 후보 원인은 흐리게 두고 선을 잇지 않는다 — 두 원인에 선이 다 닿으면 어느 쪽이 답인지, 선이 왜 엉켰는지 읽기 어렵다
  const hasAdopted = main.some(m => m.some(adopted)), dimmed = i => hasAdopted && meta.types[i.n.type].badge && !adopted(i);
  for (let k = links.length - 1; k >= 0; k--) if (dimmed(links[k][0]) || dimmed(links[k][1])) links.splice(k, 1);
  const drawn = main.flat(), shown = [...drawn, ...outs];                      // 그림엔 이번 결론으로 이어진 노드만, 아니었던 원인은 아래 목록에만
  const maxN = Math.max(1, ...main.map(m => m.length)), bottom = TOP + (maxN - 1) * ROW + 84;
  const dims = i => adopted(i) ? { w: 248, h: 72 } : { w: 238, h: 60 };
  // 일반 모드는 색을 역할로만 쓴다(상태색이 섞이면 '괜찮은 증거 → 문제 원인'처럼 읽혀 헷갈린다): 채택 원인 = 빨강, 할 일 = 강조색(라이트 파랑, 다크 흰색), 나머지 = 회색. 상태는 글리프(✕ ✓)와 아래 목록의 글자로
  const lastRank = Math.max(...Object.values(meta.types).map(t => t.rank)), role = i => adopted(i) ? 'bad' : kgType(meta, i.n.type).rank === lastRank ? 'checking' : 'neutral';
  main.forEach((m, c) => m.forEach((i, j) => Object.assign(i, { x: CW / 2 + c * CW, y: TOP + (maxN - 1) * ROW / 2 + (j - (m.length - 1) / 2) * ROW })));
    const W = CW * cols.length, H = bottom;
  const curve = ([a, b]) => { const da = dims(a), db = dims(b); return `<path class="kg-e on ${role(b)}" d="${kgCurve(a, da.w / 2, da.h / 2, b, db.w / 2, db.h / 2, 10)}" marker-end="url(#kgg-a-${role(b)})"/>`; };
  const side = i => i.t !== 'out' && i.n.side && T[`side_${i.n.side}`];
  const node = i => {
    const ty = kgType(meta, i.n.type), d = dims(i), big = adopted(i);
    const chip = kgChip('circle', d.w, d.h, i.n.plain.split('(')[0].trim(), KG_GLYPH[i.t] ?? '', big, ty.shape);   // 일반 모드는 모두 알약 모양(사용자 결정 10/1): 종류는 칸 제목과 아이콘으로 구분
    return `<g class="kg-n on ${role(i)}${dimmed(i) ? ' dim' : ''}" transform="translate(${r1(i.x)} ${r1(i.y)})">${chip.s}<g aria-hidden="true">${chip.inner}</g>`
      + (big ? kgBadge(d.w, d.h) : '')
      + (side(i) ? `<text class="kg-side" y="${r1(d.h / 2 + 18)}">${esc(side(i))}</text>` : '') + '</g>';
  };
  const heads = cols.map((c, k) => `<text class="kg-col" x="${CW / 2 + k * CW}" y="26">${esc(meta.types[c].plain)}</text>`).join('')
;
  const ci = cols.findIndex(c => meta.types[c].badge), band = ci >= 0 && main[ci].length ? `<rect class="kg-band" x="${ci * CW + 8}" y="40" width="${CW - 16}" height="${bottom - 46}" rx="16"/>` : '';
  // 상태 글자: 타입 쪽(plain_states, 예: 증거가 ok면 "지금은 괜찮아요")을 먼저, 없으면 공통. 괄호 대신 ', ' (쉬운 말에 괄호가 이미 있어 두 번 겹치지 않게)
  const word = i => meta.types[i.n.type].plain_states?.[i.t] ?? meta.states[i.t];
  const li = i => `<li>${esc(meta.types[i.n.type].plain)}: ${esc(i.n.plain)}${word(i) ? `, ${esc(word(i))}` : ''}${side(i) ? `. ${esc(side(i))}` : ''}</li>`;   // 엠대시·가운뎃점 대신 쌍점과 쉼표 (11/17)
  return `<div class="kg-plain-scroll"><svg class="kg-svg kg-plain" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T.plain_aria)}">${kgMarkers('kgg', Object.keys(TONE))}${band}${heads}${links.map(curve).join('')}${drawn.map(node).join('')}</svg></div>`
    + `<ul class="kg-list">${shown.map(li).join('')}</ul>${foot}`;
}

// ==== 시트(<dialog>): 라이선스 목록, 표시등 위치 그림 ====
export const sheetHTML = (title, body) => `<div class="chead big"><b id="sheet-title">${esc(title)}</b><div class="spacer"></div><button type="button" class="iconbtn" data-event="close_sheet" aria-label="닫기">✕</button></div>${body}`;
// 정보 수집·이용 동의: 법 제15조② 네 가지(목적·항목·보유 기간·거부 권리와 불이익)와 기기 안에서만 처리한다는 사실. 문구를 바꾸면 app.js의 CONSENT_VERSION을 올린다
// 닫기(✕)가 없다: 버튼 둘 중 하나를 고르게 한다. Esc는 '동의 안 함'과 같다
export const consentHTML = () => `<form method="dialog" class="consent"><div class="chead big"><b id="sheet-title">정보 수집·이용 동의</b></div>
<p class="lead">홈넷 진단 도우미(팀 ACK)가 점검과 진단을 위해 아래 정보를 수집합니다. 시작하기 전에 확인해 주십시오.</p>
<dl tabindex="0" aria-label="동의 내용">
<div><dt>수집 목적</dt><dd>집 인터넷에서 문제가 생긴 위치와 원인을 찾고 해결 방법을 안내합니다.</dd></div>
<div><dt>수집 항목</dt><dd>공유기·통신사·인터넷·DNS의 응답 여부와 응답 시간, 와이파이 신호 세기, 송수신량과 오류 수, 세부 질문에서 고른 답과 직접 쓴 <span class="nw">글(기기</span> 제조사·모델·운영체제 포함), 진단 결과와 기록</dd></div>
<div><dt>보유 기간</dt><dd><b>설정에서 진단 기록을 지울 때까지 보관합니다.</b></dd></div>
<div><dt>처리 위치</dt><dd>집 안의 진단 기기에서만 처리하고 저장하며 외부 서버로 보내지 않습니다. 인터넷 연결을 확인할 때만 외부 주소에 응답 확인 신호를 보냅니다. 직접 쓰는 글에는 이름이나 전화번호 같은 개인정보를 적지 마십시오.</dd></div>
<div><dt>동의하지 않을 권리</dt><dd>동의하지 않을 수 있습니다. 동의하지 않으면 점검과 진단을 쓸 수 없고, 사용법·기록·설정 화면은 그대로 볼 수 있습니다.</dd></div>
</dl>
<p class="fine">동의 여부는 이 브라우저에 저장되어 다음부터는 묻지 않습니다. 설정에서 진단 기록을 지우면 이 브라우저의 동의도 함께 철회됩니다.</p>
<div class="actions"><button class="btn sec" value="no">동의 안 함</button><button class="btn pri" value="yes">동의함</button></div></form>`;
// 서버 저장용 동의 틀(11/18 회의: 팀 DB 서버 거의 확정). 체크 목록 + 전체 동의(와디즈 회원가입 동의 참고).
// '확정 전' 칸은 백엔드 답(보관 기간, 서버 위치·위탁 업체, 실시간 간격, 기기 이름·주소 포함 여부)을 받아 채운다. 켜는 곳: app.js CONSENT_SERVER
const TBD = '<span class="tbd">확정 전</span>';
const AGREE_ITEMS = [
  { id: 'diagnosis', need: true, title: '진단 정보 수집·이용', rows: [
    ['목적', '집 인터넷에서 문제가 생긴 위치와 원인을 찾고, 진단 기록을 저장합니다.'],
    ['항목', '공유기·통신사·인터넷·DNS의 응답 여부와 응답 시간, 와이파이 신호 세기, 송수신량과 오류 수, 세부 질문에서 고른 답과 직접 쓴 <span class="nw">글(기기</span> 제조사·모델·운영체제 포함), 진단 결과와 기록'],
    ['보유 기간', `<b>${TBD}</b>`],
    ['처리 위치', `팀 ACK 서버에 보내 저장합니다. 서버 위치·위탁 업체: ${TBD}. 직접 쓰는 글에는 이름이나 전화번호 같은 개인정보를 적지 마십시오.`],
    ['동의하지 않을 권리', '동의하지 않을 수 있습니다. 동의하지 않으면 점검과 진단을 쓸 수 없고, 사용법·기록·설정 화면은 그대로 볼 수 있습니다.']] },
  { id: 'age14', need: true, title: '만 14세 이상' },
  { id: 'realtime', need: false, title: '실시간 측정 기록 저장', rows: [
    ['목적', '시간대별 인터넷 상태 변화를 기록해 진단에 씁니다.'],
    ['항목', `공유기·인터넷 응답 시간, 송수신량, 오류 수. 기록 간격: ${TBD}`],
    ['보유 기간', `<b>${TBD}</b>`],
    ['동의하지 않을 권리', '동의하지 않을 수 있습니다. 동의하지 않아도 점검과 진단은 그대로 쓸 수 있고, 실시간 기록만 남지 않습니다.']] },
  // 팀 안(KG 보완)에서만 쓰는 것으로 둔다. 다른 곳에 넘기면 제3자 제공 동의(받는 자·목적·항목·기간)를 따로 받아야 한다
  { id: 'topology', need: false, title: '연결 기기 구성 수집·이용', rows: [
    ['목적', '집마다 다른 연결 구조를 익명으로 모아 진단 지식(KG)을 보완합니다.'],
    ['항목', `연결 장치 종류(모뎀·공유기·확장기 등)와 연결 방식(유선·무선). 기기 이름·주소 포함 여부: ${TBD}`],
    ['보유 기간', `<b>${TBD}</b>`],
    ['동의하지 않을 권리', '동의하지 않을 수 있습니다. 동의하지 않아도 점검과 진단은 그대로 쓸 수 있습니다.']] },
];
const agreeRowsHTML = rows => `<dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
// 개인정보 처리방침 틀(법 제30조·시행령 제31조의 기재 사항 순서). 공개 위치(설정 행 등)는 서버 확정 뒤에 정한다
const POLICY = [
  ['처리하는 정보와 목적', '진단 정보(필수), 실시간 측정 기록(선택), 연결 기기 구성(선택)을 처리합니다. 항목과 목적은 동의 화면과 같습니다.'],
  ['보유 기간과 파기', `보유 기간: ${TBD}. 기간이 지나거나 동의를 철회하면 지체 없이 파기합니다. 파기 방법: ${TBD}`],
  ['제3자 제공', TBD],
  ['처리 위탁·국외 이전', `클라우드 업체와 서버 위치: ${TBD}`],
  ['안전성 확보 조치', `전송 암호화, 서버 접근 권한 관리, 접속 기록 보관: ${TBD}`],
  ['이용자의 권리', `열람·정정·삭제·처리 정지를 요구할 수 있습니다. 설정의 진단 기록 지우기로 기록을 지우면 동의도 함께 철회됩니다. 그 밖의 요구: ${TBD}`],
  ['만 14세 미만', '만 14세 미만은 쓸 수 없습니다.'],
  ['브라우저 저장소', '동의 여부, 화면 설정, 진단 기록을 이 브라우저의 저장소에 둡니다. 브라우저 설정에서 사이트 데이터를 지우면 함께 지워집니다.'],
  ['처리방침 변경', `바뀌면 시행 전에 앱에서 알립니다. 알리는 방법과 이전 내용 보관: ${TBD}`],
  ['개인정보 보호책임자', `이름·연락처: ${TBD}`],
  ['시행일', TBD],
];
export const policyHTML = () => `<dl class="policy">${POLICY.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
export const consentServerHTML = () => `<form method="dialog" class="consent agree"><div class="chead big"><b id="sheet-title">정보 이용 동의</b></div>
<p class="lead">필수 항목에 동의해야 점검과 진단을 쓸 수 있습니다.</p>
<label class="all"><input type="checkbox" data-all> 전체 동의 <small>선택 항목 포함</small></label>
<ul tabindex="0" aria-label="동의 항목">${AGREE_ITEMS.map(i => `<li><label><input type="checkbox" name="agree" value="${i.id}"${i.need ? ' data-need' : ''}> ${i.title} <span class="${i.need ? 'need' : 'opt'}">(${i.need ? '필수' : '선택'})</span></label>${i.rows ? `<details><summary aria-label="${i.title} 내용"></summary>${agreeRowsHTML(i.rows)}</details>` : ''}</li>`).join('')}
<li><details class="doc"><summary>개인정보 처리방침</summary>${policyHTML()}</details></li></ul>
<p class="fine">동의 여부는 이 브라우저에 저장됩니다. 설정에서 진단 기록을 지우면 동의도 함께 철회됩니다.</p>
<div class="actions"><button class="btn sec" value="no">동의 안 함</button><button class="btn pri" value="yes" disabled>동의하고 시작</button></div></form>`;
export const licensesHTML = items => `<div class="lic">${items.map(i => `<div class="metric ok"><span class="k">${esc(i.name)}<small>${esc(i.use)}</small></span><span class="v">${esc(i.license)}</span></div>`).join('')}</div>`;
// 첫 페이지는 고정 안내 문구. 실제 자동 점검 설정과 서버/정적 데모 모드에 맞춰 설명한다.
// 예시 데이터 고지(copy-note·첫 줄)는 데모만: 서버는 Prometheus 실측값을 쓴다(11/18 사용자 결정)
export function firstPage({ autoScan = true, demo = false } = {}) {
  const how = [
    autoScan ? ['앱을 열면 자동으로 한 번 확인', '결과는 홈 맨 위 그림에 나옵니다. 설정에서 끌 수 있습니다.']
      : ["홈에서 '지금 확인하기' 누르기", '자동 점검이 꺼져 있습니다. 설정에서 다시 켤 수 있습니다.'],
    ["'문제 있음, 진단 시작' 누르기", '어디서 막혔는지 여섯 구간을 차례로 확인합니다.'],
    ['질문에 답하면 다음 할 일 표시', "답을 고르고 '다음'을 누릅니다. 기기가 측정할 수 없는 것만 묻습니다."],
  ];
  const privacy = demo ? '고른 답과 설정은 이 브라우저 밖으로 보내지 않습니다. 기록은 이 브라우저에 남고, 설정에서 지울 수 있습니다.'
    : '고른 답은 진단 서버로 보냅니다. 기록은 같은 서버에 접속한 사람과 함께 보이며, 서버를 다시 켜면 처음 상태로 돌아갑니다.';
  return `<div class="first-page-screen">
    <header class="first-header"><div><button type="button" class="first-brand" data-nav="intro" title="첫 페이지로"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7M6 9v11h12V9M10 20v-6h4v6"/></svg>홈넷 진단 도우미</button></div></header>
    <main>
      <section class="intro-cover" aria-labelledby="first-title">
        <div class="network-hero first-page">
          <div class="network-copy">
            <p class="network-eyebrow">집 안부터, 집 밖까지.</p>
            <h1 id="first-title" tabindex="-1"><span>끊긴 인터넷,</span><span>어디가 문제인지 찾기</span></h1>
            <p class="network-description"><span class="desktop-copy">집 안 문제면 직접 고치는 순서를,<br>집 밖 문제면 기다릴지 연락할지 알려 드립니다.</span><span class="mobile-copy">집 안은 고치는 순서를,<br>집 밖은 기다릴지 연락할지 알려 드립니다.</span></p>
            <div class="hero-actions"><button type="button" class="btn pri" data-event="intro_start">시작하기<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button></div>
            ${demo ? '<p class="copy-note">지금은 예시 데이터로 진단 흐름을 보여 드립니다.</p>' : ''}
          </div>
          <figure class="network-art" role="img" aria-label="와이파이 신호를 측정하고 문제를 해결하는 진단 예시 화면"><iframe src="hero/index.html" title="진단 예시 애니메이션" tabindex="-1" aria-hidden="true"></iframe></figure>
        </div>
      </section>
      <div class="first-page">
        <section class="how" aria-labelledby="how-title">
          <h2 class="how-title" id="how-title">복잡한 연결을 하나씩 좁혀 확인</h2>
          <ol class="how-steps">${how.map(([title, description], i) => `<li><span class="step-number" aria-hidden="true">0${i + 1}</span><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div></li>`).join('')}</ol>
        </section>
        <footer class="first-footer">${demo ? '<p>지금은 미리 준비한 값으로 진단 흐름을 보여 줍니다. 실제 장비를 측정하지 않습니다.</p>' : ''}<p>${esc(privacy)}</p><p>처음 한 번만 보입니다. 설정 → 정보 → 사용법에서 다시 볼 수 있습니다.</p></footer>
      </div>
    </main>
  </div>`;
}

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
  return `<svg viewBox="0 0 440 226" role="img" aria-label="공유기 그림. 안테나가 두 개 달린 납작한 상자 앞면에 표시등이 네 개 있고, 왼쪽에서 두 번째, 지구본 모양 아래의 불이 인터넷 표시등입니다." style="width:100%;height:auto">
    ${antenna(84, -9)}${antenna(356, 9)}
    <path d="M56 84 H384 L412 104 H28 Z" style="fill:var(--bg-input);stroke:var(--border-strong);stroke-linejoin:round"/>
    <path d="M150 92 h140 M142 98 h156" style="stroke:var(--border-strong);stroke-width:1.5;stroke-linecap:round"/>
    <rect x="28" y="104" width="384" height="64" rx="10" style="fill:var(--bg-base);stroke:var(--border-strong)"/>
    <path d="M62 168 v6 h22 v-6 M356 168 v6 h22 v-6" style="fill:none;stroke:var(--border-strong)"/>
    ${col(95, 'power', '전원', true)}${col(180, 'globe', '인터넷', true, true)}${col(265, 'wifi', '와이파이', true)}${col(350, 'lan', 'LAN', false)}
    <text x="180" y="216" text-anchor="middle" style="fill:var(--accent);font:400 12px var(--font-ui)">이 불 확인</text>
  </svg>
  <p class="foot" style="margin:0 0 var(--space-2)">지구본 모양이거나 Internet · WAN이라고 적혀 있습니다. 공유기 앞면이나 윗면에 있습니다.</p>
  <div class="lic"><div class="metric ok"><span class="k">흰색·초록색·파란색·보라색 등으로 켜짐</span><span class="v">켜져 있음</span></div><div class="metric bad"><span class="k">불이 없거나 빨간색</span><span class="v">꺼져 있음</span></div></div>
  <p class="foot">기종마다 순서와 모양이 조금씩 다릅니다. 전원 표시등은 빨간색이 정상인 기종도 있고, 안테나가 안 보이는 기종도 있습니다. 표시등을 끄는 스위치가 있는 기종도 있으므로, 모든 불이 꺼져 있으면 뒷면·옆면 스위치도 확인합니다. 못 찾겠으면 "잘 모르겠음"을 고르면 됩니다.</p>`;
}
