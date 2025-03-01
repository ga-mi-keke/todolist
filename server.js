require('dotenv').config();
const express = require('express');
const app = express();
const db = require('./db');
const port = process.env.PORT || 3000;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const secretKey = process.env.JWT_SECRET || 'your_secret_key';


// JSONをパースするミドルウェアを追加（重要！）
app.use(express.json());
// publicディレクトリの静的ファイルを提供
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
// ルート ("/") へのリクエスト
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

// "/about" へのリクエスト
app.get('/about', (req, res) => {
  res.send('This is the About page.');
});

// ユーザー取得エンドポイント
app.get('/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
});

// タスク取得エンドポイント（修正：外に移動）
app.get('/tasks', (req, res) => {
  db.query('SELECT * FROM tasks', (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
});

// タスク作成エンドポイント
app.post('/tasks', (req, res) => {
  const { title, description, due_date } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'タイトルは必須です' });
  }
  
  const query = 'INSERT INTO tasks (title, description, due_date) VALUES (?, ?, ?)';
  db.query(query, [title, description, due_date], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({ message: 'タスクが作成されました', taskId: results.insertId });
    }
  });
});

// タスク更新エンドポイント
app.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, due_date, completed } = req.body;
  
  const query = 'UPDATE tasks SET title = ?, description = ?, due_date = ?, completed = ? WHERE id = ?';
  db.query(query, [title, description, due_date, completed, id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'タスクが更新されました' });
    }
  });
});

// タスク削除エンドポイント
app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  
  const query = 'DELETE FROM tasks WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'タスクが削除されました' });
    }
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

app.post('/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: '全ての項目（username, email, password）は必須です' });
  }
  
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  
  const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
  db.query(query, [username, email, hash], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'ユーザー登録が完了しました', userId: results.insertId });
  });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Emailとpasswordは必須です' });
  }
  
  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: '認証に失敗しました' });
    }
    
    const user = results[0];
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '認証に失敗しました' });
    }
    
    // JWTトークンの作成（有効期限1時間）
    const token = jwt.sign({ id: user.id, email: user.email }, secretKey, { expiresIn: '1h' });
    res.json({ message: 'ログイン成功', token });
  });
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // ヘッダーは "Bearer <token>" の形式で渡すことを想定
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendStatus(401); // トークンがなければ認証エラー
  }
  
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(403); // トークンが無効な場合
    }
    req.user = user;
    next();
  });
}





