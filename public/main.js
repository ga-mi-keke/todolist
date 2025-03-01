document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('auth');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const registerSection = document.getElementById('register-section');
  const showRegister = document.getElementById('show-register');
  const showLogin = document.getElementById('show-login');
  const taskManager = document.getElementById('task-manager');
  const logoutBtn = document.getElementById('logout');
  const taskList = document.getElementById('task-list');
  const taskForm = document.getElementById('task-form');

  let token = localStorage.getItem('token') || '';

  // 表示切替
  function showTaskManager() {
    authSection.style.display = 'none';
    taskManager.style.display = 'block';
    fetchTasks();
  }
  function showAuth() {
    authSection.style.display = 'block';
    taskManager.style.display = 'none';
  }

  // フォームの切り替え
  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'none';
    registerSection.style.display = 'block';
  });
  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerSection.style.display = 'none';
    loginForm.style.display = 'block';
  });

  // ログイン処理
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(response => response.json())
      .then(data => {
        if (data.token) {
          token = data.token;
          localStorage.setItem('token', token);
          showTaskManager();
        } else {
          alert('ログイン失敗: ' + (data.error || '不明なエラー'));
        }
      })
      .catch(err => console.error('ログインエラー:', err));
  });

  // ユーザー登録処理
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
      .then(response => response.json())
      .then(data => {
        if (data.userId) {
          alert('登録成功！ログインしてください。');
          registerSection.style.display = 'none';
          loginForm.style.display = 'block';
        } else {
          alert('登録失敗: ' + (data.error || '不明なエラー'));
        }
      })
      .catch(err => console.error('登録エラー:', err));
  });

  // ログアウト
  logoutBtn.addEventListener('click', () => {
    token = '';
    localStorage.removeItem('token');
    showAuth();
  });

  // タスク一覧取得（認証済みリクエスト）
  function fetchTasks() {
    fetch('/tasks', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(response => response.json())
      .then(tasks => {
        taskList.innerHTML = '';
        tasks.forEach(task => {
          const taskDiv = document.createElement('div');
          taskDiv.className = 'task-item';
          taskDiv.innerHTML = `
            <span>${task.title} (${task.due_date || '未設定'})</span>
            <button data-id="${task.id}" class="edit-btn">編集</button>
            <button data-id="${task.id}" class="delete-btn">削除</button>
          `;
          taskList.appendChild(taskDiv);
        });
        attachTaskButtons();
      })
      .catch(err => console.error('タスク取得エラー:', err));
  }

  // タスク作成
  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    const due_date = document.getElementById('task-date').value;
    fetch('/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ title, description, due_date })
    })
      .then(response => response.json())
      .then(result => {
        console.log('タスク作成:', result);
        fetchTasks();
        taskForm.reset();
      })
      .catch(err => console.error('タスク作成エラー:', err));
  });

  // タスク編集・削除ボタンのイベント付与
  function attachTaskButtons() {
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-id');
        fetch(`/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        })
          .then(response => response.json())
          .then(result => {
            console.log('タスク削除:', result);
            fetchTasks();
          })
          .catch(err => console.error('削除エラー:', err));
      });
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.getAttribute('data-id');
        const newTitle = prompt('新しいタイトルを入力してください:');
        if (newTitle) {
          // シンプルな例としてタイトルのみ更新。必要に応じて他のフィールドも更新可能です。
          fetch(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ title: newTitle })
          })
            .then(response => response.json())
            .then(result => {
              console.log('タスク更新:', result);
              fetchTasks();
            })
            .catch(err => console.error('更新エラー:', err));
        }
      });
    });
  }

  // 初期表示：保存されたトークンがあればタスク管理画面を表示
  if (token) {
    showTaskManager();
  } else {
    showAuth();
  }
});
