/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // 동적으로 생성되는 색상 클래스들이 최적화 과정에서 날아가지 않도록 안전망(Safelist) 추가
    { 
      pattern: /(bg|text|ring|border)-(violet|teal|sky|rose|yellow|indigo|amber)-(100|200|300|400|500|600|700|800|900)/, 
      variants: ['dark', 'hover', 'focus'] 
    }
  ],
  darkMode: 'class', // 수동으로 다크모드를 토글할 수 있게 설정
  theme: {
    extend: {
      colors: {
        // 다크모드 전용 중립 팔레트 (보라색 → 검정/그레이 톤으로 재정의)
        // 기존 dark:bg-purple-950(배경), dark:bg-purple-900(카드) 등이 전부 검정/그레이로 바뀜
        purple: {
          50: '#fafafa',   // 거의 흰색 텍스트
          100: '#f4f4f5',  // 밝은 텍스트
          200: '#e4e4e7',  // 부드러운 텍스트
          300: '#d4d4d8',  // 보조 텍스트
          400: '#a1a1aa',  // 흐린 텍스트
          500: '#71717a',  // 중간 톤
          600: '#52525b',  // 어두운 중간 톤
          700: '#3f3f46',  // 호버용 어두운 톤
          800: '#27272a',  // 카드/버튼 표면
          900: '#18181b',  // 카드/표면 (다크 카드)
          950: '#09090b',  // 배경 (검정)
        },
        slate: {
          50: '#f8fafc',
        }
      },
    },
  },
  plugins: [],
}
