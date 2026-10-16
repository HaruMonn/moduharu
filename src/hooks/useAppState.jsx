import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, BarChart2, Settings, Bell } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

import { COLOR_OPTIONS, TIMER_COLORS, APP_VERSION } from '../constants.js';

// =================== [백엔드 API 연동 설정] ===================
// 개발(브라우저): '/api' (Vite 프록시)
// APK(네이티브): VITE_API_BASE가 있으면 우선, 없으면 Render 서버를 기본값으로 사용
// 앱 설정에서 서버 주소를 저장하면 localStorage 값이 항상 우선 적용됨
const DEFAULT_API_BASE =
  import.meta.env.VITE_API_BASE ||
  (Capacitor.isNativePlatform() ? 'https://moduharu.onrender.com/api' : '/api');
const SERVER_URL_KEY = 'moduharu_server_url';
// 앱 설정에서 저장한 서버 주소가 있으면 우선 사용 (와이파이/핫스팟이 바뀌어 IP가 달라져도 재빌드 없이 수정 가능)
let API_BASE = (() => {
  try {
    const saved = localStorage.getItem(SERVER_URL_KEY);
    return saved || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
})();

// =================== [오프닝 영상 표시 여부] ===================
// false면 앱 시작 시 오프닝 영상을 건너뛰고 바로 로그인 화면이 떠요.
// 나중에 다시 켜려면 true로 바꾸고 빌드하면 돼요.
const SHOW_OPENING_VIDEO = false;




// =================== [부드러운 커스텀 드롭다운] ===================

export function useAppState() {
  // 로컬스토리지 안전 파싱 (데이터 손상 시 기본값으로 복구, 화이트스크린 방지)
  const safeParse = (key, fallback) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('lifestyle_darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('todo'); 
  const [selectedDay, setSelectedDay] = useState(new Date().getDay()); // 시간표 선택 요일 (0=일 ... 6=토)
  const [showStats, setShowStats] = useState(false); // 통계 모달 상태
  const [showSettings, setShowSettings] = useState(false); // 설정 모달 상태
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('lifestyle_onboarded')); // 온보딩
  const [onboardingFade, setOnboardingFade] = useState(false); // 시작하기 클릭 시 페이드 아웃
  const [showPolicy, setShowPolicy] = useState(false); // 개인정보/약관 모달
  const [showDday, setShowDday] = useState(false); // 디데이 상세 카운트다운 모달
  const [serverUrlInput, setServerUrlInput] = useState(() => {
    try {
      const b = localStorage.getItem(SERVER_URL_KEY) || DEFAULT_API_BASE;
      return b.replace(/\/api\/?$/, '').replace(/^https?:\/\//i, '');
    } catch { return ''; }
  });
  const [currentServerBase, setCurrentServerBase] = useState(API_BASE);

  // 서버 주소 저장 (와이파이/핫스팟 변경 시 IP 수정)
  const saveServerUrl = () => {
    let u = serverUrlInput.trim();
    if (!u) { alert('서버 주소를 입력해주세요.'); return; }
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    u = u.replace(/\/+$/, '');
    if (!/\/api$/i.test(u)) u = u + '/api';
    try {
      localStorage.setItem(SERVER_URL_KEY, u);
      API_BASE = u;
      setCurrentServerBase(u);
      setServerUrlInput(u.replace(/\/api\/?$/, '').replace(/^https?:\/\//i, ''));
      alert('서버 주소가 저장됐어요! 지금부터 ' + u + ' 로 연결해요.');
    } catch {
      alert('저장에 실패했어요.');
    }
  };

  // =================== [스플래시 화면 (앱 시작 오프닝 영상)] ===================
  const [showSplash, setShowSplash] = useState(SHOW_OPENING_VIDEO);
  const [splashFade, setSplashFade] = useState(false);
  const videoRef = useRef(null);

  const finishSplash = () => {
    setSplashFade(true);
    setTimeout(() => setShowSplash(false), 600);
  };

  useEffect(() => {
    if (!SHOW_OPENING_VIDEO) return; // 오프닝 영상을 끈 경우 자동재생 로직도 건너뜀
    // 영상이 재생되지 않을 경우를 대비한 안전장치: 6초 후 강제로 넘어감
    const fallback = setTimeout(finishSplash, 6000);
    // 일부 안드로이드 웹뷰에서 autoplay가 막혀 회색 '재생' 화면이 뜨는 것 방지
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    }
    return () => clearTimeout(fallback);
  }, []);

  // =================== [뒤로가기 두 번 눌러 종료 (안드로이드)] ===================
  const [exitToast, setExitToast] = useState(false);

  // =================== [테마 색상 커스텀] ===================
  const [themeColor, setThemeColor] = useState(() => {
    const saved = localStorage.getItem('lifestyle_themeColor');
    return saved || 'indigo';
  });

  // 테마 팔레트 (메인 색상 → 헤더 강조/포커스 링/뱃지 등에 사용)
  const THEME_COLORS = [
    { id: 'indigo', label: '인디고', dot: 'bg-indigo-500', ring: 'focus:ring-indigo-500', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', solid: 'bg-indigo-500' },
    { id: 'violet', label: '보라', dot: 'bg-violet-500', ring: 'focus:ring-violet-500', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', solid: 'bg-violet-500' },
    { id: 'emerald', label: '그린', dot: 'bg-emerald-500', ring: 'focus:ring-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', solid: 'bg-emerald-500' },
    { id: 'rose', label: '장미', dot: 'bg-rose-500', ring: 'focus:ring-rose-500', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300', solid: 'bg-rose-500' },
    { id: 'amber', label: '주황', dot: 'bg-amber-500', ring: 'focus:ring-amber-500', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', solid: 'bg-amber-500' },
    { id: 'sky', label: '하늘', dot: 'bg-sky-500', ring: 'focus:ring-sky-500', badge: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', solid: 'bg-sky-500' },
  ];
  const currentTheme = THEME_COLORS.find(t => t.id === themeColor) || THEME_COLORS[0];

  useEffect(() => { localStorage.setItem('lifestyle_themeColor', themeColor); }, [themeColor]);

  // =================== [데이터 저장 (LocalStorage)] ===================
  // 새로고침해도 데이터가 유지되도록 로컬스토리지에서 초기값을 불러옵니다.
  const [todos, setTodos] = useState(() => {
    const list = safeParse('lifestyle_todos', []);
    // 구버전 마이그레이션: 완료됐는데 완료 시각이 없으면 지금 시각 부여
    return list.map(t => (t.completed && !t.completedAt ? { ...t, completedAt: new Date().toISOString() } : t));
  });

  const [events, setEvents] = useState(() => {
    const today = new Date().getDay();
    return safeParse('lifestyle_events', []).map(e => ({ ...e, day: typeof e.day === 'number' ? e.day : today }));
  });

  const [studyRecords, setStudyRecords] = useState(() => {
    return safeParse('lifestyle_studyRecords', []).map(r => ({ ...r, startTime: new Date(r.startTime), endTime: new Date(r.endTime) }));
  });

  const [dday, setDday] = useState(() => {
    const saved = safeParse('lifestyle_dday', null);
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 100);
    return saved || { title: '앱 정식 출시', date: defaultDate.toISOString().split('T')[0] };
  });

  // =================== [신규 기능 5종 상태] ===================
  // 3. 루틴/습관 반복 스케줄
  const [routines, setRoutines] = useState(() => safeParse('lifestyle_routines', []));
  // 4. 장기 목표 (진행률 포함)
  const [goals, setGoals] = useState(() => safeParse('lifestyle_goals', []));
  // 5. 감정/한 줄 일기 (key: 'YYYY-MM-DD')
  const [diaries, setDiaries] = useState(() => safeParse('lifestyle_diaries', {}));
  const [diaryText, setDiaryText] = useState('');
  const [diaryMood, setDiaryMood] = useState('🙂');
  const [editingDiary, setEditingDiary] = useState(false);

  // =================== [주간 목표/회고 템플릿] ===================
  // 주간 목표: { weekKey, goals: [{id, text, done}], review: { good, bad, next } }
  const [weeklyPlans, setWeeklyPlans] = useState(() => safeParse('lifestyle_weekly', {}));
  const [newWeeklyGoal, setNewWeeklyGoal] = useState('');
  const [weeklyReviewGood, setWeeklyReviewGood] = useState('');
  const [weeklyReviewBad, setWeeklyReviewBad] = useState('');
  const [weeklyReviewNext, setWeeklyReviewNext] = useState('');
  const [editingReview, setEditingReview] = useState(false);

  useEffect(() => { localStorage.setItem('lifestyle_weekly', JSON.stringify(weeklyPlans)); }, [weeklyPlans]);

  // =================== [요청(개발 도움 요청) 상태] ===================
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [newRequestTitle, setNewRequestTitle] = useState('');
  const [newRequestBody, setNewRequestBody] = useState('');
  const [newRequestCategory, setNewRequestCategory] = useState('기능 건의');

  // =================== [친구와 경쟁 (랭킹) 상태] ===================
  const [rankings, setRankings] = useState([]);
  const [rankingFilter, setRankingFilter] = useState('all'); // 'all' | 'friends'
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingReady, setRankingReady] = useState(false); // 랭킹 빈 ID가 설정되었는지

  // 오늘 기준 점수: 오늘 집중 분 (서버가 기록을 직접 검증·합산하므로 조작 불가)
  const calcMyScore = () => {
    const today = new Date();
    return Math.round(studyRecords.filter(r => r.startTime && isSameDay(r.startTime, today)).reduce((a, r) => a + r.duration, 0) / 60);
  };
  // 점수 상세 내역 (기준 설명용)
  const getScoreBreakdown = () => {
    const today = new Date();
    const focusMin = Math.round(studyRecords.filter(r => r.startTime && isSameDay(r.startTime, today)).reduce((a, r) => a + r.duration, 0) / 60);
    return { focusMin };
  };

  // 랭킹 불러오기
  const fetchRankings = async () => {
    setRankingReady(true);
    setRankingLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rankings`);
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      const sorted = [...(data.scores || [])].sort((a, b) => b.score - a.score);
      setRankings(sorted);
    } catch (e) {
      console.error(e);
      setRankings([]);
    } finally {
      setRankingLoading(false);
    }
  };

// 마운트 시 1회성 데이터 로딩 — SPA 표준 패턴이므로 의도적 예외 처리
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRankings(); }, []);

  // 내 점수 업로드 (닉네임#코드 기반) — 공부 기록을 함께 보내 서버가 직접 검증·합산
  const submitMyScore = async () => {
    if (!currentUser) { alert('로그인이 필요해요.'); return; }
    const nick = `${currentUser.nickname}#${currentUser.code}`;
    const today = new Date();
    const records = studyRecords
      .filter(r => r.startTime && r.endTime && isSameDay(r.startTime, today))
      .map(r => ({
        startTime: (r.startTime instanceof Date ? r.startTime : new Date(r.startTime)).toISOString(),
        endTime: (r.endTime instanceof Date ? r.endTime : new Date(r.endTime)).toISOString(),
        duration: r.duration
      }));
    try {
      const res = await fetch(`${API_BASE}/rankings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick, records })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'fail');
      setRankings([...(data.scores || [])].sort((a, b) => b.score - a.score));
      const myScore = data.scores.find(s => s.nick === nick)?.score ?? 0;
      alert(`✨ ${nick}님, 오늘 집중 ${myScore}분 등록 완료!`);
    } catch (e) {
      console.error(e);
      alert(e.message && e.message !== 'fail' ? e.message : '점수 업로드에 실패했어요. 백엔드 서버가 켜져 있는지 확인해주세요.');
    }
  };

  // =================== [회원가입 / 로그인 상태] ===================
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('lifestyle_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authId, setAuthId] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authNickname, setAuthNickname] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('lifestyle_token') || '');

  // =================== [과외 모드 상태] ===================
  // 관리자 모드: 켜져 있으면 선생님 UI (학생 목록/보드 관리), 꺼져 있으면 학생 UI
  const [adminMode, setAdminModeState] = useState(() => localStorage.getItem('lifestyle_admin_mode') === 'true');
  const setAdminMode = (v) => {
    const val = !!v;
    try { localStorage.setItem('lifestyle_admin_mode', val ? 'true' : 'false'); } catch { /* 무시 */ }
    setAdminModeState(val);
  };

  // =================== [인앱 업데이트 확인] ===================
  const [updateInfo, setUpdateInfo] = useState(null); // {version, apkUrl, notes}
  const [showUpdate, setShowUpdate] = useState(false);
  // 버전 비교 (1.1, 1.2, 1.10 형식 지원)
  const compareVersions = (a, b) => {
    const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const checkForUpdate = async (manual = false) => {
    try {
      const res = await fetch(`${API_BASE}/app/version`);
      if (!res.ok) throw new Error('version check failed');
      const data = await res.json();
      if (compareVersions(data.version, APP_VERSION) > 0) {
        setUpdateInfo({ version: String(data.version), apkUrl: data.apkUrl || '', notes: data.notes || '' });
        setShowUpdate(true);
        return true;
      }
      if (manual) alert(`최신 버전이에요! (v${APP_VERSION})`);
      return false;
    } catch {
      if (manual) alert('업데이트 확인에 실패했어요. 인터넷 연결을 확인해주세요.');
      return false;
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkForUpdate(false);
  }, []);

  // =================== [과외 모드 상태] ===================
  const [tutorStudents, setTutorStudents] = useState([]); // [{code, nickname}]
  const [tutorSummaries, setTutorSummaries] = useState({}); // {code: {weekMinutes, todayMinutes, homeworkTotal, homeworkDone, nextClass}}
  const [tutorBoard, setTutorBoard] = useState(null); // {code, nickname, board}
  const [tutorRecords, setTutorRecords] = useState([]); // 선택된 학생의 공부 기록
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorError, setTutorError] = useState('');
  const [tutorStudentCodeInput, setTutorStudentCodeInput] = useState('');
  const [tutorView, setTutorView] = useState('home'); // 'home' | 'student'
  const [friends, setFriends] = useState([]); // {code, nickname}[]
  const [friendRequests, setFriendRequests] = useState([]); // 받은 친구 요청 {fromCode, fromNickname, at}[]
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [announcements, setAnnouncements] = useState([]); // 공지 {id, title, body, createdAt}[]
  const [showNotif, setShowNotif] = useState(false); // 알림 패널
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [lastSeenAnnounce, setLastSeenAnnounce] = useState(() => Number(localStorage.getItem('lifestyle_lastAnnounce') || 0));

  // =================== [뒤로가기: 모달 열려있으면 닫기, 없으면 두 번 눌러 종료] ===================
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let lastBack = 0;
    let toastTimer = null;
    const listener = CapApp.addListener('backButton', () => {
      // 열린 모달이 있으면 모달을 닫고 종료하지 않음
      if (showSettings) { setShowSettings(false); return; }
      if (showUpdate) { setShowUpdate(false); return; }
      if (showPolicy) { setShowPolicy(false); return; }
      if (showNotif) { setShowNotif(false); return; }
      const now = Date.now();
      if (now - lastBack < 2000) {
        CapApp.exitApp();
      } else {
        lastBack = now;
        setExitToast(true);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setExitToast(false), 2000);
      }
    });
    return () => {
      listener.remove();
      clearTimeout(toastTimer);
    };
  }, [showSettings, showUpdate, showPolicy, showNotif]);

  // =================== [관리자 상태] ===================
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('lifestyle_admin') === 'true');
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('lifestyle_admin_token') || '');
  const [adminTokenInput, setAdminTokenInput] = useState('');

  // 닉네임 허용 문자: 영어 + 한글 + 한자 + 히라가나 + 특수문자
  const NICKNAME_PATTERN = /^[A-Za-z가-힣一-龯ぁ-ん!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~` ]+$/;

  // ---- 관리자 로그인/로그아웃 ----
  const verifyAdmin = async () => {
    const token = adminTokenInput.trim();
    if (!token) { alert('관리자 토큰을 입력해주세요.'); return; }
    try {
      const res = await fetch(`${API_BASE}/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        sessionStorage.setItem('lifestyle_admin', 'true');
        sessionStorage.setItem('lifestyle_admin_token', token);
        setIsAdmin(true);
        setAdminToken(token);
        setAdminTokenInput('');
        alert('✅ 관리자 모드가 활성화되었어요!');
      } else {
        alert('관리자 토큰이 올바르지 않아요.');
      }
    } catch (e) {
      console.error(e);
      alert('서버에 연결할 수 없어요.');
    }
  };
  const logoutAdmin = () => {
    sessionStorage.removeItem('lifestyle_admin');
    sessionStorage.removeItem('lifestyle_admin_token');
    setIsAdmin(false);
    setAdminToken('');
  };

  // ---- 회원가입 (백엔드 API 호출) ----
  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    const id = authId.trim();
    const pw = authPassword;
    const nick = authNickname.trim();

    if (id.length < 4) { setAuthError('아이디는 4자 이상이어야 해요.'); return; }
    if (!/^[A-Za-z0-9]+$/.test(id)) { setAuthError('아이디는 영어와 숫자만 사용할 수 있어요.'); return; }
    if (pw.length < 6) { setAuthError('비밀번호는 6자 이상이어야 해요.'); return; }
    if (pw !== authPasswordConfirm) { setAuthError('비밀번호가 일치하지 않아요.'); return; }
    if (nick.length < 1) { setAuthError('닉네임을 입력해주세요.'); return; }
    if (!NICKNAME_PATTERN.test(nick)) { setAuthError('닉네임은 영어·한글·한자·히라가나·특수문자만 가능해요.'); return; }

    setAuthBusy(true);
    try {
      const res = await fetch(`${API_BASE}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: pw, nickname: nick })
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || '가입에 실패했어요.'); setAuthBusy(false); return; }
      localStorage.setItem('lifestyle_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      if (data.user?.role === 'teacher') setAdminMode(true); // 기존 선생님 계정은 관리자 모드 자동 활성화
      if (data.token) { localStorage.setItem('lifestyle_token', data.token); setSessionToken(data.token); }
      setAuthBusy(false);
      setAuthId(''); setAuthPassword(''); setAuthPasswordConfirm(''); setAuthNickname('');
    } catch (err) {
      console.error(err);
      setAuthError('서버에 연결할 수 없어요. 백엔드 서버가 켜져 있는지 확인해주세요.');
      setAuthBusy(false);
    }
  };

  // ---- 로그인 (백엔드 API 호출) ----
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    const id = authId.trim();
    const pw = authPassword;
    if (!id || !pw) { setAuthError('아이디와 비밀번호를 입력해주세요.'); return; }
    setAuthBusy(true);
    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: pw })
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || '로그인에 실패했어요.'); setAuthBusy(false); return; }
      localStorage.setItem('lifestyle_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      if (data.user?.role === 'teacher') setAdminMode(true); // 기존 선생님 계정은 관리자 모드 자동 활성화
      if (data.token) { localStorage.setItem('lifestyle_token', data.token); setSessionToken(data.token); }
      setAuthBusy(false);
      setAuthId(''); setAuthPassword('');
    } catch (err) {
      console.error(err);
      setAuthError('서버에 연결할 수 없어요.');
      setAuthBusy(false);
    }
  };

  // ---- 로그아웃 ----
  const handleLogout = async () => {
    // 서버 로그아웃은 기다리지 않고 백그라운드로 (서버가 자고 있어도 로그아웃이 멈추지 않게)
    try {
      if (currentUser?.code && sessionToken) {
        fetch(`${API_BASE}/users/logout`, {
          method: 'POST',
          headers: { 'x-user-code': currentUser.code, 'x-session-token': sessionToken },
        }).catch(() => { /* 서버 로그아웃 실패는 무시 */ });
      }
    } catch { /* 무시 */ }
    localStorage.removeItem('lifestyle_user');
    localStorage.removeItem('lifestyle_token');
    setCurrentUser(null);
    setSessionToken('');
    setAdminMode(false);
    setTutorStudents([]); setTutorSummaries({}); setTutorBoard(null); setTutorRecords([]); setTutorView('home');
    setShowSettings(false);
  };

  // =================== [과외 모드 API] ===================
  const tutorFetch = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-user-code': currentUser?.code || '',
        'x-session-token': sessionToken,
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '요청에 실패했어요.');
    return data;
  };

  const refreshMyUser = async () => {
    try {
      const data = await tutorFetch('/tutor/me');
      localStorage.setItem('lifestyle_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      return data.user;
    } catch (e) { console.error(e); return null; }
  };

  // ---- 관리자 모드 (PIN으로 활성화 → 이 계정을 선생님으로 승격) ----
  const fetchAdminStatus = async () => {
    try {
      const data = await tutorFetch('/tutor/admin/status');
      return !!data.hasPin;
    } catch (e) { console.error(e); return false; }
  };

  const activateAdminMode = async (pin) => {
    const data = await tutorFetch('/tutor/admin/activate', { method: 'POST', body: JSON.stringify({ pin }) });
    localStorage.setItem('lifestyle_user', JSON.stringify(data.user));
    setCurrentUser(data.user);
    setAdminMode(true);
    return data; // { user, isNewPin }
  };

  const fetchTutorSummaries = async () => {
    try {
      const data = await tutorFetch('/tutor/students/summary');
      const map = {};
      (data.students || []).forEach((s) => { map[s.code] = s; });
      setTutorSummaries(map);
    } catch (e) { console.error(e); }
  };

  const fetchTutorStudents = async () => {
    setTutorLoading(true); setTutorError('');
    try {
      const data = await tutorFetch('/tutor/students');
      setTutorStudents(data.students || []);
      await fetchTutorSummaries();
    } catch (e) { setTutorError(e.message); }
    finally { setTutorLoading(false); }
  };

  const registerTutorStudent = async () => {
    const code = tutorStudentCodeInput.trim();
    if (!code) { setTutorError('학생 코드를 입력해주세요.'); return; }
    setTutorLoading(true); setTutorError('');
    try {
      const data = await tutorFetch('/tutor/students', { method: 'POST', body: JSON.stringify({ studentCode: code }) });
      setTutorStudents(data.students || []);
      setTutorStudentCodeInput('');
      await fetchTutorSummaries();
    } catch (e) { setTutorError(e.message); }
    finally { setTutorLoading(false); }
  };

  const unregisterTutorStudent = async (code) => {
    if (!window.confirm('이 학생의 등록을 해제할까요?')) return;
    try {
      const data = await tutorFetch(`/tutor/students/${encodeURIComponent(code)}`, { method: 'DELETE' });
      setTutorStudents(data.students || []);
      setTutorSummaries((prev) => { const m = { ...prev }; delete m[code]; return m; });
      if (tutorBoard?.code === code) { setTutorBoard(null); setTutorRecords([]); setTutorView('home'); }
    } catch (e) { alert(e.message); }
  };

  const openTutorBoard = async (code) => {
    setTutorLoading(true); setTutorError('');
    try {
      const [b, r] = await Promise.all([
        tutorFetch(`/tutor/board/${encodeURIComponent(code)}`),
        tutorFetch(`/tutor/records/${encodeURIComponent(code)}?days=30`),
      ]);
      setTutorBoard({ code: b.code, nickname: b.nickname, board: b.board });
      setTutorRecords(r.records || []);
      setTutorView('student');
    } catch (e) { setTutorError(e.message); }
    finally { setTutorLoading(false); }
  };

  const saveTutorBoard = async (board) => {
    if (!tutorBoard) return;
    setTutorLoading(true); setTutorError('');
    try {
      const data = await tutorFetch(`/tutor/board/${encodeURIComponent(tutorBoard.code)}`, {
        method: 'PUT', body: JSON.stringify({ board }),
      });
      setTutorBoard({ ...tutorBoard, board: data.board });
    } catch (e) { setTutorError(e.message); }
    finally { setTutorLoading(false); }
  };

  const fetchMyBoard = async () => {
    if (!currentUser?.code) return;
    setTutorLoading(true); setTutorError('');
    try {
      const me = await refreshMyUser();
      const code = me?.code || currentUser.code;
      const b = await tutorFetch(`/tutor/board/${encodeURIComponent(code)}`);
      setTutorBoard({ code: b.code, nickname: b.nickname, board: b.board });
    } catch (e) { setTutorError(e.message); }
    finally { setTutorLoading(false); }
  };

  // 학생: 공부 기록을 서버에 동기화 (선생님이 볼 수 있게)
  const syncStudyRecords = async () => {
    if (currentUser?.role !== 'student' || !currentUser?.teacherCode || !sessionToken) return;
    try {
      await fetch(`${API_BASE}/tutor/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-code': currentUser.code,
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({
          records: studyRecords.map((r) => ({
            id: r.id, title: r.title,
            startTime: new Date(r.startTime).toISOString(),
            endTime: new Date(r.endTime).toISOString(),
            duration: r.duration, color: r.color,
          })),
        }),
      });
    } catch (e) { console.error('공부 기록 동기화 실패', e); }
  };

  useEffect(() => {
    if (adminMode || !currentUser?.teacherCode || !sessionToken) return;
    const t = setTimeout(() => { syncStudyRecords(); }, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyRecords, currentUser, sessionToken, adminMode]);

  // ---- 알림 상태 (뽀모도로/친구 요청 폴링에서 사용하므로 먼저 선언) ----
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('lifestyle_notif_enabled') === 'true');

  const sendNotification = useCallback((title, body) => {
    if (notifEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  }, [notifEnabled]);

  // ---- 친구 목록 + 받은 요청 불러오기 ----
  const fetchFriends = async () => {
    if (!currentUser) { setFriends([]); setFriendRequests([]); return; }
    try {
      const res = await fetch(`${API_BASE}/friends?code=${encodeURIComponent(currentUser.code)}`);
      if (!res.ok) return;
      const data = await res.json();
      setFriends(data.friends || []);
      setFriendRequests(data.requests || []);
    } catch (e) { console.error(e); }
  };

// 마운트/로그인 변경 시 친구 목록 로딩 — 의도적 예외 처리
  // (fetchFriends는 매 렌더 새로 생성되므로 deps에 넣으면 무한 루프)
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchFriends(); }, [currentUser]);

  // ---- 친구 요청 폴링 (30초마다) — 새 요청이 오면 알림 ----
  const prevRequestCount = useRef(0);
  useEffect(() => {
    if (!currentUser) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/friends?code=${encodeURIComponent(currentUser.code)}`);
        if (!res.ok) return;
        const data = await res.json();
        const reqs = data.requests || [];
        if (reqs.length > prevRequestCount.current) {
          const latest = reqs[reqs.length - 1];
          sendNotification('🤝 친구 요청이 왔어요!', `${latest.fromNickname || latest.fromCode}님이 친구 요청을 보냈어요.`);
        }
        prevRequestCount.current = reqs.length;
        setFriends(data.friends || []);
        setFriendRequests(reqs);
      } catch { /* 폴링 실패는 조용히 무시 */ }
    }, 30000);
    return () => clearInterval(t);
  }, [currentUser, sendNotification]);

  // ---- 새 숙제 폴링 (60초마다) — 학생 모드일 때, 선생님이 숙제를 새로 넣으면 알림 ----
  const seenHomeworkRef = useRef({ code: null, ids: new Set(), init: false });
  useEffect(() => {
    if (adminMode || !currentUser || !sessionToken) return;
    const code = currentUser.code;
    const key = `lifestyle_seenHomework_${code}`;
    let st = seenHomeworkRef.current;
    if (st.code !== code) {
      let ids = new Set();
      let init = false;
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) { ids = new Set(JSON.parse(raw).map(String)); init = true; }
      } catch { /* 무시 */ }
      st = { code, ids, init };
      seenHomeworkRef.current = st;
    }
    const t = setInterval(async () => {
      try {
        const data = await tutorFetch(`/tutor/board/${encodeURIComponent(code)}`);
        const hw = (data.board && data.board.homework) || [];
        const ids = hw.map((h) => String(h.id));
        const fresh = hw.filter((h) => !st.ids.has(String(h.id)));
        if (st.init && fresh.length > 0) {
          const first = fresh[0];
          sendNotification('📝 새 숙제가 등록됐어요!', `${first.title}${fresh.length > 1 ? ` 외 ${fresh.length - 1}건` : ''}`);
          setTutorBoard((prev) => (prev && prev.code === code ? { ...prev, board: data.board } : prev));
        }
        st.ids = new Set(ids);
        st.init = true;
        try { localStorage.setItem(key, JSON.stringify(ids)); } catch { /* 무시 */ }
      } catch { /* 폴링 실패는 조용히 무시 */ }
    }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, sessionToken, sendNotification, adminMode]);

  // ---- 친구 요청 보내기 ----
  const addFriend = async () => {
    const code = friendCodeInput.trim();
    if (!code) return;
    if (!currentUser) { alert('로그인이 필요해요.'); return; }
    try {
      const res = await fetch(`${API_BASE}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromCode: currentUser.code, toCode: code })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || '친구 요청에 실패했어요.'); return; }
      setFriendCodeInput('');
      if (data.autoAccepted) {
        alert('상대방도 나에게 요청을 보낸 상태라 바로 친구가 되었어요! 🎉');
      } else {
        alert('친구 요청을 보냈어요! 상대방이 수락하면 친구가 돼요.');
      }
      fetchFriends();
    } catch (err) {
      console.error(err);
      alert('친구 요청에 실패했어요.');
    }
  };

  // ---- 친구 요청 수락/거절 ----
  const acceptFriend = async (fromCode) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/friends/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentUser.code, fromCode })
      });
      if (res.ok) fetchFriends();
    } catch (e) { console.error(e); }
  };
  const rejectFriend = async (fromCode) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/friends/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentUser.code, fromCode })
      });
      if (res.ok) fetchFriends();
    } catch (e) { console.error(e); }
  };

  // ---- 친구 삭제 ----
  const removeFriend = async (friendCode) => {
    if (!currentUser) return;
    if (!window.confirm('이 친구를 삭제할까요?')) return;
    try {
      const res = await fetch(`${API_BASE}/friends`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentUser.code, friendCode })
      });
      if (res.ok) fetchFriends();
      else { const data = await res.json(); alert(data.error || '친구 삭제에 실패했어요.'); }
    } catch (e) { console.error(e); alert('친구 삭제에 실패했어요.'); }
  };

  // ---- 공지 불러오기 ----
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_BASE}/announcements`);
      if (!res.ok) return;
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (e) { console.error(e); }
  };

// 마운트 시 1회성 데이터 로딩 — SPA 표준 패턴이므로 의도적 예외 처리
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAnnouncements(); }, []);

  // ---- 새 공지 폴링 (60초마다) — 공지가 새로 올라오면 학생 폰에 알림 ----
  const seenAnnounceRef = useRef({ maxId: 0, init: false });
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/announcements`);
        if (!res.ok) return;
        const data = await res.json();
        const list = data.announcements || [];
        setAnnouncements(list);
        const maxId = list.reduce((m, a) => Math.max(m, Number(a.id) || 0), 0);
        const st = seenAnnounceRef.current;
        if (!st.init) {
          st.maxId = maxId;
          st.init = true;
          return;
        }
        if (maxId > st.maxId) {
          const fresh = list.filter((a) => (Number(a.id) || 0) > st.maxId);
          if (fresh.length > 0) {
            sendNotification('📢 새 공지가 있어요!', fresh[0].title || '');
          }
          st.maxId = maxId;
        }
      } catch { /* 폴링 실패는 조용히 무시 */ }
    }, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendNotification]);

  // ---- 공지 등록 (관리자만) ----
  const addAnnouncement = async () => {
    if (!isAdmin) { alert('관리자만 공지를 등록할 수 있어요.'); return; }
    if (!announceTitle.trim() || !announceBody.trim()) { alert('제목과 내용을 입력해주세요.'); return; }
    try {
      const res = await fetch(`${API_BASE}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ title: announceTitle.trim(), body: announceBody.trim() })
      });
      const data = await res.json();
      if (res.status === 403) { alert('관리자 토큰이 유효하지 않아요.'); return; }
      if (!res.ok) { alert(data.error || '공지 등록에 실패했어요.'); return; }
      setAnnouncements(data.announcements || []);
      setAnnounceTitle('');
      setAnnounceBody('');
    } catch (e) { console.error(e); alert('공지 등록에 실패했어요.'); }
  };

  // ---- 공지 삭제 (관리자만) ----
  const deleteAnnouncement = async (id) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`${API_BASE}/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      const data = await res.json();
      if (res.ok) setAnnouncements(data.announcements || []);
    } catch (e) { console.error(e); }
  };

  // 알림 뱃지 여부 (받은 친구 요청 있거나, 새 공지 있거나)
  const hasNewNotif = friendRequests.length > 0 || (announcements.length > 0 && announcements[0].id > lastSeenAnnounce);

  // 알림 패널 열 때 마지막 확인 공지 갱신
  const openNotif = () => {
    setShowNotif(true);
    if (announcements.length > 0) {
      const latest = announcements[0].id;
      setLastSeenAnnounce(latest);
      localStorage.setItem('lifestyle_lastAnnounce', String(latest));
    }
  };


  // ---------- 의견 목록 불러오기 (백엔드 API) ----------
  const fetchRequests = async () => {
    setRequestsLoading(true);
    setRequestsError('');
    try {
      const res = await fetch(`${API_BASE}/requests`);
      if (!res.ok) throw new Error('불러오기 실패');
      const data = await res.json();
      setRequests(data.items || []);
    } catch (e) {
      console.error(e);
      setRequestsError('의견을 불러오지 못했어요. 백엔드 서버를 확인해주세요.');
      // 로컬 폴백
      const saved = localStorage.getItem('lifestyle_requests');
      if (saved) setRequests(JSON.parse(saved));
    } finally {
      setRequestsLoading(false);
    }
  };

// 마운트 시 1회성 데이터 로딩 — SPA 표준 패턴이므로 의도적 예외 처리
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRequests(); }, []);


  // 상태가 변경될 때마다 자동 저장
  useEffect(() => { localStorage.setItem('lifestyle_todos', JSON.stringify(todos)); }, [todos]);
  useEffect(() => { localStorage.setItem('lifestyle_events', JSON.stringify(events)); }, [events]);
  useEffect(() => { localStorage.setItem('lifestyle_studyRecords', JSON.stringify(studyRecords)); }, [studyRecords]);
  useEffect(() => { localStorage.setItem('lifestyle_dday', JSON.stringify(dday)); }, [dday]);
  useEffect(() => { localStorage.setItem('lifestyle_darkMode', JSON.stringify(isDarkMode)); }, [isDarkMode]);
  useEffect(() => { localStorage.setItem('lifestyle_routines', JSON.stringify(routines)); }, [routines]);
  useEffect(() => { localStorage.setItem('lifestyle_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('lifestyle_diaries', JSON.stringify(diaries)); }, [diaries]);
  useEffect(() => { localStorage.setItem('lifestyle_requests', JSON.stringify(requests)); }, [requests]);


  // =================== [일반 상태] ===================
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState('개인');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formColor, setFormColor] = useState(COLOR_OPTIONS[0].value);
  const [formDay, setFormDay] = useState(new Date().getDay()); // 일정 추가/수정 시 요일

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentStudy, setCurrentStudy] = useState('');
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [timerColor, setTimerColor] = useState(TIMER_COLORS[0]);

  // =================== [뽀모도로 & 백색소음 상태] ===================
  const [isPomodoro, setIsPomodoro] = useState(false); // 뽀모도로 모드 여부
  const [pomodoroPhase, setPomodoroPhase] = useState('focus'); // 'focus' | 'break'
  const [pomodoroRemaining, setPomodoroRemaining] = useState(25 * 60); // 남은 초
  const [pomodoroCount, setPomodoroCount] = useState(0); // 완료한 뽀모도로 횟수
  const [isWhiteNoiseOn, setIsWhiteNoiseOn] = useState(false); // 백색소음 on/off
  const [noiseType, setNoiseType] = useState('rain'); // rain | cafe | forest | waves | fire
  const [isFocusMode, setIsFocusMode] = useState(false); // 집중 모드 (타이머 중 방해 숨김)
  const audioRef = useRef(null);
  
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordFormTitle, setRecordFormTitle] = useState('');
  const [recordFormStart, setRecordFormStart] = useState('00:00');
  const [recordFormEnd, setRecordFormEnd] = useState('00:00');
  const [recordFormColor, setRecordFormColor] = useState(TIMER_COLORS[0]);
  
  const timerRef = useRef(null);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => setTimerSeconds(prev => prev + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  // =================== [뽀모도로 로직] ===================
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(); osc.stop(ctx.currentTime + 0.7);
    } catch { /* 오디오 미지원 시 조용히 무시 */ }
  };

  // 뽀모도로 카운트다운 (집중 25분 / 휴식 5분 자동 전환)
  useEffect(() => {
    if (!isPomodoro || !isTimerRunning) return;
    const t = setInterval(() => {
      setPomodoroRemaining(prev => {
        if (prev <= 1) {
          playBeep();
          if (pomodoroPhase === 'focus') {
            setPomodoroCount(c => c + 1);
            setPomodoroPhase('break');
            sendNotification('🍅 집중 시간 종료!', '5분간 휴식하세요.');
            return 5 * 60;
          } else {
            setPomodoroPhase('focus');
            sendNotification('🍅 휴식 종료!', '다시 집중 시간입니다.');
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isPomodoro, isTimerRunning, pomodoroPhase, sendNotification]);

  // 시작/일시정지 토글 (실행 중엔 멈춤, 멈춘 상태에선 재개)
  const startPomodoro = () => {
    if (!isTimerRunning) {
      const now = new Date();
      if (!timerStartTime) setTimerStartTime(now);
      if (!currentStudy && pomodoroPhase === 'focus') setCurrentStudy('뽀모도로 집중');
      setIsTimerRunning(true);
      setIsPomodoro(true);
    } else {
      setIsTimerRunning(false);
    }
  };

  const togglePomodoroMode = () => {
    if (isTimerRunning) { alert('타이머가 실행 중일 땐 모드를 바꿀 수 없어요.'); return; }
    setIsPomodoro(!isPomodoro);
    setPomodoroRemaining(!isPomodoro ? 25 * 60 : 0);
    setPomodoroPhase('focus');
  };

  const formatPomodoro = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // =================== [백색소음 (Web Audio API 합성)] ===================
  const noiseCtxRef = useRef(null);
  const noiseNodesRef = useRef(null);

  const stopNoise = () => {
    if (noiseCtxRef.current) {
      try { noiseCtxRef.current.close(); } catch { /* 이미 닫힌 경우 무시 */ }
      noiseCtxRef.current = null;
      noiseNodesRef.current = null;
    }
  };

  const startNoise = (type) => {
    stopNoise();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // 소리 유형별 데이터 생성
    let fireBrown = 0;
    let fireEnv = 0;
    for (let i = 0; i < bufferSize; i++) {
      if (type === 'rain') {
        // 빗소리: 백색소음 + 저역 필터 느낌
        data[i] = (Math.random() * 2 - 1) * 0.6;
      } else if (type === 'cafe') {
        // 카페: 부드러운 저역 잡음 (사람들 웅성거림 느낌)
        data[i] = (Math.random() * 2 - 1) * 0.3;
      } else if (type === 'forest') {
        // 숲: 아주 잔잔한 바람 + 고요한 잡음
        data[i] = (Math.random() * 2 - 1) * 0.18;
      } else if (type === 'fire') {
        // 장작: 저역 우르릉(갈색 잡음) + 불똥 튀는 '탁탁' 크래클
        const w = Math.random() * 2 - 1;
        fireBrown = (fireBrown + 0.012 * w) / 1.012;
        if (fireEnv <= 0.005 && Math.random() < 0.0004) fireEnv = 1.0;
        fireEnv *= 0.9996;
        const crackle = (Math.random() * 2 - 1) * fireEnv;
        data[i] = fireBrown * 2.8 + crackle * 0.55;
      } else {
        // 파도: 느리게 오르내리는 잡음 (롤리지 않은 파도 느낌)
        const wave = Math.sin(i / (ctx.sampleRate * 0.9)) * 0.5 + 0.5;
        data[i] = (Math.random() * 2 - 1) * 0.25 * wave;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    let sourceNode = source;

    if (type === 'rain') {
      // 빗소리: 하이패스 필터로 고주파만 남겨 '쏴아' 소리
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 1200;
      source.connect(hp); hp.connect(master);
    } else if (type === 'cafe') {
      // 카페: 로우패스로 웅성거리는 저음 강조
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 800;
      source.connect(lp); lp.connect(master);
    } else if (type === 'fire') {
      // 장작: 로우패스로 우르릉거리는 저음을 부드럽게
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1500;
      source.connect(lp); lp.connect(master);
    } else {
      source.connect(master);
    }

    source.start();
    noiseCtxRef.current = ctx;
    noiseNodesRef.current = sourceNode;
  };

  useEffect(() => {
    if (isWhiteNoiseOn) {
      startNoise(noiseType);
    } else {
      stopNoise();
    }
    return () => stopNoise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWhiteNoiseOn, noiseType]);

  // =================== [D-Day 유틸] ===================
  const getDdayString = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dday.date);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'D-Day';
    return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
  };

  // ---- 정밀 카운트다운 (일/시/분/초) ----
  const getDdayCountdown = () => {
    const target = new Date(dday.date);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - currentTime.getTime();
    if (diff <= 0) {
      return { passed: true, days: 0, hours: 0, mins: 0, secs: 0 };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return { passed: false, days, hours, mins, secs };
  };

  const editDday = () => {
    const newTitle = window.prompt('디데이 목표를 입력하세요 (예: 토익 시험, 앱 출시)', dday.title);
    if (!newTitle) return;
    const newDate = window.prompt('날짜를 입력하세요 (YYYY-MM-DD 형식)', dday.date);
    if (newDate && !isNaN(new Date(newDate).getTime())) {
      setDday({ title: newTitle, date: newDate });
    } else {
      alert('올바른 날짜 형식이 아닙니다. (예: 2026-12-31)');
    }
  };

  // =================== [신규 기능 로직] ===================
  // 오늘 날짜 키 (YYYY-MM-DD)
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  // ---- 1. 월간 히트맵 ----
  const getMonthDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const secs = studyRecords
        .filter(r => {
          const rk = `${r.startTime.getFullYear()}-${String(r.startTime.getMonth()+1).padStart(2,'0')}-${String(r.startTime.getDate()).padStart(2,'0')}`;
          return rk === key;
        })
        .reduce((a, r) => a + r.duration, 0);
      arr.push({ day: d, dateKey: key, seconds: secs, dow: date.getDay() });
    }
    return { year, month, firstDow: first.getDay(), days: arr };
  };

  // 히트맵 색상 (초 기반 강도, 2.5시간 = 9000초 단위)
  const heatColor = (seconds) => {
    if (seconds === 0) return 'bg-slate-100 dark:bg-purple-800/30';
    if (seconds < 9000) return 'bg-emerald-200 dark:bg-emerald-800/50';        // 0 ~ 2.5시간
    if (seconds < 18000) return 'bg-emerald-300 dark:bg-emerald-700/60';       // 2.5 ~ 5시간
    if (seconds < 27000) return 'bg-emerald-400 dark:bg-emerald-600/70';       // 5 ~ 7.5시간
    if (seconds < 36000) return 'bg-emerald-500 dark:bg-emerald-500/80';       // 7.5 ~ 10시간
    return 'bg-emerald-600 dark:bg-emerald-400/90';                             // 10시간 이상
  };

  // ---- 월간 리포트 요약 (공유 이미지용) ----
  const getMonthlySummary = () => {
    const { year, month, days } = getMonthDays();
    const totalSeconds = days.reduce((a, d) => a + d.seconds, 0);
    const activeDays = days.filter(d => d.seconds > 0).length;
    const avgSeconds = activeDays > 0 ? Math.round(totalSeconds / activeDays) : 0;
    // 요일별 집중 시간 (0:일 ~ 6:토)
    const dowTotals = [0, 0, 0, 0, 0, 0, 0];
    days.forEach(d => { dowTotals[d.dow] += d.seconds; });
    let bestDow = 0;
    for (let i = 1; i < 7; i++) if (dowTotals[i] > dowTotals[bestDow]) bestDow = i;
    const bestDowName = ['일', '월', '화', '수', '목', '금', '토'][bestDow];
    const bestDay = days.reduce((m, d) => d.seconds > (m ? m.seconds : 0) ? d : m, null);
    return { year, month, totalSeconds, activeDays, avgSeconds, bestDowName, bestDay, dowTotals };
  };

  // ---- 3. 루틴 ----
  const [newRoutineText, setNewRoutineText] = useState('');
  const [newRoutineFreq, setNewRoutineFreq] = useState('매일');
  const addRoutine = (e) => {
    e.preventDefault();
    if (!newRoutineText.trim()) return;
    setRoutines([...routines, { id: Date.now(), text: newRoutineText, freq: newRoutineFreq, done: {} }]);
    setNewRoutineText('');
  };
  const toggleRoutine = (id) => {
    const k = todayKey();
    setRoutines(routines.map(r => r.id === id ? { ...r, done: { ...r.done, [k]: !r.done[k] } } : r));
  };
  const deleteRoutine = (id) => setRoutines(routines.filter(r => r.id !== id));
  const getRoutineStreak = (r) => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (r.done[k]) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  };

  // ---- 4. 목표 관리 ----
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState(10);
  const [goalName, setGoalName] = useState('');
  const [goalProgress, setGoalProgress] = useState(0);
  const [goalTarget, setGoalTarget] = useState(10);
  const addGoal = (e) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    setGoals([...goals, { id: Date.now(), text: newGoalText, progress: 0, target: Number(newGoalTarget) || 10 }]);
    setNewGoalText('');
    setNewGoalTarget(10);
  };
  const incGoal = (id, delta) => {
    setGoals(goals.map(g => g.id === id ? { ...g, progress: Math.max(0, g.progress + delta) } : g));
  };
  const deleteGoal = (id) => setGoals(goals.filter(g => g.id !== id));

  // ---- 5. 감정/한 줄 일기 ----
  const MOODS = ['😊', '🙂', '😐', '😢', '😡'];
  const saveDiary = (e) => {
    e.preventDefault();
    const k = todayKey();
    if (editingDiary && !diaryText.trim()) {
      // 수정 중에 내용을 전부 지웠다면 오늘 일기를 삭제해 깨끗한 초기 상태로
      const next = { ...diaries };
      delete next[k];
      setDiaries(next);
      setDiaryText('');
      setEditingDiary(false);
      return;
    }
    setDiaries({ ...diaries, [k]: { text: diaryText, mood: diaryMood, at: new Date().toISOString() } });
    setDiaryText('');
    setEditingDiary(false);
  };
  const todayDiary = diaries[todayKey()];
  const startEditDiary = () => {
    if (!todayDiary) return;
    setDiaryText(todayDiary.text);
    setDiaryMood(todayDiary.mood);
    setEditingDiary(true);
  };

  // ---- 주간 목표/회고 로직 ----
  // 이번 주 키 (YYYY-WW, 월요일 시작)
  const weekKey = () => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // 월=0 .. 일=6
    const monday = new Date(now);
    monday.setDate(now.getDate() - day);
    const y = monday.getFullYear();
    const m = monday.getMonth() + 1;
    const d = monday.getDate();
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  };

  const currentWeek = weeklyPlans[weekKey()] || { goals: [], review: { good: '', bad: '', next: '' } };

  const addWeeklyGoal = (e) => {
    e.preventDefault();
    if (!newWeeklyGoal.trim()) return;
    const wk = weekKey();
    const cur = weeklyPlans[wk] || { goals: [], review: { good: '', bad: '', next: '' } };
    const updated = { ...weeklyPlans, [wk]: { ...cur, goals: [...cur.goals, { id: Date.now(), text: newWeeklyGoal.trim(), done: false }] } };
    setWeeklyPlans(updated);
    setNewWeeklyGoal('');
  };

  const toggleWeeklyGoal = (id) => {
    const wk = weekKey();
    const cur = weeklyPlans[wk] || { goals: [], review: { good: '', bad: '', next: '' } };
    const updated = { ...weeklyPlans, [wk]: { ...cur, goals: cur.goals.map(g => g.id === id ? { ...g, done: !g.done } : g) } };
    setWeeklyPlans(updated);
  };

  const deleteWeeklyGoal = (id) => {
    const wk = weekKey();
    const cur = weeklyPlans[wk] || { goals: [], review: {} };
    const updated = { ...weeklyPlans, [wk]: { ...cur, goals: cur.goals.filter(g => g.id !== id) } };
    setWeeklyPlans(updated);
  };

  const saveWeeklyReview = (e) => {
    e.preventDefault();
    const wk = weekKey();
    const cur = weeklyPlans[wk] || { goals: [], review: {} };
    const updated = { ...weeklyPlans, [wk]: { ...cur, review: { good: weeklyReviewGood, bad: weeklyReviewBad, next: weeklyReviewNext } } };
    setWeeklyPlans(updated);
    setEditingReview(false);
  };
  const startEditReview = () => {
    const r = currentWeek.review || {};
    setWeeklyReviewGood(r.good || '');
    setWeeklyReviewBad(r.bad || '');
    setWeeklyReviewNext(r.next || '');
    setEditingReview(true);
  };

  // 주차 표시용 라벨
  const weekLabel = () => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const monday = new Date(now); monday.setDate(now.getDate() - day);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const fmt = (d) => `${d.getMonth() + 1}.${d.getDate()}`;
    return `${fmt(monday)} ~ ${fmt(sunday)}`;
  };

  // ---- 요청(개발 도움 요청) 관리 (백엔드 API) ----
  const addRequest = async (e) => {
    e.preventDefault();
    if (!newRequestTitle.trim() || !newRequestBody.trim()) return;
    const title = newRequestTitle.trim();
    const body = newRequestBody.trim();
    const category = newRequestCategory;
    setNewRequestTitle('');
    setNewRequestBody('');
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, category })
      });
      if (!res.ok) throw new Error('등록 실패');
      const data = await res.json();
      setRequests(data.items || []);
      localStorage.setItem('lifestyle_requests', JSON.stringify(data.items || []));
    } catch (err) {
      console.error(err);
      alert('의견 등록에 실패했어요. 백엔드 서버를 확인해주세요.');
    }
  };

  const toggleRequestVote = async (id) => {
    // 익명 추천: 이미 추천했는지 로컬에서 기억
    const myVotes = JSON.parse(localStorage.getItem('lifestyle_myVotes') || '{}');
    const voted = !!myVotes[id];
    const delta = voted ? -1 : 1;
    try {
      const res = await fetch(`${API_BASE}/requests/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta })
      });
      if (!res.ok) throw new Error('추천 실패');
      const data = await res.json();
      setRequests(data.items || []);
      localStorage.setItem('lifestyle_requests', JSON.stringify(data.items || []));
      if (voted) delete myVotes[id];
      else myVotes[id] = true;
      localStorage.setItem('lifestyle_myVotes', JSON.stringify(myVotes));
    } catch (err) {
      console.error(err);
      alert('추천 반영에 실패했어요.');
    }
  };

  const deleteRequest = async (id) => {
    if (!isAdmin) { alert('관리자만 의견을 삭제할 수 있어요.'); return; }
    try {
      const res = await fetch(`${API_BASE}/requests/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      if (res.status === 403) { alert('관리자 토큰이 유효하지 않아요.'); return; }
      if (!res.ok) throw new Error('삭제 실패');
      const data = await res.json();
      setRequests(data.items || []);
      localStorage.setItem('lifestyle_requests', JSON.stringify(data.items || []));
    } catch (err) {
      console.error(err);
      alert('의견 삭제에 실패했어요.');
    }
  };


  // =================== [A1. 계정/클라우드 동기화 (내보내기/가져오기)] ===================
  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      todos,
      events,
      studyRecords: studyRecords.map(r => ({ ...r, startTime: r.startTime.toISOString(), endTime: r.endTime.toISOString() })),
      dday,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `오늘의기록_백업_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('백업 파일이 다운로드되었습니다! ☁️');
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.todos) setTodos(data.todos);
          if (data.events) {
            // 구버전 백업(날짜 기반) 마이그레이션: day 필드가 없으면 오늘 요일로
            const today = new Date().getDay();
            setEvents(data.events.map(e => ({ ...e, day: typeof e.day === 'number' ? e.day : today })));
          }
          if (data.studyRecords) setStudyRecords(data.studyRecords.map(r => ({ ...r, startTime: new Date(r.startTime), endTime: new Date(r.endTime) })));
          if (data.dday) setDday(data.dday);
          alert('백업 데이터를 성공적으로 불러왔습니다! ✅');
        } catch {
          alert('올바른 백업 파일이 아닙니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // =================== [A2. 푸시 알림] ===================
  // (notifEnabled, sendNotification은 파일 앞쪽에서 선언됨)

  const requestNotification = async () => {
    if (!('Notification' in window)) { alert('이 브라우저는 알림을 지원하지 않습니다.'); return; }
    if (Notification.permission === 'granted') {
      setNotifEnabled(true);
      localStorage.setItem('lifestyle_notif_enabled', 'true');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifEnabled(true);
        localStorage.setItem('lifestyle_notif_enabled', 'true');
        new Notification('🌤️ 모두의 과외', { body: '알림이 활성화되었습니다!' });
      } else if (perm === 'denied') {
        // 사용자가 거부한 경우, 브라우저 설정 안내
        alert('알림이 브라우저에서 차단되어 있습니다.\n브라우저 주소창 왼쪽의 자물쇠(🔒) 아이콘을 눌러 "알림" 권한을 허용으로 바꿔주세요.');
      }
    } catch {
      alert('알림 권한을 요청할 수 없습니다. 브라우저 설정에서 직접 허용해 주세요.');
    }
  };

  // (sendNotification은 파일 앞쪽에서 선언됨)


  useEffect(() => {
    if (notifEnabled) localStorage.setItem('lifestyle_notif_enabled', 'true');
  }, [notifEnabled]);

  // =================== [A3. 온보딩] ===================
  const completeOnboarding = () => {
    setOnboardingFade(true); // 부드러운 페이드 아웃 시작
    setTimeout(() => {
      localStorage.setItem('lifestyle_onboarded', 'true');
      setShowOnboarding(false);
    }, 500); // 애니메이션 시간과 맞춤
  };
  // =================== [할 일 함수] ===================
  const addTodo = (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const newTodo = { id: Date.now(), text: newTodoText, completed: false, category: newTodoCategory };
    setTodos([newTodo, ...todos]);
    setNewTodoText('');
  };

  const toggleTodo = (id) => setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed, completedAt: !todo.completed ? new Date().toISOString() : null } : todo));
  const deleteTodo = (id) => setTodos(todos.filter(todo => todo.id !== id));

  // =================== [시간표 함수] ===================
  const currentHourDecimal = currentTime.getHours() + currentTime.getMinutes() / 60;
  const decimalToTime = (decimal) => {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const timeToDecimal = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  };

  const openModal = (event = null) => {
    if (event) {
      setEditingEvent(event); setFormTitle(event.title); setFormStart(decimalToTime(event.start)); setFormEnd(decimalToTime(event.end % 24)); setFormColor(event.color); setFormDay(typeof event.day === 'number' ? event.day : selectedDay);
    } else {
      setEditingEvent(null); setFormTitle(''); setFormStart('09:00'); setFormEnd('10:00'); setFormColor(COLOR_OPTIONS[0].value); setFormDay(selectedDay);
    }
    setIsModalOpen(true);
  };

  const saveEvent = () => {
    const startDec = timeToDecimal(formStart); let endDec = timeToDecimal(formEnd);
    if (endDec === 0) endDec = 24; // 종료 00:00 = 자정(24시)까지로 인식
    if (startDec >= endDec) return alert('종료 시간은 시작 시간보다 늦어야 합니다.');
    if (editingEvent) setEvents(events.map(e => e.id === editingEvent.id ? { ...e, title: formTitle, start: startDec, end: endDec, color: formColor, day: formDay } : e));
    else setEvents([...events, { id: Date.now(), title: formTitle || '새 일정', start: startDec, end: endDec, color: formColor, day: formDay }]);
    setIsModalOpen(false);
  };

  const deleteEvent = () => { if (editingEvent) setEvents(events.filter(e => e.id !== editingEvent.id)); setIsModalOpen(false); };

  // =================== [타이머 함수] ===================
  const toggleTimer = () => {
    if (!isTimerRunning) {
      if (!timerStartTime) setTimerStartTime(new Date());
      setIsTimerRunning(true);
    } else { setIsTimerRunning(false); }
  };

  const stopTimer = () => {
    // 뽀모도로 모드에선 집중 시간만 기록 (휴식 시간 제외)
    let duration = timerSeconds;
    let title = currentStudy || '기록 없는 시간';
    if (isPomodoro) {
      const focusElapsed = pomodoroPhase === 'focus' ? Math.max(0, 25 * 60 - pomodoroRemaining) : 0;
      duration = pomodoroCount * 25 * 60 + focusElapsed;
      if (!currentStudy) title = '뽀모도로 집중';
    }
    if (duration > 0) {
      const endTime = new Date();
      const newRecord = { id: Date.now(), title, startTime: timerStartTime || new Date(endTime.getTime() - duration * 1000), endTime: endTime, duration, color: timerColor };
      setStudyRecords([newRecord, ...studyRecords]);
    }
    setIsTimerRunning(false); setTimerSeconds(0); setTimerStartTime(null); setCurrentStudy('');
    setPomodoroPhase('focus'); setPomodoroRemaining(25 * 60); setPomodoroCount(0);
  };

  const formatTimerDisplay = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600); const m = Math.floor((totalSeconds % 3600) / 60); const s = totalSeconds % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatTimeHM = (date) => date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

  const openTimerModal = (record) => {
    setEditingRecord(record); setRecordFormTitle(record.title); setRecordFormStart(formatTimeHM(record.startTime)); setRecordFormEnd(formatTimeHM(record.endTime)); setRecordFormColor(record.color); setIsTimerModalOpen(true);
  };

  const saveRecord = () => {
    const [startH, startM] = recordFormStart.split(':').map(Number); const [endH, endM] = recordFormEnd.split(':').map(Number);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0);
    if (end <= start) end.setDate(end.getDate() + 1); // 자정을 넘기는 기록 허용 (예: 23:00~00:30)
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    setStudyRecords(studyRecords.map(r => r.id === editingRecord.id ? { ...r, title: recordFormTitle, startTime: start, endTime: end, duration, color: recordFormColor } : r));
    setIsTimerModalOpen(false);
  };

  const deleteRecord = () => { setStudyRecords(studyRecords.filter(r => r.id !== editingRecord.id)); setIsTimerModalOpen(false); };

  // 공통 헤더 렌더링 함수
  const renderHeader = (title, subtitle) => (
    <header className="sticky top-0 z-20 px-6 py-5 bg-white/80 dark:bg-purple-900/80 backdrop-blur-md border-b border-slate-100 dark:border-purple-800 flex justify-between items-center">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-bold tracking-tight whitespace-nowrap truncate">{title}</h1>
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <span className="text-sm text-slate-500 dark:text-purple-300 whitespace-nowrap truncate">{subtitle}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {/* 통계 버튼 (할 일 / 타이머 탭에서 보임) */}
        {(activeTab === 'todo' || activeTab === 'timer') && (
          <button onClick={() => setShowStats(true)} className="p-2.5 rounded-full bg-slate-100 dark:bg-purple-800 hover:bg-slate-200 dark:hover:bg-purple-700 transition">
            <BarChart2 size={20} />
          </button>
        )}
        {/* 알림 벨 (친구 요청/공지) */}
        <button onClick={openNotif} className="relative p-2.5 rounded-full bg-slate-100 dark:bg-purple-800 hover:bg-slate-200 dark:hover:bg-purple-700 transition">
          <Bell size={20} />
          {hasNewNotif && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-purple-800"></span>
          )}
        </button>
        <button onClick={() => setShowSettings(true)} className="relative p-2.5 rounded-full bg-slate-100 dark:bg-purple-800 hover:bg-slate-200 dark:hover:bg-purple-700 transition">
          <Settings size={20} />
          {updateInfo && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-purple-800"></span>
          )}
        </button>
        {activeTab === 'timetable' && (
          <button onClick={() => openModal()} className="p-2.5 rounded-full bg-slate-800 text-white dark:bg-purple-200 dark:text-purple-950 hover:opacity-80 transition shadow-md">
            <Plus size={20} />
          </button>
        )}
      </div>
    </header>
  );

  // =================== [통계 리포트 (2단계)] ===================
  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const todayRecords = studyRecords.filter(r => r.startTime && isSameDay(r.startTime, new Date()));
  const getTotalStudySeconds = () => todayRecords.reduce((acc, curr) => acc + curr.duration, 0);
  const getYesterdaySeconds = () => {
    const y = new Date(); y.setDate(y.getDate() - 1);
    return studyRecords.filter(r => r.startTime && isSameDay(r.startTime, y)).reduce((acc, curr) => acc + curr.duration, 0);
  };
  const getComparedToYesterday = () => {
    const diff = getTotalStudySeconds() - getYesterdaySeconds();
    if (diff > 0) return `어제보다 ${formatTimerDisplay(diff)} 늘었어요! 🔥`;
    if (diff < 0) return `어제보다 ${formatTimerDisplay(-diff)} 줄었어요.`;
    return '어제와 같아요.';
  };
  const getTodoCompletionRate = () => {
    if (todos.length === 0) return 0;
    return Math.round((todos.filter(t => t.completed).length / todos.length) * 100);
  };
  const handleShare = () => captureAndShare('stats-capture-area');

  // 과목별 파이 차트 데이터 가공 (오늘 기록만)
  const doughnutData = {
    labels: [...new Set(todayRecords.map(r => r.title))],
    datasets: [{
      data: [...new Set(todayRecords.map(r => r.title))].map(title =>
        todayRecords.filter(r => r.title === title).reduce((acc, r) => acc + r.duration, 0)
      ),
      backgroundColor: ['#818cf8', '#fb7185', '#2dd4bf', '#fbbf24', '#38bdf8', '#a78bfa'],
      borderWidth: 0,
    }],
  };

  // 주간 막대형 차트 데이터 (실제 기록 기반)
  const getWeekBarData = () => {
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // 월=0
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    return ['월', '화', '수', '목', '금', '토', '일'].map((_, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const secs = studyRecords.filter(r => r.startTime && isSameDay(r.startTime, d)).reduce((a, r) => a + r.duration, 0);
      return Math.round(secs / 60);
    });
  };
  const barData = {
    labels: ['월', '화', '수', '목', '금', '토', '일'],
    datasets: [{
      label: '집중 시간 (분)',
      data: getWeekBarData(),
      backgroundColor: '#818cf8',
      borderRadius: 8,
    }],
  };

  // 캡처/공유 (html2canvas 기반)
  const captureAndShare = (targetId) => {
    const el = document.getElementById(targetId);
    if (!el) { alert('캡처할 영역을 찾을 수 없습니다.'); return; }
    html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true }).then(canvas => {
      canvas.toBlob((blob) => {
        const file = new File([blob], 'today-record-stats.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: '🌤️ 모두의 과외', text: '오늘도 열심히 집중했어요! 💪' })
            .catch(() => { /* 사용자가 취소 */ });
        } else {
          const link = document.createElement('a');
          link.download = 'today-record-stats.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      });
    }).catch(err => { console.error(err); alert('캡처 중 오류가 발생했습니다.'); });
  };

  return {
    isDarkMode, setIsDarkMode, currentTime, setCurrentTime, activeTab, setActiveTab,
    selectedDay, setSelectedDay, showStats, setShowStats, showSettings, setShowSettings,
    showOnboarding, setShowOnboarding, onboardingFade, setOnboardingFade, showPolicy, setShowPolicy,
    showDday, setShowDday, serverUrlInput, setServerUrlInput, currentServerBase, setCurrentServerBase,
    saveServerUrl, showSplash, setShowSplash, splashFade, setSplashFade, videoRef,
    finishSplash, exitToast, setExitToast, themeColor, setThemeColor, THEME_COLORS,
    currentTheme, todos, setTodos, events, setEvents, studyRecords,
    setStudyRecords, dday, setDday, routines, setRoutines, goals,
    setGoals, diaries, setDiaries, diaryText, setDiaryText, diaryMood,
    setDiaryMood, editingDiary, setEditingDiary, weeklyPlans, setWeeklyPlans, newWeeklyGoal,
    setNewWeeklyGoal, weeklyReviewGood, setWeeklyReviewGood, weeklyReviewBad, setWeeklyReviewBad, weeklyReviewNext,
    setWeeklyReviewNext, editingReview, setEditingReview, requests, setRequests, requestsLoading,
    setRequestsLoading, requestsError, setRequestsError, newRequestTitle, setNewRequestTitle, newRequestBody,
    setNewRequestBody, newRequestCategory, setNewRequestCategory, rankings,
    setRankings, rankingLoading, setRankingLoading, rankingReady, setRankingReady, rankingFilter, setRankingFilter, calcMyScore,
    getScoreBreakdown, fetchRankings, submitMyScore, currentUser, setCurrentUser, authMode,
    setAuthMode, authId, setAuthId, authPassword, setAuthPassword, authPasswordConfirm,
    setAuthPasswordConfirm, authNickname, setAuthNickname, authError, setAuthError, authBusy,
    setAuthBusy, sessionToken, setSessionToken, refreshMyUser,
    friends, setFriends, friendRequests, setFriendRequests, friendCodeInput,
    setFriendCodeInput, announcements, setAnnouncements, showNotif, setShowNotif, announceTitle,
    setAnnounceTitle, announceBody, setAnnounceBody, lastSeenAnnounce, setLastSeenAnnounce, isAdmin,
    setIsAdmin, adminToken, setAdminToken, adminTokenInput, setAdminTokenInput, NICKNAME_PATTERN,
    verifyAdmin, logoutAdmin, handleSignup, handleLogin, handleLogout, fetchFriends,
    addFriend, acceptFriend, rejectFriend, removeFriend, fetchAnnouncements, addAnnouncement, deleteAnnouncement,
    adminMode, setAdminMode, fetchAdminStatus, activateAdminMode,
    updateInfo, showUpdate, setShowUpdate, checkForUpdate,
    fetchTutorStudents, registerTutorStudent, unregisterTutorStudent,
    openTutorBoard, saveTutorBoard, fetchMyBoard, syncStudyRecords,
    tutorStudents, tutorSummaries, tutorBoard, tutorRecords, tutorLoading, tutorError, setTutorError,
    tutorStudentCodeInput, setTutorStudentCodeInput, tutorView, setTutorView,
    hasNewNotif, openNotif, fetchRequests, newTodoText, setNewTodoText, newTodoCategory,
    setNewTodoCategory, isModalOpen, setIsModalOpen, editingEvent, setEditingEvent, formTitle,
    setFormTitle, formStart, setFormStart, formEnd, setFormEnd, formColor,
    setFormColor, formDay, setFormDay, isTimerRunning, setIsTimerRunning, timerSeconds, setTimerSeconds, currentStudy,
    setCurrentStudy, timerStartTime, setTimerStartTime, timerColor, setTimerColor, isPomodoro,
    setIsPomodoro, pomodoroPhase, setPomodoroPhase, pomodoroRemaining, setPomodoroRemaining, pomodoroCount,
    setPomodoroCount, isWhiteNoiseOn, setIsWhiteNoiseOn, noiseType, setNoiseType, isFocusMode,
    setIsFocusMode, audioRef, isTimerModalOpen, setIsTimerModalOpen, editingRecord, setEditingRecord,
    recordFormTitle, setRecordFormTitle, recordFormStart, setRecordFormStart, recordFormEnd, setRecordFormEnd,
    recordFormColor, setRecordFormColor, timerRef, playBeep, startPomodoro, togglePomodoroMode,
    formatPomodoro, noiseCtxRef, noiseNodesRef, stopNoise, startNoise, getDdayString,
    getDdayCountdown, editDday, todayKey, getMonthDays, heatColor, getMonthlySummary,
    newRoutineText, setNewRoutineText, newRoutineFreq, setNewRoutineFreq, addRoutine, toggleRoutine,
    deleteRoutine, getRoutineStreak, newGoalText, setNewGoalText, newGoalTarget, setNewGoalTarget,
    goalName, setGoalName, goalProgress, setGoalProgress, goalTarget, setGoalTarget,
    addGoal, incGoal, deleteGoal, MOODS, saveDiary, todayDiary,
    startEditDiary, weekKey, currentWeek, addWeeklyGoal, toggleWeeklyGoal, deleteWeeklyGoal,
    saveWeeklyReview, startEditReview, weekLabel, addRequest, toggleRequestVote, deleteRequest,
    exportData, importData, notifEnabled, setNotifEnabled, requestNotification, sendNotification,
    completeOnboarding, addTodo, toggleTodo, deleteTodo, currentHourDecimal, decimalToTime,
    timeToDecimal, openModal, saveEvent, deleteEvent, toggleTimer, stopTimer,
    formatTimerDisplay, formatTimeHM, openTimerModal, saveRecord, deleteRecord,
    renderHeader, isSameDay, todayRecords, getTotalStudySeconds, getYesterdaySeconds, getComparedToYesterday,
    getTodoCompletionRate, handleShare, doughnutData, getWeekBarData, barData, captureAndShare,
  };
}
