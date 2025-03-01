document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    const taskForm = document.getElementById('task-form');
  
    // タスク一覧を取得して表示する関数
    function fetchTasks() {
      fetch('/tasks')
        .then(response => response.json())
        .then(tasks => {
          taskList.innerHTML = '';
          tasks.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = 'task-item';
            taskDiv.textContent = `${task.title} (${task.due_date || '未設定'})`;
            taskList.appendChild(taskDiv);
          });
        })
        .catch(err => console.error('タスクの取得に失敗:', err));
    }
  
    // タスクの作成フォーム送信時の処理
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('task-title').value;
      const description = document.getElementById('task-desc').value;
      const due_date = document.getElementById('task-date').value;
  
      fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, due_date })
      })
        .then(response => response.json())
        .then(result => {
          console.log('タスク作成成功:', result);
          fetchTasks();
          taskForm.reset();
        })
        .catch(err => console.error('タスク作成に失敗:', err));
    });
  
    // 初回ロード時にタスク一覧を取得
    fetchTasks();
  });
  