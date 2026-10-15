import { useEffect } from 'react';
import { useAppState } from './hooks/useAppState';
import SoftSelect from './components/SoftSelect';
import TutorTab from './components/TutorTab.jsx';
import { COLOR_OPTIONS, TIMER_COLORS, DAY_LABELS } from './constants.js';
import { X, Trash2, Calendar, CheckSquare, Play, Pause, Square, Check, Circle, Share2, Bell, Cloud, Upload, Download, Info, Apple, MessageSquare, Palette, LogOut, User, ShieldCheck, Server, Sun, Moon, Trophy, Timer as TimerIcon, GraduationCap } from 'lucide-react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


export default function App() {
  const {
    activeTab, setActiveTab, showStats, setShowStats,
    showSettings, setShowSettings, showOnboarding, onboardingFade, showPolicy, setShowPolicy,
    showDday, setShowDday, serverUrlInput, setServerUrlInput, currentServerBase, saveServerUrl,
    showSplash, splashFade, videoRef, finishSplash, exitToast, themeColor,
    setThemeColor, THEME_COLORS, todos, events, studyRecords, dday,
    routines, goals, diaryText, setDiaryText, diaryMood, setDiaryMood,
    editingDiary, newWeeklyGoal, setNewWeeklyGoal, weeklyReviewGood, setWeeklyReviewGood, weeklyReviewBad,
    setWeeklyReviewBad, weeklyReviewNext, setWeeklyReviewNext, editingReview, requests, requestsLoading,
    requestsError, newRequestTitle, setNewRequestTitle, newRequestBody, setNewRequestBody, newRequestCategory,
    setNewRequestCategory, rankings, rankingLoading, rankingReady, rankingFilter, setRankingFilter, calcMyScore, submitMyScore,
    currentUser, authMode, setAuthMode, authId, setAuthId, authPassword,
    setAuthPassword, authPasswordConfirm, setAuthPasswordConfirm, authNickname, setAuthNickname, authError,
    setAuthError, authBusy, authRole, setAuthRole, friends, friendRequests, friendCodeInput, setFriendCodeInput,
    announcements, showNotif, setShowNotif, announceTitle, setAnnounceTitle, announceBody,
    setAnnounceBody, isAdmin, adminTokenInput, setAdminTokenInput, verifyAdmin, logoutAdmin,
    handleSignup, handleLogin, handleLogout, addFriend, acceptFriend, rejectFriend, removeFriend,
    addAnnouncement, deleteAnnouncement,
    setMyTutorRole, fetchTutorStudents, registerTutorStudent, unregisterTutorStudent,
    openTutorBoard, saveTutorBoard, fetchMyBoard,
    tutorStudents, tutorBoard, tutorRecords, tutorLoading, tutorError,
    tutorStudentCodeInput, setTutorStudentCodeInput, tutorView, setTutorView,
    newTodoText, setNewTodoText, newTodoCategory, setNewTodoCategory,
    isModalOpen, setIsModalOpen, editingEvent, formTitle, setFormTitle, formStart,
    setFormStart, formEnd, setFormEnd, formColor, setFormColor, formDay, setFormDay, isTimerRunning,
    timerSeconds, currentStudy, setCurrentStudy, timerColor, setTimerColor, isPomodoro,
    pomodoroPhase, pomodoroRemaining, pomodoroCount, isWhiteNoiseOn, setIsWhiteNoiseOn, noiseType,
    setNoiseType, isFocusMode, setIsFocusMode, isTimerModalOpen, setIsTimerModalOpen, recordFormTitle,
    setRecordFormTitle, recordFormStart, setRecordFormStart, recordFormEnd, setRecordFormEnd, recordFormColor,
    setRecordFormColor, startPomodoro, togglePomodoroMode, formatPomodoro, getDdayString, getDdayCountdown,
    editDday, todayKey, getMonthDays, heatColor, getMonthlySummary, newRoutineText,
    setNewRoutineText, newRoutineFreq, setNewRoutineFreq, addRoutine, toggleRoutine, deleteRoutine,
    getRoutineStreak, newGoalText, setNewGoalText, newGoalTarget, setNewGoalTarget, addGoal,
    incGoal, deleteGoal, MOODS, saveDiary, todayDiary, startEditDiary,
    currentWeek, addWeeklyGoal, toggleWeeklyGoal, deleteWeeklyGoal, saveWeeklyReview, startEditReview,
    weekLabel, addRequest, toggleRequestVote, deleteRequest, exportData, importData,
    notifEnabled, requestNotification, completeOnboarding, addTodo, toggleTodo, deleteTodo, isDarkMode, setIsDarkMode, currentTime,
    currentHourDecimal, decimalToTime, timeToDecimal, openModal, saveEvent, deleteEvent, toggleTimer, stopTimer,
    formatTimerDisplay, formatTimeHM, openTimerModal, saveRecord, deleteRecord, timerStartTime,
    renderHeader, todayRecords, getTotalStudySeconds, getComparedToYesterday, getTodoCompletionRate, handleShare,
    doughnutData, barData, captureAndShare,
  } = useAppState();

  // 과외 탭 진입 시 데이터 자동 불러오기
  useEffect(() => {
    if (activeTab !== 'tutor' || !currentUser) return;
    if (currentUser.role === 'student' && !tutorBoard) fetchMyBoard();
    if (currentUser.role === 'teacher' && tutorView === 'home' && tutorStudents.length === 0) fetchTutorStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // 시간표 표시 범위: 일정이 있는 시간대 ±1시간 (일정 없으면 06:00~24:00)
  const ttRange = (() => {
    if (!events.length) return { start: 6, end: 24 };
    const s = Math.max(0, Math.floor(Math.min(...events.map(e => e.start))) - 1);
    const e = Math.min(24, Math.ceil(Math.max(...events.map(e => e.end))) + 1);
    return { start: s, end: Math.max(e, s + 4) };
  })();
  const ttHours = ttRange.end - ttRange.start;

  // 오늘의 기록 요약 바: 해당 시간에 활동이 있으면 색상 클래스 반환
  const hourActivity = (h) => {
    const now = new Date();
    const hs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0).getTime();
    const he = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 1, 0, 0).getTime();
    const rec = todayRecords.find(r => r.startTime.getTime() < he && r.endTime.getTime() > hs);
    if (rec) return rec.color;
    if (timerStartTime) {
      const rs = timerStartTime.getTime();
      const re = isTimerRunning ? currentTime.getTime() : rs + timerSeconds * 1000;
      if (rs < he && re > hs) return timerColor;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-purple-950 text-slate-800 dark:text-purple-50 transition-colors duration-300">
      <div className="max-w-md mx-auto h-screen bg-white dark:bg-purple-900 shadow-sm relative overflow-hidden flex flex-col pt-safe main-content-pad">

        {/* ======================= 스플래시 화면 (앱 시작) ======================= */}
        {showSplash && (
          <div className={`absolute inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black transition-opacity duration-500 ease-out ${splashFade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* 오프닝 영상 (하양님이 보내주신 인트로) */}
            <video
              ref={videoRef}
              src="/opening.mp4"
              poster="/splash-bg.jpg"
              className="absolute inset-0 w-full h-full object-cover bg-black"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={finishSplash}
            />
          </div>
        )}

        {/* ======================= 로그인/가입 화면 ======================= */}
        {!currentUser && (
          <div className="absolute inset-0 z-[95] flex flex-col justify-center bg-slate-50 dark:bg-purple-950 p-6 overflow-y-auto">
            <div className="flex flex-col items-center mb-8">
              <div className="text-5xl mb-3">🌤️</div>
              <h1 className="text-3xl font-black tracking-tight">모두의 과외</h1>
              <p className="text-slate-500 dark:text-purple-300 text-sm font-bold mt-1">시간표·숙제·공부 기록을 함께 관리해요</p>
            </div>

            {/* 로그인/가입 토글 */}
            <div className="flex gap-2 bg-white dark:bg-purple-900 rounded-2xl p-1.5 border border-slate-100 dark:border-purple-800 mb-6">
              <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'login' ? 'bg-indigo-500 text-white shadow' : 'text-slate-500 dark:text-purple-300'}`}>로그인</button>
              <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'signup' ? 'bg-indigo-500 text-white shadow' : 'text-slate-500 dark:text-purple-300'}`}>가입</button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">아이디</label>
                  <input type="text" value={authId} onChange={(e) => setAuthId(e.target.value)} placeholder="아이디를 입력하세요" autoComplete="username" className="w-full bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">비밀번호</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="비밀번호를 입력하세요" autoComplete="current-password" className="w-full bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                {authError && <p className="text-xs font-bold text-rose-500">{authError}</p>}
                <button type="submit" disabled={authBusy} className="w-full bg-indigo-500 text-white rounded-xl font-bold py-3.5 hover:opacity-90 transition shadow-md disabled:opacity-50 mt-1">
                  {authBusy ? '로그인 중...' : '로그인'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">아이디 <span className="text-slate-400">(영어·숫자 4자 이상)</span></label>
                  <input type="text" value={authId} onChange={(e) => setAuthId(e.target.value)} placeholder="아이디를 입력하세요" autoComplete="username" className="w-full bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">닉네임 <span className="text-slate-400">(영어·한글·한자·히라가나·특수문자)</span></label>
                  <input type="text" value={authNickname} onChange={(e) => setAuthNickname(e.target.value)} placeholder="예: 하루몽, はる, 太郎" maxLength={12} className="w-full bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                  <p className="text-[10px] text-slate-400 dark:text-purple-400 font-bold mt-1">가입하면 닉네임#0000 형식의 고유 코드가 자동 부여돼요</p>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">비밀번호 <span className="text-slate-400">(6자 이상)</span></label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="비밀번호를 입력하세요" autoComplete="new-password" className="w-full bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">비밀번호 확인</label>
                  <input type="password" value={authPasswordConfirm} onChange={(e) => setAuthPasswordConfirm(e.target.value)} placeholder="비밀번호를 다시 입력하세요" autoComplete="new-password" className="w-full bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">역할</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAuthRole('student')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authRole === 'student' ? 'bg-indigo-500 text-white shadow' : 'bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 text-slate-500 dark:text-purple-300'}`}>📚 학생</button>
                    <button type="button" onClick={() => setAuthRole('teacher')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${authRole === 'teacher' ? 'bg-indigo-500 text-white shadow' : 'bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 text-slate-500 dark:text-purple-300'}`}>🎓 선생님</button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-purple-400 font-bold mt-1">학생은 선생님과 시간표·스케줄·숙제를 공유해요</p>
                </div>
                {authError && <p className="text-xs font-bold text-rose-500">{authError}</p>}
                <button type="submit" disabled={authBusy} className="w-full bg-indigo-500 text-white rounded-xl font-bold py-3.5 hover:opacity-90 transition shadow-md disabled:opacity-50 mt-1">
                  {authBusy ? '가입 중...' : '가입하기'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ======================= 할 일(To-do) 화면 ======================= */}
        {activeTab === 'todo' && (
          <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
            {renderHeader('오늘의 할 일', 'To-do List')}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <form onSubmit={addTodo} className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <SoftSelect
                      value={newTodoCategory}
                      onChange={setNewTodoCategory}
                      options={[{value:'공부',label:'공부'},{value:'개발',label:'개발'},{value:'운동',label:'운동'},{value:'개인',label:'개인'},{value:'기타',label:'기타'}]}
                      className="w-24 shrink-0"
                    />
                    <input type="text" value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)} placeholder="오늘 어떤 일을 완료할까요?" className="flex-1 min-w-0 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                  </div>
                  <button type="submit" disabled={!newTodoText.trim()} className="w-full bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-3 hover:opacity-90 transition shadow-md disabled:opacity-50 disabled:shadow-none">
                    할 일 추가하기
                  </button>
                </form>
              </div>

              <div className="shrink-0">
                <h3 className="font-bold text-sm mb-3 text-slate-500 dark:text-purple-300 ml-1">진행 중인 일</h3>
                <div className="space-y-3">
                  {todos.filter(t => !t.completed).length === 0 ? (
                    <div className="text-center text-slate-400 dark:text-purple-300/50 py-8 text-sm bg-white dark:bg-purple-900 rounded-2xl border border-slate-100 dark:border-purple-800">
                      모든 일을 완료했어요! 🎉
                    </div>
                  ) : (
                    todos.filter(t => !t.completed).map(todo => (
                      <div key={todo.id} className="group bg-white dark:bg-purple-900 p-4 rounded-2xl border border-slate-100 dark:border-purple-800 shadow-sm flex items-center justify-between transition-transform hover:scale-[1.01]">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <button onClick={() => toggleTodo(todo.id)} className="shrink-0 text-slate-300 hover:text-indigo-500 dark:text-purple-700 dark:hover:text-purple-400 transition-colors"><Circle size={24} strokeWidth={2.5} /></button>
                          <div className="flex flex-col truncate">
                            <span className="text-[10px] font-bold text-indigo-500 dark:text-purple-400 bg-indigo-50 dark:bg-purple-950 px-2 py-0.5 rounded-md w-fit mb-0.5">{todo.category}</span>
                            <span className="font-bold text-slate-800 dark:text-purple-50 truncate">{todo.text}</span>
                          </div>
                        </div>
                        <button onClick={() => deleteTodo(todo.id)} className="opacity-50 hover:opacity-100 p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all shrink-0"><Trash2 size={18} /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="shrink-0 mb-4">
                <h3 className="font-bold text-sm mb-3 text-slate-400 dark:text-purple-400 ml-1">완료됨</h3>
                <div className="space-y-3 opacity-60">
                  {todos.filter(t => t.completed).map(todo => (
                    <div key={todo.id} className="group bg-slate-50 dark:bg-purple-900/50 p-4 rounded-2xl border border-transparent shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <button onClick={() => toggleTodo(todo.id)} className="shrink-0 text-indigo-500 dark:text-purple-400 transition-colors"><Check size={24} strokeWidth={3} /></button>
                        <div className="flex flex-col truncate">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-purple-800/50 px-2 py-0.5 rounded-md w-fit mb-0.5">{todo.category}</span>
                          <span className="font-bold text-slate-500 dark:text-purple-300/70 line-through truncate">{todo.text}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteTodo(todo.id)} className="opacity-50 hover:opacity-100 p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all shrink-0"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================= 시간표 화면 ======================= */}
        {activeTab === 'timetable' && (
          <div className="flex flex-col flex-1 min-h-0">
            {renderHeader('주간 시간표', '일~토 요일별')}
            {/* 요일 헤더 */}
            <div className="px-2 pt-2 pb-1 flex bg-white dark:bg-purple-900 shrink-0">
              <div className="w-10 shrink-0"></div>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {DAY_LABELS.map((dow, i) => {
                  const isToday = i === new Date().getDay();
                  return (
                    <div key={i} className={`text-center py-1.5 rounded-lg text-xs font-black ${isToday ? 'bg-indigo-500 text-white shadow' : 'bg-slate-100 dark:bg-purple-800 text-slate-500 dark:text-purple-300'}`}>{dow}</div>
                  );
                })}
              </div>
            </div>
            {/* 시간 그리드 (일정 있는 시간대만 표시) */}
            <div className="flex-1 overflow-y-auto px-2 pt-3 pb-4">
              <div className="flex">
                {/* 시간축 라벨 */}
                <div className="w-10 shrink-0 relative" style={{ height: `${ttHours * 56}px` }}>
                  {Array.from({ length: ttHours + 1 }).map((_, i) => (
                    <div key={i} className="absolute right-1 -translate-y-1/2" style={{ top: `${i * 56}px` }}>
                      <span className="text-[8px] font-bold text-slate-400 dark:text-purple-300">{String(ttRange.start + i).padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>
                {/* 7개 요일 컬럼 */}
                <div className="flex-1 grid grid-cols-7 gap-1">
                  {DAY_LABELS.map((dow, i) => {
                    const isToday = i === new Date().getDay();
                    const dayEvents = events.filter((e) => e.day === i);
                    return (
                      <div key={i} className="relative" style={{ height: `${ttHours * 56}px` }}>
                        {Array.from({ length: ttHours }).map((_, h) => (
                          <div key={h} className="absolute left-0 right-0 border-b border-slate-100 dark:border-purple-800/40" style={{ top: `${h * 56}px`, height: '56px' }}></div>
                        ))}
                        {isToday && currentHourDecimal >= ttRange.start && currentHourDecimal <= ttRange.end && (
                          <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${(currentHourDecimal - ttRange.start) * 56}px` }}>
                            <div className="h-0.5 bg-red-400/70"></div>
                          </div>
                        )}
                        {dayEvents.map((event) => {
                          const top = (event.start - ttRange.start) * 56;
                          const height = Math.max((event.end - event.start) * 56, 22);
                          const showTime = (event.end - event.start) >= 1;
                          return (
                            <button key={event.id} onClick={() => openModal(event)} className={`absolute left-0 right-0 rounded-md px-1 py-0.5 text-left overflow-hidden active:scale-95 shadow-sm cursor-pointer border border-white/20 dark:border-black/20 ${event.color}`} style={{ top: `${top}px`, height: `${height}px` }}>
                              <div className="text-[9px] font-bold leading-tight break-words">{event.title}</div>
                              {showTime && <div className="text-[8px] font-bold opacity-70 leading-none mt-0.5">{decimalToTime(event.start)}-{decimalToTime(event.end)}</div>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= 타이머 화면 ======================= */}
        {activeTab === 'timer' && (
          <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
            {renderHeader('집중 타이머', '텐미닛 플래너')}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

              {/* 뽀모도로 / 일반 모드 토글 */}
              <div className="shrink-0 flex gap-2 bg-white dark:bg-purple-900 rounded-2xl p-1.5 border border-slate-100 dark:border-purple-800">
                <button onClick={togglePomodoroMode} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${!isPomodoro ? 'bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 shadow' : 'text-slate-500 dark:text-purple-300'}`}>일반 타이머</button>
                <button onClick={togglePomodoroMode} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${isPomodoro ? 'bg-rose-500 text-white shadow' : 'text-slate-500 dark:text-purple-300'}`}>🍅 뽀모도로</button>
              </div>

              {/* 타이머 카드 (집중 모드에서는 이것만 남김) */}
              <div className={`shrink-0 flex flex-col items-center py-8 px-4 bg-white dark:bg-purple-900 rounded-3xl shadow-sm border border-slate-100 dark:border-purple-800 relative ${isFocusMode && isTimerRunning ? 'py-16' : ''}`}>
                {(isPomodoro && !isTimerRunning) && <div className="text-sm font-bold text-rose-500 mb-4 bg-rose-50 dark:bg-rose-900/30 px-4 py-2 rounded-full">{pomodoroPhase === 'focus' ? '25분 집중' : '5분 휴식'} 모드 🍅</div>}
                {(!isPomodoro && !isTimerRunning && timerSeconds === 0) && ( <div className="text-sm font-bold text-slate-400 dark:text-purple-300/70 mb-4 bg-slate-50 dark:bg-purple-800/30 px-4 py-2 rounded-full"> 카테고리를 입력하세요 👇 </div> )}
                <input type="text" value={currentStudy} onChange={(e) => setCurrentStudy(e.target.value)} placeholder="예: 리액트 공부" disabled={isTimerRunning} className="bg-transparent text-center text-xl mb-4 outline-none placeholder:text-slate-300 dark:placeholder:text-purple-300/50 border-b-2 border-slate-100 dark:border-purple-800 focus:border-slate-400 dark:focus:border-purple-500 transition-colors py-2 font-bold w-full max-w-[260px]" />
                <div className={`flex gap-3 mb-6 transition-opacity ${isTimerRunning || isPomodoro ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  {TIMER_COLORS.map(color => ( <button key={color} onClick={() => setTimerColor(color)} className={`w-7 h-7 rounded-full transition-all duration-200 ${color} ${timerColor === color ? 'ring-4 ring-offset-2 ring-slate-300 dark:ring-purple-400 scale-110 shadow-md' : 'opacity-60 hover:opacity-100'}`} /> ))}
                </div>
                <div className={`font-black tracking-tighter font-mono mb-8 tabular-nums transition-all ${isFocusMode && isTimerRunning ? 'text-7xl' : 'text-6xl'} ${isTimerRunning ? timerColor.replace('bg-', 'text-') : 'text-slate-800 dark:text-purple-50'}`}>
                  {isPomodoro ? formatPomodoro(pomodoroRemaining) : formatTimerDisplay(timerSeconds)}
                </div>
                <div className="flex gap-4 items-center">
                  <button onClick={isPomodoro ? startPomodoro : toggleTimer} className={`w-16 h-16 flex items-center justify-center text-white rounded-full transition-transform active:scale-95 shadow-lg ${isTimerRunning ? 'bg-slate-800 dark:bg-purple-800' : (isPomodoro ? 'bg-rose-500' : timerColor)}`}>
                    {isTimerRunning ? <Pause fill="currentColor" size={28}/> : <Play fill="currentColor" size={28} className="ml-1"/>}
                  </button>
                  <button onClick={stopTimer} disabled={timerSeconds === 0 && pomodoroRemaining === 25 * 60} className={`w-14 h-14 flex items-center justify-center rounded-full transition-all active:scale-95 ${timerSeconds === 0 && pomodoroRemaining === 25 * 60 ? 'bg-slate-100 text-slate-300 dark:bg-purple-950/50 dark:text-purple-800' : 'bg-slate-800 text-white dark:bg-purple-200 dark:text-purple-950 hover:opacity-90 shadow-md'}`}>
                    <Square fill="currentColor" size={22}/>
                  </button>
                </div>

                {isPomodoro && <div className="mt-4 text-xs font-bold text-rose-400">🍅 오늘 완료한 뽀모도로: {pomodoroCount}회</div>}

                {/* 집중 모드 토글 */}
                <div className="mt-6 w-full flex items-center justify-center">
                  <button onClick={() => setIsFocusMode(!isFocusMode)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition ${isFocusMode ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' : 'bg-slate-100 dark:bg-purple-800 text-slate-500 dark:text-purple-300 hover:bg-slate-200'}`}>
                    🌙 집중 모드 {isFocusMode ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* 집중 모드 중에는 아래 요소들을 숨김 */}
              {!isFocusMode && (
              <>

              {/* 백색소음 */}
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-4 text-slate-700 dark:text-purple-100 flex items-center gap-1.5">🎵 집중 백색소음</h3>
                <div className="flex gap-2 mb-4">
                  {[{k:'rain',l:'빗소리'},{k:'cafe',l:'카페'},{k:'forest',l:'숲'},{k:'fire',l:'장작'},{k:'waves',l:'파도'}].map(opt => (
                    <button key={opt.k} onClick={() => { setNoiseType(opt.k); setIsWhiteNoiseOn(true); }} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${noiseType === opt.k && isWhiteNoiseOn ? 'bg-indigo-500 text-white shadow' : 'bg-slate-100 dark:bg-purple-800 text-slate-500 dark:text-purple-300'}`}>{opt.l}</button>
                  ))}
                </div>
                <button onClick={() => setIsWhiteNoiseOn(!isWhiteNoiseOn)} className={`w-full py-3 rounded-xl font-bold text-sm transition ${isWhiteNoiseOn ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 shadow'}`}>
                  {isWhiteNoiseOn ? '⏹ 소리 끄기' : '▶ 소리 켜기'}
                </button>
              </div>

              {/* 오늘의 기록: 하루 요약 바 */}
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-3 text-slate-700 dark:text-purple-100 flex items-center gap-1.5"><TimerIcon size={16}/> 오늘의 기록</h3>
                <div className="flex gap-[3px]">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const color = hourActivity(h);
                    return <div key={h} title={`${h}시`} className={`flex-1 h-7 rounded-md ${color || 'bg-slate-100 dark:bg-purple-800/50'}`} />;
                  })}
                </div>
                <div className="flex justify-between mt-1.5 text-[9px] font-bold text-slate-400 dark:text-purple-300/60">
                  <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                </div>
              </div>

              {/* 타임라인 */}
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-3 text-slate-700 dark:text-purple-100">타임라인</h3>
                <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1">
                  {studyRecords.length === 0 ? (
                    <div className="text-center text-slate-400 dark:text-purple-300/50 py-8 text-xs bg-slate-50 dark:bg-purple-950 rounded-xl border border-slate-100 dark:border-purple-800">아직 기록이 없어요.</div>
                  ) : (
                    studyRecords.map(record => (
                      <div key={record.id} onClick={() => openTimerModal(record)} className="bg-slate-50 dark:bg-purple-950 p-3 rounded-xl border border-slate-100 dark:border-purple-800 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform flex flex-col">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${record.color}`}></div>
                        <div className="pl-2">
                          <h4 className="font-bold text-[13px] text-slate-800 dark:text-purple-100 truncate">{record.title}</h4>
                          <p className="text-[10px] text-slate-400 dark:text-purple-300/70 font-bold mt-0.5">{formatTimeHM(record.startTime)} - {formatTimeHM(record.endTime)}</p>
                          <div className="font-mono text-[11px] font-bold text-slate-600 dark:text-purple-200 mt-1">{formatTimerDisplay(record.duration)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              </>
              )}

            </div>

            {isTimerModalOpen && (
              <div className="absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/20 dark:bg-purple-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-purple-900 rounded-t-3xl p-6 shadow-2xl pb-[100px] animate-in slide-in-from-bottom-full duration-300">
                  <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">기록 수정</h2><button onClick={() => setIsTimerModalOpen(false)} className="p-2 bg-slate-100 dark:bg-purple-800 rounded-full hover:bg-slate-200 transition"><X size={20} /></button></div>
                  <div className="space-y-5">
                    <div><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">카테고리</label><input type="text" value={recordFormTitle} onChange={(e) => setRecordFormTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                    <div className="flex gap-4">
                      <div className="flex-1"><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">시작 시간</label><input type="time" value={recordFormStart} onChange={(e) => setRecordFormStart(e.target.value)} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                      <div className="flex-1"><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">종료 시간</label><input type="time" value={recordFormEnd} onChange={(e) => setRecordFormEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                    </div>
                    <div><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">테마 색상</label><div className="flex gap-3">{TIMER_COLORS.map(color => ( <button key={color} onClick={() => setRecordFormColor(color)} className={`w-10 h-10 rounded-full transition-all duration-200 ${color} ${recordFormColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-purple-400 scale-110 shadow-md' : 'opacity-80 hover:opacity-100 hover:scale-105'}`} /> ))}</div></div>
                  </div>
                  <div className="mt-8 flex gap-3"><button onClick={deleteRecord} className="p-4 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition"><Trash2 size={20} /></button><button onClick={saveRecord} className="flex-1 bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-4 hover:opacity-90 transition shadow-md">저장하기</button></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= 기록 탭 (히트맵 + 루틴 + 목표 + 일기) ======================= */}
        {activeTab === 'diary' && (
          <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
            {renderHeader('습관 · 목표 · 일기', '나의 기록')}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

              {/* 1. 월간 히트맵 */}
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-1 text-slate-700 dark:text-purple-100 flex items-center gap-1.5">🔥 월간 집중 히트맵</h3>
                <p className="text-[11px] text-slate-400 dark:text-purple-300/70 font-bold mb-4">{getMonthDays().year}년 {getMonthDays().month+1}월</p>
                <div className="flex gap-1 mb-1">
                  {['일','월','화','수','목','금','토'].map((d,i) => (
                    <span key={i} className="flex-1 text-center text-[10px] font-bold text-slate-400 dark:text-purple-300/60">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getMonthDays().firstDow }).map((_, i) => <div key={'pad'+i} />)}
                  {getMonthDays().days.map(d => (
                    <div key={d.day} title={`${d.dateKey} · ${Math.floor(d.seconds/60)}분`} className={`aspect-square rounded-md ${heatColor(d.seconds)} flex items-center justify-center text-[9px] font-bold text-slate-600 dark:text-purple-200`}>{d.day}</div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1 mt-3 text-[9px] font-bold text-slate-400 dark:text-purple-300/60">
                  <span>적음</span>
                  <div className="w-3 h-3 rounded bg-slate-100 dark:bg-purple-800/30"></div>
                  <div className="w-3 h-3 rounded bg-emerald-200"></div>
                  <div className="w-3 h-3 rounded bg-emerald-300"></div>
                  <div className="w-3 h-3 rounded bg-emerald-400"></div>
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span>많음</span>
                </div>
              </div>

              {/* 2. 루틴/습관 */}
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-3 text-slate-700 dark:text-purple-100">🔁 나의 루틴</h3>
                <form onSubmit={addRoutine} className="flex flex-col gap-2 mb-4">
                  <div className="flex gap-2">
                    <input type="text" value={newRoutineText} onChange={(e) => setNewRoutineText(e.target.value)} placeholder="예: 아침 러닝 30분" className="flex-1 min-w-0 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                    <SoftSelect
                      value={newRoutineFreq}
                      onChange={setNewRoutineFreq}
                      options={[{value:'매일',label:'매일'},{value:'주중',label:'주중'},{value:'주말',label:'주말'},{value:'매주',label:'매주'}]}
                      className="w-20 shrink-0"
                    />
                  </div>
                  <button type="submit" disabled={!newRoutineText.trim()} className="w-full bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-2.5 text-sm hover:opacity-90 transition shadow disabled:opacity-50">루틴 추가</button>
                </form>
                <div className="space-y-2">
                  {routines.length === 0 ? (
                    <div className="text-center text-slate-400 dark:text-purple-300/50 py-4 text-sm">아직 등록된 루틴이 없어요.</div>
                  ) : routines.map(r => {
                    const done = r.done[todayKey()];
                    const streak = getRoutineStreak(r);
                    return (
                      <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-purple-950 border border-slate-100 dark:border-purple-800">
                        <button onClick={() => toggleRoutine(r.id)} className={`flex items-center gap-2 flex-1 text-left ${done ? 'opacity-60' : ''}`}>
                          {done ? <Check size={20} className="text-emerald-500 shrink-0"/> : <Circle size={20} className="text-slate-300 shrink-0"/>}
                          <div className="min-w-0">
                            <span className={`font-bold text-sm block truncate ${done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-purple-100'}`}>{r.text}</span>
                            <span className="text-[10px] font-bold text-slate-400">{r.freq} · {streak}일 연속 🔥</span>
                          </div>
                        </button>
                        <button onClick={() => deleteRoutine(r.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"><Trash2 size={16}/></button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. 목표 관리 */}
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-3 text-slate-700 dark:text-purple-100">🎯 장기 목표</h3>
                <form onSubmit={addGoal} className="flex flex-col gap-2 mb-4">
                  <input type="text" value={newGoalText} onChange={(e) => setNewGoalText(e.target.value)} placeholder="예: 책 10권 읽기" className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                  <div className="flex gap-2">
                    <input type="number" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} min="1" className="flex-1 min-w-0 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="목표량" />
                    <button type="submit" disabled={!newGoalText.trim()} className="shrink-0 whitespace-nowrap px-4 bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-2.5 text-sm hover:opacity-90 transition shadow disabled:opacity-50">목표 추가</button>
                  </div>
                </form>
                <div className="space-y-3">
                  {goals.length === 0 ? (
                    <div className="text-center text-slate-400 dark:text-purple-300/50 py-4 text-sm">아직 등록된 목표가 없어요.</div>
                  ) : goals.map(g => {
                    const pct = Math.min(100, Math.round((g.progress / (g.target || 1)) * 100));
                    return (
                      <div key={g.id} className="p-3 rounded-xl bg-slate-50 dark:bg-purple-950 border border-slate-100 dark:border-purple-800">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-bold text-sm text-slate-700 dark:text-purple-100 truncate">{g.text}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => incGoal(g.id, -1)} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-purple-800 text-slate-600 dark:text-purple-200 font-bold">−</button>
                            <span className="text-xs font-bold text-slate-500 dark:text-purple-300 w-14 text-center">{g.progress}/{g.target}</span>
                            <button onClick={() => incGoal(g.id, 1)} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-purple-800 text-slate-600 dark:text-purple-200 font-bold">+</button>
                            <button onClick={() => deleteGoal(g.id)} className="w-6 h-6 rounded-full bg-red-50 text-red-400 dark:bg-red-900/30 flex items-center justify-center"><X size={14}/></button>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-purple-900 rounded-full h-2 overflow-hidden">
                          <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. 감정/한 줄 일기 */}
              <div className="shrink-0 mb-4 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-3 text-slate-700 dark:text-purple-100">📝 오늘의 한 줄 일기</h3>
                {todayDiary && !editingDiary ? (
                  <div className="bg-slate-50 dark:bg-purple-950 rounded-xl p-4 border border-slate-100 dark:border-purple-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-3xl">{todayDiary.mood}</div>
                      <button onClick={startEditDiary} className="shrink-0 text-xs font-bold text-slate-400 dark:text-purple-300 hover:text-indigo-500 dark:hover:text-indigo-300 transition">✏️ 수정</button>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-purple-100 font-bold whitespace-pre-wrap mt-1">{todayDiary.text}</p>
                  </div>
                ) : (
                  <form onSubmit={saveDiary} className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      {MOODS.map(m => (
                        <button key={m} type="button" onClick={() => setDiaryMood(m)} className={`text-2xl transition-transform ${diaryMood === m ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}>{m}</button>
                      ))}
                    </div>
                    <textarea value={diaryText} onChange={(e) => setDiaryText(e.target.value)} placeholder="오늘 하루는 어땠나요? 한 줄로 남겨보세요." rows={3} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold resize-none" />
                    <button type="submit" disabled={!editingDiary && !diaryText.trim()} className="w-full bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-3 hover:opacity-90 transition shadow disabled:opacity-50">{editingDiary ? (diaryText.trim() ? '수정 완료' : '삭제') : '기록하기'}</button>
                  </form>
                )}
              </div>

              {/* 5. 주간 목표 & 회고 템플릿 */}
              <div className="shrink-0 mb-4 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-1 text-slate-700 dark:text-purple-100 flex items-center gap-1.5">🗓️ 주간 목표 & 회고</h3>
                <p className="text-[11px] text-slate-400 dark:text-purple-300/70 font-bold mb-4">{weekLabel()}</p>

                {/* 이번 주 목표 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-purple-300">🎯 이번 주 목표</span>
                    <span className="text-[10px] font-bold text-emerald-500 dark:text-emerald-300">{currentWeek.goals.filter(g => g.done).length}/{currentWeek.goals.length} 달성</span>
                  </div>
                  <form onSubmit={addWeeklyGoal} className="flex gap-2 mb-2">
                    <input type="text" value={newWeeklyGoal} onChange={(e) => setNewWeeklyGoal(e.target.value)} placeholder="예: 운동 3회, 책 1권 읽기" className="flex-1 min-w-0 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                    <button type="submit" disabled={!newWeeklyGoal.trim()} className="shrink-0 px-4 py-2 bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold text-sm hover:opacity-90 transition shadow disabled:opacity-50">목표 추가</button>
                  </form>
                  <div className="space-y-1.5">
                    {currentWeek.goals.length === 0 ? (
                      <div className="text-center text-slate-400 dark:text-purple-300/50 py-3 text-xs">이번 주 목표를 세워보세요.</div>
                    ) : currentWeek.goals.map(g => (
                      <div key={g.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-purple-950 border border-slate-100 dark:border-purple-800">
                        <button onClick={() => toggleWeeklyGoal(g.id)} className="shrink-0">{g.done ? <Check size={20} className="text-emerald-500"/> : <Circle size={20} className="text-slate-300"/>}</button>
                        <span className={`flex-1 text-sm font-bold truncate ${g.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-purple-100'}`}>{g.text}</span>
                        <button onClick={() => deleteWeeklyGoal(g.id)} className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 이번 주 회고 */}
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-purple-300 block mb-2">📝 이번 주 회고</span>
                  {currentWeek.review && (currentWeek.review.good || currentWeek.review.bad || currentWeek.review.next) && !editingReview ? (
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <button onClick={startEditReview} className="text-xs font-bold text-slate-400 dark:text-purple-300 hover:text-indigo-500 dark:hover:text-indigo-300 transition">✏️ 수정</button>
                      </div>
                      {currentWeek.review.good && <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-sm"><span className="font-bold text-emerald-600 dark:text-emerald-300">👍 잘한 점</span><p className="text-slate-700 dark:text-purple-100 font-bold whitespace-pre-wrap">{currentWeek.review.good}</p></div>}
                      {currentWeek.review.bad && <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-sm"><span className="font-bold text-amber-600 dark:text-amber-300">😅 아쉬운 점</span><p className="text-slate-700 dark:text-purple-100 font-bold whitespace-pre-wrap">{currentWeek.review.bad}</p></div>}
                      {currentWeek.review.next && <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-3 text-sm"><span className="font-bold text-sky-600 dark:text-sky-300">🚀 다음 주 다짐</span><p className="text-slate-700 dark:text-purple-100 font-bold whitespace-pre-wrap">{currentWeek.review.next}</p></div>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input type="text" value={weeklyReviewGood} onChange={(e) => setWeeklyReviewGood(e.target.value)} placeholder="👍 잘한 점" className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <input type="text" value={weeklyReviewBad} onChange={(e) => setWeeklyReviewBad(e.target.value)} placeholder="😅 아쉬운 점" className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <input type="text" value={weeklyReviewNext} onChange={(e) => setWeeklyReviewNext(e.target.value)} placeholder="🚀 다음 주 다짐" className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <button onClick={saveWeeklyReview} className="w-full bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-2.5 text-sm hover:opacity-90 transition shadow">{editingReview ? '수정 완료' : '회고 저장'}</button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================= 요청 탭 (개발 도움 요청) ======================= */}
        {activeTab === 'requests' && (
          <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
            {renderHeader('개발 요청', '여러분의 의견을 반영해요')}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

              {/* 공지 섹션 */}
              <div className="shrink-0 bg-amber-50 dark:bg-amber-900/20 rounded-3xl p-5 shadow-sm border border-amber-100 dark:border-amber-800">
                <h3 className="font-bold text-sm mb-3 text-amber-700 dark:text-amber-300 flex items-center gap-1.5">📢 공지사항</h3>
                {announcements.length === 0 ? (
                  <div className="text-center text-amber-600/60 dark:text-amber-300/50 py-4 text-sm">아직 공지가 없어요.</div>
                ) : (
                  <div className="space-y-2">
                    {announcements.slice(0, 3).map(a => (
                      <div key={a.id} className="bg-white/70 dark:bg-purple-900/50 rounded-xl p-3 border border-amber-100 dark:border-amber-800/50 relative">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-amber-800 dark:text-amber-100">📌 {a.title}</h4>
                          {isAdmin && (
                            <button onClick={() => deleteAnnouncement(a.id)} className="shrink-0 p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={14} /></button>
                          )}
                        </div>
                        <p className="text-xs text-amber-700/80 dark:text-amber-200/80 whitespace-pre-wrap break-words mt-1">{a.body}</p>
                        <span className="text-[10px] text-amber-500/70 dark:text-amber-300/50 font-bold block mt-1">{new Date(a.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* 관리자 공지 작성 */}
                {isAdmin && (
                  <div className="mt-3 bg-white/70 dark:bg-purple-900/50 rounded-xl p-3 border border-amber-100 dark:border-amber-800/50">
                    <input type="text" value={announceTitle} onChange={(e) => setAnnounceTitle(e.target.value)} placeholder="공지 제목" className="w-full bg-white dark:bg-purple-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition font-bold mb-2" />
                    <textarea value={announceBody} onChange={(e) => setAnnounceBody(e.target.value)} placeholder="공지 내용" rows={2} className="w-full bg-white dark:bg-purple-950 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition font-bold resize-none mb-2" />
                    <button onClick={addAnnouncement} className="w-full py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:opacity-90 transition">공지 등록</button>
                  </div>
                )}
              </div>

              {/* 요청 등록 폼 */}
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-bold text-sm mb-3 text-slate-700 dark:text-purple-100 flex items-center gap-1.5">💡 이런 기능이 있으면 좋겠어요</h3>
                <form onSubmit={addRequest} className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <SoftSelect
                      value={newRequestCategory}
                      onChange={setNewRequestCategory}
                      options={[{value:'기능 건의',label:'기능 건의'},{value:'버그 제보',label:'버그 제보'},{value:'디자인 개선',label:'디자인 개선'},{value:'기타',label:'기타'}]}
                      className="w-28 shrink-0"
                    />
                    <input type="text" value={newRequestTitle} onChange={(e) => setNewRequestTitle(e.target.value)} placeholder="제목을 입력하세요" className="flex-1 min-w-0 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                  </div>
                  <textarea value={newRequestBody} onChange={(e) => setNewRequestBody(e.target.value)} placeholder="필요한 기능을 적어주세요." rows={3} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold resize-none" />
                  <button type="submit" disabled={!newRequestTitle.trim() || !newRequestBody.trim()} className="w-full bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-3 hover:opacity-90 transition shadow-md disabled:opacity-50 disabled:shadow-none">의견 보내기</button>
                </form>
              </div>

              {/* 요청 목록 */}
              <div className="shrink-0 mb-4">
                <h3 className="font-bold text-sm mb-3 text-slate-500 dark:text-purple-300 ml-1">🫶 보내주신 의견</h3>
                <div className="space-y-3">
                  {requestsLoading ? (
                    <div className="text-center text-slate-400 dark:text-purple-300/50 py-10 text-sm bg-white dark:bg-purple-900 rounded-2xl border border-slate-100 dark:border-purple-800">
                      의견을 불러오는 중... ⏳
                    </div>
                  ) : requestsError && requests.length === 0 ? (
                    <div className="text-center text-amber-500 dark:text-amber-300 py-10 text-sm bg-white dark:bg-purple-900 rounded-2xl border border-slate-100 dark:border-purple-800">
                      {requestsError}
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center text-slate-400 dark:text-purple-300/50 py-10 text-sm bg-white dark:bg-purple-900 rounded-2xl border border-slate-100 dark:border-purple-800">
                      아직 등록된 의견이 없어요.<br/>첫 번째 의견을 남겨주세요! 🙌
                    </div>
                  ) : (
                    requests.map(req => (
                      <div key={req.id} className="bg-white dark:bg-purple-900 p-4 rounded-2xl border border-slate-100 dark:border-purple-800 shadow-sm">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-indigo-500 dark:text-purple-400 bg-indigo-50 dark:bg-purple-950 px-2 py-0.5 rounded-md shrink-0">{req.category}</span>
                            <h4 className="font-bold text-[15px] text-slate-800 dark:text-purple-50 truncate">{req.title}</h4>
                          </div>
                          {isAdmin ? (
                            <button onClick={() => deleteRequest(req.id)} className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shrink-0"><Trash2 size={16} /></button>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-purple-200/80 whitespace-pre-wrap break-words">{req.body}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] text-slate-400 dark:text-purple-300/60 font-bold">{new Date(req.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                          <button onClick={() => toggleRequestVote(req.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition ${(() => { const v = JSON.parse(localStorage.getItem('lifestyle_myVotes') || '{}'); return v[req.id]; })() ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-purple-800 text-slate-500 dark:text-purple-300 hover:bg-slate-200'}`}>
                            👍 {req.votes || 0}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= 과외 탭 ======================= */}
        {activeTab === 'tutor' && (
          <TutorTab
            currentUser={currentUser} events={events} studyRecords={studyRecords}
            decimalToTime={decimalToTime} timeToDecimal={timeToDecimal} setActiveTab={setActiveTab}
            renderHeader={renderHeader}
            tutorStudents={tutorStudents} tutorBoard={tutorBoard} tutorRecords={tutorRecords}
            tutorLoading={tutorLoading} tutorError={tutorError}
            tutorStudentCodeInput={tutorStudentCodeInput} setTutorStudentCodeInput={setTutorStudentCodeInput}
            tutorView={tutorView} setTutorView={setTutorView}
            setMyTutorRole={setMyTutorRole} registerTutorStudent={registerTutorStudent}
            unregisterTutorStudent={unregisterTutorStudent} openTutorBoard={openTutorBoard}
            saveTutorBoard={saveTutorBoard}
          />
        )}

        {/* ======================= 랭킹 탭 ======================= */}
        {activeTab === 'ranking' && (
          <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
            {renderHeader('친구 랭킹', `내 집중 ${calcMyScore()}분`)}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              {/* ===== 친구와 경쟁 (랭킹) ===== */}
              <div className="shrink-0 mb-4 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                {!currentUser ? (
                  <div className="text-center text-slate-400 dark:text-purple-300/70 py-8 text-sm">
                    <div className="text-3xl mb-2">🔒</div>
                    로그인하면 친구와 경쟁할 수 있어요!
                  </div>
                ) : !rankingReady ? (
                  <div className="text-center text-slate-400 dark:text-purple-300/70 py-8 text-sm">
                    <div className="text-3xl mb-2">🚧</div>
                    랭킹을 준비 중이에요.<br/>조금만 기다려주세요!
                  </div>
                ) : (
                  <>
                    {/* 내 프로필 + 기록 등록 */}
                    <div className="flex items-center gap-2 mb-3 bg-slate-50 dark:bg-purple-950 rounded-xl p-3 border border-slate-100 dark:border-purple-800">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-slate-700 dark:text-purple-100 truncate">{currentUser.nickname}<span className="text-slate-400 font-bold">#{currentUser.code}</span></div>
                        <div className="text-[10px] text-slate-400 dark:text-purple-300/70 font-bold">내 고유 코드</div>
                      </div>
                      <button onClick={submitMyScore} className="shrink-0 px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-sm shadow hover:opacity-90 transition">기록 등록 🏆</button>
                    </div>

                    {/* 친구 추가 (코드 기반) */}
                    <div className="flex gap-2 mb-3">
                      <input type="text" value={friendCodeInput} onChange={(e) => setFriendCodeInput(e.target.value)} placeholder="친구 코드 입력 (예: Ab3x)" maxLength={4} className="flex-1 min-w-0 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <button onClick={addFriend} className="shrink-0 px-4 py-2 bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold text-sm hover:opacity-90 transition">+ 친구</button>
                    </div>

                    {/* 친구 목록 */}
                    {friends.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {friends.map(f => (
                          <span key={f.code} className="inline-flex items-center gap-1 text-[11px] font-bold bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300 pl-2.5 pr-1 py-1 rounded-full border border-sky-100 dark:border-sky-800">{f.nickname}<span className="text-sky-400">#{f.code}</span><button onClick={() => removeFriend(f.code)} className="p-0.5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-800" aria-label={`${f.nickname} 삭제`}><X size={12} /></button></span>
                        ))}
                      </div>
                    )}

                    {/* 랭킹 필터 */}
                    <div className="flex gap-1.5 mb-3">
                      {[{ v: 'all', label: '🌍 전체' }, { v: 'friends', label: '👥 친구만' }].map(o => (
                        <button key={o.v} onClick={() => setRankingFilter(o.v)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${rankingFilter === o.v ? 'bg-indigo-500 text-white shadow' : 'bg-slate-100 dark:bg-purple-800 text-slate-500 dark:text-purple-300'}`}>{o.label}</button>
                      ))}
                    </div>

                    {/* 랭킹 보드 */}
                    <div className="space-y-2">
                      {rankingLoading ? (
                        <div className="text-center text-slate-400 dark:text-purple-300/50 py-6 text-sm">순위 불러오는 중... ⏳</div>
                      ) : (() => {
                        const friendNicks = new Set(friends.map(f => `${f.nickname}#${f.code}`));
                        const myNick = currentUser ? `${currentUser.nickname}#${currentUser.code}` : '';
                        const visible = (rankingFilter === 'friends' ? rankings.filter(r => r.nick === myNick || friendNicks.has(r.nick)) : rankings).slice(0, 20);
                        if (visible.length === 0) return <div className="text-center text-slate-400 dark:text-purple-300/50 py-6 text-sm">{rankingFilter === 'friends' ? '친구 중 등록된 기록이 없어요.<br/>친구를 추가하고 기록을 등록해보세요! 🤝' : '아직 등록된 기록이 없어요.<br/>첫 번째로 도전해보세요! 💪'}</div>;
                        return visible.map((r, i) => (
                          <div key={r.nick + i} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-purple-950 border border-slate-100 dark:border-purple-800'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 dark:bg-purple-800 text-slate-500 dark:text-purple-300'}`}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                            </div>
                            <span className={`flex-1 font-bold text-sm truncate ${r.nick === `${currentUser.nickname}#${currentUser.code}` ? 'text-indigo-500 dark:text-purple-300' : 'text-slate-700 dark:text-purple-100'}`}>{r.nick}{r.nick === `${currentUser.nickname}#${currentUser.code}` ? ' (나)' : ''}</span>
                            <span className="font-mono font-black text-sm text-slate-600 dark:text-purple-200">{r.score}분</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= 통계 화면 모달 (2단계) ======================= */}
        {showStats && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/40 dark:bg-purple-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-purple-900 rounded-t-3xl p-6 shadow-2xl pb-[100px] animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">📊 일간 리포트</h2>
                <div className="flex gap-2">
                  <button onClick={handleShare} className="p-2 bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full hover:scale-105 transition shadow-sm"><Share2 size={20} /></button>
                  <button onClick={() => setShowStats(false)} className="p-2 bg-slate-100 dark:bg-purple-800 rounded-full hover:bg-slate-200 transition"><X size={20} /></button>
                </div>
              </div>
              
              <div id="stats-capture-area" className="space-y-6 pb-2 bg-slate-50 dark:bg-purple-950 p-4 -mx-4 rounded-3xl">
                {/* 1. 타이머 통계 요약 */}
                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-20"><TimerIcon size={80} /></div>
                  <h3 className="font-bold text-indigo-100 mb-1">오늘 집중한 시간</h3>
                  <div className="text-4xl font-black font-mono mb-2">{formatTimerDisplay(getTotalStudySeconds())}</div>
                  <p className="text-sm font-medium text-indigo-100/80">{getComparedToYesterday()}</p>
                </div>

                {/* 2. 할 일 달성률 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-3xl p-6 border border-slate-100 dark:border-purple-800 shadow-sm">
                  <h3 className="font-bold text-slate-700 dark:text-purple-200 mb-4 flex items-center justify-between">
                    <span>할 일 달성률</span>
                    <span className="text-2xl font-black text-indigo-500 dark:text-purple-400">{getTodoCompletionRate()}%</span>
                  </h3>
                  <div className="w-full bg-slate-200 dark:bg-purple-900 rounded-full h-4 overflow-hidden shadow-inner">
                    <div className="bg-indigo-500 dark:bg-purple-500 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${getTodoCompletionRate()}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-purple-400 mt-3 font-bold text-center">총 {todos.length}개 중 {todos.filter(t => t.completed).length}개 완료</p>
                </div>

                {/* 3. 과목별 파이 차트 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-3xl p-6 border border-slate-100 dark:border-purple-800 shadow-sm flex flex-col items-center">
                  <h3 className="font-bold text-slate-700 dark:text-purple-200 mb-4 self-start">과목별 집중 비율</h3>
                  <div className="w-48 h-48 relative">
                    {todayRecords.length > 0 ? (
                      <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false } } }} />
                    ) : (
                       <div className="w-full h-full rounded-full border-4 border-slate-200 dark:border-purple-800/50 flex items-center justify-center">
                         <span className="text-xs text-slate-400">기록 없음</span>
                       </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-slate-800 dark:text-purple-50">{todayRecords.length}</span>
                      <span className="text-[10px] font-bold text-slate-400">세션</span>
                    </div>
                  </div>
                </div>

                {/* 4. 주간 막대형 차트 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-3xl p-6 border border-slate-100 dark:border-purple-800 shadow-sm">
                  <h3 className="font-bold text-slate-700 dark:text-purple-200 mb-4">주간 집중 추이</h3>
                  <div className="h-40 w-full">
                    <Bar 
                      data={barData} 
                      options={{ 
                        maintainAspectRatio: false, 
                        plugins: { legend: { display: false } },
                        scales: { 
                          y: { display: false, beginAtZero: true },
                          x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } }
                        }
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* 5. 공유하기 배너 (캡처 영역 밖) */}
              <button onClick={() => captureAndShare('stats-capture-area')} className="w-full bg-indigo-50 dark:bg-purple-800/30 border border-indigo-100 dark:border-purple-700 rounded-2xl p-4 flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-purple-800/50 transition-colors mt-4">
                <span className="font-bold text-indigo-600 dark:text-purple-300">인스타 스토리에 성과 인증하기 📸</span>
              </button>

              {/* ===== 월간 리포트 (공유 전용 예쁜 카드) ===== */}
              <div className="mt-6 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-slate-800 dark:text-purple-100">📅 월간 리포트</h3>
                  <button onClick={() => captureAndShare('monthly-card')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold shadow hover:opacity-90 transition"><Share2 size={14}/> 공유하기</button>
                </div>

                {/* 공유 이미지로 캡처될 카드 */}
                <div id="monthly-card" className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#1f2937] to-[#111827] text-white p-6 relative">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <p className="text-indigo-300 text-xs font-bold mb-1">MONTHLY REPORT</p>
                      <h3 className="text-2xl font-black">{getMonthlySummary().year}년 {getMonthlySummary().month + 1}월</h3>
                    </div>
                    <span className="text-3xl">🎨</span>
                  </div>

                  {/* 핵심 지표 3종 */}
                  <div className="flex gap-3 mb-5">
                    <div className="flex-1 bg-white/10 backdrop-blur rounded-2xl p-3 text-center">
                      <div className="text-[10px] text-indigo-200 font-bold mb-1">총 집중</div>
                      <div className="text-xl font-black font-mono">{formatTimerDisplay(getMonthlySummary().totalSeconds)}</div>
                    </div>
                    <div className="flex-1 bg-white/10 backdrop-blur rounded-2xl p-3 text-center">
                      <div className="text-[10px] text-indigo-200 font-bold mb-1">집중 일수</div>
                      <div className="text-xl font-black font-mono">{getMonthlySummary().activeDays}<span className="text-sm font-bold text-indigo-200">일</span></div>
                    </div>
                    <div className="flex-1 bg-white/10 backdrop-blur rounded-2xl p-3 text-center">
                      <div className="text-[10px] text-indigo-200 font-bold mb-1">일 평균</div>
                      <div className="text-xl font-black font-mono">{formatTimerDisplay(getMonthlySummary().avgSeconds)}</div>
                    </div>
                  </div>

                  {/* 히트맵 미니 */}
                  <div className="bg-white/5 rounded-2xl p-3 mb-4">
                    <div className="flex gap-1 mb-1">
                      {['일','월','화','수','목','금','토'].map((d,i) => <span key={i} className="flex-1 text-center text-[9px] font-bold text-indigo-200/60">{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: getMonthDays().firstDow }).map((_, i) => <div key={'mp'+i} />)}
                      {getMonthDays().days.map(d => {
                        const lvl = d.seconds === 0 ? 'bg-white/10' : d.seconds < 9000 ? 'bg-emerald-400/40' : d.seconds < 18000 ? 'bg-emerald-400/60' : d.seconds < 27000 ? 'bg-emerald-400/80' : d.seconds < 36000 ? 'bg-emerald-400' : 'bg-emerald-300';
                        return <div key={d.day} className={`aspect-square rounded-[4px] ${lvl}`} />;
                      })}
                    </div>
                  </div>

                  {/* 하이라이트 문구 */}
                  <div className="flex items-center gap-2 bg-white/10 rounded-2xl p-3">
                    <span className="text-lg">🔥</span>
                    <p className="text-xs font-bold text-indigo-100 leading-snug">
                      이번 달 가장 열심히한 요일은 <span className="text-amber-300">{getMonthlySummary().bestDowName}요일</span>!
                      {getMonthlySummary().bestDay && getMonthlySummary().bestDay.seconds > 0 ? <> 최고 기록은 {getMonthlySummary().bestDay.day}일 ({formatTimerDisplay(getMonthlySummary().bestDay.seconds)})이에요.</> : ' 아직 기록이 없어요. 오늘부터 시작해볼까요?'}
                    </p>
                  </div>

                  <div className="text-center mt-4 text-[10px] font-bold text-indigo-200/50">모두의 과외 · 함께 성장해요 🦊</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= 하단 네비게이션 ======================= */}
        <nav className="absolute bottom-0 w-full nav-safe bg-white/90 dark:bg-purple-900/90 backdrop-blur-md border-t border-slate-100 dark:border-purple-800 flex items-center justify-around px-2 z-40">
          <button onClick={() => setActiveTab('todo')} className={`flex flex-1 flex-col items-center justify-center h-full transition-all ${activeTab === 'todo' ? 'text-slate-800 dark:text-purple-100' : 'text-slate-400 dark:text-purple-400 hover:text-slate-600 dark:hover:text-purple-300'}`}>
            <CheckSquare size={24} className={activeTab === 'todo' ? 'drop-shadow-sm scale-110 mb-1' : 'mb-1 transition-transform'} />
            <span className="text-[10px] font-bold">할 일</span>
          </button>
          
          <button onClick={() => setActiveTab('timetable')} className={`flex flex-1 flex-col items-center justify-center h-full transition-all ${activeTab === 'timetable' ? 'text-slate-800 dark:text-purple-100' : 'text-slate-400 dark:text-purple-400 hover:text-slate-600 dark:hover:text-purple-300'}`}>
            <Calendar size={24} className={activeTab === 'timetable' ? 'drop-shadow-sm scale-110 mb-1' : 'mb-1 transition-transform'} />
            <span className="text-[10px] font-bold">시간표</span>
          </button>

          <button onClick={() => setActiveTab('timer')} className={`flex flex-1 flex-col items-center justify-center h-full transition-all ${activeTab === 'timer' ? 'text-slate-800 dark:text-purple-100' : 'text-slate-400 dark:text-purple-400 hover:text-slate-600 dark:hover:text-purple-300'}`}>
            <TimerIcon size={24} className={activeTab === 'timer' ? 'drop-shadow-sm scale-110 mb-1' : 'mb-1 transition-transform'} />
            <span className="text-[10px] font-bold">타이머</span>
          </button>

          <button onClick={() => setActiveTab('diary')} className={`flex flex-1 flex-col items-center justify-center h-full transition-all ${activeTab === 'diary' ? 'text-slate-800 dark:text-purple-100' : 'text-slate-400 dark:text-purple-400 hover:text-slate-600 dark:hover:text-purple-300'}`}>
            <Apple size={24} className={activeTab === 'diary' ? 'drop-shadow-sm scale-110 mb-1' : 'mb-1 transition-transform'} />
            <span className="text-[10px] font-bold">기록</span>
          </button>

          {currentUser && (
            <button onClick={() => setActiveTab('tutor')} className={`flex flex-1 flex-col items-center justify-center h-full transition-all ${activeTab === 'tutor' ? 'text-slate-800 dark:text-purple-100' : 'text-slate-400 dark:text-purple-400 hover:text-slate-600 dark:hover:text-purple-300'}`}>
              <GraduationCap size={24} className={activeTab === 'tutor' ? 'drop-shadow-sm scale-110 mb-1' : 'mb-1 transition-transform'} />
              <span className="text-[10px] font-bold">과외</span>
            </button>
          )}

          <button onClick={() => setActiveTab('ranking')} className={`flex flex-1 flex-col items-center justify-center h-full transition-all ${activeTab === 'ranking' ? 'text-slate-800 dark:text-purple-100' : 'text-slate-400 dark:text-purple-400 hover:text-slate-600 dark:hover:text-purple-300'}`}>
            <Trophy size={24} className={activeTab === 'ranking' ? 'drop-shadow-sm scale-110 mb-1' : 'mb-1 transition-transform'} />
            <span className="text-[10px] font-bold">랭킹</span>
          </button>

          <button onClick={() => setActiveTab('requests')} className={`flex flex-1 flex-col items-center justify-center h-full transition-all ${activeTab === 'requests' ? 'text-slate-800 dark:text-purple-100' : 'text-slate-400 dark:text-purple-400 hover:text-slate-600 dark:hover:text-purple-300'}`}>
            <MessageSquare size={24} className={activeTab === 'requests' ? 'drop-shadow-sm scale-110 mb-1' : 'mb-1 transition-transform'} />
            <span className="text-[10px] font-bold">요청</span>
          </button>
        </nav>

        {/* 뒤로가기 종료 안내 토스트 */}
        {exitToast && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[120] bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
            뒤로 가기를 한 번 더 누르면 종료돼요
          </div>
        )}

        {/* ======================= 알림 패널 ======================= */}
        {showNotif && (
          <div className="absolute inset-0 z-[65] flex flex-col justify-end bg-slate-900/40 dark:bg-purple-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-purple-900 rounded-t-3xl p-6 shadow-2xl pb-[100px] animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-black">🔔 알림</h2>
                <button onClick={() => setShowNotif(false)} className="p-2 bg-slate-100 dark:bg-purple-800 rounded-full hover:bg-slate-200 transition"><X size={20} /></button>
              </div>

              {/* 친구 요청 */}
              <h3 className="font-bold text-sm mb-2 text-slate-500 dark:text-purple-300">👥 친구 요청</h3>
              {friendRequests.length === 0 ? (
                <div className="text-center text-slate-400 dark:text-purple-300/50 py-5 text-sm bg-slate-50 dark:bg-purple-950 rounded-2xl mb-5">받은 친구 요청이 없어요.</div>
              ) : (
                <div className="space-y-2 mb-5">
                  {friendRequests.map(r => (
                    <div key={r.fromCode + (r.at || '')} className="bg-slate-50 dark:bg-purple-950 rounded-xl p-3 border border-slate-100 dark:border-purple-800 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-slate-700 dark:text-purple-100 truncate">{r.fromNickname}<span className="text-slate-400 font-bold">#{r.fromCode}</span></div>
                        <div className="text-[10px] text-slate-400 dark:text-purple-300/70 font-bold">친구 요청을 보냈어요</div>
                      </div>
                      <button onClick={() => acceptFriend(r.fromCode)} className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:opacity-90 transition">수락</button>
                      <button onClick={() => rejectFriend(r.fromCode)} className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-purple-800 text-slate-600 dark:text-purple-200 text-xs font-bold hover:opacity-90 transition">거절</button>
                    </div>
                  ))}
                </div>
              )}

              {/* 공지 */}
              <h3 className="font-bold text-sm mb-2 text-slate-500 dark:text-purple-300">📢 공지사항</h3>
              {announcements.length === 0 ? (
                <div className="text-center text-slate-400 dark:text-purple-300/50 py-5 text-sm bg-slate-50 dark:bg-purple-950 rounded-2xl">등록된 공지가 없어요.</div>
              ) : (
                <div className="space-y-2">
                  {announcements.slice(0, 5).map(a => (
                    <div key={a.id} className="bg-slate-50 dark:bg-purple-950 rounded-xl p-3 border border-slate-100 dark:border-purple-800">
                      <div className="font-bold text-sm text-slate-700 dark:text-purple-100">📌 {a.title}</div>
                      <p className="text-xs text-slate-500 dark:text-purple-300/80 whitespace-pre-wrap break-words mt-1">{a.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= 설정 모달 (A/B 기능) ======================= */}
        {showSettings && (
          <div className="absolute inset-0 z-[60] flex flex-col justify-end bg-slate-900/40 dark:bg-purple-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-purple-900 rounded-t-3xl p-6 shadow-2xl pb-[100px] animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">⚙️ 설정</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 dark:bg-purple-800 rounded-full hover:bg-slate-200 transition"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                {/* 계정 / 프로필 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3 font-bold text-slate-700 dark:text-purple-200"><User size={18} className="text-indigo-500"/> 계정</div>
                  {currentUser ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-black text-slate-700 dark:text-purple-100">{currentUser.nickname}<span className="text-slate-400 font-bold">#{currentUser.code}</span></span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-purple-800 px-2 py-0.5 rounded-full">@{currentUser.id}</span>
                      </div>
                      <button onClick={handleLogout} className="w-full py-2.5 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-rose-200 transition"><LogOut size={16}/> 로그아웃</button>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-purple-300/70 font-bold">로그인하면 친구와 경쟁하고 기록을 동기화할 수 있어요.</p>
                  )}
                </div>

                {/* 서버 주소 설정 (고급) */}
                <details className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <summary className="flex items-center gap-2 font-bold text-slate-700 dark:text-purple-200 cursor-pointer list-none"><Server size={18} className="text-sky-500"/> 서버 주소 <span className="text-[10px] font-bold text-slate-400 ml-auto">고급</span></summary>
                  <div className="flex gap-2 mt-3">
                    <input type="text" value={serverUrlInput} onChange={(e) => setServerUrlInput(e.target.value)} placeholder="예: 10.60.30.134:3001" className="flex-1 min-w-0 bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                    <button onClick={saveServerUrl} className="shrink-0 px-3 py-2 rounded-xl bg-sky-500 text-white text-sm font-bold hover:opacity-90 transition">저장</button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-purple-400 font-bold mt-2">현재: {currentServerBase}</p>
                </details>

                {/* 관리자 모드 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-700 dark:text-purple-200"><ShieldCheck size={18} className="text-rose-500"/> 관리자 모드</div>
                  {isAdmin ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300">✅ 관리자로 인증됨</span>
                      <button onClick={logoutAdmin} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300 text-sm font-bold hover:bg-rose-200 transition">관리자 해제</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="password" value={adminTokenInput} onChange={(e) => setAdminTokenInput(e.target.value)} placeholder="관리자 토큰" className="flex-1 min-w-0 bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <button onClick={verifyAdmin} className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 text-sm font-bold hover:opacity-90 transition">인증</button>
                    </div>
                  )}
                </div>

                {/* 다크 모드 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-purple-200">{isDarkMode ? <Moon size={18} className="text-indigo-500"/> : <Sun size={18} className="text-amber-500"/>} 다크 모드</div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-12 h-7 rounded-full transition-colors relative ${isDarkMode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-purple-800'}`}>
                      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${isDarkMode ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                {/* 테마 색상 커스텀 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-700 dark:text-purple-200"><Palette size={18} className="text-amber-500"/> 테마 색상</div>
                  <p className="text-xs text-slate-500 dark:text-purple-300/70 mb-3 font-bold">앱의 포인트 색상을 원하는 색으로 바꿔보세요.</p>
                  <div className="flex gap-2">
                    {THEME_COLORS.map(t => (
                      <button key={t.id} onClick={() => setThemeColor(t.id)} className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition ${themeColor === t.id ? 'bg-white dark:bg-purple-800 shadow ring-2 ring-offset-1 ring-slate-300 dark:ring-purple-400' : 'hover:bg-white/60 dark:hover:bg-purple-800/50'}`}>
                        <span className={`w-6 h-6 rounded-full ${t.dot} ${themeColor === t.id ? 'ring-2 ring-offset-1 ring-slate-300 dark:ring-purple-400' : ''}`} />
                        <span className="text-[10px] font-bold text-slate-500 dark:text-purple-300">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 계정/클라우드 동기화 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3 font-bold text-slate-700 dark:text-purple-200"><Cloud size={18} className="text-indigo-500"/> 계정 / 데이터 동기화</div>
                  <p className="text-xs text-slate-500 dark:text-purple-300/70 mb-3 font-bold">데이터를 백업/복원할 수 있어요. 폰을 바꾸거나 앱을 지워도 안심!</p>
                  <div className="flex gap-2">
                    <button onClick={exportData} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow"><Upload size={16}/> 백업 (내보내기)</button>
                    <button onClick={importData} className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-purple-800 text-slate-700 dark:text-purple-200 text-sm font-bold flex items-center justify-center gap-1.5"><Download size={16}/> 복원 (가져오기)</button>
                  </div>
                </div>

                {/* 푸시 알림 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-3 font-bold text-slate-700 dark:text-purple-200"><Bell size={18} className="text-rose-500"/> 푸시 알림</div>
                  <p className="text-xs text-slate-500 dark:text-purple-300/70 mb-3 font-bold">뽀모도로 종료, 할 일 마감, 디데이 알림을 받아보세요.</p>
                  <button onClick={requestNotification} className={`w-full py-2.5 rounded-xl text-sm font-bold ${notifEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950'}`}>
                    {notifEnabled ? '✅ 알림 활성화됨' : '🔔 알림 허용하기'}
                  </button>
                </div>

                {/* 개인정보/약관 */}
                <button onClick={() => setShowPolicy(true)} className="w-full bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-purple-200"><Info size={18} className="text-sky-500"/> 개인정보 처리방침 / 이용약관</span>
                  <span className="text-slate-400">›</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= 디데이 상세 카운트다운 모달 ======================= */}
        {showDday && (
          <div className="absolute inset-0 z-[75] flex flex-col justify-end bg-slate-900/40 dark:bg-purple-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-purple-900 rounded-t-3xl p-6 shadow-2xl pb-[100px] animate-in slide-in-from-bottom-full duration-300">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-black">📅 디데이</h2>
                <div className="flex gap-2">
                  <button onClick={editDday} className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-purple-800 text-indigo-600 dark:text-purple-200 text-sm font-bold hover:bg-indigo-100 transition">수정</button>
                  <button onClick={() => setShowDday(false)} className="p-2 bg-slate-100 dark:bg-purple-800 rounded-full hover:bg-slate-200 transition"><X size={20} /></button>
                </div>
              </div>

              <div className="text-center py-6">
                <p className="text-slate-500 dark:text-purple-300 font-bold mb-1">{dday.title}</p>
                <p className="text-3xl font-black text-indigo-600 dark:text-purple-200 mb-5">{getDdayString()}</p>
                <div className="text-xs text-slate-400 dark:text-purple-300 font-bold mb-6">{dday.date} 까지</div>

                {!getDdayCountdown().passed ? (
                  <>
                    <div className="flex justify-center gap-3">
                      {[
                        { label: '일', value: getDdayCountdown().days },
                        { label: '시간', value: getDdayCountdown().hours },
                        { label: '분', value: getDdayCountdown().mins },
                      ].map((u) => (
                        <div key={u.label} className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-900 dark:bg-purple-800 rounded-2xl flex items-center justify-center text-white dark:text-purple-100 text-2xl font-black font-mono tabular-nums shadow-lg">
                            {String(u.value).padStart(2, '0')}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 dark:text-purple-300 mt-2">{u.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-6">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-lg font-black text-slate-700 dark:text-purple-100">D-Day가 지났어요!</p>
                    <p className="text-sm text-slate-400 dark:text-purple-300 font-bold mt-1">{getDdayString()} 경과</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= 개인정보/약관 모달 (A4) ======================= */}
        {showPolicy && (
          <div className="absolute inset-0 z-[70] flex flex-col justify-end bg-slate-900/40 dark:bg-purple-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-purple-900 rounded-t-3xl p-6 shadow-2xl pb-[100px] animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">📋 개인정보 처리방침 / 이용약관</h2>
                <button onClick={() => setShowPolicy(false)} className="p-2 bg-slate-100 dark:bg-purple-800 rounded-full hover:bg-slate-200 transition"><X size={20} /></button>
              </div>
              <div className="space-y-4 text-sm text-slate-600 dark:text-purple-300 leading-relaxed">
                <section>
                  <h3 className="font-black text-slate-800 dark:text-purple-100 mb-1">1. 개인정보 수집 및 이용</h3>
                  <p>회원가입 시 아이디, 비밀번호(암호화되어 저장됩니다), 닉네임을 수집합니다. 친구 코드, 친구 목록, 랭킹 기록, 의견 게시글은 서비스 제공을 위해 서버에 저장됩니다. 할 일, 시간표, 타이머 기록 등 개인 기록은 기본적으로 사용자의 기기 내부(로컬 스토리지)에만 저장되며 서버로 전송되지 않습니다. 단, 과외 모드를 사용하는 학생의 보드(시간표·공유 스케줄·숙제)와 공부 기록은 담당 선생님과의 공유를 위해 서버에 저장됩니다.</p>
                </section>
                <section>
                  <h3 className="font-black text-slate-800 dark:text-purple-100 mb-1">2. 데이터 보관 및 삭제</h3>
                  <p>기기 내부 데이터는 앱을 삭제하거나 브라우저 데이터를 삭제하면 함께 삭제됩니다. 백업 기능을 통해 언제든지 데이터를 내보내거나 복원할 수 있습니다. 서버에 저장된 계정·친구·랭킹 데이터의 삭제를 원하시면 앱 설정의 문의 채널을 통해 요청할 수 있습니다.</p>
                </section>
                <section>
                  <h3 className="font-black text-slate-800 dark:text-purple-100 mb-1">3. 알림 권한</h3>
                  <p>푸시 알림 기능은 사용자가 명시적으로 허용한 경우에만 사용됩니다. 언제든지 브라우저 설정 또는 앱 설정에서 해제할 수 있습니다.</p>
                </section>
                <section>
                  <h3 className="font-black text-slate-800 dark:text-purple-100 mb-1">4. 책임의 한계</h3>
                  <p>본 앱은 자기계발 및 생활 기록을 돕는 도구입니다. 기록 데이터의 손실에 대해 법적 책임을 지지 않으며, 중요 데이터는 정기적인 백업을 권장합니다.</p>
                </section>
              </div>
              <button onClick={() => setShowPolicy(false)} className="w-full mt-6 py-4 rounded-xl bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 font-bold shadow">확인했습니다</button>
            </div>
          </div>
        )}

        {/* ======================= 온보딩 모달 (A3) ======================= */}
        {showOnboarding && (
          <div className={`absolute inset-0 z-[96] flex flex-col justify-center items-center bg-white dark:bg-purple-950 p-6 transition-opacity duration-500 ${onboardingFade ? 'opacity-0' : 'opacity-100'}`}>
            <div className="text-6xl mb-6">🎨</div>
            <h1 className="text-3xl font-black mb-2">모두의 과외</h1>
            <p className="text-slate-500 dark:text-purple-300 mb-8 text-center font-bold">하루를 알차게 기록하고<br/>선생님과 함께 성장해요! 🦊</p>
            <div className="space-y-3 w-full mb-8">
              {[
                { icon: '✅', title: '할 일 관리', desc: '오늘 해야 할 일을 카테고리별로 정리' },
                { icon: '📅', title: '시간표', desc: '하루 일정을 색상으로 깔끔하게' },
                { icon: '⏱️', title: '집중 타이머', desc: '뽀모도로 + 백색소음으로 몰입' },
                { icon: '📊', title: '통계 리포트', desc: '내 노력을 데이터로 확인하고 공유' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-purple-900 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <span className="text-2xl">{f.icon}</span>
                  <div><div className="font-bold">{f.title}</div><div className="text-xs text-slate-500 dark:text-purple-300/70">{f.desc}</div></div>
                </div>
              ))}
            </div>
            <button onClick={completeOnboarding} className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-black text-lg shadow-lg hover:opacity-90 transition">시작하기</button>
          </div>
        )}

        {/* 모달 (시간표 화면 전용) */}
        {isModalOpen && activeTab === 'timetable' && (
          <div className="absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/20 dark:bg-purple-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-purple-900 rounded-t-3xl p-6 shadow-2xl pb-[100px] animate-in slide-in-from-bottom-full duration-300">
              <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">{(editingEvent ? '일정 수정' : '새 일정 추가')}</h2><button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-purple-800 rounded-full hover:bg-slate-200 transition"><X size={20} /></button></div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">요일</label>
                  <div className="flex gap-1">{DAY_LABELS.map((dow, i) => ( <button key={i} onClick={() => setFormDay(i)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${formDay === i ? 'bg-indigo-500 text-white shadow' : 'bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 text-slate-500 dark:text-purple-300 hover:bg-slate-100 dark:hover:bg-purple-800'}`}>{dow}</button> ))}</div>
                </div>
                <div><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">일정 이름</label><input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="예: 독서, 코딩, 운동..." className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                <div className="flex gap-4">
                  <div className="flex-1"><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">시작 시간</label><input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                  <div className="flex-1"><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">종료 시간</label><input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                </div>
                <div><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">테마 색상</label><div className="flex gap-3">{COLOR_OPTIONS.map(opt => ( <button key={opt.value} onClick={() => setFormColor(opt.value)} className={`w-10 h-10 rounded-full transition-all duration-200 ${opt.value.split(' ')[0]} ${formColor === opt.value ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-purple-400 scale-110 shadow-md' : 'opacity-80 hover:opacity-100 hover:scale-105'}`} /> ))}</div></div>
              </div>
              <div className="mt-8 flex gap-3">{editingEvent && (<button onClick={deleteEvent} className="p-4 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition"><Trash2 size={20} /></button>)}<button onClick={saveEvent} className="flex-1 bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-4 hover:opacity-90 transition shadow-md">저장하기</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
