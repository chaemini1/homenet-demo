import { getStatus, startDiagnosis, advance, getRecords, clearRecords, getSettings, getExpert, getKg, demoBroken } from './api.js?v=3f91c674';
import { esc, actionHTML, pathCardHTML, headlineHTML, actionsHTML, railHomeHTML, recentCardHTML, dotHTML, metricListHTML, stepConfirmHTML, stepInfoHTML, railStepsHTML, answerCardHTML, whyAskingHTML, recordsRailHTML, recordsStageHTML, settingsRailHTML, settingsStageHTML, expertTopbarHTML, expertRailHTML, expertStageHTML, sheetHTML, licensesHTML, ledGuideHTML, kgGraphHTML, kgPanelHTML, kgGeneralHTML, kgLinkHTML } from './render.js?v=3f91c674';

const $ = s => document.querySelector(s);
const state = { status: null, session: null, selectedAnswer: null, timer: null, busy: false, starting: false, records: null, recordsOpen: null, settings: null, settingsValues: {}, settingsActive: null, expert: null, kg: null, kgErr: null, kgSel: null, kgView: 'focus', railCollapsed: (() => { try { return localStorage.getItem('homenet.railCollapsed') === '1'; } catch { return false; } })(), view: 'home', checkedAt: Date.now() };
const SETTINGS_KEY = 'homenet.settings';
const scenario = new URLSearchParams(location.search).get('scenario') === 'outside' ? 'outside' : 'wifi';
// 데모 빌드의 예시 링크(build-static.py가 넣음): 지금 보고 있는 예시를 표시. 서버 모드엔 이 링크가 없다
document.querySelectorAll('[data-scenario]').forEach(a => { if (a.dataset.scenario === scenario) { a.classList.add('on'); a.setAttribute('aria-current', 'page'); } });

export const SCREENS = {
  home: s => ({
    rail: railHomeHTML(s),
    stage: pathCardHTML(s.path) + headlineHTML(s.headline) + recentCardHTML(s) + '<div class="spacer"></div>' + actionsHTML(s.actions),
  }),
  scanning: p => ({
    rail: railStepsHTML(p.rail.steps),
    stage: pathCardHTML(p.path) + headlineHTML(p.headline)
      + `<div class="detail">${metricListHTML(p.measuring)}${metricListHTML(p.capabilities)}</div>`
      + `<p class="foot">${esc(p.footnote)}</p><div class="spacer"></div>` + actionsHTML(p.actions),
  }),
  result: p => ({
    rail: railStepsHTML(p.rail.steps),
    stage: pathCardHTML(p.path) + headlineHTML(p.headline)
      + `<div class="detail">${metricListHTML(p.evidence)}${metricListHTML(p.candidates)}</div>`
      + kgLinkHTML(p.graph_link) + '<div class="spacer"></div>' + actionsHTML(p.actions),
  }),
  steps: p => ({
    rail: railStepsHTML(p.rail.steps),
    stage: pathCardHTML(p.path) + headlineHTML(p.headline)
      + `<div class="steps">${p.steps.map(stepConfirmHTML).join('')}</div>`
      + kgLinkHTML(p.graph_link) + '<div class="spacer"></div>' + actionsHTML(p.actions),
  }),
  done: p => ({
    rail: railStepsHTML(p.rail.steps),
    stage: pathCardHTML(p.path) + headlineHTML(p.headline)
      + `<div class="detail">${metricListHTML(p.summary)}${metricListHTML(p.remeasured)}</div>`
      + kgLinkHTML(p.graph_link) + '<div class="spacer"></div>' + actionsHTML(p.actions),
  }),
  question: p => ({
    rail: railStepsHTML(p.rail.steps),
    stage: pathCardHTML(p.path) + whyAskingHTML(p.why) + headlineHTML(p.headline)
      + `<div class="answers">${p.answers.map(a => answerCardHTML(a, a.id === state.selectedAnswer)).join('')}</div>`
      + `<button type="button" class="ghost link" data-event="led_guide">${esc(p.link)}</button>`
      + '<div class="spacer"></div>'
      + actionsHTML({ ...p.actions, primary: p.actions.primary && { ...p.actions.primary, disabled: !state.selectedAnswer } }),
  }),
  // W5는 1440×900에서 세로가 거의 꽉 차서, 그림 링크를 무대 줄로 두면 라임 주버튼이 화면 밖으로 밀린다
  // → 왼쪽 할 일 3칸보다 짧은 오른쪽 '왜 그렇게 봤나요' 아래 빈자리에 (높이가 늘지 않음)
  wait: p => ({
    rail: railStepsHTML(p.rail.steps),
    stage: pathCardHTML(p.path) + headlineHTML(p.headline)
      + `<div class="detail"><div><div class="mlist"><div class="mhead"><b>${esc(p.todo.title)}</b></div></div><div class="steps" style="flex-direction:column;align-items:stretch">${p.todo.steps.map(stepInfoHTML).join('')}</div></div><div>${metricListHTML(p.evidence)}${kgLinkHTML(p.graph_link)}</div></div>`
      + '<div class="spacer"></div>' + actionsHTML(p.actions),
  }),
};

function setStatusPill(p) { $('#status-pill').innerHTML = `${dotHTML(p.tone)}<span id="status-pill-text">${esc(p.text)}</span>`; }

// 화면에 그리기 직전에 끼우는 값 두 가지: 마지막 점검 뒤 흐른 시간({ago})과 설정에서 고른 통신사.
// 통신사: 응답의 by_isp[고른 통신사]가 같은 이름의 최상위 필드를 통째로 바꾼다. 안 골랐으면(null) 본문 = 미선택 문구 그대로.
// 그릴 때마다 고르므로 진단 도중 설정에서 통신사를 바꾸고 돌아와도 바로 반영된다.
const ispKey = () => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').isp ?? 'unset'; } catch { return 'unset'; } };
function ago() {
  const s = Math.round((Date.now() - state.checkedAt) / 1000);
  return s < 10 ? '방금' : s < 60 ? `${s}초 전` : `${Math.floor(s / 60)}분 전`;
}
function localize(obj) {
  const { by_isp, ...base } = obj;
  const pick = by_isp && Object.hasOwn(by_isp, ispKey()) ? by_isp[ispKey()] : {};
  return JSON.parse(JSON.stringify({ ...base, ...pick }).replaceAll('{ago}', ago()));
}
// 상단 통신사 라벨과 고객센터 버튼 (통신사를 모르면 "통신사 고르기").
// 홈 상태가 아직 없으면(#settings·#records로 바로 열거나 거기서 새로고침) 한 번 받아 와서 그린다. 실패하면 빈칸 그대로
function paintTopIsp() {
  if (!state.status) return void getStatus().then(s => { state.status ??= s; paintTopIsp(); }, () => {});
  const s = localize(state.status);
  $('#isp').textContent = s.isp_label;
  $('#isp-call').innerHTML = actionHTML(s.isp_call, 'ghost');
}

// key = 어떤 화면인지. 화면이 바뀔 때만 진입 모션을 준다 (토글·아코디언·15초 갱신 같은 재렌더는 깜빡이지 않게).
let paintedKey = null;
function paint({ rail, stage }, key) {
  $('#rail').innerHTML = rail; $('#stage').innerHTML = stage;
  $('#rail').classList.toggle('collapsed', key === 'expert' && state.railCollapsed);      // 접힌 추론 로그는 전문가 콘솔에서만
  const el = $('#stage');
  el.classList.remove('enter');
  if (key === paintedKey) return;
  paintedKey = key;
  void el.offsetWidth;
  el.classList.add('enter');
}

// label = 버튼 이름. 버튼이 실제로 하는 일과 같아야 한다 (홈으로 가는 버튼에 "다시 시도"라고 쓰지 않는다).
function showError(where, e, retry, label = '다시 시도') {
  if (demoBroken) { retry = () => location.reload(); label = '새로고침'; }   // 데모 파일을 못 받았으면 어떤 재시도도 같은 실패 → 버튼이 실제로 하는 일로
  $('#rail > .state[role="status"]')?.remove();   // 오류가 떴는데 레일이 계속 "불러오는 중…"이라고 하지 않게
  $(where).innerHTML = `<p class="state err" role="alert">${esc(e.message)}<button type="button" class="btn sec" id="retry">${esc(label)}</button></p>`;
  $('#retry').onclick = retry;
}
// 서버가 다시 켜지면 세션이 사라진다(404). 옛 세션으로 재시도해 봐야 계속 404이므로 세션을 버리고, 이유를 보여 준 뒤 버튼으로 홈에.
// 말없이 홈으로 가면 홈이 "지금은 정상이에요"라고 해서 방금 본 결과와 모순되고, W5 60초 자동 재확인에선 이유도 모르고 화면이 바뀐다.
// 무대를 오류로 바꾸는 게 중요하다: 세션만 버리고 진단 화면을 두면 그 화면 버튼이 눌러도 아무 일 없는 버튼이 된다.
function sessionLost(home = showHome) {
  state.session = null;
  showError('#stage', new Error('진행 중이던 진단을 서버에서 찾을 수 없어요(서버가 다시 시작됐을 수 있어요). 처음부터 다시 진단해 주세요.'), home, '홈으로');
}
// 어디서도 잡지 않은 비동기 오류(예: 받은 데이터를 그리다 난 예외) → "불러오는 중…"에 멈추지 않게 보여 주고, 재시도는 홈으로.
// 이미 오류 안내가 떠 있으면 덮지 않는다: 더 구체적인 문구와 재시도(하던 진단으로 돌아가기 등)를 지우지 않게.
window.addEventListener('unhandledrejection', e => {
  if ($('#stage [role="alert"]')) return;
  let msg = '알 수 없는 오류';
  try { if (e.reason != null) msg = e.reason.message || String(e.reason); } catch { /* toString이 없는 값 → 기본 문구 */ }
  showError('#stage', new Error(`문제가 생겼어요: ${msg}`), showHome, '홈으로');
});

// ---- 상단 탭 (홈/기록/설정): 진단 세션과 별개의 최상위 화면 라우팅 ----
function setActiveNav(view) {
  state.view = view;
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('on', el.dataset.nav === view));
  // 전문가 콘솔은 상단바가 다르다: 일반 그룹 ↔ 전문가 그룹 전환. 일반 상단바의 "전문가 모드" 칩은 설정이 켜져 있을 때만.
  const expert = view === 'expert';
  $('#nav-normal').hidden = expert; $('#nav-expert').hidden = !expert;
  $('#expert-pill').hidden = expert || !isExpertOn();
}
// 최상위 화면은 주소(#records·#settings·#expert)에 둔다 → 브라우저 뒤로가기가 앱 안에서 동작한다.
// 진단 중에 다른 화면에 갔다 돌아오면 하던 진단으로, 진단 화면에서 "홈"을 한 번 더 누르면 진짜 홈으로.
const viewFromHash = () => ['records', 'settings', 'expert'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
function route(view) {
  // 'back' = 닫기(✕·Esc): 전문가 콘솔에서 들어온 기록·설정은 콘솔로, 나머지는 홈(진단 중이면 하던 진단)으로
  if (view === 'back') view = state.view !== 'expert' && state.cameFrom === 'expert' && isExpertOn() ? 'expert' : 'home';
  else if (['records', 'settings'].includes(view) && ['home', 'expert'].includes(state.view)) state.cameFrom = state.view;
  if (view === viewFromHash()) return render(view, true);
  location.hash = view === 'home' ? '' : view;
}
function render(view, again = false) {
  if (view === 'records') return showRecords();
  if (view === 'settings') return showSettings();
  if (view === 'expert') return showExpert();
  if (state.session && !again) { setActiveNav('home'); return showScreen(state.session.payload); }
  return showHome();
}
window.addEventListener('hashchange', () => render(viewFromHash()));
// 기록·설정의 상단 pill은 홈 상태를 그대로 쓴다. 아직 홈 상태를 못 받았으면
// index.html의 기본 pill을 그대로 둔다 (문구를 여기 또 적지 않는다). 통신사 라벨·버튼은 paintTopIsp가 없으면 받아 온다.
const syncTopPill = () => { if (state.status) setStatusPill(state.status.status_pill); paintTopIsp(); };

export async function showHome() {
  setActiveNav('home');
  clearTimeout(state.timer); state.session = null; state.selectedAnswer = null;
  $('#rail').innerHTML = '<p class="state" role="status">불러오는 중…</p>'; $('#stage').innerHTML = '';
  try { state.status = await getStatus(); }
  catch (e) { showError('#stage', new Error(`상태를 불러오지 못했어요: ${e.message}`), showHome); return; }
  state.checkedAt = Date.now();
  paintHome();
}
// "N초 전"이 실제로 흐르게 15초마다 다시 그린다 (홈에 머무는 동안만)
function paintHome() {
  if (state.view !== 'home' || state.session) return;
  const s = localize(state.status);
  setStatusPill(s.status_pill); paintTopIsp();
  const y = window.scrollY; paint(SCREENS.home(s), 'home'); window.scrollTo(0, y);
  clearTimeout(state.timer); state.timer = setTimeout(paintHome, 15000);
}

// 아코디언은 무대를 통째로 다시 그리므로 스크롤 위치를 보존한다 (아래쪽 행을 펼쳐도 위로 튀지 않게)
const paintRecords = () => { const y = window.scrollY; paint({ rail: recordsRailHTML(state.records.rail), stage: recordsStageHTML(state.records, state.recordsOpen) }, 'records'); window.scrollTo(0, y); };
export async function showRecords() {
  setActiveNav('records'); clearTimeout(state.timer); syncTopPill();
  $('#rail').innerHTML = '<p class="state" role="status">불러오는 중…</p>'; $('#stage').innerHTML = '';
  try { state.records = await getRecords(); }
  catch (e) { showError('#stage', new Error(`기록을 불러오지 못했어요: ${e.message}`), showRecords); return; }
  state.recordsOpen = state.records.records[0]?.id ?? null;   // 첫 행은 펼쳐 놓는다 (Figma)
  paintRecords();
}

// 설정 값 = 픽스처 기본값 위에 localStorage 저장값을 덮어씀 ("이 컴퓨터에만 저장")
function settingsDefaults(d) {
  const v = {};
  for (const s of d.sections) for (const r of s.rows) if (r.control.type === 'segment' || r.control.type === 'toggle') v[r.id] = r.control.value;
  return v;
}
function loadSettingsValues(d) {
  const v = settingsDefaults(d);
  try { Object.assign(v, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { /* 저장값 없거나 손상 → 기본값 */ }
  return v;
}
const saveSettingsValues = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settingsValues)); } catch { /* 저장 불가(사생활 모드 등)면 무시 */ } };
const isExpertOn = () => { try { return !!JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')['expert-on']; } catch { return false; } };
const paintSettings = () => paint({ rail: settingsRailHTML(state.settings, state.settingsActive), stage: settingsStageHTML(state.settings, state.settingsValues) }, 'settings');
export async function showSettings() {
  setActiveNav('settings'); clearTimeout(state.timer); syncTopPill();
  $('#rail').innerHTML = '<p class="state" role="status">불러오는 중…</p>'; $('#stage').innerHTML = '';
  try { state.settings = await getSettings(); }
  catch (e) { showError('#stage', new Error(`설정을 불러오지 못했어요: ${e.message}`), showSettings); return; }
  state.settingsValues = loadSettingsValues(state.settings);
  state.settingsActive = state.settings.sections[0].id;
  paintSettings();
  // "통신사 고르기"로 왔으면 통신사 항목에 포커스 (키보드·스크린리더 사용자가 바로 고르게)
  if (state.pickIsp) { state.pickIsp = false; ($('.seg-opt.on[data-set="isp"]') || $('[data-set="isp"]'))?.focus(); }
}

// 전문가 콘솔(WE1): 설정 "전문가 모드 켜기"나 상단 칩으로 들어오고, 상단 토글이나 "일반 화면으로 보기"로 나간다.
// 진단 중에 들어오면 그 세션의 추론을 보여주고, 나갈 때 진단 화면으로 되돌아간다 (세션은 건드리지 않는다).
// KG 카드는 경로(path)가 있을 때만 (빈 상태엔 없음). /kg 실패는 카드 자리에만 알리고 콘솔 나머지는 그대로 그린다
const kgCard = () => state.kgErr ? `<p class="state err" role="alert">지식그래프를 불러오지 못했어요: ${esc(state.kgErr)}</p>` : kgGraphHTML(state.kg, state.expert.path, { sel: state.kgSel, log: state.expert.log.entries, view: state.kgView });
const kgKnown = () => state.kg && !state.kgErr && state.expert.path ? new Set(state.kg.nodes.map(n => n.id)) : null;   // 로그의 id를 버튼으로 바꿀 대상
const paintExpert = () => {
  $('#nav-expert').innerHTML = expertTopbarHTML(state.expert.topbar);
  paint({ rail: expertRailHTML(state.expert.log, kgKnown(), state.railCollapsed), stage: expertStageHTML(state.expert, state.expert.path ? kgCard() : '') }, 'expert');
  state.kgSel = $('#stage .kg-n.sel')?.dataset.kg ?? null; markKgLog(); applyKgLabels();
};
// 노드 선택은 제자리 갱신만: 노드 클래스·aria·tabindex, 패널, 해당 로그 줄 강조. 무대 전체를 다시 그리지 않는다 (스크롤·포커스 유지)
const markKgLog = () => document.querySelectorAll('#rail .logrow').forEach(r => r.classList.toggle('hit', !!state.kgSel && !!r.querySelector(`[data-kg="${state.kgSel}"]`)));
// 추론 로그 접기/펴기: 로그를 다시 그리지 않고 클래스·버튼 글자만 바꾼다(스크롤·포커스 유지). 접은 상태는 기억한다(이 브라우저에만)
function toggleRail() {
  state.railCollapsed = !state.railCollapsed;
  try { localStorage.setItem('homenet.railCollapsed', state.railCollapsed ? '1' : '0'); } catch { /* 저장 불가면 이번 화면에서만 */ }
  const b = $('#rail [data-rail-toggle]'), name = $('#rail .lhead b')?.textContent ?? '';
  $('#rail').classList.toggle('collapsed', state.railCollapsed);
  b.setAttribute('aria-expanded', String(!state.railCollapsed)); b.setAttribute('aria-label', `${name} ${state.railCollapsed ? '펼치기' : '접기'}`); b.textContent = state.railCollapsed ? '›' : '‹';
}
// 카드만 다시 그린다(보기 전환·이번 경로 밖 노드 선택). 선택·로그 강조·ID 라벨은 다시 맞추고, 포커스는 요청한 요소로
function repaintKg(focusSel) {
  const old = $('#stage .kg'); if (!old) return;
  old.outerHTML = kgCard(); state.kgSel = $('#stage .kg-n.sel')?.dataset.kg ?? state.kgSel; markKgLog(); applyKgLabels();
  $(focusSel)?.focus({ preventScroll: true });
}
function selectKg(id, { focus = false, reveal = false } = {}) {
  const svg = $('#stage .kg-svg'), n = svg?.querySelector(`.kg-n[data-kg="${id}"]`);
  // 이번 경로 보기엔 경로 노드만 있다: 패널의 이웃 버튼이 경로 밖 노드를 가리키면 전체 보기로 바꿔서 그 노드를 보여 준다
  if (!n && svg && state.kg?.nodes.some(x => x.id === id)) { state.kgView = 'all'; state.kgSel = id; return repaintKg(`#stage .kg-n[data-kg="${id}"]`); }
  if (!n) return;
  svg.querySelectorAll('.kg-n.sel').forEach(o => { o.classList.remove('sel'); o.setAttribute('aria-selected', 'false'); o.tabIndex = -1; });
  n.classList.add('sel'); n.setAttribute('aria-selected', 'true'); n.tabIndex = 0;
  state.kgSel = id; markKgLog();
  $('#kg-panel').innerHTML = kgPanelHTML(state.kg, id, state.expert.path, state.expert.log.entries);
  if (focus) n.focus({ preventScroll: true });
  if (reveal) $('#stage .kg').scrollIntoView({ block: 'nearest' });
}
// 설정 "지식그래프 노드 ID 표시": 라벨 자리에 종류 접두어를 뺀 id(mono)를. kg_build가 좌표를 한글 라벨 폭 기준으로 겹침 0이 되게 잡았으므로,
// id가 그 폭보다 길면 그 폭으로 눌러 준다(textLength) → 켜도 겹침이 늘지 않는다. 전체 id는 패널·툴팁에.
function applyKgLabels() {
  let on = false; try { on = !!JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')['kg-id']; } catch { /* 저장값 없음 → 꺼짐 */ }
  if (!on) return;
  document.querySelectorAll('#stage .kg-svg .kg-l').forEach(t => {
    const w = t.getBBox().width; if (!(w > 0)) return;                       // 숨겨진 상태면 잴 수 없다 → 그대로
    t.textContent = t.closest('.kg-n').dataset.kg.replace(/^[a-z]+_/, ''); t.classList.add('id');
    if (t.getBBox().width > w) { t.setAttribute('textLength', w); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
  });
}
// KG 전체는 세션과 무관해서 한 번만 받는다 (실패하면 다음에 다시)
const loadKg = async () => (state.kg ??= await getKg());
export async function showExpert() {
  setActiveNav('expert'); clearTimeout(state.timer);
  $('#rail').innerHTML = '<p class="state" role="status">불러오는 중…</p>'; $('#stage').innerHTML = '';
  try { state.expert = await getExpert(state.session?.session_id); }
  catch (e) {
    if (e.status === 404) return sessionLost(() => route('home'));   // /expert도 세션이 없으면 404 (주소가 #expert라 홈은 route로)
    showError('#stage', new Error(`전문가 콘솔을 불러오지 못했어요: ${e.message}`), showExpert); return;
  }
  state.kgErr = null;
  if (state.expert.path) await loadKg().catch(e => { state.kgErr = e.message; });
  paintExpert();
}
const leaveExpert = () => route('home');
// 칩으로 바로 들어온 경우 state.settingsValues가 비어 있을 수 있으므로, 저장된 값을 읽어 병합한 뒤 쓴다.
function expertOff() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { /* 손상 → 빈 값 */ }
  state.settingsValues = { ...stored, ...state.settingsValues, 'expert-on': false };
  saveSettingsValues();
  return leaveExpert();
}

export function showScreen(raw) {
  const payload = localize(raw);
  setStatusPill(payload.status_pill);
  const render = SCREENS[payload.screen];
  if (!render) { showError('#stage', new Error(`아직 만들지 않은 화면이에요: ${payload.screen}`), showHome); return; }
  paint(render(payload), payload.screen);
  clearTimeout(state.timer);
  if (payload.screen === 'scanning') revealMeasuring(payload, 1);
  // "1분마다 다시 잼". 그림 시트가 열려 있으면 닫힐 때까지 미룬다 — 시트 뒤 화면만 바뀌면 시트 내용과 어긋나고, 닫을 때 포커스가 돌아갈 링크가 사라진다
  if (payload.screen === 'wait') state.timer = setTimeout(function tick() { if ($('#sheet').open) state.timer = setTimeout(tick, 5000); else send('recheck'); }, 60000);
}

// W1: 재는 항목을 0.6초에 한 줄씩 드러내고(5줄 = 3초), 다 드러나면 자동으로 다음 화면.
function revealMeasuring(p, n) {
  const rows = p.measuring.rows.map((r, i) => i < n ? r : { ...r, value: '대기', status: 'unknown' });
  const d = $('#stage .detail');
  if (d) d.innerHTML = metricListHTML({ ...p.measuring, rows }) + metricListHTML(p.capabilities);
  state.timer = setTimeout(() => n < rows.length ? revealMeasuring(p, n + 1) : send('scan_done'), 600);
}

export async function send(event, value = null) {
  if (!state.session || state.busy) return;
  state.busy = true;
  try { const r = await advance(state.session.session_id, event, value); state.session = r; state.selectedAnswer = null; showScreen(r.payload); }
  catch (e) {
    if (e.status === 404) return sessionLost();
    showError('#stage', new Error(`진행하지 못했어요: ${e.message}`), () => state.session ? showScreen(state.session.payload) : showHome());
  }
  finally { state.busy = false; }
}

// 더블클릭으로 세션이 두 개 생기지 않게. send()의 busy와는 따로 둔다: 같이 쓰면 응답 없이 멈춘 send 하나가
// 홈의 "진단 시작"까지 막아 눌러도 아무 일 없는 버튼이 된다.
// ponytail: 멈췄던 send 응답이 늦게 와서 새 진단을 덮는 경우는 못 막음 → B-4(await 뒤 nav 토큰 확인)에서
async function start() {
  if (state.starting) return;
  state.starting = true;
  clearTimeout(state.timer);
  $('#stage').innerHTML = '<p class="state">진단을 시작하는 중…</p>';
  try { state.session = await startDiagnosis(scenario); showScreen(state.session.payload); }
  catch (e) { showError('#stage', new Error(`진단을 시작하지 못했어요: ${e.message}`), showHome); }
  finally { state.starting = false; }
}

// 끝내기: 서버 세션을 닫는 걸 기다린 뒤 홈으로. 종료 응답은 다시 그리지 않는다 (경쟁 방지).
async function finish(then = 'home') {
  const sid = state.session?.session_id;
  if (sid) { try { await advance(sid, 'finish'); } catch (e) { /* 세션 종료 실패는 무시하고 나간다 */ } }
  state.session = null;
  return route(then);
}

// Esc: 기록·설정·전문가 콘솔에서 홈으로. 진단 중(home 뷰)에는 아무 일도 하지 않는다.
// KG 그래프 키보드: ←↑ 이전 · →↓ 다음 · Home/End 처음/끝(옮기며 선택) · Enter/Space 선택. 순서는 그림 순서(경로 노드 → 종류 → id). Esc는 아래 전역 동작 그대로
document.addEventListener('keydown', e => {
  const n = e.target.closest?.('.kg-n'); if (!n || e.altKey || e.ctrlKey || e.metaKey) return;
  const all = [...n.parentElement.querySelectorAll('.kg-n')].sort((x, y) => x.dataset.o - y.dataset.o), i = all.indexOf(n);   // 그리는 순서가 아니라 읽는 순서(data-o)
  const to = { ArrowLeft: i - 1, ArrowUp: i - 1, ArrowRight: i + 1, ArrowDown: i + 1, Home: 0, End: all.length - 1, Enter: i, ' ': i }[e.key];
  if (to === undefined) return;
  e.preventDefault(); selectKg(all[Math.max(0, Math.min(all.length - 1, to))].dataset.kg, { focus: true });
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || state.view === 'home' || $('#sheet').open) return;   // 시트가 열려 있으면 Esc는 시트만 닫는다
  route('back');
});

// 이벤트 위임: 화면 코드는 data-event만 붙인다. "어디로 갈지"는 서버가 정한다.
document.addEventListener('click', e => {
  const el = e.target.closest('[data-event],[data-answer],[data-nav],[data-rec],[data-secnav],[data-set],[data-expert-off],[data-kg],[data-kg-view],[data-rail-toggle]'); if (!el || el.disabled) return;
  if (el.dataset.railToggle !== undefined) return void toggleRail();
  if (el.dataset.kgView) { state.kgView = el.dataset.kgView; return void repaintKg(`#stage [data-kg-view="${el.dataset.kgView}"]`); }
  if (el.dataset.kg) return void selectKg(el.dataset.kg, { focus: true, reveal: !el.closest('#stage') });   // 로그(왼쪽)의 id를 눌렀으면 카드를 화면에 보이게
  if (el.dataset.nav) return void route(el.dataset.nav);
  if (el.dataset.expertOff !== undefined) return void expertOff();
  // 기록 아코디언: 같은 행을 다시 누르면 접기
  if (el.dataset.rec) { state.recordsOpen = state.recordsOpen === el.dataset.rec ? null : el.dataset.rec; return paintRecords(); }
  // 설정 섹션 네비: 스크롤만 (전체 다시 그리면 스크롤이 튀므로 클래스만 갱신)
  if (el.dataset.secnav) {
    state.settingsActive = el.dataset.secnav;
    el.parentElement.querySelectorAll('.secnav').forEach(n => n.classList.toggle('on', n === el));
    document.getElementById(`set-${el.dataset.secnav}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  // 설정 값 변경: 스크롤 유지를 위해 해당 컨트롤만 제자리 갱신 + localStorage 저장
  if (el.dataset.set) {
    const id = el.dataset.set;
    if (el.dataset.toggle !== undefined) {
      const on = !state.settingsValues[id]; state.settingsValues[id] = on;
      el.classList.toggle('on', on); el.setAttribute('aria-checked', on ? 'true' : 'false');
      if (id === 'expert-on' && on) { saveSettingsValues(); return void route('expert'); }
    } else {
      state.settingsValues[id] = el.dataset.val;
      el.parentElement.querySelectorAll('.seg-opt').forEach(o => { o.classList.toggle('on', o === el); o.setAttribute('aria-pressed', o === el ? 'true' : 'false'); });
    }
    saveSettingsValues();
    if (id === 'isp') paintTopIsp();   // localize가 저장값을 읽으므로 저장 뒤에
    return;
  }
  if (el.dataset.answer) { state.selectedAnswer = el.dataset.answer; showScreen(state.session.payload); return; }
  onEvent(el.dataset.event, el);
});

function download(name, text, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  // click 직후 해제하면 받기가 시작되기 전에 URL이 죽어 일부 브라우저에서 빈 파일이 된다 → 넉넉히 뒤에 해제
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}
const stamp = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace(/\D/g, '');   // 현지 시각
// 전문가 콘솔 응답을 그대로 .json 파일로 (백엔드가 KG 결과와 대조할 때 쓰는 실물)
const exportLog = () => download(`homenet-expert-${stamp()}.json`, JSON.stringify(state.expert, null, 2));
// 사람이 읽는 리포트(.txt): 상담원·팀원에게 그대로 붙여넣을 수 있게
function exportReport() {
  const x = state.expert, rows = l => l.rows.map(r => `  ${r.label}: ${r.value}`).join('\n');
  download(`homenet-report-${stamp()}.txt`, [
    '홈넷 진단 도우미 — 진단 리포트', `${x.topbar.model} · ${x.topbar.kg}`, '',
    `판정: ${x.verdict.pill.text} — ${x.verdict.title}`, `근거: ${x.verdict.chain.map(c => c.text).join(' → ')}`, `(${x.verdict.meta})`, '',
    `연결 경로: ${x.topology.conclusion.text}`, '', `${x.candidates.title}\n${rows(x.candidates)}`, '', `${x.measurements.title} (${x.measurements.meta})\n${rows(x.measurements)}`, '',
    `${x.log.title} ${x.log.range}`, ...x.log.entries.map(e => `  ${e.time} [${e.tag}] ${e.text}`),
  ].join('\n'), 'text/plain');
}
async function exportRecords() {
  try { download(`homenet-records-${stamp()}.json`, JSON.stringify((await getRecords()).records, null, 2)); }
  catch (e) { showError('#stage', new Error(`기록을 내보내지 못했어요: ${e.message}`), () => route(state.view)); }
}
// 시트: 브라우저 기본 <dialog> (Esc·포커스 가두기는 브라우저가 해준다). wide = 그림 시트(KG)
function openSheet(title, body, wide = false) { const d = $('#sheet'); d.innerHTML = sheetHTML(title, body); d.classList.toggle('wide', wide); d.showModal(); }
// 일반 모드 "어떻게 알아냈는지 그림으로 보기": KG + 지금 진단의 경로(/expert의 path) → 4칸 그림 + 번호 목록
async function openKgSheet(label) {
  if (state.sheetBusy || $('#sheet').open) return;   // 두 번 눌러도 시트는 하나
  state.sheetBusy = true;
  try {
    const [kg, x] = await Promise.all([loadKg(), getExpert(state.session?.session_id)]);
    openSheet(kg.meta.text.plain_title, kgGeneralHTML(kg, x.path ?? []), true);
  } catch (e) {
    if (e.status === 404) return sessionLost();            // 시트에 "세션 … 없음"(id)을 띄우는 대신 send()와 같은 안내
    openSheet(label, `<p class="state err" role="alert">그림을 불러오지 못했어요: ${esc(e.message)}</p>`, true);
  } finally { state.sheetBusy = false; }
}

export function onEvent(event, el) {
  switch (event) {
    case 'start': return start();
    case 'recheck_home': return showHome();
    case 'restart': return start();
    case 'finish': return finish();
    case 'answer': return send('answer', state.selectedAnswer);
    case 'export_log': return exportLog();
    case 'export_report': return exportReport();
    case 'export_records': return exportRecords();
    case 'close_sheet': return $('#sheet').close();
    case 'led_guide': return openSheet('인터넷 표시등은 여기 있어요', ledGuideHTML());
    case 'kg_general': return openKgSheet(el.textContent);
    case 'licenses': return openSheet('오픈소스 라이선스', licensesHTML(state.settings.sections.flatMap(s => s.rows).find(r => r.id === 'license').details));
    case 'clear_records':
      if (!confirm('진단 기록을 모두 지울까요? 되돌릴 수 없어요.')) return;
      return clearRecords().then(() => { el.textContent = '지웠어요'; el.disabled = true; }, e => showError('#stage', new Error(`기록을 지우지 못했어요: ${e.message}`), showSettings));
    case 'records': return finish('records');          // 완료 화면 "진단 기록 보기": 끝내야 기록에 남으므로 닫고 간다
    // 전화는 render.js가 tel: 링크로 그려 브라우저가 처리한다. 번호를 모르면(미선택·기타) 버튼이 이것으로 바뀐다
    case 'pick_isp': state.pickIsp = true; return route('settings');
    // W3: "됐어요/안 됐어요" 뒤에 기기가 다시 재는 순간을 보여주고 나서 넘어간다
    case 'step_done': case 'step_failed':
      el.disabled = true; setStatusPill({ tone: 'checking', text: '다시 재는 중…' });
      state.timer = setTimeout(() => send(event), 900); return;
    case 'normal_view': return leaveExpert();        // 전문가 콘솔 → 하던 진단 화면 (설정은 켜진 채)
    case 'skip': clearTimeout(state.timer); return send('skip');
    default: return send(event);
  }
}

export { state, setStatusPill, paint };
render(viewFromHash());
