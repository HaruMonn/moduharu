import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';

// =================== 1:1 채팅 (선생님↔학생) ===================
// 스레드 목록은 서버 /tutor/chat/threads에서만 가져옴 — 학생은 선생님 목록만,
// 선생님은 학생 목록만 받으므로, 여기서 다른 학생을 골라 채팅을 시작할 수 없음.

function formatChatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function ChatTab({
  currentUser,
  chatThreads, chatUnread, chatLoading, chatError, setChatError,
  fetchChatThreads, fetchChatThread, sendChatMessage, markChatSeen,
  chatOpenCode, setChatOpenCode,
}) {
  const [openNickname, setOpenNickname] = useState('');
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const isTeacher = currentUser?.role === 'teacher';
  const openCode = chatOpenCode;

  // 채팅 탭 진입 시 스레드 목록 불러오기
  useEffect(() => {
    if (!currentUser) return;
    fetchChatThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // 열린 스레드 60초마다 새로고침 (숙제·공지 폴링과 같은 방식, 푸시 알림 없음)
  // 탭을 나갔다 돌아와도 열린 스레드가 유지되므로, 마운트 시에도 즉시 불러옴
  useEffect(() => {
    if (!openCode) return;
    const load = async () => {
      try {
        const data = await fetchChatThread(openCode);
        setMessages(data.messages || []);
        const last = (data.messages || [])[(data.messages || []).length - 1];
        if (last) markChatSeen(openCode, last.id);
      } catch { /* 폴링 실패는 조용히 무시 */ }
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCode]);

  // 메시지 목록이 바뀌면 맨 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const openThread = async (otherCode, otherNickname) => {
    setChatError('');
    setChatOpenCode(otherCode);
    setOpenNickname(otherNickname);
    setThreadLoading(true);
    try {
      const data = await fetchChatThread(otherCode);
      setMessages(data.messages || []);
      const last = (data.messages || [])[(data.messages || []).length - 1];
      if (last) markChatSeen(otherCode, last.id);
    } catch (e) {
      setChatError(e.message || '메시지를 불러오지 못했어요.');
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  };

  const closeThread = () => {
    setChatOpenCode(null);
    setMessages([]);
    fetchChatThreads();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !openCode || sending) return;
    setSending(true);
    setChatError('');
    try {
      const next = await sendChatMessage(openCode, text);
      setMessages(next);
      setInput('');
      const last = next[next.length - 1];
      if (last) markChatSeen(openCode, last.id);
    } catch (err) {
      setChatError(err.message || '전송에 실패했어요.');
    } finally {
      setSending(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
        <div className="text-center text-slate-400 dark:text-purple-300/70 py-16 text-sm font-bold">
          <div className="text-3xl mb-2">🔒</div>
          로그인하면 채팅을 쓸 수 있어요!
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
      {openCode ? (
        <>
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <button onClick={closeThread} className="flex items-center gap-1 text-sm font-bold text-slate-500 dark:text-purple-300">
              <ChevronLeft size={16} /> 목록으로
            </button>
            <h2 className="font-black text-lg text-slate-700 dark:text-purple-100 truncate">{openNickname}</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-3 flex flex-col gap-2">
            {threadLoading && messages.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-10">불러오는 중...</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-10">아직 메시지가 없어요. 첫 메시지를 보내보세요.</p>
            ) : (
              messages.map((m) => {
                const mine = m.fromCode === currentUser.code;
                return (
                  <div key={m.id} className={`flex flex-col max-w-[80%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm font-bold break-words ${mine ? 'bg-indigo-500 text-white rounded-br-md' : 'bg-white dark:bg-purple-900 text-slate-700 dark:text-purple-100 border border-slate-100 dark:border-purple-800 rounded-bl-md'}`}>
                      {m.text}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-1">{formatChatTime(m.createdAt)}</span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 px-5 pb-5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="메시지 입력"
              className="flex-1 bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-800 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            />
            <button type="submit" disabled={sending || !input.trim()} className="shrink-0 w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40">
              <Send size={18} />
            </button>
          </form>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <h2 className="font-black text-xl text-slate-700 dark:text-purple-100">💬 채팅</h2>
          <p className="text-xs font-bold text-slate-400 -mt-2">
            {isTeacher ? '학생과 1:1로 대화해요.' : '선생님과 1:1로 대화해요.'}
          </p>
          <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
            {chatLoading && chatThreads.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-3">불러오는 중...</p>
            ) : chatThreads.length === 0 ? (
              <p className="text-xs text-slate-400 font-bold text-center py-3">
                {isTeacher ? '등록된 학생이 없어요.' : '선생님이 아직 없어요.'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {chatThreads.map((t) => (
                  <button
                    key={t.otherCode}
                    onClick={() => openThread(t.otherCode, t.otherNickname)}
                    className="flex items-center gap-3 bg-slate-50 dark:bg-purple-950/60 rounded-2xl px-3 py-3 text-left hover:opacity-90"
                  >
                    <span className="relative shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-300">
                      {t.otherNickname ? t.otherNickname.slice(0, 1) : '?'}
                      {chatUnread[t.otherCode] && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-purple-950" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-slate-700 dark:text-purple-100 truncate">{t.otherNickname}</span>
                      <span className="block text-xs font-bold text-slate-400 truncate mt-0.5">
                        {t.lastMessage ? `${t.lastMessage.fromRole === currentUser.role ? '나: ' : ''}${t.lastMessage.text}` : '아직 메시지가 없어요'}
                      </span>
                    </span>
                    {t.lastMessage && (
                      <span className="shrink-0 text-[10px] font-bold text-slate-400">{formatChatTime(t.lastMessage.createdAt)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {chatError && <p className="text-xs font-bold text-rose-500 text-center">{chatError}</p>}
        </div>
      )}
    </div>
  );
}
