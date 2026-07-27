/**
 * 个人工作台 v2 - 应用入口
 * 左侧导航 + 右侧内容区 + 所有板块逻辑
 */
const App = {
  currentPage: 'home',
  pageData: {},  // 缓存各页面数据

  /* ========================================
     初始化
     ======================================== */
  async init() {
    console.log('[App] 初始化...');
    await Storage.init();

    // 恢复云配置
    const savedEnv = localStorage.getItem('workbench_cloud_env');
    if (savedEnv) CloudConfig.env = savedEnv;

    await CloudConfig.init();
    if (CloudConfig.enabled) await SyncEngine.init();

    // 注册云端变化回调
    window._onCloudChange = (col) => {
      console.log('[App] 云端变化:', col);
      this.refreshCurrentPage();
    };

    // 设置今天日期
    const today = new Date();
    const weekdays = ['日','一','二','三','四','五','六'];
    const dateStr = `${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日 星期${weekdays[today.getDay()]}`;
    const el = document.getElementById('todayDate');
    if (el) el.textContent = dateStr;

    // 绑定事件
    this.bindNavigation();
    this.bindPageActions();
    this.bindSettingsActions();

    // 渲染首页
    await this.renderHome();

    console.log('[App] 初始化完成');
  },

  /* ========================================
     导航
     ======================================== */
  bindNavigation() {
    // 左侧导航点击
    document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        this.navigateTo(page);
      });
    });

    // 移动端菜单按钮
    document.getElementById('btnMenuToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('overlay').classList.toggle('hidden');
    });

    document.getElementById('overlay')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('overlay').classList.add('hidden');
    });

    // 概览卡片点击跳转
    document.getElementById('overviewCards')?.addEventListener('click', (e) => {
      const card = e.target.closest('[data-nav]');
      if (card) this.navigateTo(card.dataset.nav);
    });
  },

  navigateTo(page) {
    if (this.currentPage === page && page !== 'home') return;

    // 更新导航高亮
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    const navItem = document.querySelector(`.sidebar-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    // 切换页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // 更新移动端标题
    const titles = { home: '首页', tasks: '任务清单', calendar: '日程规划', notes: '笔记备忘',
      finance: '记账', habits: '习惯打卡', birthdays: '生日纪念日', outfits: '穿搭灵感', settings: '设置' };
    const mobileTitle = document.getElementById('mobileTitle');
    if (mobileTitle) mobileTitle.textContent = titles[page] || '';

    this.currentPage = page;

    // 渲染页面
    switch (page) {
      case 'home': this.renderHome(); break;
      case 'tasks': this.renderTasks(); break;
      case 'calendar': this.renderCalendar(); break;
      case 'notes': this.renderNotes(); break;
      case 'finance': this.renderFinance(); break;
      case 'habits': this.renderHabits(); break;
      case 'birthdays': this.renderBirthdays(); break;
      case 'outfits': this.renderOutfits(); break;
      case 'settings': this.renderSettings(); break;
    }

    // 移动端关闭菜单
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.add('hidden');
  },

  refreshCurrentPage() {
    this.navigateTo(this.currentPage);
  },

  /* ========================================
     首页
     ======================================== */
  async renderHome() {
    const today = new Date().toISOString().split('T')[0];
    const [tasks, events, habits, birthdays] = await Promise.all([
      Storage.getAll('tasks'), Storage.getAll('events'),
      Storage.getAll('habits'), Storage.getAll('birthdays')
    ]);

    // 概览卡片
    const activeTasks = tasks.filter(t => !t.completed).length;
    const todayEvents = events.filter(e => e.date === today).length;
    let todayCheckins = 0;
    habits.forEach(h => { if ((h.checkins || []).includes(today)) todayCheckins++; });

    // 最近生日
    let upcomingBday = null;
    if (birthdays.length > 0) {
      const enriched = birthdays.map(b => {
        const bDate = new Date(b.date);
        const thisYear = new Date(new Date().getFullYear(), bDate.getMonth(), bDate.getDate());
        const next = thisYear >= new Date() ? thisYear : new Date(new Date().getFullYear()+1, bDate.getMonth(), bDate.getDate());
        return { ...b, daysUntil: Math.ceil((next - new Date())/86400000) };
      });
      enriched.sort((a,b) => a.daysUntil - b.daysUntil);
      upcomingBday = enriched[0];
    }

    const cards = [
      { icon: '✅', label: '待办任务', value: activeTasks, nav: 'tasks', color: '#6366f1' },
      { icon: '📅', label: '今日日程', value: todayEvents, nav: 'calendar', color: '#06b6d4' },
      { icon: '🎯', label: '今日打卡', value: `${todayCheckins}/${habits.length||'-'}`, nav: 'habits', color: '#f59e0b' },
      { icon: '🎂', label: '即将到来', value: upcomingBday ? upcomingBday.name : '无', nav: 'birthdays', color: '#ec4899' },
    ];

    document.getElementById('overviewCards').innerHTML = cards.map(c => `
      <div class="overview-card" data-nav="${c.nav}">
        <div class="overview-card-icon">${c.icon}</div>
        <div class="overview-card-label">${c.label}</div>
        <div class="overview-card-value" style="color:${c.color}">${c.value}</div>
      </div>
    `).join('');

    // 待办快速区
    const pendingTasks = tasks.filter(t => !t.completed).slice(0, 5);
    document.getElementById('quickTasks').innerHTML = `
      <h3>📋 待办任务 (${pendingTasks.length})</h3>
      ${pendingTasks.length === 0 ? '<div class="text-sm text-muted">暂无待办</div>' :
        pendingTasks.map(t => `
          <div class="list-item">
            <div class="checkbox-circle" onclick="App.quickToggleTask('${t._id}')"></div>
            <span class="flex-1 text-sm">${this.esc(t.title)}</span>
            ${t.priority !== 'p3' ? `<span class="tag tag-${t.priority}">${t.priority.toUpperCase()}</span>` : ''}
          </div>
        `).join('')
      }
    `;

    // 今日日程快速区
    const todayEventsList = events.filter(e => e.date === today);
    document.getElementById('quickEvents').innerHTML = `
      <h3>📅 今日日程 (${todayEventsList.length})</h3>
      ${todayEventsList.length === 0 ? '<div class="text-sm text-muted">今日暂无日程</div>' :
        todayEventsList.map(e => `
          <div class="list-item">
            <span class="text-sm flex-1">${this.esc(e.title)}</span>
            ${e.startTime ? `<span class="text-xs text-muted">${e.startTime}${e.endTime?' - '+e.endTime:''}</span>` : ''}
          </div>
        `).join('')
      }
    `;
  },

  async quickToggleTask(id) {
    const task = await Storage.get('tasks', id);
    if (!task) return;
    task.completed = !task.completed;
    await Storage.put('tasks', task);
    if (CloudConfig.enabled) SyncEngine.push('tasks', task);
    this.renderHome();
    this.updateSidebarBadges();
  },

  /* ========================================
     任务清单
     ======================================== */
  async renderTasks() {
    const tasks = await Storage.getAll('tasks');
    const active = tasks.filter(t => !t.completed);
    const completed = tasks.filter(t => t.completed);
    const pOrder = { p0: 0, p1: 1, p2: 2, p3: 3 };
    active.sort((a,b) => (pOrder[a.priority]||3) - (pOrder[b.priority]||3));
    completed.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    const all = [...active, ...completed];

    document.getElementById('tasksCount').textContent = `${active.length} 待办 · ${completed.length} 已完成`;
    const list = document.getElementById('tasksList');

    if (all.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>暂无任务</p></div>`;
    } else {
      list.innerHTML = all.map(t => `
        <div class="list-item">
          <div class="checkbox-circle ${t.completed?'checked':''}" onclick="App.toggleTask('${t._id}')"></div>
          <span class="flex-1 text-sm task-title ${t.completed?'completed':''}">${this.esc(t.title)}</span>
          ${t.priority !== 'p3' ? `<span class="tag tag-${t.priority}">${t.priority.toUpperCase()}</span>` : ''}
          ${t.dueDate ? `<span class="text-xs text-muted">📅 ${t.dueDate}</span>` : ''}
          <button class="icon-btn" onclick="App.deleteTask('${t._id}')" title="删除">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('');
    }
  },

  async toggleTask(id) {
    const task = await Storage.get('tasks', id);
    if (!task) return;
    task.completed = !task.completed;
    await Storage.put('tasks', task);
    if (CloudConfig.enabled) SyncEngine.push('tasks', task);
    this.renderTasks();
    this.updateSidebarBadges();
  },

  async deleteTask(id) {
    await Storage.delete('tasks', id);
    if (CloudConfig.enabled) SyncEngine.pushDelete('tasks', id);
    this.renderTasks();
    this.updateSidebarBadges();
  },

  /* ========================================
     日程规划
     ======================================== */
  async renderCalendar() {
    const events = await Storage.getAll('events');
    this._calendarDate = this._calendarDate || new Date();
    this._selectedDate = this._selectedDate || null;

    const year = this._calendarDate.getFullYear();
    const month = this._calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const eventDays = {};
    events.forEach(e => { if (e.date) eventDays[e.date] = (eventDays[e.date]||0)+1; });

    let html = `
      <div class="calendar-nav">
        <button class="icon-btn" id="calPrev"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="calendar-month">${year}年 ${month+1}月</span>
        <button class="icon-btn" id="calNext"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div class="calendar-grid">
        ${['日','一','二','三','四','五','六'].map(d => `<div class="calendar-day-header">${d}</div>`).join('')}
    `;

    for (let i = firstDay-1; i >= 0; i--) {
      const d = prevMonthDays - i;
      html += `<div class="calendar-day other-month">${d}</div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isToday = ds === todayStr;
      const hasEv = eventDays[ds];
      const sel = this._selectedDate;
      const selStr = sel ? `${sel.getFullYear()}-${String(sel.getMonth()+1).padStart(2,'0')}-${String(sel.getDate()).padStart(2,'0')}` : '';
      const isSelected = ds === selStr;
      html += `<div class="calendar-day ${isToday?'today':''} ${hasEv?'has-events':''} ${isSelected?'selected':''}" data-date="${ds}">${d}</div>`;
    }

    const remaining = 42 - (firstDay + daysInMonth);
    for (let d = 1; d <= remaining; d++) {
      html += `<div class="calendar-day other-month">${d}</div>`;
    }
    html += `</div>`;

    document.getElementById('calendarWidget').innerHTML = html;

    // 日历事件
    document.getElementById('calPrev').onclick = () => {
      this._calendarDate.setMonth(this._calendarDate.getMonth()-1);
      this.renderCalendar();
    };
    document.getElementById('calNext').onclick = () => {
      this._calendarDate.setMonth(this._calendarDate.getMonth()+1);
      this.renderCalendar();
    };
    document.querySelectorAll('#calendarWidget .calendar-day:not(.other-month)').forEach(el => {
      el.onclick = () => {
        const d = new Date(el.dataset.date);
        if (this._selectedDate && d.toDateString() === this._selectedDate.toDateString()) {
          this._selectedDate = null;
        } else {
          this._selectedDate = d;
        }
        this.renderCalendar();
      };
    });

    // 选中日期的日程列表
    const eventsList = document.getElementById('eventsList');
    if (this._selectedDate) {
      const selStr = `${this._selectedDate.getFullYear()}-${String(this._selectedDate.getMonth()+1).padStart(2,'0')}-${String(this._selectedDate.getDate()).padStart(2,'0')}`;
      const dayEvents = events.filter(e => e.date === selStr);
      eventsList.innerHTML = `
        <h3 class="mb-2">${selStr} 日程 (${dayEvents.length})</h3>
        ${dayEvents.length === 0 ? '<div class="text-sm text-muted">暂无日程</div>' :
          dayEvents.map(e => `
            <div class="list-item" style="border-left:3px solid ${e.color||'#6366f1'}">
              <span class="flex-1 text-sm">${this.esc(e.title)}</span>
              ${e.startTime ? `<span class="text-xs text-muted">${e.startTime}${e.endTime?'-'+e.endTime:''}</span>` : ''}
              <button class="icon-btn" onclick="App.deleteEvent('${e._id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          `).join('')
        }
      `;
    } else {
      eventsList.innerHTML = '<div class="text-sm text-muted">点击日期查看日程</div>';
    }
  },

  async deleteEvent(id) {
    await Storage.delete('events', id);
    if (CloudConfig.enabled) SyncEngine.pushDelete('events', id);
    this.renderCalendar();
  },

  /* ========================================
     笔记备忘
     ======================================== */
  async renderNotes() {
    const notes = await Storage.getAll('notes');
    const active = notes.filter(n => !n.archived);
    active.sort((a,b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    const list = document.getElementById('notesList');
    if (active.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>暂无笔记</p></div>`;
    } else {
      list.innerHTML = active.map(n => `
        <div class="list-item" onclick="App.openNoteEditor('${n._id}')" style="cursor:pointer">
          ${n.pinned ? '<span style="font-size:12px">📌</span>' : ''}
          <span class="flex-1 text-sm truncate">${this.esc(n.title)}</span>
          <span class="text-xs text-muted no-shrink">${this.fmtDate(n.updatedAt)}</span>
          <button class="icon-btn" onclick="event.stopPropagation();App.deleteNote('${n._id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('');
    }
  },

  async openNoteEditor(id) {
    const note = id ? (await Storage.get('notes', id)) : { _id: Storage.generateId(), title: '', content: '', pinned: false, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (!note) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;width:100%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-color)">
          <h3 style="font-size:16px;font-weight:700">编辑笔记</h3>
          <button class="icon-btn" id="noteEditorClose"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div style="padding:16px 18px;overflow-y:auto;flex:1">
          <input type="text" class="input mb-3" id="noteTitleInput" value="${this.esc(note.title)}" placeholder="标题" />
          <textarea class="input" id="noteContentInput" rows="12" placeholder="内容（支持 Markdown）" style="font-family:monospace;font-size:13px">${this.esc(note.content)}</textarea>
          <label class="flex items-center gap-2 mt-3" style="font-size:13px;cursor:pointer">
            <input type="checkbox" id="notePinnedCheck" ${note.pinned?'checked':''} /> 📌 置顶
          </label>
        </div>
        <div style="display:flex;gap:10px;padding:14px 18px;border-top:1px solid var(--border-color);justify-content:flex-end">
          <button class="btn btn-danger btn-sm" id="noteDeleteBtn">删除</button>
          <button class="btn btn-primary btn-sm" id="noteSaveBtn">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#noteEditorClose').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.querySelector('#noteSaveBtn').onclick = async () => {
      note.title = overlay.querySelector('#noteTitleInput').value.trim();
      note.content = overlay.querySelector('#noteContentInput').value;
      note.pinned = overlay.querySelector('#notePinnedCheck').checked;
      note.updatedAt = new Date().toISOString();
      if (!note.title) { this.showToast('标题不能为空', 'error'); return; }
      await Storage.put('notes', note);
      if (CloudConfig.enabled) SyncEngine.push('notes', note);
      close();
      this.renderNotes();
    };

    overlay.querySelector('#noteDeleteBtn').onclick = async () => {
      if (confirm('确定删除？')) {
        await Storage.delete('notes', id);
        if (CloudConfig.enabled) SyncEngine.pushDelete('notes', id);
        close();
        this.renderNotes();
      }
    };
  },

  async deleteNote(id) {
    await Storage.delete('notes', id);
    if (CloudConfig.enabled) SyncEngine.pushDelete('notes', id);
    this.renderNotes();
  },

  /* ========================================
     记账
     ======================================== */
  async renderFinance() {
    const txns = await Storage.getAll('transactions');
    const now = new Date();
    const ym = `${now.getFullYear()}年${now.getMonth()+1}月`;
    document.getElementById('financeMonth').textContent = ym;

    const ms = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const me = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-31`;
    const monthTx = txns.filter(t => t.date >= ms && t.date <= me);
    const income = monthTx.filter(t => t.type==='income').reduce((s,t) => s+t.amount, 0);
    const expense = monthTx.filter(t => t.type==='expense').reduce((s,t) => s+t.amount, 0);

    document.getElementById('financeStats').innerHTML = `
      <div class="stat-item"><div class="stat-value" style="color:var(--danger)">-¥${expense.toFixed(0)}</div><div class="stat-label">支出</div></div>
      <div class="stat-item"><div class="stat-value" style="color:var(--success)">+¥${income.toFixed(0)}</div><div class="stat-label">收入</div></div>
      <div class="stat-item"><div class="stat-value" style="color:${income-expense>=0?'var(--success)':'var(--danger)'}">¥${(income-expense).toFixed(0)}</div><div class="stat-label">结余</div></div>
    `;

    const sorted = [...monthTx].sort((a,b) => new Date(b.date) - new Date(a.date));
    const list = document.getElementById('transactionsList');
    const icons = { '餐饮':'🍜','交通':'🚗','购物':'🛍️','娱乐':'🎮','住房':'🏠','医疗':'💊','教育':'📚','工资':'💼','理财':'📈','其他':'📌' };

    if (sorted.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">💰</div><p>本月暂无记录</p></div>`;
    } else {
      list.innerHTML = sorted.map(t => `
        <div class="list-item">
          <span style="font-size:20px">${icons[t.category]||'📌'}</span>
          <span class="flex-1 text-sm">${this.esc(t.category)}</span>
          <span class="text-xs text-muted">${t.date}</span>
          <span style="font-weight:600;color:${t.type==='expense'?'var(--danger)':'var(--success)'}">${t.type==='expense'?'-':'+'}¥${t.amount.toFixed(2)}</span>
          <button class="icon-btn" onclick="App.deleteTransaction('${t._id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `).join('');
    }
  },

  async deleteTransaction(id) {
    await Storage.delete('transactions', id);
    if (CloudConfig.enabled) SyncEngine.pushDelete('transactions', id);
    this.renderFinance();
  },

  /* ========================================
     习惯打卡
     ======================================== */
  async renderHabits() {
    const habits = await Storage.getAll('habits');
    const today = new Date().toISOString().split('T')[0];
    const list = document.getElementById('habitsList');

    if (habits.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>添加一个习惯开始打卡</p></div>`;
    } else {
      list.innerHTML = habits.map(h => {
        const checkins = h.checkins || [];
        const checked = checkins.includes(today);
        let streak = 0;
        const d = new Date();
        for (let i = 0; i < 365; i++) {
          const ds = d.toISOString().split('T')[0];
          if (checkins.includes(ds)) { streak++; d.setDate(d.getDate()-1); }
          else if (i === 0) break;
          else break;
        }
        return `
          <div class="list-item">
            <button class="habit-check-btn ${checked?'checked':''}" onclick="App.toggleHabit('${h._id}')">${checked?'✓':''}</button>
            <span class="flex-1 text-sm">${this.esc(h.name)}</span>
            <span class="text-xs text-muted">🔥${streak}天 · ${checkins.length}次</span>
            <button class="icon-btn" onclick="App.deleteHabit('${h._id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `;
      }).join('');
    }
  },

  async toggleHabit(id) {
    const habit = await Storage.get('habits', id);
    if (!habit) return;
    const today = new Date().toISOString().split('T')[0];
    const checkins = habit.checkins || [];
    habit.checkins = checkins.includes(today) ? checkins.filter(d => d !== today) : [...checkins, today];
    await Storage.put('habits', habit);
    if (CloudConfig.enabled) SyncEngine.push('habits', habit);
    this.renderHabits();
    this.updateSidebarBadges();
  },

  async deleteHabit(id) {
    await Storage.delete('habits', id);
    if (CloudConfig.enabled) SyncEngine.pushDelete('habits', id);
    this.renderHabits();
    this.updateSidebarBadges();
  },

  /* ========================================
     生日纪念日
     ======================================== */
  async renderBirthdays() {
    const birthdays = await Storage.getAll('birthdays');
    const today = new Date();
    const enriched = birthdays.map(b => {
      const bDate = new Date(b.date);
      const thisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      const next = thisYear >= today ? thisYear : new Date(today.getFullYear()+1, bDate.getMonth(), bDate.getDate());
      return { ...b, daysUntil: Math.ceil((next - today)/86400000), nextDate: next };
    });
    enriched.sort((a,b) => a.daysUntil - b.daysUntil);

    const list = document.getElementById('birthdaysList');
    const relIcons = { '家人':'👨‍👩‍👧','朋友':'🤝','恋人':'💕','同事':'💼','生日':'🎂','纪念日':'💝','其他':'📌' };

    if (enriched.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎂</div><p>添加生日或纪念日</p></div>`;
    } else {
      list.innerHTML = enriched.map(b => {
        const isToday = b.daysUntil === 0;
        const isSoon = b.daysUntil <= 7;
        return `
          <div class="list-item">
            <span style="font-size:20px">${relIcons[b.relation]||'📌'}</span>
            <span class="flex-1 text-sm">${this.esc(b.name)}</span>
            <span class="text-xs text-muted">${b.relation} · ${b.date}</span>
            <span style="font-weight:600;color:${isToday?'var(--accent)':isSoon?'var(--warning)':'var(--text-muted)'};white-space:nowrap">
              ${isToday?'🎉 今天!':isSoon?`${b.daysUntil}天后`:`${b.daysUntil}天`}
            </span>
            <button class="icon-btn" onclick="App.deleteBirthday('${b._id}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        `;
      }).join('');
    }
  },

  async deleteBirthday(id) {
    await Storage.delete('birthdays', id);
    if (CloudConfig.enabled) SyncEngine.pushDelete('birthdays', id);
    this.renderBirthdays();
  },

  /* ========================================
     穿搭灵感
     ======================================== */
  renderOutfits() {
    this.renderColorAdvice();
    this.renderOutfitsList();
  },

  renderColorAdvice() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    let season, palettes;

    if (month >= 2 && month <= 4) {
      season = '春';
      palettes = [
        { colors: [{hex:'#F5E6CA',name:'奶油白'},{hex:'#B8D4E3',name:'雾蓝'},{hex:'#D4A574',name:'卡其'}], reason: '春日柔和色调，温暖而不张扬', tip: '宽松针织+直筒裤，奶油白为主色调' },
        { colors: [{hex:'#E8D5B7',name:'燕麦'},{hex:'#A8C8A0',name:'鼠尾草绿'},{hex:'#F0F0F0',name:'米白'}], reason: '清新自然的大地色系', tip: '棉麻衬衫+休闲裤，清爽舒适' },
        { colors: [{hex:'#D4C5E2',name:'薰衣草紫'},{hex:'#F5F0E8',name:'暖白'},{hex:'#9DB5B2',name:'灰绿'}], reason: '温柔又带点春日浪漫', tip: '针织开衫+白T+休闲裤' },
      ];
    } else if (month >= 5 && month <= 7) {
      season = '夏';
      palettes = [
        { colors: [{hex:'#FFFFFF',name:'纯白'},{hex:'#87CEEB',name:'天蓝'},{hex:'#D4E4F0',name:'浅灰蓝'}], reason: '夏季清凉配色，视觉降温', tip: '白T+浅蓝牛仔裤，极简清爽' },
        { colors: [{hex:'#F5F5DC',name:'米白'},{hex:'#B0C4DE',name:'浅钢蓝'},{hex:'#E8E8E8',name:'浅灰'}], reason: '简约冷淡风，夏天不闷热', tip: '亚麻衬衫+短裤，舒适透气' },
        { colors: [{hex:'#FFFDD0',name:'奶油'},{hex:'#C9B8A8',name:'奶茶'},{hex:'#A8C8C0',name:'薄荷绿'}], reason: '温柔奶茶色系', tip: '浅色Polo+卡其短裤' },
      ];
    } else if (month >= 8 && month <= 10) {
      season = '秋';
      palettes = [
        { colors: [{hex:'#8B6914',name:'焦糖'},{hex:'#D2B48C',name:'驼色'},{hex:'#F5F5F0',name:'奶白'}], reason: '经典秋季暖色调', tip: '风衣+高领毛衣，层次感搭配' },
        { colors: [{hex:'#6B4423',name:'深棕'},{hex:'#C4A882',name:'沙色'},{hex:'#2F4F4F',name:'深灰绿'}], reason: '复古英伦风配色', tip: '格纹外套+纯色内搭' },
        { colors: [{hex:'#A0522D',name:'砖红'},{hex:'#DEB887',name:'原木色'},{hex:'#F0E6D3',name:'暖灰'}], reason: '温暖文艺的秋季配色', tip: '针织衫+灯芯绒裤' },
      ];
    } else {
      season = '冬';
      palettes = [
        { colors: [{hex:'#2C2C2C',name:'炭灰'},{hex:'#4A4A5A',name:'深蓝灰'},{hex:'#E8E0D5',name:'奶油'}], reason: '冬季沉稳高级感', tip: '大衣+高领毛衣，深色为主' },
        { colors: [{hex:'#1C1C1C',name:'黑'},{hex:'#8B0000',name:'酒红'},{hex:'#D3D3D3',name:'浅灰'}], reason: '经典黑白配+酒红提亮', tip: '黑色大衣+酒红围巾' },
        { colors: [{hex:'#3B3B4F',name:'藏蓝'},{hex:'#C9B99A',name:'杏色'},{hex:'#696969',name:'中灰'}], reason: '沉稳中带着温柔', tip: '藏蓝大衣+杏色毛衣' },
      ];
    }

    const p = palettes[(day-1) % palettes.length];
    document.getElementById('colorAdvice').innerHTML = `
      <div class="color-advice-card">
        <div class="text-sm font-600 mb-2">🎨 今日配色建议 · ${season}季</div>
        <div class="text-xs text-muted mb-2">${p.reason}</div>
        <div class="color-palette">
          ${p.colors.map(c => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
              <div class="color-swatch-large" style="background:${c.hex}"></div>
              <span class="text-xs text-muted">${c.name}</span>
            </div>
          `).join('')}
        </div>
        <div class="text-xs text-muted mt-2">💡 ${p.tip}</div>
      </div>
    `;
  },

  async renderOutfitsList() {
    const outfits = await Storage.getAll('outfits');
    const list = document.getElementById('outfitsList');
    const byStyle = {};
    outfits.forEach(o => {
      const s = o.style || '其他';
      if (!byStyle[s]) byStyle[s] = [];
      byStyle[s].push(o);
    });

    if (outfits.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">👔</div><p>粘贴小红书穿搭链接开始收藏</p></div>`;
    } else {
      let html = '';
      Object.entries(byStyle).forEach(([style, items]) => {
        html += `<div class="text-xs text-muted mb-1 mt-2 font-600">${style} (${items.length})</div>`;
        items.forEach(o => {
          html += `
            <a class="link-card" href="${this.esc(o.xhsUrl)}" target="_blank" rel="noopener">
              <span>🔗</span>
              <span class="flex-1 text-sm truncate">${this.esc(o.title)}</span>
              <button class="icon-btn" onclick="event.preventDefault();event.stopPropagation();App.deleteOutfit('${o._id}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </a>
          `;
        });
      });
      list.innerHTML = html;
    }
  },

  async deleteOutfit(id) {
    await Storage.delete('outfits', id);
    if (CloudConfig.enabled) SyncEngine.pushDelete('outfits', id);
    this.renderOutfitsList();
  },

  /* ========================================
     设置
     ======================================== */
  renderSettings() {
    this.renderWidgetManager();
    this.renderCloudStatus();
  },

  renderWidgetManager() {
    // 板块列表（固定，不在设置里开关，因为导航已经有了）
    const widgets = [
      { id: 'tasks', name: '任务清单', icon: '✅', cat: '效率' },
      { id: 'calendar', name: '日程规划', icon: '📅', cat: '效率' },
      { id: 'notes', name: '笔记备忘', icon: '📝', cat: '知识' },
      { id: 'finance', name: '记账', icon: '💰', cat: '生活' },
      { id: 'habits', name: '习惯打卡', icon: '🎯', cat: '生活' },
      { id: 'birthdays', name: '生日纪念日', icon: '🎂', cat: '生活' },
      { id: 'outfits', name: '穿搭灵感', icon: '👔', cat: '生活' },
    ];

    document.getElementById('widgetManager').innerHTML = widgets.map(w => `
      <div class="widget-manager-item">
        <span class="drag-handle">⋮⋮</span>
        <span class="manager-icon">${w.icon}</span>
        <span class="manager-name">${w.name}</span>
        <span class="text-xs text-muted">${w.cat}</span>
        <label class="toggle-switch">
          <input type="checkbox" checked data-widget="${w.id}" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('');

    document.querySelectorAll('[data-widget]').forEach(el => {
      el.addEventListener('change', () => {
        const id = el.dataset.widget;
        const navItem = document.querySelector(`.sidebar-item[data-page="${id}"]`);
        if (navItem) navItem.style.display = el.checked ? '' : 'none';
      });
    });
  },

  renderCloudStatus() {
    const ind = document.querySelector('#cloudSyncStatus .sync-indicator');
    const txt = document.getElementById('syncStatusText');
    if (CloudConfig.enabled) {
      ind.className = 'sync-indicator online';
      txt.textContent = `已连接 · ${CloudConfig.env}`;
    } else if (CloudConfig.env) {
      ind.className = 'sync-indicator offline';
      txt.textContent = '连接失败，检查环境ID';
    } else {
      ind.className = 'sync-indicator offline';
      txt.textContent = '未配置云同步';
    }
  },

  /* ========================================
     页面操作绑定
     ======================================== */
  bindPageActions() {
    // 添加任务
    document.getElementById('btnAddTask')?.addEventListener('click', () => this.addTask());
    document.getElementById('tasksInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.addTask(); });

    // 添加日程
    document.getElementById('btnAddEvent')?.addEventListener('click', () => this.addEvent());
    document.getElementById('calendarInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.addEvent(); });

    // 新建笔记
    document.getElementById('btnAddNote')?.addEventListener('click', () => this.addNote());
    document.getElementById('notesInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.addNote(); });

    // 记账
    document.getElementById('btnAddTransaction')?.addEventListener('click', () => this.addTransaction());

    // 添加习惯
    document.getElementById('btnAddHabit')?.addEventListener('click', () => this.addHabit());
    document.getElementById('habitsInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.addHabit(); });

    // 添加生日
    document.getElementById('btnAddBirthday')?.addEventListener('click', () => this.addBirthday());

    // 添加穿搭收藏
    document.getElementById('btnAddOutfit')?.addEventListener('click', () => this.addOutfit());
    document.getElementById('outfitsInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.addOutfit(); });
  },

  async addTask() {
    const input = document.getElementById('tasksInput');
    const title = input.value.trim();
    if (!title) return;
    const task = { _id: Storage.generateId(), title, completed: false, priority: 'p3', dueDate: null, tags: [], createdAt: new Date().toISOString() };
    await Storage.put('tasks', task);
    if (CloudConfig.enabled) SyncEngine.push('tasks', task);
    input.value = '';
    this.renderTasks();
    this.updateSidebarBadges();
  },

  async addEvent() {
    const input = document.getElementById('calendarInput');
    const title = input.value.trim();
    if (!title) return;
    const date = this._selectedDate
      ? `${this._selectedDate.getFullYear()}-${String(this._selectedDate.getMonth()+1).padStart(2,'0')}-${String(this._selectedDate.getDate()).padStart(2,'0')}`
      : new Date().toISOString().split('T')[0];
    const event = { _id: Storage.generateId(), title, date, startTime: '', endTime: '', repeat: 'none', color: '#6366f1', notes: '', createdAt: new Date().toISOString() };
    await Storage.put('events', event);
    if (CloudConfig.enabled) SyncEngine.push('events', event);
    input.value = '';
    this.renderCalendar();
  },

  async addNote() {
    const input = document.getElementById('notesInput');
    const title = input.value.trim();
    if (!title) return;
    const note = { _id: Storage.generateId(), title, content: '', tags: [], pinned: false, archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await Storage.put('notes', note);
    if (CloudConfig.enabled) SyncEngine.push('notes', note);
    input.value = '';
    this.renderNotes();
  },

  async addTransaction() {
    const amount = parseFloat(document.getElementById('financeAmount').value);
    if (isNaN(amount) || amount <= 0) { this.showToast('请输入有效金额', 'error'); return; }
    const txn = {
      _id: Storage.generateId(),
      type: document.getElementById('financeType').value,
      amount,
      category: document.getElementById('financeCategory').value,
      date: new Date().toISOString().split('T')[0],
      note: '',
      createdAt: new Date().toISOString()
    };
    await Storage.put('transactions', txn);
    if (CloudConfig.enabled) SyncEngine.push('transactions', txn);
    document.getElementById('financeAmount').value = '';
    this.renderFinance();
  },

  async addHabit() {
    const input = document.getElementById('habitsInput');
    const name = input.value.trim();
    if (!name) return;
    const habit = { _id: Storage.generateId(), name, color: '#6366f1', checkins: [], createdAt: new Date().toISOString() };
    await Storage.put('habits', habit);
    if (CloudConfig.enabled) SyncEngine.push('habits', habit);
    input.value = '';
    this.renderHabits();
    this.updateSidebarBadges();
  },

  addBirthday() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;width:100%;max-width:400px;box-shadow:0 8px 30px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-color)">
          <h3 style="font-size:16px;font-weight:700">添加纪念日</h3>
          <button class="icon-btn" id="bdayClose"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">
          <div><label class="text-sm" style="display:block;margin-bottom:4px">姓名/名称</label><input type="text" class="input" id="bdayName" placeholder="如：妈妈" /></div>
          <div><label class="text-sm" style="display:block;margin-bottom:4px">关系/类型</label>
            <select class="input" id="bdayRelation"><option>家人</option><option>朋友</option><option>恋人</option><option>同事</option><option>生日</option><option>纪念日</option><option>其他</option></select></div>
          <div><label class="text-sm" style="display:block;margin-bottom:4px">日期</label><input type="date" class="input" id="bdayDate" /></div>
          <div><label class="text-sm" style="display:block;margin-bottom:4px">备注</label><input type="text" class="input" id="bdayNotes" placeholder="可选" /></div>
        </div>
        <div style="padding:14px 18px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end">
          <button class="btn btn-primary btn-sm" id="bdaySave">保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('#bdayClose').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.querySelector('#bdaySave').onclick = async () => {
      const name = overlay.querySelector('#bdayName').value.trim();
      const date = overlay.querySelector('#bdayDate').value;
      if (!name) { this.showToast('请输入姓名', 'error'); return; }
      if (!date) { this.showToast('请选择日期', 'error'); return; }
      const bday = {
        _id: Storage.generateId(),
        name,
        relation: overlay.querySelector('#bdayRelation').value,
        date,
        notes: overlay.querySelector('#bdayNotes').value.trim(),
        createdAt: new Date().toISOString()
      };
      await Storage.put('birthdays', bday);
      if (CloudConfig.enabled) SyncEngine.push('birthdays', bday);
      close();
      this.renderBirthdays();
    };
  },

  async addOutfit() {
    const input = document.getElementById('outfitsInput');
    const url = input.value.trim();
    if (!url) return;
    const title = prompt('给这个穿搭起个名字：', '新收藏');
    if (!title) return;
    const style = prompt('风格标签（如：温柔甜美、极简通勤）：', '休闲');
    const outfit = { _id: Storage.generateId(), title, xhsUrl: url, style: style || '休闲', tags: [], notes: '', createdAt: new Date().toISOString() };
    await Storage.put('outfits', outfit);
    if (CloudConfig.enabled) SyncEngine.push('outfits', outfit);
    input.value = '';
    this.renderOutfitsList();
  },

  /* ========================================
     设置页面操作
     ======================================== */
  bindSettingsActions() {
    document.getElementById('btnCloudConfig')?.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:16px;width:100%;max-width:400px;box-shadow:0 8px 30px rgba(0,0,0,0.5)">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-color)">
            <h3 style="font-size:16px;font-weight:700">配置微信云开发</h3>
            <button class="icon-btn" id="cloudClose"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div style="padding:16px 18px;display:flex;flex-direction:column;gap:12px">
            <div><label class="text-sm" style="display:block;margin-bottom:4px">环境 ID</label><input type="text" class="input" id="cloudEnvInput" value="${CloudConfig.env||''}" placeholder="例如: your-env-xxx" /></div>
            <p class="text-xs text-muted">在微信云开发控制台 → 设置 → 环境设置中可找到环境ID。保存后自动刷新页面。</p>
          </div>
          <div style="padding:14px 18px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end">
            <button class="btn btn-primary btn-sm" id="cloudSave">保存并刷新</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const close = () => overlay.remove();
      overlay.querySelector('#cloudClose').onclick = close;
      overlay.onclick = (e) => { if (e.target === overlay) close(); };
      overlay.querySelector('#cloudSave').onclick = () => {
        const env = overlay.querySelector('#cloudEnvInput').value.trim();
        CloudConfig.env = env;
        localStorage.setItem('workbench_cloud_env', env);
        this.showToast('环境ID已保存，刷新中...', 'success');
        setTimeout(() => location.reload(), 1500);
      };
    });

    // 导出
    document.getElementById('btnExportData')?.addEventListener('click', async () => {
      const data = await Storage.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workbench-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('数据已导出', 'success');
    });

    // 导入
    document.getElementById('btnImportData')?.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json';
      inp.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          await Storage.importAll(data);
          this.showToast('数据已导入', 'success');
          this.renderHome();
        } catch { this.showToast('导入失败', 'error'); }
      };
      inp.click();
    });

    // 清空
    document.getElementById('btnClearData')?.addEventListener('click', () => {
      if (confirm('确定清空所有本地数据？建议先导出备份。')) {
        Storage.clearAll().then(() => { this.showToast('数据已清空', 'success'); this.renderHome(); });
      }
    });
  },

  /* ========================================
     工具方法
     ======================================== */
  async updateSidebarBadges() {
    const tasks = await Storage.getAll('tasks');
    const active = tasks.filter(t => !t.completed).length;
    const badge = document.getElementById('sidebarBadge-tasks');
    if (badge) {
      badge.textContent = active > 0 ? active : '';
    }
  },

  showToast(message, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.offsetHeight;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
  },

  esc(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return '刚刚';
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h前`;
    if (diff < 604800000) return `${Math.floor(diff/86400000)}d前`;
    return `${d.getMonth()+1}/${d.getDate()}`;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
