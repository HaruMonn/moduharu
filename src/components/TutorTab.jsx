import { useState } from 'react';
import { X, Trash2, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { COLOR_OPTIONS, DAY_LABELS, NOTION_SITE_URL } from '../constants.js';

// =================== 과외 모드 컴포넌트 ===================

// 노션 사이트 배너 (선생님/학생 홈 상단)
function SiteBanner() {
  return (
    <button onClick={() => window.open(NOTION_SITE_URL, '_system')}
      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl p-4 shadow-md text-left text-white flex items-center gap-3 hover:opacity-95 active:scale-[0.99] transition">
      <span className="text-2xl">🌐</span>
      <span className="flex-1 min-w-0">
        <span className="block font-black text-sm">모두의 과외 사이트</span>
        <span className="block text-[11px] font-bold text-indigo-100">수업 안내 · 공지사항 · 앱 다운로드</span>
      </span>
      <ChevronRight size={18} className="text-indigo-100 shrink-0" />
    </button>
  );
}

function WeekChart({ records }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    const mins = Math.round(
      (records || [])
        .filter((r) => r.startTime && new Date(r.startTime).toDateString() === key)
        .reduce((a, r) => a + (Number(r.duration) || 0), 0) / 60
    );
    days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, mins });
  }
  const data = {
    labels: days.map((d) => d.label),
    datasets: [{ data: days.map((d) => d.mins), backgroundColor: '#818cf8', borderRadius: 5 }],
  };
  const options = {
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y}분` } } },
    scales: { y: { beginAtZero: true, ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } },
    maintainAspectRatio: false,
  };
  return (
    <div className="h-44">
      <Bar data={data} options={options} />
    </div>
  );
}

// 보드 섹션 (시간표 / 공유 스케줄 / 숙제 목록)
function BoardSection({ title, emoji, items, onAdd, onEdit, renderMeta, emptyText, onToggle, allowAdd = true, allowEdit = true }) {
  return (
    <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-slate-700 dark:text-purple-100">{emoji} {title} <span className="text-xs text-slate-400 font-bold">({items.length})</span></h3>
        {allowAdd && (
        <button onClick={onAdd} className="flex items-center gap-1 text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-full hover:opacity-80">
          <Plus size={14} /> 추가
        </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-purple-400 font-bold py-3 text-center">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((it) => {
            const inner = (
              <>
                <p className={`text-sm font-bold truncate ${it.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-purple-100'}`}>{it.title}</p>
                {renderMeta && <p className="text-[11px] text-slate-400 dark:text-purple-400 font-bold mt-0.5">{renderMeta(it)}</p>}
              </>
            );
            return (
            <div key={it.id} className="flex items-center gap-2 bg-slate-50 dark:bg-purple-950/60 rounded-2xl px-3 py-2.5">
              {onToggle && (
                <button onClick={() => onToggle(it)} className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${it.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-purple-700 text-transparent'}`}>
                  <Check size={14} />
                </button>
              )}
              {allowEdit && onEdit ? (
              <button onClick={() => onEdit(it)} className="flex-1 text-left min-w-0">
                {inner}
              </button>
              ) : (
              <div className="flex-1 text-left min-w-0">
                {inner}
              </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 보드 항목 추가/편집 모달
function BoardItemModal({ section, item, onClose, onSave, onDelete, decimalToTime, timeToDecimal }) {
  const [title, setTitle] = useState(item?.title || '');
  const [color, setColor] = useState(item?.color || 'indigo');
  const [note, setNote] = useState(item?.note || '');
  const [day, setDay] = useState(item?.day ?? 1);
  const [date, setDate] = useState(item?.date || '');
  const [useDate, setUseDate] = useState(!!item?.date);
  const [start, setStart] = useState(item ? decimalToTime(item.start) : '09:00');
  const [end, setEnd] = useState(item ? decimalToTime(item.end % 24) : '10:00');
  const [subject, setSubject] = useState(item?.subject || '');
  const [dueDate, setDueDate] = useState(item?.dueDate || '');
  const [done, setDone] = useState(!!item?.done);
  const [err, setErr] = useState('');

  const sectionTitle = section === 'timetable' ? '시간표 항목' : section === 'schedule' ? '과외 시간표' : '숙제';

  const submit = () => {
    if (!title.trim()) { setErr('제목을 입력해주세요.'); return; }
    const s = timeToDecimal(start);
    const e = timeToDecimal(end);
    if (section !== 'homework' && (isNaN(s) || isNaN(e) || s >= e)) { setErr('종료 시간은 시작 시간보다 늦어야 해요.'); return; }
    const base = { id: item?.id ?? Date.now(), title: title.trim(), color, note: note.trim() };
    if (section === 'timetable') onSave({ ...base, day: Number(day), start: s, end: e });
    else if (section === 'schedule') onSave({ ...base, date: useDate && date ? date : null, day: useDate ? null : Number(day), start: s, end: e });
    else onSave({ ...base, subject: subject.trim(), dueDate: dueDate || null, done, doneAt: done ? (item?.doneAt || new Date().toISOString()) : null, createdAt: item?.createdAt || new Date().toISOString() });
  };

  const inputCls = 'w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold';
  const labelCls = 'block text-xs font-bold mb-1 text-slate-500 dark:text-purple-300';

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-purple-900 rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-slate-700 dark:text-purple-100">{item ? '편집' : '추가'} — {sectionTitle}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelCls}>제목</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 수학 과외" className={inputCls} />
          </div>
          {section === 'homework' && (
            <>
              <div>
                <label className={labelCls}>과목</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="예: 수학" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>마감일</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-purple-200">
                <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
                완료됨
              </label>
            </>
          )}
          {section === 'timetable' && (
            <div>
              <label className={labelCls}>요일</label>
              <div className="flex gap-1">
                {DAY_LABELS.map((l, i) => (
                  <button key={i} type="button" onClick={() => setDay(i)} className={`flex-1 py-2 rounded-xl text-xs font-black ${day === i ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-purple-950 text-slate-500 dark:text-purple-300'}`}>{l}</button>
                ))}
              </div>
            </div>
          )}
          {section === 'schedule' && (
            <div>
              <label className={labelCls}>반복 방식</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setUseDate(false)} className={`flex-1 py-2 rounded-xl text-xs font-black ${!useDate ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-purple-950 text-slate-500 dark:text-purple-300'}`}>매주 반복</button>
                <button type="button" onClick={() => setUseDate(true)} className={`flex-1 py-2 rounded-xl text-xs font-black ${useDate ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-purple-950 text-slate-500 dark:text-purple-300'}`}>특정 날짜</button>
              </div>
              {useDate ? (
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              ) : (
                <div className="flex gap-1">
                  {DAY_LABELS.map((l, i) => (
                    <button key={i} type="button" onClick={() => setDay(i)} className={`flex-1 py-2 rounded-xl text-xs font-black ${day === i ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-purple-950 text-slate-500 dark:text-purple-300'}`}>{l}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {section !== 'homework' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>시작</label>
                <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>종료</label>
                <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
          <div>
            <label className={labelCls}>색상</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button key={c.id} type="button" onClick={() => setColor(c.id)} title={c.label}
                  className={`w-8 h-8 rounded-full ${c.dot} ${color === c.id ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-60'}`} />
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>메모</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 (선택)" className={inputCls} />
          </div>
          {err && <p className="text-xs font-bold text-rose-500">{err}</p>}
          <div className="flex gap-2 mt-1">
            {item && onDelete && (
              <button onClick={() => onDelete(item.id)} className="px-4 py-3 rounded-xl font-bold text-sm bg-rose-50 dark:bg-rose-900/30 text-rose-500">삭제</button>
            )}
            <button onClick={submit} className="flex-1 bg-indigo-500 text-white rounded-xl font-bold py-3 hover:opacity-90">저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TutorTab({
  currentUser, events, studyRecords, decimalToTime, timeToDecimal, setActiveTab, renderHeader,
  tutorStudents, tutorSummaries, tutorBoard, tutorRecords, tutorLoading, tutorError,
  tutorStudentCodeInput, setTutorStudentCodeInput, tutorView, setTutorView,
  adminMode, registerTutorStudent, unregisterTutorStudent, openTutorBoard, saveTutorBoard, fetchTutorStudents,
}) {
  const [boardModal, setBoardModal] = useState(null); // {section, item} | null

  const handleBoardSave = (section, item) => {
    if (!tutorBoard) return;
    const list = [...(tutorBoard.board[section] || [])];
    const idx = list.findIndex((i) => String(i.id) === String(item.id));
    if (idx >= 0) list[idx] = item; else list.unshift(item);
    saveTutorBoard({ ...tutorBoard.board, [section]: list });
    setBoardModal(null);
  };

  const handleBoardDelete = (section, id) => {
    if (!tutorBoard || !window.confirm('삭제할까요?')) return;
    saveTutorBoard({ ...tutorBoard.board, [section]: tutorBoard.board[section].filter((i) => String(i.id) !== String(id)) });
    setBoardModal(null);
  };

  const toggleHomeworkDone = (hw) => {
    if (!tutorBoard) return;
    const list = tutorBoard.board.homework.map((h) =>
      String(h.id) === String(hw.id) ? { ...h, done: !h.done, doneAt: !h.done ? new Date().toISOString() : null } : h
    );
    saveTutorBoard({ ...tutorBoard.board, homework: list });
  };

  const tutorTimetableMeta = (it) => `${DAY_LABELS[it.day]} ${decimalToTime(it.start)}-${decimalToTime(it.end)}${it.note ? ` · ${it.note}` : ''}`;
  const tutorScheduleMeta = (it) => {
    const when = it.date ? it.date.slice(5).replace('-', '/') : (it.day != null ? `매주 ${DAY_LABELS[it.day]}` : '');
    return `${when} ${decimalToTime(it.start)}-${decimalToTime(it.end)}${it.note ? ` · ${it.note}` : ''}`;
  };
  const tutorHomeworkMeta = (it) => `${it.subject ? `[${it.subject}] ` : ''}${it.dueDate ? `~${it.dueDate.slice(5).replace('-', '/')}까지` : ''}${it.note ? ` · ${it.note}` : ''}`;

  const tutorWeekTotal = (records) => {
    // eslint-disable-next-line react-hooks/purity -- 렌더 시점 기준 7일 컷오프 계산
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return Math.round((records || []).filter((r) => new Date(r.startTime).getTime() >= weekAgo).reduce((a, r) => a + (Number(r.duration) || 0), 0) / 60);
  };
  const tutorTodayTotal = (records) => {
    const key = new Date().toDateString();
    return Math.round((records || []).filter((r) => r.startTime && new Date(r.startTime).toDateString() === key).reduce((a, r) => a + (Number(r.duration) || 0), 0) / 60);
  };

  const tutorDetailHw = tutorBoard?.board?.homework || [];
  const tutorDetailHwDone = tutorDetailHw.filter((h) => h.done).length;
  const tutorDetailHwRate = tutorDetailHw.length ? Math.round((tutorDetailHwDone / tutorDetailHw.length) * 100) : 0;

  return (
  <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
    {renderHeader('과외', adminMode ? '학생 관리' : '내 보드')}
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
      {!currentUser ? (
        <div className="text-center text-slate-400 dark:text-purple-300/70 py-16 text-sm font-bold">
          <div className="text-3xl mb-2">🔒</div>
          로그인하면 과외 모드를 쓸 수 있어요!
        </div>
      ) : adminMode ? (
        tutorView === 'student' && tutorBoard ? (
          <>
            <button onClick={() => { setTutorView('home'); fetchTutorStudents(); }} className="flex items-center gap-1 text-sm font-bold text-slate-500 dark:text-purple-300 self-start">
              <ChevronLeft size={16} /> 학생 목록으로
            </button>
            <h2 className="font-black text-xl text-slate-700 dark:text-purple-100">{tutorBoard.nickname} <span className="text-xs text-slate-400 font-bold">({tutorBoard.code})</span></h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white dark:bg-purple-900 rounded-2xl p-3 text-center border border-slate-100 dark:border-purple-800">
                <p className="text-[10px] font-bold text-slate-400">이번 주 공부</p>
                <p className="font-black text-lg text-indigo-500">{tutorWeekTotal(tutorRecords)}<span className="text-xs">분</span></p>
              </div>
              <div className="bg-white dark:bg-purple-900 rounded-2xl p-3 text-center border border-slate-100 dark:border-purple-800">
                <p className="text-[10px] font-bold text-slate-400">오늘 공부</p>
                <p className="font-black text-lg text-indigo-500">{tutorTodayTotal(tutorRecords)}<span className="text-xs">분</span></p>
              </div>
              <div className="bg-white dark:bg-purple-900 rounded-2xl p-3 text-center border border-slate-100 dark:border-purple-800">
                <p className="text-[10px] font-bold text-slate-400">숙제 완료율</p>
                <p className="font-black text-lg text-emerald-500">{tutorDetailHwRate}<span className="text-xs">%</span></p>
              </div>
            </div>
            <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
              <h3 className="font-black text-slate-700 dark:text-purple-100 mb-3">📊 최근 7일 공부 시간</h3>
              <WeekChart records={tutorRecords} />
            </div>
            <BoardSection title="시간표" emoji="🗓️" items={tutorBoard.board.timetable} emptyText="등록된 시간표가 없어요"
              onAdd={() => setBoardModal({ section: 'timetable', item: null })}
              onEdit={(it) => setBoardModal({ section: 'timetable', item: it })}
              renderMeta={tutorTimetableMeta} />
            <BoardSection title="과외 시간표" emoji="📌" items={tutorBoard.board.schedule} emptyText="등록된 수업 일정이 없어요"
              onAdd={() => setBoardModal({ section: 'schedule', item: null })}
              onEdit={(it) => setBoardModal({ section: 'schedule', item: it })}
              renderMeta={tutorScheduleMeta} />
            <BoardSection title="숙제" emoji="📝" items={tutorBoard.board.homework} emptyText="등록된 숙제가 없어요"
              onAdd={() => setBoardModal({ section: 'homework', item: null })}
              onEdit={(it) => setBoardModal({ section: 'homework', item: it })}
              renderMeta={tutorHomeworkMeta} onToggle={toggleHomeworkDone} />
          </>
        ) : (
          <>
            <SiteBanner />
            <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
              <p className="text-xs font-bold text-slate-400 dark:text-purple-400 mb-1">내 코드 — 학생에게 알려주세요</p>
              <p className="font-black text-2xl text-indigo-500 tracking-widest">{currentUser.code}</p>
            </div>
            <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-slate-700 dark:text-purple-100">📅 내 시간표</h3>
                <button onClick={() => setActiveTab('timetable')} className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-full">편집하기</button>
              </div>
              {events.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold text-center py-3">시간표 탭에서 내 일정을 추가해보세요</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {DAY_LABELS.map((label, d) => {
                    const dayEvents = events.filter((e) => e.day === d).sort((a, b) => a.start - b.start);
                    if (dayEvents.length === 0) return null;
                    return (
                      <div key={d} className="flex gap-2 items-start">
                        <span className="text-[11px] font-black text-slate-400 w-6 shrink-0 pt-0.5">{label}</span>
                        <div className="flex flex-col gap-1 flex-1">
                          {dayEvents.map((e) => (
                            <div key={e.id} className="text-xs font-bold text-slate-600 dark:text-purple-200 bg-slate-50 dark:bg-purple-950/60 rounded-xl px-2.5 py-1.5">
                              {decimalToTime(e.start)}-{decimalToTime(e.end)} {e.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
              <h3 className="font-black text-slate-700 dark:text-purple-100 mb-3">➕ 학생 등록</h3>
              <div className="flex gap-2">
                <input value={tutorStudentCodeInput} onChange={(e) => setTutorStudentCodeInput(e.target.value)} placeholder="학생 코드 입력" className="flex-1 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                <button onClick={registerTutorStudent} disabled={tutorLoading} className="bg-indigo-500 text-white rounded-xl font-bold px-5 text-sm disabled:opacity-50">등록</button>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-2">학생이 가입 후 알려준 코드를 입력하세요</p>
            </div>
            <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
              <h3 className="font-black text-slate-700 dark:text-purple-100 mb-3">👥 내 학생 <span className="text-xs text-slate-400">({tutorStudents.length})</span></h3>
              {tutorLoading && tutorStudents.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold text-center py-3">불러오는 중...</p>
              ) : tutorStudents.length === 0 ? (
                <p className="text-xs text-slate-400 font-bold text-center py-3">등록된 학생이 없어요. 위에서 코드를 입력해 등록하세요.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {tutorStudents.map((s) => {
                    const sum = tutorSummaries[s.code];
                    return (
                    <div key={s.code} className="bg-slate-50 dark:bg-purple-950/60 rounded-2xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openTutorBoard(s.code)} className="flex-1 text-left">
                          <p className="text-sm font-bold text-slate-700 dark:text-purple-100">{s.nickname} <span className="text-[11px] text-slate-400 font-bold">{s.code}</span></p>
                        </button>
                        <button onClick={() => unregisterTutorStudent(s.code)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={16} /></button>
                      </div>
                      {sum ? (
                      <button onClick={() => openTutorBoard(s.code)} className="w-full text-left mt-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-full">이번 주 {sum.weekMinutes}분</span>
                          <span className="text-[11px] font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 px-2 py-1 rounded-full">숙제 {sum.homeworkDone}/{sum.homeworkTotal}</span>
                          {sum.nextClass ? (
                            <span className="text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 px-2 py-1 rounded-full">다음 수업 {sum.nextClass.when.slice(5).replace('-', '/')} {decimalToTime(sum.nextClass.start)}</span>
                          ) : (
                            <span className="text-[11px] font-bold bg-slate-100 dark:bg-purple-800 text-slate-400 px-2 py-1 rounded-full">수업 일정 없음</span>
                          )}
                        </div>
                      </button>
                      ) : (
                        <p className="text-[11px] text-slate-400 font-bold mt-1">요약 불러오는 중...</p>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )
      ) : (
        <>
          {tutorLoading && !tutorBoard ? (
            <p className="text-xs text-slate-400 font-bold text-center py-10">보드를 불러오는 중...</p>
          ) : tutorBoard ? (
            <>
              <SiteBanner />
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl p-4 border border-indigo-100 dark:border-indigo-800">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300">시간표·스케줄·숙제는 선생님과 공유돼요. 공부 기록도 자동으로 전달돼요.</p>
              </div>
              <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-black text-slate-700 dark:text-purple-100 mb-1">📊 이번 주 내 공부</h3>
                <p className="text-xs font-bold text-slate-400 mb-3">이번 주 {tutorWeekTotal(studyRecords)}분 · 오늘 {tutorTodayTotal(studyRecords)}분</p>
                <WeekChart records={studyRecords} />
              </div>
              <BoardSection title="내 시간표" emoji="🗓️" items={tutorBoard.board.timetable} emptyText="시간표를 추가해보세요"
                onAdd={() => setBoardModal({ section: 'timetable', item: null })}
                onEdit={(it) => setBoardModal({ section: 'timetable', item: it })}
                renderMeta={tutorTimetableMeta} />
              <BoardSection title="과외 시간표" emoji="📌" items={tutorBoard.board.schedule} emptyText="등록된 수업 일정이 없어요"
                renderMeta={tutorScheduleMeta} allowAdd={false} allowEdit={false} />
              <BoardSection title="숙제" emoji="📝" items={tutorBoard.board.homework} emptyText="등록된 숙제가 없어요"
                renderMeta={tutorHomeworkMeta} onToggle={toggleHomeworkDone} allowAdd={false} allowEdit={false} />
            </>
          ) : (
            <p className="text-xs text-slate-400 font-bold text-center py-10">보드를 불러오지 못했어요. 탭을 다시 열어주세요.</p>
          )}
        </>
      )}
      {tutorError && <p className="text-xs font-bold text-rose-500 text-center">{tutorError}</p>}
    </div>
    {boardModal && (
      <BoardItemModal section={boardModal.section} item={boardModal.item}
        onClose={() => setBoardModal(null)}
        onSave={(item) => handleBoardSave(boardModal.section, item)}
        onDelete={boardModal.item ? (id) => handleBoardDelete(boardModal.section, id) : null}
        decimalToTime={decimalToTime} timeToDecimal={timeToDecimal} />
    )}
  </div>
  );
}
