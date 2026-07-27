/**
 * 日程规划板块
 */
class CalendarWidget extends WidgetBase {
  constructor() {
    super('calendar', {
      name: '日程规划',
      icon: '📅',
      collection: 'events',
      addPlaceholder: '添加日程...'
    });
    this.currentDate = new Date();
    this.selectedDate = null;
  }
  
  async onAdd() {
    const title = this.getInput();
    if (!title) return;
    
    const date = this.selectedDate 
      ? `${this.selectedDate.getFullYear()}-${String(this.selectedDate.getMonth()+1).padStart(2,'0')}-${String(this.selectedDate.getDate()).padStart(2,'0')}`
      : new Date().toISOString().split('T')[0];
    
    const event = {
      _id: Storage.generateId(),
      title,
      date,
      startTime: '',
      endTime: '',
      repeat: 'none',
      color: '#6366f1',
      notes: '',
      createdAt: new Date().toISOString()
    };
    
    await Storage.put('events', event);
    if (CloudConfig.enabled) SyncEngine.push('events', event);
    this.clearInput();
    this.loadData();
  }
  
  async loadData() {
    if (!this.bodyEl) return;
    const events = await Storage.getAll('events');
    this.renderCalendar(events);
    
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.date === today);
    this.updateBadge(todayEvents.length);
  }
  
  renderCalendar(events) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    
    // 收集每天的事件数
    const eventDays = {};
    events.forEach(e => {
      if (e.date) {
        eventDays[e.date] = (eventDays[e.date] || 0) + 1;
      }
    });
    
    let html = `
      <div class="calendar-nav">
        <button class="icon-btn" data-action="prevMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="calendar-month">${year}年 ${month + 1}月</span>
        <button class="icon-btn" data-action="nextMonth">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="calendar-grid">
        ${['日','一','二','三','四','五','六'].map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
    `;
    
    // 上月末尾
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateStr = `${month === 0 ? year-1 : year}-${String(month === 0 ? 12 : month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      html += `<div class="calendar-day other-month" data-date="${dateStr}">${d}</div>`;
    }
    
    // 当月
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = dateStr === todayStr;
      const hasEvents = eventDays[dateStr];
      const isSelected = this.selectedDate && dateStr === `${this.selectedDate.getFullYear()}-${String(this.selectedDate.getMonth()+1).padStart(2,'0')}-${String(this.selectedDate.getDate()).padStart(2,'0')}`;
      
      html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateStr}">${d}</div>`;
    }
    
    // 下月开头
    const remaining = 42 - (firstDay + daysInMonth); // 6 rows
    for (let d = 1; d <= remaining; d++) {
      const dateStr = `${month === 11 ? year+1 : year}-${String(month === 11 ? 1 : month+2).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      html += `<div class="calendar-day other-month" data-date="${dateStr}">${d}</div>`;
    }
    
    html += `</div>`;
    
    // 选中日期的日程列表
    if (this.selectedDate) {
      const selStr = `${this.selectedDate.getFullYear()}-${String(this.selectedDate.getMonth()+1).padStart(2,'0')}-${String(this.selectedDate.getDate()).padStart(2,'0')}`;
      const dayEvents = events.filter(e => e.date === selStr);
      
      html += `<div class="mt-3"><strong class="text-sm">${selStr} 日程</strong></div>`;
      if (dayEvents.length === 0) {
        html += `<div class="text-xs text-muted mt-2">暂无日程</div>`;
      } else {
        html += dayEvents.map(e => `
          <div class="list-item flex justify-between" style="border-left: 3px solid ${e.color || '#6366f1'}; margin-bottom: 4px;">
            <div class="flex-1">
              <div class="text-sm">${this.escapeHtml(e.title)}</div>
              ${e.startTime ? `<div class="text-xs text-muted">${e.startTime}${e.endTime ? ' - ' + e.endTime : ''}</div>` : ''}
            </div>
            <button class="icon-btn" data-action="deleteEvent" data-id="${e._id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `).join('');
      }
    }
    
    this.bodyEl.innerHTML = html;
    
    // 事件
    this.bodyEl.querySelector('[data-action="prevMonth"]')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.loadData();
    });
    this.bodyEl.querySelector('[data-action="nextMonth"]')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.loadData();
    });
    this.bodyEl.querySelectorAll('.calendar-day:not(.other-month)').forEach(el => {
      el.addEventListener('click', () => {
        const d = new Date(el.dataset.date);
        if (this.selectedDate && 
            d.toDateString() === this.selectedDate.toDateString()) {
          this.selectedDate = null;
        } else {
          this.selectedDate = d;
        }
        this.loadData();
      });
    });
    this.bodyEl.querySelectorAll('[data-action="deleteEvent"]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.delete('events', el.dataset.id);
        if (CloudConfig.enabled) SyncEngine.pushDelete('events', el.dataset.id);
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

WidgetRegistry.register('calendar', {
  name: '日程规划',
  icon: '📅',
  description: '日历视图管理日程，支持重复规则',
  category: '效率',
  widgetClass: CalendarWidget
});
