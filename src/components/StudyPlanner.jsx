const PHASES = [
  {
    months: '10 – 12월',
    title: '기초 재구축',
    headerBg: 'bg-violet-500',
    desc: '세법 기본서 정독 · 회계 개정 정리 · 재정학/행정소송법 훑기',
    days: [
      { day: '화', text: '세법 기본서 정독 9시간' },
      { day: '수', text: '회계 개정 중심 9시간' },
      { day: '목', text: '재정학 4h + 행정소송법 3h + 복습 2h' },
      { day: '금·일·월', text: '라이트 6시간 — 복습 위주' },
      { day: '토', text: '휴식 (과외 10시간)', rest: true },
    ],
  },
  {
    months: '1 – 2월',
    title: '심화 + 2차 병행',
    headerBg: 'bg-indigo-500',
    desc: '1차 기출 회독 · 2차 서술형 답안 연습 시작',
    days: [
      { day: '화', text: '세법 서술형 3h + 개론 기출 4h + 오답 2h' },
      { day: '수', text: '회계 서술형 3h + 개론 기출 4h + 오답 2h' },
      { day: '목', text: '재정학 3h + 행소법 3h + 서술형 3h' },
      { day: '금·일·월', text: '라이트 6시간 — 기출 + 오답' },
      { day: '토', text: '휴식 (과외 10시간)', rest: true },
    ],
  },
  {
    months: '3 – 4월',
    title: '1차 마무리',
    headerBg: 'bg-amber-500',
    desc: '전과목 기출 + 모의고사 · 2차 감각 유지',
    days: [
      { day: '화', text: '세법 기출 + 모의고사 9시간' },
      { day: '수', text: '회계 기출 + 모의고사 9시간' },
      { day: '목', text: '재정+행소법 6h · 서술형 감각 유지 3h' },
      { day: '금·일·월', text: '라이트 6시간 — 오답 정리' },
      { day: '토', text: '휴식 (과외 10시간)', rest: true },
    ],
  },
  {
    months: '5 – 7월',
    title: '2차 올인',
    headerBg: 'bg-rose-500',
    desc: '2차 4과목 서술형 집중 · 답안 작성 훈련',
    days: [
      { day: '화', text: '세법학 1부 서술형 9시간' },
      { day: '수', text: '회계학 1부 서술형 9시간' },
      { day: '목', text: '세법학 2부 4h + 회계학 2부 5h' },
      { day: '금·일·월', text: '라이트 6시간 — 답안 첨삭 + 복습' },
      { day: '토', text: '휴식 (과외 10시간)', rest: true },
    ],
  },
];

const GUIDE_1CHA = [
  {
    subject: '세법학개론',
    items: [
      '소득세/법인세/부가가치세 — 유은종 (책 독학 + 막히는 부분만 강의)',
      '국세기본법 — 강경태 (무료강의)',
      '국징법/조세범처벌법/국제조세 — 양소영 (기타세법)',
    ],
  },
  {
    subject: '회계학개론',
    items: [
      '재무회계 — 김기동 (나무경영)',
      '원가관리회계 — 이승우 (나무경영)',
    ],
  },
  { subject: '재정학', items: ['황정빈 (우리경영)'] },
  { subject: '행정소송법', items: ['정인국 (우리경영)'] },
];

const GUIDE_2CHA = [
  {
    subject: '세법학 1부',
    items: ['유은종 — 국세기본법/법인세/소득세/상속증여세'],
  },
  {
    subject: '세법학 2부',
    items: ['유은종 — 부가가치세/개별소비세/지방세/조특법'],
  },
  {
    subject: '회계학 1부',
    items: ['김기동 (나무경영) — 1차와 동일'],
  },
  {
    subject: '회계학 2부',
    items: ['이승우 (나무경영) — 1차와 동일'],
  },
  {
    subject: '세무회계 계산 연습',
    items: ['강경태 or 정우승 연습서'],
  },
];

const SUBJECT_RATIO = [
  { name: '세법학', pct: 35, bar: 'bg-violet-500' },
  { name: '회계학', pct: 35, bar: 'bg-indigo-500' },
  { name: '재정학', pct: 15, bar: 'bg-violet-400' },
  { name: '행정소송법', pct: 15, bar: 'bg-indigo-300' },
];

function GuideSection({ title, guides }) {
  return (
    <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
      <h3 className="text-base font-black text-slate-800 dark:text-purple-100 mb-3">{title}</h3>
      <div className="flex flex-col gap-3">
        {guides.map((g) => (
          <div key={g.subject} className="bg-slate-50 dark:bg-purple-950 rounded-2xl p-3 border border-slate-100 dark:border-purple-800">
            <div className="text-sm font-black text-teal-600 dark:text-teal-300 mb-1">{g.subject}</div>
            {g.items.map((it, i) => (
              <div key={i} className="text-[13px] text-slate-600 dark:text-purple-200 leading-relaxed">· {it}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudyPlanner() {
  return (
    <div className="flex flex-col gap-5">
      {/* ===== 월별 로드맵 ===== */}
      <div>
        <h3 className="text-base font-black text-slate-800 dark:text-purple-100 mb-3 px-1">월별 로드맵 + 요일 플랜</h3>
        <div className="flex flex-col gap-4">
          {PHASES.map((p) => (
            <div key={p.months} className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl shadow-sm border border-slate-100 dark:border-purple-800 overflow-hidden">
              <div className={`${p.headerBg} px-5 py-3`}>
                <span className="text-white font-black text-sm">{p.months} · {p.title}</span>
              </div>
              <div className="p-4">
                <div className="text-xs text-slate-400 dark:text-purple-300/70 font-bold mb-3">{p.desc}</div>
                <div className="flex flex-col gap-2">
                  {p.days.map((d) => (
                    <div
                      key={d.day}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${d.rest
                        ? 'bg-slate-50 dark:bg-purple-950 border border-dashed border-slate-200 dark:border-purple-800'
                        : 'bg-slate-50 dark:bg-purple-950 border border-slate-100 dark:border-purple-800'}`}
                    >
                      <span className={`shrink-0 text-[13px] font-black w-14 ${d.rest ? 'text-slate-400 dark:text-purple-300/60' : 'text-slate-700 dark:text-purple-100'}`}>{d.day}</span>
                      <span className={`text-[13px] leading-relaxed ${d.rest ? 'text-slate-400 dark:text-purple-300/60' : 'text-slate-600 dark:text-purple-200'}`}>{d.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 강사 가이드 ===== */}
      <div>
        <h3 className="text-base font-black text-slate-800 dark:text-purple-100 mb-3 px-1">과목별 강사 가이드</h3>
        <div className="flex flex-col gap-4">
          <GuideSection title="1차 과목" guides={GUIDE_1CHA} />
          <GuideSection title="2차 과목" guides={GUIDE_2CHA} />
        </div>
        <div className="mt-3 text-xs text-slate-400 dark:text-purple-300/70 font-bold px-1 leading-relaxed">
          핵심 원칙 — 1차 강사를 2차까지 끌고 가기. 세법 유은종, 회계 김기동+이승우.
        </div>
      </div>

      {/* ===== 과목 비중 ===== */}
      <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
        <h3 className="text-base font-black text-slate-800 dark:text-purple-100 mb-4">과목 비중</h3>
        <div className="flex flex-col gap-3">
          {SUBJECT_RATIO.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-bold text-slate-700 dark:text-purple-100">{s.name}</span>
                <span className="text-slate-400 dark:text-purple-300/70 font-bold">{s.pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-purple-950 rounded-full overflow-hidden">
                <div className={`h-2 rounded-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-slate-400 dark:text-purple-300/70 font-bold leading-relaxed">
          주 44시간 · 6개월이면 1,100시간. 1차는 복습 위주, 처음부터 2차 깊이로 공부하는 게 핵심.
        </div>
      </div>

      {/* ===== 과외 스케줄 ===== */}
      <div className="shrink-0 bg-white dark:bg-purple-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-purple-800">
        <h3 className="text-base font-black text-slate-800 dark:text-purple-100 mb-3">과외 스케줄</h3>
        <div className="flex flex-col gap-2 text-[13px]">
          <div className="flex gap-3"><span className="font-black text-slate-700 dark:text-purple-100 w-8 shrink-0">금</span><span className="text-slate-600 dark:text-purple-200">18:30 – 21:30 진량</span></div>
          <div className="flex gap-3"><span className="font-black text-slate-700 dark:text-purple-100 w-8 shrink-0">토</span><span className="text-slate-600 dark:text-purple-200">09 – 12 진량 · 13 – 16 수성 · 17 – 21 칠곡</span></div>
          <div className="flex gap-3"><span className="font-black text-slate-700 dark:text-purple-100 w-8 shrink-0">일</span><span className="text-slate-600 dark:text-purple-200">20:00 – 24:00 평택</span></div>
          <div className="flex gap-3"><span className="font-black text-slate-700 dark:text-purple-100 w-8 shrink-0">월</span><span className="text-slate-600 dark:text-purple-200">18:00 – 22:00 평택</span></div>
        </div>
      </div>
    </div>
  );
}
