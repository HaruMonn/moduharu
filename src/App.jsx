import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Plus, MoreHorizontal, X, Trash2, Calendar, Timer as TimerIcon, CheckSquare, Play, Pause, Square, Check, Circle, BarChart2, Share2, Settings, Bell, Cloud, Upload, Download, Info, Apple, MessageSquare, Palette, UserPlus, LogOut, User, ShieldCheck, Server } from 'lucide-react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import html2canvas from 'html2canvas';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// =================== [백엔드 API 연동 설정] ===================
// 개발(브라우저): '/api' (Vite 프록시)
// APK 빌드: VITE_API_BASE 환경변수로 PC IP 지정 (예: http://10.60.30.134:3001/api)
const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE || '/api';
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

const INITIAL_EVENTS = [
  { id: 1, title: '수면 (루틴)', start: 0, end: 7, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { id: 2, title: '아침 조깅 & 샤워', start: 7.5, end: 8.5, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  { id: 3, title: '집중 업무 시간', start: 9.5, end: 12.5, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { id: 4, title: '독서 및 개인 정비', start: 20, end: 21.5, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
];

const COLOR_OPTIONS = [
  { label: '보라', value: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { label: '민트', value: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  { label: '하늘', value: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { label: '장미', value: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  { label: '노랑', value: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
];

const TIMER_COLORS = [
  'bg-indigo-400', 'bg-rose-400', 'bg-teal-400', 'bg-amber-400', 'bg-sky-400', 'bg-violet-400'
];

// =================== [부드러운 커스텀 드롭다운] ===================
// 네이티브 <select>의 딱딱한 네모난 기본 UI를 대신해 부드럽게 보이는 드롭다운.
function SoftSelect({ value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-600 dark:text-purple-200 outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all hover:bg-slate-100 dark:hover:bg-purple-800/60 shadow-sm"
      >
        <span className="truncate">{selected ? selected.label : '선택'}</span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-purple-900 border border-slate-100 dark:border-purple-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-bold transition-colors ${o.value === value ? 'bg-indigo-50 dark:bg-purple-800 text-indigo-600 dark:text-purple-200' : 'text-slate-600 dark:text-purple-300 hover:bg-slate-50 dark:hover:bg-purple-800/60'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('lifestyle_darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('todo'); 
  const [selectedDate, setSelectedDate] = useState(new Date()); // 시간표 선택 날짜 (주간 달력)
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
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
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
  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);

  const finishSplash = () => {
    setSplashFade(true);
    setTimeout(() => setShowSplash(false), 600);
  };

  useEffect(() => {
    // 영상이 재생되지 않을 경우를 대비한 안전장치: 6초 후 강제로 넘어감
    const fallback = setTimeout(finishSplash, 6000);
    return () => clearTimeout(fallback);
  }, []);

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
    const saved = localStorage.getItem('lifestyle_todos');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('lifestyle_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [studyRecords, setStudyRecords] = useState(() => {
    const saved = localStorage.getItem('lifestyle_studyRecords');
    if (saved) {
      return JSON.parse(saved).map(r => ({ ...r, startTime: new Date(r.startTime), endTime: new Date(r.endTime) }));
    }
    return [];
  });

  const [dday, setDday] = useState(() => {
    const saved = localStorage.getItem('lifestyle_dday');
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 100);
    return saved ? JSON.parse(saved) : { title: '앱 정식 출시', date: defaultDate.toISOString().split('T')[0] };
  });

  // =================== [신규 기능 5종 상태] ===================
  // 3. 루틴/습관 반복 스케줄
  const [routines, setRoutines] = useState(() => {
    const saved = localStorage.getItem('lifestyle_routines');
    return saved ? JSON.parse(saved) : [];
  });
  // 4. 장기 목표 (진행률 포함)
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('lifestyle_goals');
    return saved ? JSON.parse(saved) : [];
  });
  // 5. 감정/한 줄 일기 (key: 'YYYY-MM-DD')
  const [diaries, setDiaries] = useState(() => {
    const saved = localStorage.getItem('lifestyle_diaries');
    return saved ? JSON.parse(saved) : {};
  });
  const [diaryText, setDiaryText] = useState('');
  const [diaryMood, setDiaryMood] = useState('🙂');

  // =================== [주간 목표/회고 템플릿] ===================
  // 주간 목표: { weekKey, goals: [{id, text, done}], review: { good, bad, next } }
  const [weeklyPlans, setWeeklyPlans] = useState(() => {
    const saved = localStorage.getItem('lifestyle_weekly');
    return saved ? JSON.parse(saved) : {};
  });
  const [newWeeklyGoal, setNewWeeklyGoal] = useState('');
  const [weeklyReviewGood, setWeeklyReviewGood] = useState('');
  const [weeklyReviewBad, setWeeklyReviewBad] = useState('');
  const [weeklyReviewNext, setWeeklyReviewNext] = useState('');

  useEffect(() => { localStorage.setItem('lifestyle_weekly', JSON.stringify(weeklyPlans)); }, [weeklyPlans]);

  // =================== [요청(개발 도움 요청) 상태] ===================
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [newRequestTitle, setNewRequestTitle] = useState('');
  const [newRequestBody, setNewRequestBody] = useState('');
  const [newRequestCategory, setNewRequestCategory] = useState('기능 건의');
  const [requestVoteId, setRequestVoteId] = useState(null);

  // =================== [친구와 경쟁 (랭킹) 상태] ===================
  const [rankings, setRankings] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingReady, setRankingReady] = useState(false); // 랭킹 빈 ID가 설정되었는지

  // 점수 계산: 완료한 할 일 1개 = 10점, 집중 1분 = 1점
  const calcMyScore = () => {
    const todoScore = todos.filter(t => t.completed).length * 10;
    const focusMin = Math.round(studyRecords.reduce((a, r) => a + r.duration, 0) / 60);
    return todoScore + focusMin;
  };
  // 점수 상세 내역 (기준 설명용)
  const getScoreBreakdown = () => {
    const doneTodos = todos.filter(t => t.completed).length;
    const focusMin = Math.round(studyRecords.reduce((a, r) => a + r.duration, 0) / 60);
    return { doneTodos, todoScore: doneTodos * 10, focusMin };
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

  useEffect(() => { fetchRankings(); }, []);

  // 내 점수 업로드 (닉네임#코드 기반)
  const submitMyScore = async () => {
    if (!currentUser) { alert('로그인이 필요해요.'); return; }
    const nick = `${currentUser.nickname}#${currentUser.code}`;
    const myScore = calcMyScore();
    try {
      const res = await fetch(`${API_BASE}/rankings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick, score: myScore })
      });
      if (!res.ok) throw new Error('fail');
      const data = await res.json();
      setRankings([...(data.scores || [])].sort((a, b) => b.score - a.score));
      alert(`✨ ${nick}님, 점수 ${myScore}점 등록 완료!`);
    } catch (e) {
      console.error(e);
      alert('점수 업로드에 실패했어요. 백엔드 서버가 켜져 있는지 확인해주세요.');
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
  const [friends, setFriends] = useState([]); // {code, nickname}[]
  const [friendRequests, setFriendRequests] = useState([]); // 받은 친구 요청 {fromCode, fromNickname, at}[]
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [announcements, setAnnouncements] = useState([]); // 공지 {id, title, body, createdAt}[]
  const [showNotif, setShowNotif] = useState(false); // 알림 패널
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [lastSeenAnnounce, setLastSeenAnnounce] = useState(() => Number(localStorage.getItem('lifestyle_lastAnnounce') || 0));

  // =================== [관리자 상태] ===================
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('lifestyle_admin') === 'true');
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('lifestyle_admin_token') || '');
  const [adminTokenInput, setAdminTokenInput] = useState('');

  // 닉네임 허용 문자: 영어 + 한글 + 한자 + 히라가나 + 특수문자
  const NICKNAME_PATTERN = /^[A-Za-z가-힣一-龯ぁ-ん!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~` ]+$/;

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
      setAuthBusy(false);
      setAuthId(''); setAuthPassword('');
    } catch (err) {
      console.error(err);
      setAuthError('서버에 연결할 수 없어요.');
      setAuthBusy(false);
    }
  };

  // ---- 로그아웃 ----
  const handleLogout = () => {
    localStorage.removeItem('lifestyle_user');
    setCurrentUser(null);
  };

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

  useEffect(() => { fetchFriends(); }, [currentUser]);

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

  // ---- 공지 불러오기 ----
  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_BASE}/announcements`);
      if (!res.ok) return;
      const data = await res.json();
      setAnnouncements(data.announcements || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

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
  const [noiseType, setNoiseType] = useState('rain'); // rain | cafe | forest | waves
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
    } catch (e) { /* 오디오 미지원 시 조용히 무시 */ }
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
            return 5 * 60;
          } else {
            setPomodoroPhase('focus');
            return 25 * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isPomodoro, isTimerRunning, pomodoroPhase]);

  const startPomodoro = () => {
    if (!isTimerRunning) {
      const now = new Date();
      if (!timerStartTime) setTimerStartTime(now);
      if (!currentStudy && pomodoroPhase === 'focus') setCurrentStudy('뽀모도로 집중');
      setIsTimerRunning(true);
      setIsPomodoro(false); // 실제 기록 타이머로만 동작
      // 뽀모도로는 별도 카운트다운으로만 표시
      setIsPomodoro(true);
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
      try { noiseCtxRef.current.close(); } catch (e) {}
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
    setDiaries({ ...diaries, [k]: { text: diaryText, mood: diaryMood, at: new Date().toISOString() } });
    setDiaryText('');
  };
  const todayDiary = diaries[todayKey()];

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
          if (data.events) setEvents(data.events);
          if (data.studyRecords) setStudyRecords(data.studyRecords.map(r => ({ ...r, startTime: new Date(r.startTime), endTime: new Date(r.endTime) })));
          if (data.dday) setDday(data.dday);
          alert('백업 데이터를 성공적으로 불러왔습니다! ✅');
        } catch (err) {
          alert('올바른 백업 파일이 아닙니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // =================== [A2. 푸시 알림] ===================
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('lifestyle_notif_enabled') === 'true');

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
        new Notification('🌤️ 모두의 하루', { body: '알림이 활성화되었습니다!' });
      } else if (perm === 'denied') {
        // 사용자가 거부한 경우, 브라우저 설정 안내
        alert('알림이 브라우저에서 차단되어 있습니다.\n브라우저 주소창 왼쪽의 자물쇠(🔒) 아이콘을 눌러 \"알림\" 권한을 허용으로 바꿔주세요.');
      }
    } catch (e) {
      alert('알림 권한을 요청할 수 없습니다. 브라우저 설정에서 직접 허용해 주세요.');
    }
  };

  const sendNotification = (title, body) => {
    if (notifEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  useEffect(() => {
    if (localStorage.getItem('lifestyle_notif_enabled') === 'true' && 'Notification' in window && Notification.permission === 'granted') {
      setNotifEnabled(true);
    }
  }, []);

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

  const toggleTodo = (id) => setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
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
      setEditingEvent(event); setFormTitle(event.title); setFormStart(decimalToTime(event.start)); setFormEnd(decimalToTime(event.end)); setFormColor(event.color);
    } else {
      setEditingEvent(null); setFormTitle(''); setFormStart('09:00'); setFormEnd('10:00'); setFormColor(COLOR_OPTIONS[0].value);
    }
    setIsModalOpen(true);
  };

  const saveEvent = () => {
    const startDec = timeToDecimal(formStart); const endDec = timeToDecimal(formEnd);
    if (startDec >= endDec) return alert('종료 시간은 시작 시간보다 늦어야 합니다.');
    if (editingEvent) setEvents(events.map(e => e.id === editingEvent.id ? { ...e, title: formTitle, start: startDec, end: endDec, color: formColor } : e));
    else setEvents([...events, { id: Date.now(), title: formTitle || '새 일정', start: startDec, end: endDec, color: formColor }]);
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
    if (timerSeconds > 0) {
      const endTime = new Date();
      const newRecord = { id: Date.now(), title: currentStudy || '기록 없는 시간', startTime: timerStartTime || new Date(endTime.getTime() - timerSeconds * 1000), endTime: endTime, duration: timerSeconds, color: timerColor };
      setStudyRecords([newRecord, ...studyRecords]);
    }
    setIsTimerRunning(false); setTimerSeconds(0); setTimerStartTime(null); setCurrentStudy('');
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
    if (end <= start) return alert('종료 시간은 시작 시간보다 늦어야 합니다.');
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    setStudyRecords(studyRecords.map(r => r.id === editingRecord.id ? { ...r, title: recordFormTitle, startTime: start, endTime: end, duration, color: recordFormColor } : r));
    setIsTimerModalOpen(false);
  };

  const deleteRecord = () => { setStudyRecords(studyRecords.filter(r => r.id !== editingRecord.id)); setIsTimerModalOpen(false); };

  const renderSlotFill = (hour, minuteBlock) => {
    const now = currentTime;
    const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minuteBlock * 10, 0).getTime();
    const slotEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, (minuteBlock + 1) * 10, 0).getTime();

    const record = studyRecords.find(r => r.startTime.getTime() < slotEnd && r.endTime.getTime() > slotStart);
    if (record) {
       const overlapStart = Math.max(record.startTime.getTime(), slotStart);
       const overlapEnd = Math.min(record.endTime.getTime(), slotEnd);
       const fillPercent = Math.min(100, ((overlapEnd - overlapStart) / (10 * 60 * 1000)) * 100);
       const marginLeft = Math.max(0, ((overlapStart - slotStart) / (10 * 60 * 1000)) * 100);
       return <div className={`h-full ${record.color}`} style={{ width: `${fillPercent}%`, marginLeft: `${marginLeft}%` }}></div>;
    }

    if (timerStartTime) {
       const rStart = timerStartTime.getTime();
       const rEnd = isTimerRunning ? new Date().getTime() : rStart + (timerSeconds * 1000);
       if (rStart < slotEnd && rEnd > slotStart) {
          const overlapStart = Math.max(rStart, slotStart);
          const overlapEnd = Math.min(rEnd, slotEnd);
          const fillPercent = Math.min(100, ((overlapEnd - overlapStart) / (10 * 60 * 1000)) * 100);
          const marginLeft = Math.max(0, ((overlapStart - slotStart) / (10 * 60 * 1000)) * 100);
          return <div className={`h-full ${timerColor} ${isTimerRunning ? 'opacity-90 animate-pulse' : 'opacity-100'}`} style={{ width: `${fillPercent}%`, marginLeft: `${marginLeft}%`, transition: 'width 1s linear' }}></div>;
       }
    }
    return null;
  };

  // 공통 헤더 렌더링 함수
  const renderHeader = (title, subtitle) => (
    <header className="sticky top-0 z-20 px-6 py-5 bg-white/80 dark:bg-purple-900/80 backdrop-blur-md border-b border-slate-100 dark:border-purple-800 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm text-slate-500 dark:text-purple-300">{subtitle}</span>
        </div>
      </div>
      <div className="flex gap-3">
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
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-full bg-slate-100 dark:bg-purple-800 hover:bg-slate-200 dark:hover:bg-purple-700 transition">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-full bg-slate-100 dark:bg-purple-800 hover:bg-slate-200 dark:hover:bg-purple-700 transition">
          <Settings size={20} />
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
          navigator.share({ files: [file], title: '🌤️ 모두의 하루', text: '오늘도 열심히 집중했어요! 💪' })
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-purple-950 text-slate-800 dark:text-purple-50 transition-colors duration-300">
      <div className="max-w-md mx-auto h-screen bg-white dark:bg-purple-900 shadow-sm relative overflow-hidden flex flex-col pb-[72px]">

        {/* ======================= 스플래시 화면 (앱 시작) ======================= */}
        {showSplash && (
          <div className={`absolute inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black transition-opacity duration-500 ease-out ${splashFade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {/* 오프닝 영상 (하양님이 보내주신 인트로) */}
            <video
              src="/opening.mp4"
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={finishSplash}
            />
          </div>
        )}

        {/* ======================= 로그인/가입 화면 ======================= */}
        {!currentUser && (
          <div className="absolute inset-0 z-[95] flex flex-col justify-center bg-slate-50 dark:bg-[#09090b] p-6 overflow-y-auto">
            <div className="flex flex-col items-center mb-8">
              <div className="text-5xl mb-3">🌤️</div>
              <h1 className="text-3xl font-black tracking-tight">모두의 하루</h1>
              <p className="text-slate-500 dark:text-purple-300 text-sm font-bold mt-1">하루를 알차게 기록하고 성장해요</p>
            </div>

            {/* 로그인/가입 토글 */}
            <div className="flex gap-2 bg-white dark:bg-[#18181b] rounded-2xl p-1.5 border border-slate-100 dark:border-[#27272a] mb-6">
              <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'login' ? 'bg-indigo-500 text-white shadow' : 'text-slate-500 dark:text-purple-300'}`}>로그인</button>
              <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'signup' ? 'bg-indigo-500 text-white shadow' : 'text-slate-500 dark:text-purple-300'}`}>가입</button>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">아이디</label>
                  <input type="text" value={authId} onChange={(e) => setAuthId(e.target.value)} placeholder="아이디를 입력하세요" autoComplete="username" className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">비밀번호</label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="비밀번호를 입력하세요" autoComplete="current-password" className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                {authError && <p className="text-xs font-bold text-rose-500">{authError}</p>}
                <button type="submit" disabled={authBusy} className="w-full bg-indigo-500 text-white rounded-xl font-bold py-3.5 hover:opacity-90 transition shadow-md disabled:opacity-50 mt-1">
                  {authBusy ? '로그인 중...' : '로그인'}
                </button>
                <p className="text-center text-[11px] text-slate-400 dark:text-purple-400 font-bold">아이디/비밀번호 찾기는 곧 추가될 예정이에요</p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">아이디 <span className="text-slate-400">(영어·숫자 4자 이상)</span></label>
                  <input type="text" value={authId} onChange={(e) => setAuthId(e.target.value)} placeholder="아이디를 입력하세요" autoComplete="username" className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">닉네임 <span className="text-slate-400">(영어·한글·한자·히라가나·특수문자)</span></label>
                  <input type="text" value={authNickname} onChange={(e) => setAuthNickname(e.target.value)} placeholder="예: 하루몽, はる, 太郎" maxLength={12} className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                  <p className="text-[10px] text-slate-400 dark:text-purple-400 font-bold mt-1">가입하면 닉네임#0000 형식의 고유 코드가 자동 부여돼요</p>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">비밀번호 <span className="text-slate-400">(6자 이상)</span></label>
                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="비밀번호를 입력하세요" autoComplete="new-password" className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1.5 text-slate-500 dark:text-purple-300">비밀번호 확인</label>
                  <input type="password" value={authPasswordConfirm} onChange={(e) => setAuthPasswordConfirm(e.target.value)} placeholder="비밀번호를 다시 입력하세요" autoComplete="new-password" className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
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
                    <input type="text" value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)} placeholder="오늘 어떤 일을 완료할까요?" className="flex-1 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
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
                        <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all shrink-0"><Trash2 size={18} /></button>
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
                      <button onClick={() => deleteTodo(todo.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all shrink-0"><Trash2 size={18} /></button>
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
            {renderHeader('오늘의 일상', `${selectedDate.getMonth()+1}월 ${selectedDate.getDate()}일`)}
            {/* 주간 달력 네비게이션 (7일 선택) */}
            <div className="px-4 pt-3 pb-1 flex gap-1 bg-white dark:bg-purple-900">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(selectedDate);
                d.setDate(selectedDate.getDate() - selectedDate.getDay() + i);
                const isSel = d.toDateString() === selectedDate.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                const dow = ['일','월','화','수','목','금','토'][d.getDay()];
                return (
                  <button key={i} onClick={() => setSelectedDate(d)} className={`flex-1 flex flex-col items-center py-2 rounded-xl transition ${isSel ? 'bg-indigo-500 text-white shadow' : 'hover:bg-slate-100 dark:hover:bg-purple-800'}`}>
                    <span className={`text-[10px] font-bold ${isSel ? 'text-indigo-100' : 'text-slate-400 dark:text-purple-300'}`}>{dow}</span>
                    <span className={`text-sm font-black ${isSel ? '' : (isToday ? 'text-indigo-500 dark:text-purple-300' : 'text-slate-700 dark:text-purple-100')}`}>{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative px-4 py-6 flex-1 overflow-y-auto">
              <div className="absolute inset-0 flex">
                <div className="w-16"></div>
                <div className="flex-1 border-l border-slate-100 dark:border-purple-800 relative">
                  {Array.from({ length: 24 }).map((_, i) => ( <div key={i} className="h-16 border-b border-slate-100 dark:border-purple-800/50 w-full" /> ))}
                </div>
              </div>
              <div className="relative h-[1536px]">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="absolute w-full flex items-start" style={{ top: `${i * 4}rem`, marginTop: '-0.6rem' }}>
                    <span className="text-xs font-bold text-slate-400 dark:text-purple-300 w-12 text-right pr-3">{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</span>
                  </div>
                ))}
                <div className="absolute top-0 left-16 right-2 bottom-0">
                  {events.map((event) => (
                    <div key={event.id} onClick={() => openModal(event)} className={`absolute left-0 right-0 p-3 rounded-2xl backdrop-blur-sm transition-all hover:scale-[1.02] shadow-sm cursor-pointer border border-white/20 dark:border-black/20 ${event.color}`} style={{ top: `${event.start * 4}rem`, height: `${(event.end - event.start) * 4}rem` }}>
                      <h3 className="font-bold text-[14px] leading-tight overflow-hidden text-ellipsis">{event.title}</h3>
                    </div>
                  ))}
                  <div className="absolute left-0 right-0 z-10 flex items-center -ml-2 transition-all duration-1000" style={{ top: `${currentHourDecimal * 4}rem` }}>
                    <div className="w-2 h-2 rounded-full bg-red-500"></div><div className="h-0.5 bg-red-500/50 flex-1 shadow-sm"></div>
                  </div>
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
                {(!isPomodoro && !isTimerRunning && timerSeconds === 0) && ( <div className="text-sm font-bold text-slate-400 dark:text-purple-300/70 mb-4 bg-slate-50 dark:bg-purple-800/30 px-4 py-2 rounded-full"> 측정할 카테고리와 색상을 골라주세요 👇 </div> )}
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
                  {[{k:'rain',l:'빗소리'},{k:'cafe',l:'카페'},{k:'forest',l:'숲'},{k:'waves',l:'파도'}].map(opt => (
                    <button key={opt.k} onClick={() => { setNoiseType(opt.k); setIsWhiteNoiseOn(true); }} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${noiseType === opt.k && isWhiteNoiseOn ? 'bg-indigo-500 text-white shadow' : 'bg-slate-100 dark:bg-purple-800 text-slate-500 dark:text-purple-300'}`}>{opt.l}</button>
                  ))}
                </div>
                <button onClick={() => setIsWhiteNoiseOn(!isWhiteNoiseOn)} className={`w-full py-3 rounded-xl font-bold text-sm transition ${isWhiteNoiseOn ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 shadow'}`}>
                  {isWhiteNoiseOn ? '⏹ 소리 끄기' : '▶ 소리 켜기'}
                </button>
              </div>

              {/* 오늘의 기록 + 타임라인 상세 나란히 배치 (세로로 길게) */}
              <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <div className="flex gap-4 items-stretch">
                  {/* 왼쪽: 오늘의 기록 (시간 블록) */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="font-bold text-sm mb-3 text-slate-700 dark:text-purple-100 flex items-center gap-1.5"><TimerIcon size={16}/> 오늘의 기록</h3>
                    <div className="overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div className="flex gap-[6px] min-w-max px-1">
                        {Array.from({ length: 24 }).map((_, h) => (
                          <div key={h} className="flex flex-col gap-1 items-center w-[22px]">
                            <span className="text-[11px] text-slate-400 dark:text-purple-300/70 font-bold mb-1 tracking-tighter">{h}</span>
                            {Array.from({ length: 6 }).map((_, m) => ( <div key={m} className="w-full h-[14px] rounded-[4px] relative overflow-hidden bg-slate-100 dark:bg-purple-800/50 shadow-sm">{renderSlotFill(h, m)}</div> ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 세로 구분선 */}
                  <div className="w-px bg-slate-100 dark:bg-purple-800 self-stretch shrink-0"></div>

                  {/* 오른쪽: 타임라인 상세 (세로 긴 목록) */}
                  <div className="flex-1 min-w-0 flex flex-col">
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
                    <input type="text" value={newRoutineText} onChange={(e) => setNewRoutineText(e.target.value)} placeholder="예: 아침 러닝 30분" className="flex-1 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
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
                    <input type="number" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} min="1" className="flex-1 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="목표량" />
                    <button type="submit" disabled={!newGoalText.trim()} className="flex-1 bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-2.5 text-sm hover:opacity-90 transition shadow disabled:opacity-50">목표 추가</button>
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
                {todayDiary ? (
                  <div className="bg-slate-50 dark:bg-purple-950 rounded-xl p-4 border border-slate-100 dark:border-purple-800">
                    <div className="text-3xl mb-2">{todayDiary.mood}</div>
                    <p className="text-sm text-slate-700 dark:text-purple-100 font-bold whitespace-pre-wrap">{todayDiary.text}</p>
                  </div>
                ) : (
                  <form onSubmit={saveDiary} className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      {MOODS.map(m => (
                        <button key={m} type="button" onClick={() => setDiaryMood(m)} className={`text-2xl transition-transform ${diaryMood === m ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}>{m}</button>
                      ))}
                    </div>
                    <textarea value={diaryText} onChange={(e) => setDiaryText(e.target.value)} placeholder="오늘 하루는 어땠나요? 한 줄로 남겨보세요." rows={3} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold resize-none" />
                    <button type="submit" disabled={!diaryText.trim()} className="w-full bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-3 hover:opacity-90 transition shadow disabled:opacity-50">기록하기</button>
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
                    <input type="text" value={newWeeklyGoal} onChange={(e) => setNewWeeklyGoal(e.target.value)} placeholder="예: 운동 3회, 책 1권 읽기" className="flex-1 bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
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
                  {currentWeek.review && (currentWeek.review.good || currentWeek.review.bad || currentWeek.review.next) ? (
                    <div className="space-y-2">
                      {currentWeek.review.good && <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-sm"><span className="font-bold text-emerald-600 dark:text-emerald-300">👍 잘한 점</span><p className="text-slate-700 dark:text-purple-100 font-bold whitespace-pre-wrap">{currentWeek.review.good}</p></div>}
                      {currentWeek.review.bad && <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-sm"><span className="font-bold text-amber-600 dark:text-amber-300">😅 아쉬운 점</span><p className="text-slate-700 dark:text-purple-100 font-bold whitespace-pre-wrap">{currentWeek.review.bad}</p></div>}
                      {currentWeek.review.next && <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-3 text-sm"><span className="font-bold text-sky-600 dark:text-sky-300">🚀 다음 주 다짐</span><p className="text-slate-700 dark:text-purple-100 font-bold whitespace-pre-wrap">{currentWeek.review.next}</p></div>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input type="text" value={weeklyReviewGood} onChange={(e) => setWeeklyReviewGood(e.target.value)} placeholder="👍 잘한 점" className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <input type="text" value={weeklyReviewBad} onChange={(e) => setWeeklyReviewBad(e.target.value)} placeholder="😅 아쉬운 점" className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <input type="text" value={weeklyReviewNext} onChange={(e) => setWeeklyReviewNext(e.target.value)} placeholder="🚀 다음 주 다짐" className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <button onClick={saveWeeklyReview} className="w-full bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-2.5 text-sm hover:opacity-90 transition shadow">회고 저장</button>
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
                  <textarea value={newRequestBody} onChange={(e) => setNewRequestBody(e.target.value)} placeholder="어떤 기능이 필요하신가요? 자세히 적어주실수록 더 잘 반영할 수 있어요." rows={3} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold resize-none" />
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

              {/* ===== 친구와 경쟁 (랭킹) ===== */}
              <div className="shrink-0 mb-4 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-slate-700 dark:text-purple-100 flex items-center gap-1.5">👥 친구와 경쟁</h3>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-purple-300">내 점수 {calcMyScore()}점</span>
                </div>

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
                    {/* 내 프로필 + 점수 등록 */}
                    <div className="flex items-center gap-2 mb-3 bg-slate-50 dark:bg-purple-950 rounded-xl p-3 border border-slate-100 dark:border-purple-800">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-slate-700 dark:text-purple-100 truncate">{currentUser.nickname}<span className="text-slate-400 font-bold">#{currentUser.code}</span></div>
                        <div className="text-[10px] text-slate-400 dark:text-purple-300/70 font-bold">내 고유 코드</div>
                      </div>
                      <button onClick={submitMyScore} className="shrink-0 px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-sm shadow hover:opacity-90 transition">점수 등록 🏆</button>
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
                          <span key={f.code} className="text-[11px] font-bold bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300 px-2.5 py-1 rounded-full border border-sky-100 dark:border-sky-800">{f.nickname}<span className="text-sky-400">#{f.code}</span></span>
                        ))}
                      </div>
                    )}

                    {/* 랭킹 보드 */}
                    <div className="space-y-2">
                      {rankingLoading ? (
                        <div className="text-center text-slate-400 dark:text-purple-300/50 py-6 text-sm">순위 불러오는 중... ⏳</div>
                      ) : rankings.length === 0 ? (
                        <div className="text-center text-slate-400 dark:text-purple-300/50 py-6 text-sm">아직 등록된 점수가 없어요.<br/>첫 번째로 도전해보세요! 💪</div>
                      ) : (
                        rankings.slice(0, 20).map((r, i) => (
                          <div key={r.nick + i} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-slate-50 dark:bg-purple-950 border border-slate-100 dark:border-purple-800'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-200 dark:bg-purple-800 text-slate-500 dark:text-purple-300'}`}>
                              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                            </div>
                            <span className={`flex-1 font-bold text-sm truncate ${r.nick === `${currentUser.nickname}#${currentUser.code}` ? 'text-indigo-500 dark:text-purple-300' : 'text-slate-700 dark:text-purple-100'}`}>{r.nick}{r.nick === `${currentUser.nickname}#${currentUser.code}` ? ' (나)' : ''}</span>
                            <span className="font-mono font-black text-sm text-slate-600 dark:text-purple-200">{r.score}점</span>
                          </div>
                        ))
                      )}
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

                  <div className="text-center mt-4 text-[10px] font-bold text-indigo-200/50">모두의 하루 · 함께 성장해요 🦊</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= 하단 네비게이션 ======================= */}
        <nav className="absolute bottom-0 w-full h-[72px] bg-white/90 dark:bg-purple-900/90 backdrop-blur-md border-t border-slate-100 dark:border-purple-800 flex items-center justify-around px-2 z-40 pb-safe">
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

          <button onClick={() => setActiveTab('requests')} className={`flex flex-1 flex-col items-center justify-center h-full transition-all ${activeTab === 'requests' ? 'text-slate-800 dark:text-purple-100' : 'text-slate-400 dark:text-purple-400 hover:text-slate-600 dark:hover:text-purple-300'}`}>
            <MessageSquare size={24} className={activeTab === 'requests' ? 'drop-shadow-sm scale-110 mb-1' : 'mb-1 transition-transform'} />
            <span className="text-[10px] font-bold">요청</span>
          </button>
        </nav>

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

                {/* 서버 주소 설정 */}
                <div className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-4 border border-slate-100 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-700 dark:text-purple-200"><Server size={18} className="text-sky-500"/> 서버 주소</div>
                  <p className="text-xs text-slate-500 dark:text-purple-300/70 mb-3 font-bold">PC의 IP를 입력하세요. 와이파이/핫스팟이 바뀌면 여기서 수정하면 돼요.</p>
                  <div className="flex gap-2">
                    <input type="text" value={serverUrlInput} onChange={(e) => setServerUrlInput(e.target.value)} placeholder="예: 10.60.30.134:3001" className="flex-1 min-w-0 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                    <button onClick={saveServerUrl} className="shrink-0 px-3 py-2 rounded-xl bg-sky-500 text-white text-sm font-bold hover:opacity-90 transition">저장</button>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-purple-400 font-bold mt-2">현재: {currentServerBase}</p>
                </div>

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
                      <input type="password" value={adminTokenInput} onChange={(e) => setAdminTokenInput(e.target.value)} placeholder="관리자 토큰" className="flex-1 min-w-0 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" />
                      <button onClick={verifyAdmin} className="shrink-0 px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 text-sm font-bold hover:opacity-90 transition">인증</button>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-purple-400 font-bold mt-2"></p>
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
                        { label: '초', value: getDdayCountdown().secs },
                      ].map((u, i) => (
                        <div key={u.label} className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-900 dark:bg-purple-800 rounded-2xl flex items-center justify-center text-white dark:text-purple-100 text-2xl font-black font-mono tabular-nums shadow-lg">
                            {String(u.value).padStart(2, '0')}
                          </div>
                          <span className="text-[11px] font-bold text-slate-400 dark:text-purple-300 mt-2">{u.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-purple-300/70 font-bold mt-6">매분 갱신되고 있어요 ⏱️</p>
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
                  <p>본 앱은 회원가입이나 개인정보 수집을 하지 않습니다. 모든 데이터(할 일, 시간표, 타이머 기록)는 사용자의 기기 내부(브라우저 로컬 스토리지)에만 저장되며, 외부 서버로 전송되지 않습니다.</p>
                </section>
                <section>
                  <h3 className="font-black text-slate-800 dark:text-purple-100 mb-1">2. 데이터 보관 및 삭제</h3>
                  <p>사용자가 앱을 삭제하거나 브라우저 데이터를 삭제하면 모든 기록이 함께 삭제됩니다. 백업 기능을 통해 언제든지 데이터를 내보내거나 복원할 수 있습니다.</p>
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
            <h1 className="text-3xl font-black mb-2">모두의 하루</h1>
            <p className="text-slate-500 dark:text-purple-300 mb-8 text-center font-bold">하루를 알차게 기록하고<br/>성장하는 나를 만나보세요! 🦊</p>
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
                <div><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">일정 이름</label><input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="예: 독서, 코딩, 운동..." className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                <div className="flex gap-4">
                  <div className="flex-1"><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">시작 시간</label><input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                  <div className="flex-1"><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">종료 시간</label><input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-purple-950 border border-slate-200 dark:border-purple-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition font-bold" /></div>
                </div>
                <div><label className="block text-sm font-bold mb-2 text-slate-500 dark:text-purple-300">테마 색상</label><div className="flex gap-3">{COLOR_OPTIONS.map(opt => ( <button key={opt.value} onClick={() => setFormColor(opt.value)} className={`w-10 h-10 rounded-full transition-all duration-200 ${opt.value.split(' ')[0]} ${formColor === opt.value ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-purple-400 scale-110 shadow-md' : 'opacity-80 hover:opacity-100 hover:scale-105'}`} /> ))}</div></div>
              </div>
              <div className="mt-8 flex gap-3"><button onClick={deleteEvent} className="p-4 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition"><Trash2 size={20} /></button><button onClick={saveEvent} className="flex-1 bg-slate-900 text-white dark:bg-purple-200 dark:text-purple-950 rounded-xl font-bold py-4 hover:opacity-90 transition shadow-md">저장하기</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}