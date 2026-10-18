import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, Users } from 'lucide-react';
import ExamQuestionsSection from './ExamQuestionsSection.jsx';

// 학부모용: 연결된 자녀 목록 + 자녀 보드 읽기 전용 보기
export default function ParentTab({
  currentUser, renderHeader,
  parentChildren, parentChildBoard, setParentChildBoard,
  parentChildRecords, parentLoading, fetchParentChildren, openParentChildBoard,
  examQuestions, examQuestionsLoading,
}) {
  const [selectedCode, setSelectedCode] = useState(null);

  useEffect(() => {
    if (currentUser?.role === 'parent') fetchParentChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleSelect = async (code) => {
    setSelectedCode(code);
    await openParentChildBoard(code);
  };

  const handleBack = () => {
    setSelectedCode(null);
    setParentChildBoard(null);
  };

  /* eslint-disable react-hooks/purity */
  const stats = useMemo(() => {
    if (!selectedCode || !parentChildBoard) return null;
    const board = parentChildBoard.board || {};
    const homework = board.homework || [];
    const doneCount = homework.filter((h) => h.done).length;
    const hwRate = homework.length ? Math.round((doneCount / homework.length) * 100) : 0;
    const todayKey = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const todayMinutes = (parentChildRecords || [])
      .filter((r) => new Date(new Date(r.startTime).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) === todayKey)
      .reduce((s, r) => s + (r.durationSec || 0), 0) / 60;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekMinutes = (parentChildRecords || [])
      .filter((r) => new Date(r.startTime).getTime() >= weekAgo)
      .reduce((s, r) => s + (r.durationSec || 0), 0) / 60;
    return { board, homework, doneCount, hwRate, todayMinutes, weekMinutes };
  }, [selectedCode, parentChildBoard, parentChildRecords]);
  /* eslint-enable react-hooks/purity */

  // 자녀 보드 상세 (읽기 전용)
  if (selectedCode && parentChildBoard && stats) {
    const { board, homework, doneCount, hwRate, todayMinutes, weekMinutes } = stats;

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
        {renderHeader('과외', '자녀 보기')}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <button onClick={handleBack} className="flex items-center gap-1 text-sm font-bold text-slate-500 dark:text-purple-300 self-start">
            <ChevronLeft size={16} /> 자녀 목록으로
          </button>
          <h2 className="font-black text-xl text-slate-700 dark:text-purple-100">{parentChildBoard.nickname}</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-purple-900 rounded-2xl p-3 text-center border border-slate-100 dark:border-purple-800">
              <p className="text-[10px] font-bold text-slate-400">이번 주 공부</p>
              <p className="font-black text-lg text-indigo-500">{Math.round(weekMinutes)}<span className="text-xs">분</span></p>
            </div>
            <div className="bg-white dark:bg-purple-900 rounded-2xl p-3 text-center border border-slate-100 dark:border-purple-800">
              <p className="text-[10px] font-bold text-slate-400">오늘 공부</p>
              <p className="font-black text-lg text-indigo-500">{Math.round(todayMinutes)}<span className="text-xs">분</span></p>
            </div>
            <div className="bg-white dark:bg-purple-900 rounded-2xl p-3 text-center border border-slate-100 dark:border-purple-800">
              <p className="text-[10px] font-bold text-slate-400">숙제 완료율</p>
              <p className="font-black text-lg text-emerald-500">{hwRate}<span className="text-xs">%</span></p>
            </div>
          </div>
          <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
            <h3 className="font-black text-slate-700 dark:text-purple-100 mb-3">📝 숙제 ({doneCount}/{homework.length})</h3>
            {homework.length === 0 ? (
              <p className="text-sm text-slate-400">등록된 숙제가 없어요</p>
            ) : (
              <div className="space-y-2">
                {homework.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={h.done ? 'text-emerald-500' : 'text-slate-300'}>{h.done ? '✓' : '○'}</span>
                    <span className={h.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-purple-100 font-bold'}>{h.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
            <h3 className="font-black text-slate-700 dark:text-purple-100 mb-3">🗓️ 시간표</h3>
            {(board.timetable || []).length === 0 ? (
              <p className="text-sm text-slate-400">등록된 시간표가 없어요</p>
            ) : (
              <div className="space-y-1.5">
                {(board.timetable || []).map((t, i) => (
                  <div key={i} className="text-sm text-slate-600 dark:text-purple-200">
                    <span className="font-bold">{t.title}</span>
                    {t.day && <span className="text-slate-400"> · {t.day}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
      {renderHeader('과외', '내 자녀')}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {!currentUser ? (
          <div className="text-center text-slate-400 dark:text-purple-300/70 py-16 text-sm font-bold">
            <div className="text-3xl mb-2">🔒</div>
            로그인하면 과외 모드를 쓸 수 있어요!
          </div>
        ) : parentLoading ? (
          <div className="text-center text-slate-400 py-16 text-sm font-bold">불러오는 중...</div>
        ) : parentChildren.length === 0 ? (
          <div className="text-center text-slate-400 dark:text-purple-300/70 py-16 text-sm font-bold">
            <div className="text-3xl mb-2">👨‍👩‍👧</div>
            연결된 자녀가 없어요.<br />선생님이 연결해줄 때까지 기다려주세요.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-purple-300">
              <Users size={16} /> 자녀를 선택하세요
            </div>
            {parentChildren.map((child) => (
              <button
                key={child.code}
                onClick={() => handleSelect(child.code)}
                className="bg-white dark:bg-purple-900 rounded-2xl p-4 border border-slate-100 dark:border-purple-800 shadow-sm text-left hover:opacity-80 transition"
              >
                <p className="font-black text-slate-700 dark:text-purple-100">{child.nickname}</p>
                <p className="text-xs text-slate-400 font-bold mt-1">공부 기록 · 숙제 · 시간표 보기</p>
              </button>
            ))}
            <ExamQuestionsSection
              examQuestions={examQuestions} examQuestionsLoading={examQuestionsLoading}
              isTeacher={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
