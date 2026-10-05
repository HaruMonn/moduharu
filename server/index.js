import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 로컬에 .env가 있을 때만 로드 (Render 등 배포 환경에선 환경변수로 주입됨)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const app = express();
app.use(cors());
app.use(express.json());

const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
const REQUESTS_BIN = process.env.JSONBIN_REQUESTS_BIN;
const RANKINGS_BIN = process.env.JSONBIN_RANKINGS_BIN;
const USERS_BIN = process.env.JSONBIN_USERS_BIN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const PORT = process.env.PORT || 3001;

const binUrl = (id) => `https://api.jsonbin.io/v3/b/${id}`;

async function readBin(id) {
  const res = await fetch(binUrl(id), { headers: { 'X-Master-Key': MASTER_KEY } });
  if (!res.ok) throw new Error(`read failed: ${res.status}`);
  const data = await res.json();
  return data?.record ?? {};
}

async function writeBin(id, record) {
  const res = await fetch(binUrl(id), {
    method: 'PUT',
    headers: { 'X-Master-Key': MASTER_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`write failed: ${res.status}`);
  return true;
}

// 구버전 단순 해시 (기존 계정 로그인 호환용 — 신규 가입에는 scrypt 사용)
const legacyHashPassword = (pw) => {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return 'h' + Math.abs(h).toString(36) + '_' + pw.length;
};

// 안전한 비밀번호 해시 (Node 내장 crypto.scrypt — 별도 의존성 없음)
// 저장 형식: s2$<salt hex>$<derived hex>
const scryptAsync = promisify(crypto.scrypt);
const hashPasswordSecure = async (pw) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(pw, salt, 64);
  return `s2$${salt}$${derived.toString('hex')}`;
};
const verifyPasswordSecure = async (pw, hash) => {
  try {
    const [ver, salt, hex] = String(hash).split('$');
    if (ver !== 's2' || !salt || !hex) return false;
    const derived = await scryptAsync(pw, salt, 64);
    const expected = Buffer.from(hex, 'hex');
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
};

// 응답에서 비밀번호를 제외한 사용자 객체 반환
const publicUser = (u) => {
  if (!u) return u;
  const rest = { ...u };
  delete rest.password;
  return rest;
};

// 친구 코드는 대소문자 구분 없이 비교 (4자리 영숫자라 오타 방지)
const sameCode = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
const findUserByCode = (users, code) => users.find((u) => sameCode(u.code, code));

const generateUserCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// 관리자 인증 미들웨어
function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: '관리자 권한이 필요해요.' });
  }
  next();
}

// =================== 의견 (공개 읽기/등록/추천, 관리자만 삭제) ===================
app.get('/api/requests', async (req, res) => {
  try {
    const record = await readBin(REQUESTS_BIN);
    const items = (record.items || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ items });
  } catch {
    res.status(500).json({ error: '의견을 불러오지 못했어요.' });
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { title, body, category } = req.body || {};
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
    const record = await readBin(REQUESTS_BIN);
    const items = record.items || [];
    const newItem = {
      id: Date.now(),
      title: title.trim(),
      body: body.trim(),
      category: category || '기능 건의',
      votes: 0,
      votedBy: [],
      createdAt: new Date().toISOString(),
    };
    items.unshift(newItem);
    await writeBin(REQUESTS_BIN, { ...record, items });
    res.json({ items: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  } catch {
    res.status(500).json({ error: '의견 등록에 실패했어요.' });
  }
});

app.post('/api/requests/:id/vote', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { delta } = req.body || {};
    // delta는 +1(추천) 또는 -1(취소)만 허용 — 임의값으로 점수 조작 방지
    if (delta !== 1 && delta !== -1) return res.status(400).json({ error: '잘못된 추천 요청이에요.' });
    const record = await readBin(REQUESTS_BIN);
    const items = (record.items || []).map((r) =>
      r.id === id ? { ...r, votes: Math.max(0, (r.votes || 0) + delta) } : r
    );
    await writeBin(REQUESTS_BIN, { ...record, items });
    res.json({ items: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  } catch {
    res.status(500).json({ error: '추천 반영에 실패했어요.' });
  }
});

app.delete('/api/requests/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const record = await readBin(REQUESTS_BIN);
    const items = (record.items || []).filter((r) => r.id !== id);
    await writeBin(REQUESTS_BIN, { ...record, items });
    res.json({ items: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  } catch {
    res.status(500).json({ error: '의견 삭제에 실패했어요.' });
  }
});

// =================== 랭킹 (공개 읽기/등록) ===================
app.get('/api/rankings', async (req, res) => {
  try {
    const record = await readBin(RANKINGS_BIN);
    const scores = (record.scores || []).sort((a, b) => b.score - a.score);
    res.json({ scores });
  } catch {
    res.status(500).json({ error: '랭킹을 불러오지 못했어요.' });
  }
});

app.post('/api/rankings', async (req, res) => {
  try {
    const { nick, records } = req.body || {};
    // 닉네임: 필수 문자열, 50자로 제한
    const cleanNick = typeof nick === 'string' ? nick.trim().slice(0, 50) : '';
    if (!cleanNick) return res.status(400).json({ error: '닉네임이 필요해요.' });
    // 점수 숫자는 신뢰하지 않고, 클라이언트가 보낸 공부 기록을 직접 검증·합산
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: '공부 기록이 필요해요. 앱을 최신 버전으로 업데이트해주세요.' });
    }
    if (records.length > 200) return res.status(400).json({ error: '기록이 너무 많아요.' });

    // 오늘 (KST 기준)
    const kstDate = (d) => new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const todayKst = kstDate(new Date());
    const now = Date.now();

    const intervals = [];
    for (const r of records) {
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);
      const dur = Number(r.duration);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ error: '기록 시간이 올바르지 않아요.' });
      if (!(dur > 0) || !Number.isFinite(dur)) return res.status(400).json({ error: '기록 길이가 올바르지 않아요.' });
      if (end <= start) return res.status(400).json({ error: '기록 시간이 올바르지 않아요.' });
      // duration이 실제 구간과 크게 다르면 거부
      if (Math.abs((end - start) / 1000 - dur) > 120) return res.status(400).json({ error: '기록 길이가 올바르지 않아요.' });
      // 오늘(KST) 시작한 기록만, 미래 시간 거부
      if (kstDate(start) !== todayKst) return res.status(400).json({ error: '오늘의 기록만 등록할 수 있어요.' });
      if (start.getTime() > now) return res.status(400).json({ error: '미래의 기록은 등록할 수 없어요.' });
      intervals.push({ start: start.getTime(), end: end.getTime(), dur });
    }
    // 겹치는 구간 거부
    intervals.sort((a, b) => a.start - b.start);
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].start < intervals[i - 1].end) {
        return res.status(400).json({ error: '겹치는 시간대의 기록이 있어요.' });
      }
    }
    const minutes = Math.round(intervals.reduce((a, r) => a + r.dur, 0) / 60);
    if (minutes > 1440) return res.status(400).json({ error: '하루 24시간을 초과할 수 없어요.' });

    const record = await readBin(RANKINGS_BIN);
    let scores = (record.scores || []).filter((s) => s.nick !== cleanNick);
    scores.push({ nick: cleanNick, score: minutes, updatedAt: new Date().toISOString() });
    await writeBin(RANKINGS_BIN, { ...record, scores });
    res.json({ scores: scores.sort((a, b) => b.score - a.score) });
  } catch {
    res.status(500).json({ error: '점수 등록에 실패했어요.' });
  }
});

// =================== 사용자 (가입/로그인/코드 조회) ===================
app.post('/api/users/signup', async (req, res) => {
  try {
    const { id, password, nickname } = req.body || {};
    // 서버 측 입력 검증
    const cleanId = typeof id === 'string' ? id.trim() : '';
    const cleanNickname = typeof nickname === 'string' ? nickname.trim() : '';
    if (!/^[A-Za-z0-9]{4,}$/.test(cleanId)) return res.status(400).json({ error: '아이디는 4자 이상의 영문/숫자 조합이어야 해요.' });
    if (typeof password !== 'string' || password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 해요.' });
    if (cleanNickname.length < 1 || cleanNickname.length > 20) return res.status(400).json({ error: '닉네임은 1~20자여야 해요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    if (users.some((u) => u.id === cleanId)) return res.status(409).json({ error: '이미 사용 중인 아이디예요.' });

    const existingCodes = new Set(users.map((u) => String(u.code).toLowerCase()));
    let code = generateUserCode();
    while (existingCodes.has(code.toLowerCase())) code = generateUserCode();

    const hashed = await hashPasswordSecure(password);
    const newUser = { id: cleanId, password: hashed, nickname: cleanNickname, code, friends: [], friendRequests: [], createdAt: new Date().toISOString() };
    users.push(newUser);
    await writeBin(USERS_BIN, { ...record, users });
    res.json({ user: publicUser(newUser) });
  } catch {
    res.status(500).json({ error: '가입 저장에 실패했어요.' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { id, password } = req.body || {};
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const found = users.find((u) => u.id === id);
    if (!found || typeof password !== 'string') {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않아요.' });
    }
    // 1) scrypt 해시 비교 → 2) 구버전 해시 비교 (맞으면 scrypt로 재해시해 저장)
    let ok = false;
    try { ok = await verifyPasswordSecure(password, found.password); } catch { ok = false; }
    let migrated = false;
    if (!ok && found.password === legacyHashPassword(password)) {
      ok = true;
      migrated = true;
    }
    if (!ok) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않아요.' });
    }
    if (migrated) {
      const hashed = await hashPasswordSecure(password);
      const updated = users.map((u) => (u.id === found.id ? { ...u, password: hashed } : u));
      await writeBin(USERS_BIN, { ...record, users: updated });
    }
    res.json({ user: publicUser(found) });
  } catch {
    res.status(500).json({ error: '로그인에 실패했어요.' });
  }
});

// 코드로 사용자 조회 (친구 추가용, 닉네임만 노출)
app.get('/api/users/lookup', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: '코드가 필요해요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const found = findUserByCode(users, code);
    if (!found) return res.status(404).json({ error: '사용자를 찾을 수 없어요.' });
    res.json({ user: { nickname: found.nickname, code: found.code } });
  } catch {
    res.status(500).json({ error: '사용자 조회에 실패했어요.' });
  }
});

// =================== 친구 (요청/수락/거절) ===================
// 내 친구 요청 목록 + 친구 목록 조회
app.get('/api/friends', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ error: '코드가 필요해요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const me = findUserByCode(users, code);
    if (!me) return res.status(404).json({ error: '사용자를 찾을 수 없어요.' });

    // 친구 목록 (code → nickname)
    const friends = (me.friends || []).map((fcode) => {
      const f = findUserByCode(users, fcode);
      return { code: fcode, nickname: f ? f.nickname : fcode };
    });
    // 받은 친구 요청 (보낸 사람 코드/닉네임)
    const requests = (me.friendRequests || []).map((r) => {
      const from = findUserByCode(users, r.fromCode);
      return { fromCode: r.fromCode, fromNickname: from ? from.nickname : r.fromCode, at: r.at };
    });
    res.json({ friends, requests });
  } catch {
    res.status(500).json({ error: '친구 목록을 불러오지 못했어요.' });
  }
});

// 친구 요청 보내기
app.post('/api/friends/request', async (req, res) => {
  try {
    const { fromCode, toCode } = req.body || {};
    if (!fromCode || !toCode) return res.status(400).json({ error: '코드가 필요해요.' });
    if (sameCode(fromCode, toCode)) return res.status(400).json({ error: '자기 자신에게는 요청할 수 없어요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const target = findUserByCode(users, toCode);
    if (!target) return res.status(404).json({ error: '대상 사용자를 찾을 수 없어요.' });
    const me = findUserByCode(users, fromCode);
    if (!me) return res.status(404).json({ error: '내 계정을 찾을 수 없어요.' });
    // 저장된 원래 코드 형식(대소문자)을 기준으로 사용 — 데이터 일관성 유지
    const myCode = me.code;
    const theirCode = target.code;

    // 이미 친구인지
    if ((target.friends || []).some((f) => sameCode(f, myCode))) return res.status(400).json({ error: '이미 친구예요.' });
    // 이미 요청을 보냈는지
    if ((target.friendRequests || []).some((r) => sameCode(r.fromCode, myCode))) {
      return res.status(400).json({ error: '이미 친구 요청을 보냈어요.' });
    }
    // 상대가 나에게 이미 요청을 보냈다면 바로 친구 맺기
    if ((me.friendRequests || []).some((r) => sameCode(r.fromCode, theirCode))) {
      const updated = users.map((u) => {
        if (sameCode(u.code, myCode)) {
          const friends = (u.friends || []).some((f) => sameCode(f, theirCode)) ? u.friends : [...(u.friends || []), theirCode];
          return { ...u, friends, friendRequests: (u.friendRequests || []).filter((r) => !sameCode(r.fromCode, theirCode)) };
        }
        if (sameCode(u.code, theirCode)) {
          const friends = (u.friends || []).some((f) => sameCode(f, myCode)) ? u.friends : [...(u.friends || []), myCode];
          return { ...u, friends };
        }
        return u;
      });
      await writeBin(USERS_BIN, { ...record, users: updated });
      return res.json({ ok: true, autoAccepted: true });
    }

    // 요청 추가
    const updated = users.map((u) => {
      if (sameCode(u.code, theirCode)) {
        return { ...u, friendRequests: [...(u.friendRequests || []), { fromCode: myCode, at: new Date().toISOString() }] };
      }
      return u;
    });
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '친구 요청에 실패했어요.' });
  }
});

// 친구 요청 수락
app.post('/api/friends/accept', async (req, res) => {
  try {
    const { code, fromCode } = req.body || {};
    if (!code || !fromCode) return res.status(400).json({ error: '코드가 필요해요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const me = findUserByCode(users, code);
    const sender = findUserByCode(users, fromCode);
    if (!me || !sender) return res.status(404).json({ error: '사용자를 찾을 수 없어요.' });
    // 실제로 온 요청이 있는지 확인
    if (!(me.friendRequests || []).some((r) => sameCode(r.fromCode, sender.code))) {
      return res.status(404).json({ error: '내게 온 요청이 없어요.' });
    }
    const addUnique = (list, c) => ((list || []).some((x) => sameCode(x, c)) ? list : [...(list || []), c]);
    const updated = users.map((u) => {
      if (sameCode(u.code, me.code)) {
        return { ...u, friends: addUnique(u.friends, sender.code), friendRequests: (u.friendRequests || []).filter((r) => !sameCode(r.fromCode, sender.code)) };
      }
      if (sameCode(u.code, sender.code)) {
        return { ...u, friends: addUnique(u.friends, me.code) };
      }
      return u;
    });
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '친구 수락에 실패했어요.' });
  }
});

// 친구 요청 거절
app.post('/api/friends/reject', async (req, res) => {
  try {
    const { code, fromCode } = req.body || {};
    if (!code || !fromCode) return res.status(400).json({ error: '코드가 필요해요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const me = findUserByCode(users, code);
    if (!me) return res.status(404).json({ error: '사용자를 찾을 수 없어요.' });
    const updated = users.map((u) => {
      if (sameCode(u.code, me.code)) {
        return { ...u, friendRequests: (u.friendRequests || []).filter((r) => !sameCode(r.fromCode, fromCode)) };
      }
      return u;
    });
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '친구 요청 거절에 실패했어요.' });
  }
});

// 친구 삭제 (양쪽 목록에서 서로 제거)
app.delete('/api/friends', async (req, res) => {
  try {
    const { code, friendCode } = req.body || {};
    if (!code || !friendCode) return res.status(400).json({ error: '코드가 필요해요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const me = findUserByCode(users, code);
    const friend = findUserByCode(users, friendCode);
    if (!me || !friend) return res.status(404).json({ error: '사용자를 찾을 수 없어요.' });
    if (!(me.friends || []).some((f) => sameCode(f, friend.code))) {
      return res.status(404).json({ error: '친구 관계가 아니에요.' });
    }
    const updated = users.map((u) => {
      if (sameCode(u.code, me.code)) {
        return { ...u, friends: (u.friends || []).filter((f) => !sameCode(f, friend.code)) };
      }
      if (sameCode(u.code, friend.code)) {
        return { ...u, friends: (u.friends || []).filter((f) => !sameCode(f, me.code)) };
      }
      return u;
    });
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '친구 삭제에 실패했어요.' });
  }
});

// =================== 공지 (공개 읽기, 관리자만 작성/삭제) ===================
app.get('/api/announcements', async (req, res) => {
  try {
    const record = await readBin(REQUESTS_BIN);
    const announcements = (record.announcements || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ announcements });
  } catch {
    res.status(500).json({ error: '공지를 불러오지 못했어요.' });
  }
});

app.post('/api/announcements', requireAdmin, async (req, res) => {
  try {
    const { title, body } = req.body || {};
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
    const record = await readBin(REQUESTS_BIN);
    const announcements = record.announcements || [];
    announcements.unshift({
      id: Date.now(),
      title: title.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString(),
    });
    await writeBin(REQUESTS_BIN, { ...record, announcements });
    res.json({ announcements: announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  } catch {
    res.status(500).json({ error: '공지 등록에 실패했어요.' });
  }
});

app.delete('/api/announcements/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const record = await readBin(REQUESTS_BIN);
    const announcements = (record.announcements || []).filter((a) => a.id !== id);
    await writeBin(REQUESTS_BIN, { ...record, announcements });
    res.json({ announcements: announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  } catch {
    res.status(500).json({ error: '공지 삭제에 실패했어요.' });
  }
});

// 여러 코드 한 번에 조회 (친구 목록 표시용)
app.post('/api/users/lookup-batch', async (req, res) => {
  try {
    const { codes } = req.body || {};
    if (!Array.isArray(codes)) return res.status(400).json({ error: 'codes가 필요해요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const map = {};
    users.forEach((u) => {
      if (codes.includes(u.code)) map[u.code] = u.nickname;
    });
    res.json({ map });
  } catch {
    res.status(500).json({ error: '사용자 조회에 실패했어요.' });
  }
});

// 관리자 토큰 검증
app.post('/api/admin/verify', (req, res) => {
  const token = req.body?.token;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: '관리자 토큰이 올바르지 않아요.' });
  }
  res.json({ ok: true });
});

// =================== 프로덕션 정적 서빙 (Render 등 단일 서비스용) ===================
const distDir = path.join(__dirname, '..', 'dist');
app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ 백엔드 서버 실행 중: http://localhost:${PORT}`);
});
