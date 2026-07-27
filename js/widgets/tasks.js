/**
 * 任务清单板块
 */
class TasksWidget extends WidgetBase {
  constructor() {
    super('tasks', {
      name: '任务清单',
      icon: '✅',
      collection: 'tasks',
      addPlaceholder: '添加新任务...'
    });
  }
  
  async onAdd() {
    const title = this.getInput();
    if (!title) return;
    
    const task = {
      _id: Storage.generateId(),
      title,
      completed: false,
      priority: 'p3',
      dueDate: null,
      tags: [],
      createdAt: new Date().toISOString()
    };
    
    await Storage.put('tasks', task);
    if (CloudConfig.enabled) SyncEngine.push('tasks', task);
    this.clearInput();
    this.loadData();
  }
  
  async loadData() {
    const tasks = await Storage.getAll('tasks');
    this.renderList(tasks);
    this.updateBadge(tasks.filter(t => !t.completed).length);
  }
  
  renderList(tasks) {
    if (!this.bodyEl) return;
    
    const active = tasks.filter(t => !t.completed);
    const completed = tasks.filter(t => t.completed);
    
    // 排序: 优先级高的在前，然后按创建时间
    const sortFn = (a, b) => {
      const pOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
      const pDiff = (pOrder[a.priority] || 3) - (pOrder[b.priority] || 3);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    };
    
    active.sort(sortFn);
    completed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const all = [...active, ...completed];
    
    if (all.length === 0) {
      this.bodyEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>暂无任务，添加一个吧</p></div>`;
      return;
    }
    
    this.bodyEl.innerHTML = all.map(task => `
      <div class="task-item" data-id="${task._id}">
        <div class="checkbox-circle ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task._id}"></div>
        <div class="task-content">
          <div class="task-title ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.title)}</div>
          <div class="task-meta">
            ${task.priority !== 'p3' ? `<span class="tag tag-${task.priority}">${task.priority.toUpperCase()}</span>` : ''}
            ${task.dueDate ? `<span class="text-xs text-muted">📅 ${task.dueDate}</span>` : ''}
            ${(task.tags || []).map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
        <button class="icon-btn" data-action="delete" data-id="${task._id}" title="删除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');
    
    // 事件委托
    this.bodyEl.querySelectorAll('[data-action="toggle"]').forEach(el => {
      el.addEventListener('click', () => this.toggleTask(el.dataset.id));
    });
    this.bodyEl.querySelectorAll('[data-action="delete"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTask(el.dataset.id);
      });
    });
  }
  
  async toggleTask(id) {
    const task = await Storage.get('tasks', id);
    if (!task) return;
    task.completed = !task.completed;
    await Storage.put('tasks', task);
    if (CloudConfig.enabled) SyncEngine.push('tasks', task);
    this.loadData();
    if (window._refreshDashboard) window._refreshDashboard();
  }
  
  async deleteTask(id) {
    await Storage.delete('tasks', id);
    if (CloudConfig.enabled) SyncEngine.pushDelete('tasks', id);
    this.loadData();
    if (window._refreshDashboard) window._refreshDashboard();
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 注册
WidgetRegistry.register('tasks', {
  name: '任务清单',
  icon: '✅',
  description: '管理待办任务，设置优先级和截止日期',
  category: '效率',
  widgetClass: TasksWidget
});
