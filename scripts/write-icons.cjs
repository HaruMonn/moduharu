// 앱 아이콘 PNG를 base64 데이터에서 복원하는 스크립트.
// GitHub MCP로는 바이너리를 직접 푸시할 수 없어서(텍스트로 저장됨),
// 아이콘은 이 스크립트가 빌드 시점에 생성한다.
// package.json의 build 스크립트에서 vite build 전에 실행됨.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const parts = [
  require('./icon-data-1.cjs'),
  require('./icon-data-2.cjs'),
  require('./icon-data-3.cjs'),
  require('./icon-data-4.cjs'),
  require('./icon-data-5.cjs'),
];

let count = 0;
for (const part of parts) {
  for (const [rel, b64] of Object.entries(part)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, Buffer.from(b64, 'base64'));
    count++;
  }
}
console.log(`[write-icons] restored ${count} icon files`);
