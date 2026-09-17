import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

// 간단 해시 (프론트와 동일하게 유지해야 로그인 호환)
const hashPassword = (pw) => {
  let h = 5381;
  for (let i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
  return 'h' + Math.abs(h).toString(36) + '_' + pw.length;
};

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
  } catch (e) {
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
  } catch (e) {
    res.status(500).json({ error: '의견 등록에 실패했어요.' });
  }
});

app.post('/api/requests/:id/vote', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { delta } = req.body || {};
    const record = await readBin(REQUESTS_BIN);
    const items = (record.items || []).map((r) =>
      r.id === id ? { ...r, votes: Math.max(0, (r.votes || 0) + (delta || 0)) } : r
    );
    await writeBin(REQUESTS_BIN, { ...record, items });
    res.json({ items: items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  } catch (e) {
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
  } catch (e) {
    res.status(500).json({ error: '의견 삭제에 실패했어요.' });
  }
});

// =================== 랭킹 (공개 읽기/등록) ===================
app.get('/api/rankings', async (req, res) => {
  try {
    const record = await readBin(RANKINGS_BIN);
    const scores = (record.scores || []).sort((a, b) => b.score - a.score);
    res.json({ scores });
  } catch (e) {
    res.status(500).json({ error: '랭킹을 불러오지 못했어요.' });
  }
});

app.post('/api/rankings', async (req, res) => {
  try {
    const { nick, score } = req.body || {};
    if (!nick) return res.status(400).json({ error: '닉네임이 필요해요.' });
    const record = await readBin(RANKINGS_BIN);
    let scores = (record.scores || []).filter((s) => s.nick !== nick);
    scores.push({ nick, score: Number(score) || 0, updatedAt: new Date().toISOString() });
    await writeBin(RANKINGS_BIN, { ...record, scores });
    res.json({ scores: scores.sort((a, b) => b.score - a.score) });
  } catch (e) {
    res.status(500).json({ error: '점수 등록에 실패했어요.' });
  }
});

// =================== 사용자 (가입/로그인/코드 조회) ===================
app.post('/api/users/signup', async (req, res) => {
  try {
    const { id, password, nickname } = req.body || {};
    if (!id || !password || !nickname) return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    if (users.some((u) => u.id === id)) return res.status(409).json({ error: '이미 사용 중인 아이디예요.' });

    const existingCodes = new Set(users.map((u) => u.code));
    let code = generateUserCode();
    while (existingCodes.has(code)) code = generateUserCode();

    const newUser = { id, password: hashPassword(password), nickname, code, friends: [], friendRequests: [], createdAt: new Date().toISOString() };
    users.push(newUser);
    await writeBin(USERS_BIN, { ...record, users });
    res.json({ user: newUser });
  } catch (e) {
    res.status(500).json({ error: '가입 저장에 실패했어요.' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { id, password } = req.body || {};
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const found = users.find((u) => u.id === id);
    if (!found || found.password !== hashPassword(password)) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않아요.' });
    }
    res.json({ user: found });
  } catch (e) {
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
    const found = users.find((u) => u.code === code);
    if (!found) return res.status(404).json({ error: '사용자를 찾을 수 없어요.' });
    res.json({ user: { nickname: found.nickname, code: found.code } });
  } catch (e) {
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
    const me = users.find((u) => u.code === code);
    if (!me) return res.status(404).json({ error: '사용자를 찾을 수 없어요.' });

    // 친구 목록 (code → nickname)
    const friends = (me.friends || []).map((fcode) => {
      const f = users.find((u) => u.code === fcode);
      return { code: fcode, nickname: f ? f.nickname : fcode };
    });
    // 받은 친구 요청 (보낸 사람 코드/닉네임)
    const requests = (me.friendRequests || []).map((r) => {
      const from = users.find((u) => u.code === r.fromCode);
      return { fromCode: r.fromCode, fromNickname: from ? from.nickname : r.fromCode, at: r.at };
    });
    res.json({ friends, requests });
  } catch (e) {
    res.status(500).json({ error: '친구 목록을 불러오지 못했어요.' });
  }
});

// 친구 요청 보내기
app.post('/api/friends/request', async (req, res) => {
  try {
    const { fromCode, toCode } = req.body || {};
    if (!fromCode || !toCode) return res.status(400).json({ error: '코드가 필요해요.' });
    if (fromCode === toCode) return res.status(400).json({ error: '자기 자신에게는 요청할 수 없어요.' });
    const record = await readBin(USERS_BIN);
    const users = record.users || [];
    const target = users.find((u) => u.code === toCode);
    if (!target) return res.status(404).json({ error: '대상 사용자를 찾을 수 없어요.' });
    const me = users.find((u) => u.code === fromCode);
    if (!me) return res.status(404).json({ error: '내 계정을 찾을 수 없어요.' });

    // 이미 친구인지
    if ((target.friends || []).includes(fromCode)) return res.status(400).json({ error: '이미 친구예요.' });
    // 이미 요청을 보냈는지
    if ((target.friendRequests || []).some((r) => r.fromCode === fromCode)) {
      return res.status(400).json({ error: '이미 친구 요청을 보냈어요.' });
    }
    // 상대가 나에게 이미 요청을 보냈다면 바로 친구 맺기
    if ((me.friendRequests || []).some((r) => r.fromCode === toCode)) {
      const updated = users.map((u) => {
        if (u.code === fromCode) {
          return { ...u, friends: [...(u.friends || []), toCode], friendRequests: (u.friendRequests || []).filter((r) => r.fromCode !== toCode) };
        }
        if (u.code === toCode) {
          return { ...u, friends: [...(u.friends || []), fromCode] };
        }
        return u;
      });
      await writeBin(USERS_BIN, { ...record, users: updated });
      return res.json({ ok: true, autoAccepted: true });
    }

    // 요청 추가
    const updated = users.map((u) => {
      if (u.code === toCode) {
        return { ...u, friendRequests: [...(u.friendRequests || []), { fromCode, at: new Date().toISOString() }] };
      }
      return u;
    });
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true });
  } catch (e) {
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
    const updated = users.map((u) => {
      if (u.code === code) {
        return { ...u, friends: [...(u.friends || []), fromCode], friendRequests: (u.friendRequests || []).filter((r) => r.fromCode !== fromCode) };
      }
      if (u.code === fromCode) {
        return { ...u, friends: [...(u.friends || []), code] };
      }
      return u;
    });
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true });
  } catch (e) {
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
    const updated = users.map((u) => {
      if (u.code === code) {
        return { ...u, friendRequests: (u.friendRequests || []).filter((r) => r.fromCode !== fromCode) };
      }
      return u;
    });
    await writeBin(USERS_BIN, { ...record, users: updated });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '친구 요청 거절에 실패했어요.' });
  }
});

// =================== 공지 (공개 읽기, 관리자만 작성/삭제) ===================
app.get('/api/announcements', async (req, res) => {
  try {
    const record = await readBin(REQUESTS_BIN);
    const announcements = (record.announcements || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ announcements });
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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

app.listen(PORT, () => {
  console.log(`✅ 백엔드 서버 실행 중: http://localhost:${PORT}`);
});
