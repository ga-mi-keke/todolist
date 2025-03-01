require('dotenv').config();
const express = require('express');
const app = express();
const db = require('./db');
const port = process.env.PORT || 3000;

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || 'your_secret_key';
db.connect((err) => {
  if (err) {
    console.error('❌ MySQL接続エラー:', err);
    process.exit(1); // サーバーを停止
  } else {
    console.log('✅ MySQLに接続成功');
  }
});

// JSONのパースと静的ファイル提供のミドルウェア
app.use(express.json());
app.use(express.static('public'));

// 認証ミドルウェア
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ルートエンドポイント
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});
app.get('/about', (req, res) => {
  res.send('This is the About page.');
});

// ユーザー登録エンドポイント
app.post('/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: '全ての項目（username, email, password）は必須です' });
  }
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
  db.query(query, [username, email, hash], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'ユーザー登録が完了しました', userId: results.insertId });
  });
});

// ログインエンドポイント
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Emailとpasswordは必須です' });
  }
  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: '認証に失敗しました' });
    const user = results[0];
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '認証に失敗しました' });
    }
    // JWTトークンを作成（有効期限1時間）
    const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '1h' });
    res.json({ message: 'ログイン成功', token });
  });
});

// 認証が必要なタスク関連エンドポイント

// ① ログインユーザーのタスク一覧取得
app.get('/tasks', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT * FROM tasks WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ② 新規タスク作成（ログインユーザーに紐づく）
app.post('/tasks', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { title, description, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'タイトルは必須です' });
  const query = 'INSERT INTO tasks (title, description, due_date, user_id) VALUES (?, ?, ?, ?)';
  db.query(query, [title, description, due_date, userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'タスクが作成されました', taskId: results.insertId });
  });
});

// ③ タスク更新（該当タスクがログインユーザーのものであるか確認）
app.put('/tasks/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, description, due_date, completed } = req.body;
  const query = 'UPDATE tasks SET title = ?, description = ?, due_date = ?, completed = ? WHERE id = ? AND user_id = ?';
  db.query(query, [title, description, due_date, completed, id, userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'タスクが見つからないか、権限がありません' });
    }
    res.json({ message: 'タスクが更新されました' });
  });
});

// ④ タスク削除（ユーザー所有のタスクのみ削除可能）
app.delete('/tasks/:id', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const query = 'DELETE FROM tasks WHERE id = ? AND user_id = ?';
  db.query(query, [id, userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'タスクが見つからないか、権限がありません' });
    }
    res.json({ message: 'タスクが削除されました' });
  });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// サーバーの起動
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
