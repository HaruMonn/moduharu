import { useState } from 'react';
import { Plus, ExternalLink, Trash2 } from 'lucide-react';

// 모의고사 기출문제 섹션 (과외 탭 공용)
export default function ExamQuestionsSection({
  examQuestions, examQuestionsLoading,
  addExamQuestion, deleteExamQuestion, isTeacher,
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', source: '', description: '', fileUrl: '' });
  const [filter, setFilter] = useState('전체');

  const subjects = ['전체', ...new Set((examQuestions || []).map((q) => q.subject).filter(Boolean))];
  const filtered = filter === '전체'
    ? (examQuestions || [])
    : (examQuestions || []).filter((q) => q.subject === filter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await addExamQuestion(form);
      setForm({ title: '', subject: '', source: '', description: '', fileUrl: '' });
      setShowForm(false);
    } catch {
      alert('등록에 실패했어요.');
    }
  };

  return (
    <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-slate-700 dark:text-purple-100">📚 모의고사 기출문제</h3>
        {isTeacher && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-full flex items-center gap-1"
          >
            <Plus size={14} /> 등록
          </button>
        )}
      </div>

      {showForm && isTeacher && (
        <form onSubmit={handleSubmit} className="mb-4 p-3 bg-slate-50 dark:bg-purple-950/60 rounded-2xl space-y-2">
          <input
            type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="제목 (예: 2024 시대 서바 3회)" maxLength={50}
            className="w-full text-sm bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-700 rounded-xl px-3 py-2 outline-none font-bold"
          />
          <div className="flex gap-2">
            <input
              type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="과목 (예: 영어)" maxLength={20}
              className="flex-1 text-sm bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-700 rounded-xl px-3 py-2 outline-none"
            />
            <input
              type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
              placeholder="출처 (예: 시대인재)" maxLength={20}
              className="flex-1 text-sm bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-700 rounded-xl px-3 py-2 outline-none"
            />
          </div>
          <input
            type="text" value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
            placeholder="파일 링크 (선택)"
            className="w-full text-sm bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-700 rounded-xl px-3 py-2 outline-none"
          />
          <textarea
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="설명 (선택)" rows={2} maxLength={200}
            className="w-full text-sm bg-white dark:bg-purple-900 border border-slate-200 dark:border-purple-700 rounded-xl px-3 py-2 outline-none resize-none"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 text-sm font-bold bg-indigo-500 text-white py-2 rounded-xl">등록</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm font-bold bg-slate-200 dark:bg-purple-800 px-4 py-2 rounded-xl">취소</button>
          </div>
        </form>
      )}

      {subjects.length > 1 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${filter === s ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-purple-800 text-slate-500 dark:text-purple-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {examQuestionsLoading ? (
        <p className="text-xs text-slate-400 font-bold text-center py-3">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-400 font-bold text-center py-3">등록된 기출문제가 없어요.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => (
            <div key={q.id} className="bg-slate-50 dark:bg-purple-950/60 rounded-2xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700 dark:text-purple-100">{q.title}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {q.subject && <span className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">{q.subject}</span>}
                    {q.source && <span className="text-[11px] font-bold bg-slate-200 dark:bg-purple-800 text-slate-500 dark:text-purple-300 px-2 py-0.5 rounded-full">{q.source}</span>}
                  </div>
                  {q.description && <p className="text-xs text-slate-500 dark:text-purple-300 mt-1.5">{q.description}</p>}
                  {q.fileUrl && (
                    <a href={q.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-500 mt-1.5">
                      <ExternalLink size={12} /> 파일 열기
                    </a>
                  )}
                </div>
                {isTeacher && (
                  <button onClick={() => { if (window.confirm('삭제할까요?')) deleteExamQuestion(q.id); }} className="text-slate-300 hover:text-red-500 shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
