/**
 * 习惯打卡板块
 */
class HabitsWidget extends WidgetBase {
  constructor() {
    super('habits', {
      name: '习惯打卡',
      icon: '🎯',
      collection: 'habits',
      addPlaceholder: '添加新习惯...'
    });
  }
  
  async onAdd() {
    const name = this.getInput();
    if (!name) return;
    
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f97316'];
    const habit = {
      _id: Storage.generateId(),
      name,
      color: colors[Math.floor(Math.random() * colors.length)],
      checkins: [],
      createdAt: new Date().toISOString()
    };
    
    await Storage.put('habits', habit);
    if (CloudConfig.enabled) SyncEngine.push('habits', habit);
    this.clearInput();
    this.loadData();
  }
  
  async loadData() {
    if (!this.bodyEl) return;
    const habits = await Storage.getAll('habits');
    const today = new Date().toISOString().split('T')[0];
    
    this.updateBadge(habits.length);
    
    if (habits.length === 0) {
      this.bodyEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>添加一个习惯开始打卡吧</p></div>`;
      return;
    }
    
    let html = '';
    
    habits.forEach(habit => {
      const checkins = habit.checkins || [];
      const checkedToday = checkins.includes(today);
      
      // 计算连续天数
      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const ds = d.toISOString().split('T')[0];
        if (checkins.includes(ds)) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else if (i === 0) {
          break; // 今天没打卡不计算
        } else {
          break;
        }
      }
      
      html += `
        <div class="habit-item">
          <button class="habit-check-btn ${checkedToday ? 'checked' : ''}" data-action="check" data-id="${habit._id}">
            ${checkedToday ? '✓' : ''}
          </button>
          <div class="habit-info">
            <div class="habit-name">${this.escapeHtml(habit.name)}</div>
            <div class="habit-streak">
              🔥 连续 ${streak} 天 · 共 ${checkins.length} 次
            </div>
          </div>
          <button class="icon-btn" data-action="deleteHabit" data-id="${habit._id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
    });
    
    this.bodyEl.innerHTML = html;
    
    this.bodyEl.querySelectorAll('[data-action="check"]').forEach(el => {
      el.addEventListener('click', async () => {
        const habit = await Storage.get('habits', el.dataset.id);
        if (!habit) return;
        const checkins = habit.checkins || [];
        const today = new Date().toISOString().split('T')[0];
        
        if (checkins.includes(today)) {
          habit.checkins = checkins.filter(d => d !== today);
        } else {
          habit.checkins = [...checkins, today];
        }
        
        await Storage.put('habits', habit);
        if (CloudConfig.enabled) SyncEngine.push('habits', habit);
        this.loadData();
        if (window._refreshDashboard) window._refreshDashboard();
      });
    });
    
    this.bodyEl.querySelectorAll('[data-action="deleteHabit"]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.delete('habits', el.dataset.id);
        if (CloudConfig.enabled) SyncEngine.pushDelete('habits', el.dataset.id);
        this.loadData();
      });
    });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

WidgetRegistry.register('habits', {
  name: '习惯打卡',
  icon: '🎯',
  description: '每日打卡，追踪连续天数',
  category: '生活',
  widgetClass: HabitsWidget
});
