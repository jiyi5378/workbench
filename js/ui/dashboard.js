/**
 * 首页仪表盘
 * 今日概览 + 板块网格渲染
 */
const Dashboard = {
  _widgetInstances: {},
  
  /**
   * 刷新今日概览
   */
  async refreshOverview() {
    const container = document.getElementById('overviewCards');
    if (!container) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // 并行获取数据
    const [tasks, events, habits, birthdays] = await Promise.all([
      Storage.getAll('tasks'),
      Storage.getAll('events'),
      Storage.getAll('habits'),
      Storage.getAll('birthdays')
    ]);
    
    const activeTasks = tasks.filter(t => !t.completed).length;
    const todayEvents = events.filter(e => e.date === today).length;
    
    // 今日打卡数
    let todayCheckins = 0;
    habits.forEach(h => {
      if ((h.checkins || []).includes(today)) todayCheckins++;
    });
    
    // 最近生日
    const enrichedBdays = birthdays.map(b => {
      const bDate = new Date(b.date);
      const thisYear = new Date(new Date().getFullYear(), bDate.getMonth(), bDate.getDate());
      let nextDate = thisYear >= new Date() ? thisYear : new Date(new Date().getFullYear() + 1, bDate.getMonth(), bDate.getDate());
      return { ...b, daysUntil: Math.ceil((nextDate - new Date()) / 86400000) };
    });
    enrichedBdays.sort((a, b) => a.daysUntil - b.daysUntil);
    const upcomingBday = enrichedBdays[0];
    
    const cards = [
      { icon: '✅', label: '待办任务', value: `${activeTasks} 项`, color: 'var(--widget-tasks)' },
      { icon: '📅', label: '今日日程', value: `${todayEvents} 项`, color: 'var(--widget-calendar)' },
      { icon: '🎯', label: '今日打卡', value: `${todayCheckins}/${habits.length || '-'}`, color: 'var(--widget-habits)' },
      { icon: '🎂', label: '即将到来', value: upcomingBday ? `${upcomingBday.name}` : '无', color: 'var(--widget-birthdays)' },
    ];
    
    container.innerHTML = cards.map(c => `
      <div class="overview-card">
        <div class="overview-card-icon" style="background:${c.color}20">${c.icon}</div>
        <div class="overview-card-info">
          <div class="overview-card-label">${c.label}</div>
          <div class="overview-card-value">${c.value}</div>
        </div>
      </div>
    `).join('');
  },
  
  /**
   * 渲染所有已启用的板块
   */
  async renderWidgets() {
    const grid = document.getElementById('widgetsGrid');
    const empty = document.getElementById('widgetsEmpty');
    if (!grid) return;
    
    const enabled = WidgetRegistry.getEnabled();
    
    if (enabled.length === 0) {
      grid.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }
    
    empty?.classList.add('hidden');
    
    // 为每个板块创建容器
    grid.innerHTML = enabled.map(def => 
      `<div id="widget-container-${def.id}"></div>`
    ).join('');
    
    // 初始化板块实例
    enabled.forEach(def => {
      const container = document.getElementById(`widget-container-${def.id}`);
      if (!container) return;
      
      const WidgetClass = def.widgetClass;
      const instance = new WidgetClass();
      this._widgetInstances[def.id] = instance;
      instance.render(container);
    });
  },
  
  /**
   * 刷新所有板块
   */
  refreshAll() {
    Object.values(this._widgetInstances).forEach(w => w.refresh());
    this.refreshOverview();
  }
};
