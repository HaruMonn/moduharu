import { useEffect, useState } from 'react';

// =================== 세무사 공부 루트 (선생님 전용 탭) ===================
// 데이터는 레포의 study-route.json을 원격으로 불러옴 — 파일만 푸시하면
// 앱 재설치 없이 다음 진입 때 자동 반영됨. 학생·학부모에게는 탭 자체가 안 보임.
const ROUTE_URL = 'https://raw.githubusercontent.com/HaruMonn/moduharu/master/study-route.json';

function ddayFrom(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return Math.round((d - today) / 86400000);
}

export default function StudyRouteTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // fetch 이후에만 setState (effect 동기 setState 금지 규칙 대응)
  const fetchData = async () => {
    try {
      const res = await fetch(ROUTE_URL);
      if (!res.ok) throw new Error('fetch failed');
      setData(await res.json());
    } catch {
      setError('불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const reload = async () => {
    setLoading(true);
    setError('');
    await fetchData();
  };

  // 탭 진입 시 원격 JSON 불러오기 (표준 마운트 fetch — setState는 await 이후에만 실행됨)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-purple-950">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        <h2 className="font-black text-xl text-slate-700 dark:text-purple-100">📚 세무사 공부 루트</h2>
        <p className="text-xs font-bold text-slate-400 -mt-2">선생님 전용 · 파일만 바꾸면 앱 재설치 없이 반영돼요.</p>

        {loading && !data && (
          <p className="text-xs text-slate-400 font-bold text-center py-10">불러오는 중...</p>
        )}

        {error && !data && (
          <div className="text-center py-10">
            <p className="text-xs text-slate-400 font-bold mb-3">{error}</p>
            <button onClick={reload} className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:opacity-90">다시 불러오기</button>
          </div>
        )}

        {data && (
          <>
            {/* 디데이 */}
            <div className="grid grid-cols-2 gap-3">
              {[data.DDAY_1CHA, data.DDAY_2CHA].filter(Boolean).map((dd) => {
                const left = ddayFrom(dd.date);
                return (
                  <div key={dd.label} className="bg-white dark:bg-purple-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-purple-800">
                    <div className="text-xs font-bold text-slate-400">{dd.label}</div>
                    <div className="font-black text-lg text-slate-700 dark:text-purple-100 mt-1">
                      {left === null ? dd.date : left > 0 ? `D-${left}` : left === 0 ? 'D-Day' : `D+${-left}`}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1">{dd.note || dd.date}</div>
                  </div>
                );
              })}
            </div>

            {/* 단계별 로드맵 */}
            <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
              <h3 className="font-black text-sm text-slate-700 dark:text-purple-100 mb-3">🗺️ 단계별 로드맵</h3>
              <div className="flex flex-col gap-4">
                {(data.PHASES || []).map((p) => (
                  <div key={p.months + p.title}>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${p.headerBg || 'bg-indigo-500'}`} />
                      <span className="font-black text-sm text-slate-700 dark:text-purple-100">{p.months} · {p.title}</span>
                    </div>
                    {p.desc && <p className="text-xs font-bold text-slate-400 mt-1 ml-5">{p.desc}</p>}
                    <div className="flex flex-col gap-1 mt-2 ml-5">
                      {(p.days || []).map((day) => (
                        <div key={day.day} className="flex gap-2 text-xs">
                          <span className="shrink-0 w-5 h-5 rounded-md bg-slate-100 dark:bg-purple-950 flex items-center justify-center font-black text-slate-500 dark:text-purple-300">{day.day}</span>
                          <span className="font-bold text-slate-600 dark:text-purple-200">{day.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 과목별 강사 */}
            {[
              { title: '1차 과목별 강사', guides: data.GUIDE_1CHA },
              { title: '2차 과목별 강사', guides: data.GUIDE_2CHA },
            ].map((section) => (
              <div key={section.title} className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
                <h3 className="font-black text-sm text-slate-700 dark:text-purple-100 mb-3">👨‍🏫 {section.title}</h3>
                <div className="flex flex-col gap-3">
                  {(section.guides || []).map((g) => (
                    <div key={g.subject}>
                      <div className="font-black text-xs text-slate-700 dark:text-purple-100">{g.subject}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {(g.items || []).map((item) => (
                          <div key={item} className="text-xs font-bold text-slate-500 dark:text-purple-300">· {item}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* 과목 비중 */}
            <div className="bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
              <h3 className="font-black text-sm text-slate-700 dark:text-purple-100 mb-3">⚖️ 과목 비중</h3>
              <div className="flex flex-col gap-2">
                {(data.SUBJECT_RATIO || []).map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs font-black text-slate-600 dark:text-purple-200">{s.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-purple-950 overflow-hidden">
                      <div className={`${s.bar || 'bg-indigo-500'} h-2 rounded-full`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-black text-slate-500 dark:text-purple-300">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
