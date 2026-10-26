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

// 응답에서 비밀번호/세션을 제외한 사용자 객체 반환
const publicUser = (u) => {
  if (!u) return u;
  const rest = { ...u };
  delete rest.password;
  delete rest.sessions;
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
    const { id, password, nickname, role } = req.body || {};
    // 서버 측 입력 검증
    const cleanId = typeof id === 'string' ? id.trim() : '';
    const cleanNickname = typeof nickname === 'string' ? nickname.trim() : '';
    if (!/^[A-Za-z0-9]{4,}$/.test(cleanId)) return res.status(400).json({ error: '아이디는 4자 이상의 영문/숫자 조합이어야 해요.' });
    if (typeof password !== 'string' || password.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 해요.' });
    if (cleanNickname.length < 1 || cleanNickname.length > 20) return res.status(400).json({ error: '닉네임은 1~20자여야 해요.' });
    const userRole = role === 'parent' ? 'parent' : 'student';
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    if (users.some((u) => u.id === cleanId)) return res.status(409).json({ error: '이미 사용 중인 아이디예요.' });

    const existingCodes = new Set(users.map((u) => String(u.code).toLowerCase()));
    let code = generateUserCode();
    while (existingCodes.has(code.toLowerCase())) code = generateUserCode();

    const hashed = await hashPasswordSecure(password);
    const newUser = {
      id: cleanId, password: hashed, nickname: cleanNickname, code,
      friends: [], friendRequests: [], createdAt: new Date().toISOString(),
      role: userRole, teacherCode: null, studentCodes: [], linkedChildren: [],
      board: { timetable: [], schedule: [], homework: [] }, studyRecords: [], sessions: [],
    };
    users.push(newUser);
    await writeBin(USERS_BIN, { ...record, users });
    const token = await createSession(newUser);
    res.json({ user: publicUser(newUser), token });
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
    // 과외 모드 기본값 백필 (기존 계정 호환) + 구버전 해시 마이그레이션
    const finalPassword = migrated ? await hashPasswordSecure(password) : found.password;
    const fresh = { ...withTutorDefaults(found), password: finalPassword };
    const finalUsers = users.map((u) => (u.id === found.id ? fresh : u));
    await writeBin(USERS_BIN, { ...record, users: finalUsers });
    const token = await createSession(fresh);
    res.json({ user: publicUser(fresh), token });
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

// =================== 과외 모드 (선생님/학생) ===================
// 친구 코드 기반 식별은 학생 간 엿보기를 막기에 약해서, 과외 API는 전부 로그인 세션 토큰을 요구함

const issueSessionToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

// 세션 발급 — 토큰 원문은 이 응답에서만 나가고, 저장되는 건 해시뿐
async function createSession(user) {
  const record = await readBin(USERS_BIN);
  const users = record.users || [];
  const token = issueSessionToken();
  const sessions = [...(user.sessions || []), { hash: hashToken(token), createdAt: new Date().toISOString() }].slice(-10);
  const updated = users.map((u) => (sameCode(u.code, user.code) ? { ...u, sessions } : u));
  await writeBin(USERS_BIN, { ...record, users: updated });
  return token;
}

// 세션 인증 미들웨어 — req.me 에 사용자 원본 세팅
async function requireSession(req, res, next) {
  const code = req.get('x-user-code');
  const token = req.get('x-session-token');
  if (!code || !token) return res.status(401).json({ error: '로그인이 필요해요.' });
  try {
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const me = findUserByCode(users, code);
    const h = hashToken(token);
    if (!me || !(me.sessions || []).some((s) => s.hash === h)) {
      return res.status(401).json({ error: '로그인이 만료됐어요. 다시 로그인해주세요.' });
    }
    req.me = me;
    next();
  } catch {
    res.status(500).json({ error: '인증 확인에 실패했어요.' });
  }
}

// 과외 모드 필드 기본값 (기존 계정 호환용)
const withTutorDefaults = (u) => {
  const v = { ...u };
  if (!v.role) v.role = null;
  if (!('teacherCode' in v)) v.teacherCode = null;
  if (!Array.isArray(v.studentCodes)) v.studentCodes = [];
  if (!v.board || typeof v.board !== 'object') v.board = { timetable: [], schedule: [], homework: [] };
  else {
    if (!Array.isArray(v.board.timetable)) v.board.timetable = [];
    if (!Array.isArray(v.board.schedule)) v.board.schedule = [];
    if (!Array.isArray(v.board.homework)) v.board.homework = [];
  }
  if (!Array.isArray(v.studyRecords)) v.studyRecords = [];
  if (!Array.isArray(v.sessions)) v.sessions = [];
  return v;
};

// 선생님은 모든 학생의 보드에 접근 가능 (앱을 선생님 학생들하고만 쓰므로)
const isTeacherOf = (teacher, student) =>
  !!teacher && !!student && teacher.role === 'teacher';

// 학생 본인 / 선생님 / 연결된 학부모만 조회 가능
const isParentOf = (parent, student) =>
  !!parent && !!student && parent.role === 'parent' &&
  (parent.linkedChildren || []).some((c) => sameCode(c, student.code));
const canAccessBoard = (me, student) =>
  !!student && (sameCode(me.code, student.code) || isTeacherOf(me, student) || isParentOf(me, student));
// 쓰기는 학생 본인 / 선생님만 (학부모는 읽기 전용)
const canWriteBoard = (me, student) =>
  !!student && (sameCode(me.code, student.code) || isTeacherOf(me, student));

// 선생님은 모든 학생을 볼 수 있음 (코드 등록 불필요 — 앱을 선생님 학생들하고만 씀)
const studentListOf = (users) =>
  users
    .filter((u) => u.role !== 'teacher')
    .map((u) => ({ code: u.code, nickname: u.nickname }));

const cleanStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// 보드 섹션 검증 — timetable | schedule | homework
function validateBoardSection(items, kind) {
  if (!Array.isArray(items) || items.length > 300) return null;
  const out = [];
  for (const it of items) {
    if (!it || typeof it !== 'object') return null;
    const title = cleanStr(it.title, 100);
    if (!title) return null;
    const base = {
      id: it.id ?? Date.now() + Math.floor(Math.random() * 1000),
      title,
      color: cleanStr(it.color, 20) || 'indigo',
      note: cleanStr(it.note, 500),
    };
    if (kind === 'timetable') {
      const day = Number(it.day);
      const start = Number(it.start);
      const end = Number(it.end);
      if (!(day >= 0 && day <= 6) || !(start >= 0) || !(end > start) || end > 24) return null;
      out.push({ ...base, day, start, end });
    } else if (kind === 'schedule') {
      const date = typeof it.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : null;
      const day = it.day == null || it.day === '' ? null : Number(it.day);
      const start = Number(it.start);
      const end = Number(it.end);
      if (!(start >= 0) || !(end > start) || end > 24) return null;
      if (day !== null && !(day >= 0 && day <= 6)) return null;
      out.push({ ...base, date, day, start, end });
    } else if (kind === 'homework') {
      out.push({
        ...base,
        subject: cleanStr(it.subject, 40),
        dueDate: typeof it.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(it.dueDate) ? it.dueDate : null,
        done: !!it.done,
        doneAt: it.doneAt || null,
        createdAt: it.createdAt || new Date().toISOString(),
      });
    } else return null;
  }
  return out;
}

// 공부 기록 검증 (랭킹 검증과 같은 원칙: 구간-길이 일치, 미래 거부, 겹침은 날짜별 합산으로)
function validateStudyRecords(records) {
  if (!Array.isArray(records)) return { error: '공부 기록이 필요해요.' };
  if (records.length > 1000) return { error: '기록이 너무 많아요.' };
  const now = Date.now();
  const oldest = now - 90 * 24 * 60 * 60 * 1000;
  const seen = new Set();
  const perDay = {};
  const out = [];
  for (const r of records) {
    if (!r || typeof r !== 'object') return { error: '기록 형식이 올바르지 않아요.' };
    const id = String(r.id ?? '');
    if (!id || seen.has(id)) return { error: '기록 ID가 올바르지 않아요.' };
    seen.add(id);
    const start = new Date(r.startTime);
    const end = new Date(r.endTime);
    const dur = Number(r.duration);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return { error: '기록 시간이 올바르지 않아요.' };
    if (!(dur > 0) || !Number.isFinite(dur)) return { error: '기록 길이가 올바르지 않아요.' };
    if (end <= start) return { error: '기록 시간이 올바르지 않아요.' };
    if (Math.abs((end - start) / 1000 - dur) > 120) return { error: '기록 길이가 올바르지 않아요.' };
    if (start.getTime() > now) return { error: '미래의 기록은 등록할 수 없어요.' };
    if (start.getTime() < oldest) continue; // 90일 이전은 조용히 제외
    const dayKey = new Date(start.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    perDay[dayKey] = (perDay[dayKey] || 0) + dur;
    if (perDay[dayKey] > 24 * 3600) return { error: '하루 24시간을 초과할 수 없어요.' };
    out.push({
      id,
      title: cleanStr(r.title, 100) || '공부',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: dur,
      color: cleanStr(r.color, 20) || 'indigo',
    });
  }
  out.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  return { records: out };
}

// ---- 로그아웃 (세션 제거) ----
app.post('/api/users/logout', requireSession, async (req, res) => {
  try {
    const h = hashToken(req.get('x-session-token'));
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const updated = users.map((u) =>
      sameCode(u.code, req.me.code) ? { ...u, sessions: (u.sessions || []).filter((s) => s.hash !== h) } : u
    );
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '로그아웃에 실패했어요.' });
  }
});

// ---- 앱 최신 버전 정보 (인앱 업데이트 확인용) ----
app.get('/api/app/version', async (req, res) => {
  try {
    const raw = await fs.promises.readFile(path.join(__dirname, '..', 'app-release.json'), 'utf-8');
    const info = JSON.parse(raw);
    res.json({
      version: String(info.version || '1'),
      apkUrl: typeof info.apkUrl === 'string' ? info.apkUrl : '',
      notes: typeof info.notes === 'string' ? info.notes : '',
    });
  } catch {
    res.json({ version: 0, apkUrl: '', notes: '' });
  }
});

// ---- 내 정보 조회 (역할/담당선생 갱신용) ----
app.get('/api/tutor/me', requireSession, async (req, res) => {
  try {
    res.json({ user: publicUser(withTutorDefaults(req.me)) });
  } catch {
    res.status(500).json({ error: '정보를 불러오지 못했어요.' });
  }
});

// ---- 관리자 모드 상태 (PIN 설정 여부) ----
app.get('/api/tutor/admin/status', requireSession, async (req, res) => {
  try {
    const record = await readBin(USERS_BIN);
    res.json({ hasPin: !!(record.tutorAdmin && record.tutorAdmin.pinHash) });
  } catch {
    res.status(500).json({ error: '상태 조회에 실패했어요.' });
  }
});

// ---- 관리자 모드 활성화 (PIN 설정/확인 → 이 계정을 선생님으로 승격) ----
app.post('/api/tutor/admin/activate', requireSession, async (req, res) => {
  try {
    const pin = String(req.body?.pin || '').trim();
    if (!/^\d{4,12}$/.test(pin)) return res.status(400).json({ error: 'PIN은 4~12자리 숫자여야 해요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const admin = record.tutorAdmin || {};
    const pinHash = hashToken(`tutor-admin-pin:${pin}`);
    let isNewPin = false;
    if (admin.pinHash) {
      if (admin.pinHash !== pinHash) return res.status(403).json({ error: 'PIN이 올바르지 않아요.' });
    } else {
      admin.pinHash = pinHash; // 최초 1회: PIN 등록
      isNewPin = true;
    }
    const updated = users.map((u) => (sameCode(u.code, req.me.code) ? { ...withTutorDefaults(u), role: 'teacher' } : u));
    await writeBin(USERS_BIN, { ...record, tutorAdmin: admin, users: updated });
    const me = findUserByCode(updated, req.me.code);
    res.json({ user: publicUser(me), isNewPin });
  } catch {
    res.status(500).json({ error: '관리자 모드 활성화에 실패했어요.' });
  }
});

// ---- 학생 목록 ----
app.get('/api/tutor/students', requireSession, async (req, res) => {
  try {
    if (req.me.role !== 'teacher') return res.status(403).json({ error: '선생님 계정만 조회할 수 있어요.' });
    const record = await readBin(USERS_BIN);
    res.json({ students: studentListOf(record.users || []) });
  } catch {
    res.status(500).json({ error: '학생 목록을 불러오지 못했어요.' });
  }
});

// ---- 학생 요약 목록 (선생님 대시보드용: 주간 공부/숙제/다음 수업) ----
app.get('/api/tutor/students/summary', requireSession, async (req, res) => {
  try {
    if (req.me.role !== 'teacher') return res.status(403).json({ error: '선생님 계정만 조회할 수 있어요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const kstNow = new Date(now + 9 * 60 * 60 * 1000); // KST 벽시계
    const kstDayKey = kstNow.toISOString().slice(0, 10);
    const kstDow = kstNow.getUTCDay();
    const kstHour = kstNow.getUTCHours() + kstNow.getUTCMinutes() / 60;
    const recDayKey = (r) => new Date(new Date(r.startTime).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 스케줄 항목의 다음 발생 시점 (KST 기준)
    const nextOccurrence = (s) => {
      const start = Number(s.start);
      const end = Number(s.end);
      if (!(start >= 0) || !(end > start) || end > 24) return null;
      if (s.date) {
        if (s.date < kstDayKey) return null;
        if (s.date === kstDayKey && end <= kstHour) return null;
        return { title: s.title, when: s.date, start, end, ts: Date.parse(`${s.date}T00:00:00+09:00`) + start * 3600e3 };
      }
      const day = Number(s.day);
      if (!(day >= 0 && day <= 6)) return null;
      let delta = (day - kstDow + 7) % 7;
      if (delta === 0 && end <= kstHour) delta = 7;
      const d = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() + delta));
      return { title: s.title, when: d.toISOString().slice(0, 10), start, end, ts: d.getTime() + start * 3600e3 };
    };

    const students = users
      .filter((u) => u.role !== 'teacher')
      .map((u) => {
        const v = withTutorDefaults(u);
        const recs = v.studyRecords || [];
        const weekMinutes = Math.round(recs.filter((r) => new Date(r.startTime).getTime() >= weekAgo).reduce((a, r) => a + (Number(r.duration) || 0), 0) / 60);
        const todayMinutes = Math.round(recs.filter((r) => recDayKey(r) === kstDayKey).reduce((a, r) => a + (Number(r.duration) || 0), 0) / 60);
        const hw = v.board.homework || [];
        let nextClass = null;
        for (const s of v.board.schedule || []) {
          const occ = nextOccurrence(s);
          if (occ && (!nextClass || occ.ts < nextClass.ts)) nextClass = occ;
        }
        return {
          code: v.code,
          nickname: v.nickname,
          weekMinutes,
          todayMinutes,
          homeworkTotal: hw.length,
          homeworkDone: hw.filter((h) => h.done).length,
          nextClass: nextClass ? { title: nextClass.title, when: nextClass.when, start: nextClass.start, end: nextClass.end } : null,
        };
      });
    res.json({ students });
  } catch {
    res.status(500).json({ error: '요약을 불러오지 못했어요.' });
  }
});

// ---- 학부모 목록 (선생님만) ----
app.get('/api/tutor/parents', requireSession, async (req, res) => {
  try {
    if (req.me.role !== 'teacher') return res.status(403).json({ error: '선생님 계정만 조회할 수 있어요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const parents = users
      .filter((u) => u.role === 'parent')
      .map((u) => ({
        code: u.code,
        nickname: u.nickname,
        linkedChildren: (u.linkedChildren || []).map((cc) => {
          const child = findUserByCode(users, cc);
          return child ? { code: child.code, nickname: child.nickname } : null;
        }).filter(Boolean),
      }));
    res.json({ parents });
  } catch {
    res.status(500).json({ error: '학부모 목록을 불러오지 못했어요.' });
  }
});

// ---- 학부모-자녀 연결 (선생님만) ----
app.post('/api/tutor/parents/link', requireSession, async (req, res) => {
  try {
    if (req.me.role !== 'teacher') return res.status(403).json({ error: '선생님 계정만 연결할 수 있어요.' });
    const { parentCode, studentCode } = req.body || {};
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const parent = findUserByCode(users, parentCode);
    const student = findUserByCode(users, studentCode);
    if (!parent || parent.role !== 'parent') return res.status(404).json({ error: '학부모를 찾을 수 없어요.' });
    if (!student || student.role === 'teacher') return res.status(404).json({ error: '학생을 찾을 수 없어요.' });
    parent.linkedChildren = parent.linkedChildren || [];
    if (!parent.linkedChildren.some((c) => sameCode(c, student.code))) {
      parent.linkedChildren.push(student.code);
    }
    await writeBin(USERS_BIN, { ...record, users });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '연결에 실패했어요.' });
  }
});

// ---- 학부모-자녀 연결 해제 (선생님만) ----
app.delete('/api/tutor/parents/link', requireSession, async (req, res) => {
  try {
    if (req.me.role !== 'teacher') return res.status(403).json({ error: '선생님 계정만 해제할 수 있어요.' });
    const { parentCode, studentCode } = req.body || {};
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const parent = findUserByCode(users, parentCode);
    if (!parent || parent.role !== 'parent') return res.status(404).json({ error: '학부모를 찾을 수 없어요.' });
    parent.linkedChildren = (parent.linkedChildren || []).filter((c) => !sameCode(c, studentCode));
    await writeBin(USERS_BIN, { ...record, users });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '해제에 실패했어요.' });
  }
});

// ---- 내 자녀 목록 (학부모 본인) ----
app.get('/api/tutor/my-children', requireSession, async (req, res) => {
  try {
    if (req.me.role !== 'parent') return res.status(403).json({ error: '학부모 계정만 조회할 수 있어요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const me = findUserByCode(users, req.me.code);
    const children = (me?.linkedChildren || []).map((cc) => {
      const child = findUserByCode(users, cc);
      return child ? { code: child.code, nickname: child.nickname } : null;
    }).filter(Boolean);
    res.json({ children });
  } catch {
    res.status(500).json({ error: '자녀 목록을 불러오지 못했어요.' });
  }
});

// ---- 학생 보드 조회 (학생 본인 / 담당 선생님만) ----
app.get('/api/tutor/board/:code', requireSession, async (req, res) => {
  try {
    const record = await readBin(USERS_BIN);
    const student = findUserByCode(record.users || [], req.params.code);
    if (!canAccessBoard(req.me, student)) return res.status(403).json({ error: '볼 수 있는 권한이 없어요.' });
    res.json({ nickname: student.nickname, code: student.code, board: withTutorDefaults(student).board });
  } catch {
    res.status(500).json({ error: '보드를 불러오지 못했어요.' });
  }
});

// ---- 학생 보드 저장 (학생 본인 / 담당 선생님만) ----
app.put('/api/tutor/board/:code', requireSession, async (req, res) => {
  try {
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const student = findUserByCode(users, req.params.code);
    if (!canWriteBoard(req.me, student)) return res.status(403).json({ error: '수정할 수 있는 권한이 없어요.' });
    const { board } = req.body || {};
    const timetable = validateBoardSection(board?.timetable, 'timetable');
    const schedule = validateBoardSection(board?.schedule, 'schedule');
    const homework = validateBoardSection(board?.homework, 'homework');
    if (!timetable || !schedule || !homework) return res.status(400).json({ error: '보드 형식이 올바르지 않아요.' });
    const updated = users.map((u) =>
      sameCode(u.code, student.code) ? { ...withTutorDefaults(u), board: { timetable, schedule, homework } } : u
    );
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true, board: { timetable, schedule, homework } });
  } catch {
    res.status(500).json({ error: '보드 저장에 실패했어요.' });
  }
});

// ---- 공부 기록 동기화 (학생 본인) ----
app.post('/api/tutor/records', requireSession, async (req, res) => {
  try {
    const v = validateStudyRecords(req.body?.records);
    if (v.error) return res.status(400).json({ error: v.error });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const updated = users.map((u) =>
      sameCode(u.code, req.me.code) ? { ...withTutorDefaults(u), studyRecords: v.records } : u
    );
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true, count: v.records.length });
  } catch {
    res.status(500).json({ error: '기록 동기화에 실패했어요.' });
  }
});

// ---- 공부 기록 조회 (학생 본인 / 담당 선생님만) ----
app.get('/api/tutor/records/:code', requireSession, async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90);
    const record = await readBin(USERS_BIN);
    const student = findUserByCode(record.users || [], req.params.code);
    if (!canAccessBoard(req.me, student)) return res.status(403).json({ error: '볼 수 있는 권한이 없어요.' });
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const records = (student.studyRecords || []).filter((r) => new Date(r.startTime).getTime() >= cutoff);
    res.json({ records });
  } catch {
    res.status(500).json({ error: '기록을 불러오지 못했어요.' });
  }
});

// =================== 1:1 채팅 (선생님↔학생 전용, 학부모 제외) ===================
// 룸은 (선생님 코드, 학생 코드) 쌍으로만 존재 — 학생 간 룸은 만들 수 없음
const CHAT_MAX_TEXT = 1000;
const CHAT_MAX_MESSAGES = 500;

const chatRoomKey = (teacherCode, studentCode) => `${teacherCode}::${studentCode}`;

// 세션 기준으로 스레드의 양쪽 당사자를 확정.
// 선생님은 자기 코드가 teacherCode일 때만, 학생은 자기 코드가 studentCode일 때만 접근.
// 상대 코드를 직접 넘겨도, 세션과 맞지 않으면 403 — 클라이언트 숨김만으로 막는 게 아님.
function resolveChatThread(me, otherCode, users) {
  const other = findUserByCode(users, otherCode);
  if (!other) return { error: 404, message: '대화 상대를 찾을 수 없어요.' };
  if (me.role === 'teacher') {
    if (other.role !== 'student') return { error: 403, message: '채팅할 수 없는 상대예요.' };
    return { teacher: me, student: other };
  }
  if (me.role === 'student') {
    if (other.role !== 'teacher') return { error: 403, message: '채팅할 수 없는 상대예요.' };
    return { teacher: other, student: me };
  }
  return { error: 403, message: '채팅을 쓸 수 없는 계정이에요.' };
}

const chatThreadSummary = (thread, other) => {
  const messages = thread?.messages || [];
  const last = messages.length ? messages[messages.length - 1] : null;
  return {
    otherCode: other.code,
    otherNickname: other.nickname,
    messageCount: messages.length,
    lastMessage: last ? { id: last.id, fromRole: last.fromRole, text: last.text, createdAt: last.createdAt } : null,
  };
};

// ---- 스레드 목록: 선생님은 학생별, 학생은 선생님별 (학부모는 403) ----
app.get('/api/tutor/chat/threads', requireSession, async (req, res) => {
  try {
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const threads = record.chatThreads || {};
    if (req.me.role === 'teacher') {
      const list = users
        .filter((u) => u.role === 'student')
        .map((s) => chatThreadSummary(threads[chatRoomKey(req.me.code, s.code)], s));
      return res.json({ threads: list });
    }
    if (req.me.role === 'student') {
      const list = users
        .filter((u) => u.role === 'teacher')
        .map((t) => chatThreadSummary(threads[chatRoomKey(t.code, req.me.code)], t));
      return res.json({ threads: list });
    }
    return res.status(403).json({ error: '채팅을 쓸 수 없는 계정이에요.' });
  } catch {
    res.status(500).json({ error: '채팅 목록을 불러오지 못했어요.' });
  }
});

// ---- 스레드 메시지 조회 ----
app.get('/api/tutor/chat/thread/:otherCode', requireSession, async (req, res) => {
  try {
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const r = resolveChatThread(req.me, req.params.otherCode, users);
    if (r.error) return res.status(r.error).json({ error: r.message });
    const thread = (record.chatThreads || {})[chatRoomKey(r.teacher.code, r.student.code)];
    res.json({
      teacherCode: r.teacher.code,
      studentCode: r.student.code,
      otherNickname: req.me.role === 'teacher' ? r.student.nickname : r.teacher.nickname,
      messages: thread?.messages || [],
    });
  } catch {
    res.status(500).json({ error: '메시지를 불러오지 못했어요.' });
  }
});

// ---- 메시지 전송 (스레드가 없으면 첫 메시지와 함께 생성) ----
app.post('/api/tutor/chat/thread/:otherCode', requireSession, async (req, res) => {
  try {
    const text = cleanStr(req.body?.text, CHAT_MAX_TEXT);
    if (!text) return res.status(400).json({ error: '메시지를 입력해주세요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const r = resolveChatThread(req.me, req.params.otherCode, users);
    if (r.error) return res.status(r.error).json({ error: r.message });
    const threads = record.chatThreads || {};
    const key = chatRoomKey(r.teacher.code, r.student.code);
    const thread = threads[key] || { teacherCode: r.teacher.code, studentCode: r.student.code, messages: [] };
    thread.messages = [
      ...thread.messages,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        fromCode: req.me.code,
        fromRole: req.me.role,
        text,
        createdAt: new Date().toISOString(),
      },
    ].slice(-CHAT_MAX_MESSAGES);
    threads[key] = thread;
    await writeBin(USERS_BIN, { ...record, chatThreads: threads });
    res.json({ messages: thread.messages });
  } catch {
    res.status(500).json({ error: '메시지 전송에 실패했어요.' });
  }
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
