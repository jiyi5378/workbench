/**
 * 个人工作台 - 主应用逻辑
 * 所有功能挂载在 App 对象上
 */

// 导航顺序常量（不含 home 和 settings）
const NAV_ORDER = ['tasks', 'notes', 'reviews', 'calendar', 'outfits', 'finance', 'habits', 'birthdays', 'lookback'];

// 页面标题映射
const PAGE_TITLES = {
  home: '首页', tasks: '任务清单', calendar: '日程规划', outfits: '穿搭灵感',
  notes: '笔记备忘', finance: '记账', habits: '习惯打卡', birthdays: '生日纪念日',
  reviews: '每日所学', lookback: '上月今日', settings: '设置'
};

// 30 条金句
const QUOTES = [
  '每一个清晨，都是重新开始的机会。',
  '你比你想象中更强大。',
  '今天的努力，是明天的底气。',
  '种一棵树最好的时间是十年前，其次是现在。',
  '生活明朗，万物可爱。',
  '慢慢来，比较快。',
  '所有的坚持，终将美好。',
  '愿你成为自己的太阳，无需借谁的光。',
  '把每一天都当作生命中最美好的一天。',
  '你现在的气质里，藏着你走过的路和读过的书。',
  '星光不问赶路人，时光不负有心人。',
  '自律的本质，是对自己的温柔。',
  '生活不是等待风暴过去，而是学会在雨中跳舞。',
  '心若向阳，无谓悲伤。',
  '今日事，今日毕。',
  '你只管努力，剩下的交给时间。',
  '每一步都算数，每一天都有意义。',
  '做一个温暖的人，心怀热爱，奔赴山海。',
  '生活或许会有遗憾，但未来依旧值得期待。',
  '把简单的事做到极致，就是不简单。',
  '优于别人并不高贵，真正的高贵是优于过去的自己。',
  '愿所有的美好，都如约而至。',
  '保持热爱，奔赴下一场山海。',
  '你今天的快乐，是未来的回忆。',
  '别急，月亮也终会等到属于它的星空。',
  '把生活过成诗，一半烟火，一半清欢。',
  '愿你眼中有星辰，心中有山海。',
  '生活总会给你答案，但不会马上告诉你一切。',
  '每一个不曾起舞的日子，都是对生命的辜负。',
  '愿你历尽千帆，归来仍是少年。'
];

// 季节配色
const SEASON_PALETTES = {
  spring: [
    { name: '樱花粉调', colors: ['#FFB7C5', '#FFC8DD', '#F4ACB7', '#D8E2DC'] },
    { name: '嫩绿生机', colors: ['#A8E6CF', '#DCEDC1', '#FFD3B6', '#FFAAA5'] },
    { name: '春日暖阳', colors: ['#FFE5B4', '#FFB347', '#FFCCCB', '#B5EAD7'] }
  ],
  summer: [
    { name: '海蓝清凉', colors: ['#006BA6', '#0496FF', '#FFBC42', '#D81159'] },
    { name: '薄荷冰淇淋', colors: ['#B8E0D2', '#D6EADF', '#95B8D1', '#EAC4D1'] },
    { name: '夏日西瓜', colors: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#95E1D3'] }
  ],
  autumn: [
    { name: '枫叶棕橘', colors: ['#D4A373', '#CC9B6C', '#E9C46A', '#F4A261'] },
    { name: '焦糖暖棕', colors: ['#8B5E3C', '#A0522D', '#CD853F', '#DEB887'] },
    { name: '秋日大地', colors: ['#795D45', '#9B7B5A', '#C1A077', '#E0CDA9'] }
  ],
  winter: [
    { name: '雪域灰白', colors: ['#E8E8E8', '#D0D0D0', '#B0B0B0', '#909090'] },
    { name: '圣诞红绿', colors: ['#C41E3A', '#00874D', '#FFD700', '#FFFFFF'] },
    { name: '深冬蓝调', colors: ['#1A365D', '#2C5282', '#4299E1', '#BEE3F8'] }
  ]
};

const App = {
  currentPage: 'home',
  tasksFilter: 'all',
  notesFilter: 'all',
  notesSearch: '',
  birthdaysFilter: 'all',
  calendarDate: null,       // 日历选中的日期
  calendarView: null,       // 日历视图所在的月份
  lookbackDate: null,       // 上月今日回顾的日期
  monthBudget: 3000,

  // ==================== 初始化 ====================
  async init() {
    try {
      await Storage.init();
    } catch (e) {
      console.error('存储初始化失败', e);
    }

    // 加载用户配置
    await this.loadUserConfig();

    // 绑定全局事件
    this.bindGlobalEvents();

    // 渲染各模块
    this.renderTasksFilter();
    this.renderNotesFilter();
    this.renderBirthdaysFilter();
    this.renderThemeSwitcher();
    this.renderWidgetManager();
    this.renderCloudStatus();
    this.updateNicknameDisplay();

    // 初始化日历视图
    const today = new Date();
    this.calendarView = new Date(today.getFullYear(), today.getMonth(), 1);
    this.calendarDate = this.toDateStr(today);

    // 上月今日
    this.lookbackDate = this.toDateStr(this.getLastMonthSameDay(today));

    // 渲染首页
    this.renderHome();

    // 渲染各页面
    this.renderTasks();
    this.renderCalendar();
    this.renderOutfits();
    this.renderNotes();
    this.renderFinance();
    this.renderHabits();
    this.renderBirthdays();
    this.renderReviews();
    this.renderLookback();
    this.renderSettings();

    // 更新角标
    this.updateBadges();

    // 尝试初始化云同步
    CloudConfig.init().then(ok => {
      if (ok) {
        SyncEngine.init();
        this.renderCloudStatus();
      }
    });
  },

  // ==================== 全局事件绑定 ====================
  bindGlobalEvents() {
    // 导航切换
    document.querySelectorAll('.sidebar-item[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.page));
    });

    // 移动端菜单
    const btnMenu = document.getElementById('btnMenuToggle');
    const overlay = document.getElementById('overlay');
    const sidebar = document.getElementById('sidebar');
    if (btnMenu) {
      btnMenu.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.remove('hidden');
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');
      });
    }

    // ===== 任务 =====
    const tasksInput = document.getElementById('tasksInput');
    const btnAddTask = document.getElementById('btnAddTask');
    if (btnAddTask) btnAddTask.addEventListener('click', () => this.addTask());
    if (tasksInput) {
      tasksInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.addTask();
      });
    }

    // ===== 日程 =====
    const btnAddEvent = document.getElementById('btnAddEvent');
    if (btnAddEvent) btnAddEvent.addEventListener('click', () => this.addEvent());
    const calendarInput = document.getElementById('calendarInput');
    if (calendarInput) {
      calendarInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.addEvent();
      });
    }

    // ===== 穿搭 =====
    const btnAddOutfit = document.getElementById('btnAddOutfit');
    if (btnAddOutfit) btnAddOutfit.addEventListener('click', () => this.addOutfitLink());
    const btnAddOutfitPhoto = document.getElementById('btnAddOutfitPhoto');
    if (btnAddOutfitPhoto) btnAddOutfitPhoto.addEventListener('click', () => this.addOutfitPhoto());

    // ===== 笔记 =====
    const btnAddNote = document.getElementById('btnAddNote');
    if (btnAddNote) btnAddNote.addEventListener('click', () => this.openNoteEditor());
    const notesSearch = document.getElementById('notesSearch');
    if (notesSearch) {
      notesSearch.addEventListener('input', () => {
        this.notesSearch = notesSearch.value.trim().toLowerCase();
        this.renderNotes();
      });
    }

    // ===== 记账 =====
    const btnAddTransaction = document.getElementById('btnAddTransaction');
    if (btnAddTransaction) btnAddTransaction.addEventListener('click', () => this.addTransaction());

    // ===== 习惯 =====
    const btnAddHabit = document.getElementById('btnAddHabit');
    if (btnAddHabit) btnAddHabit.addEventListener('click', () => this.addHabit());
    const habitsInput = document.getElementById('habitsInput');
    if (habitsInput) {
      habitsInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.addHabit();
      });
    }

    // ===== 生日纪念日 =====
    const btnAddBirthday = document.getElementById('btnAddBirthday');
    if (btnAddBirthday) btnAddBirthday.addEventListener('click', () => this.openBirthdayEditor());

    // ===== 复盘 =====
    const btnSaveReview = document.getElementById('btnSaveReview');
    if (btnSaveReview) btnSaveReview.addEventListener('click', () => this.saveReview());

    // ===== 金句刷新 =====
    const quoteCard = document.getElementById('quoteCard');
    if (quoteCard) {
      quoteCard.addEventListener('click', () => this.renderQuote(true));
    }

    // ===== 设置 =====
    const btnSaveNickname = document.getElementById('btnSaveNickname');
    if (btnSaveNickname) btnSaveNickname.addEventListener('click', () => this.saveNickname());
    const nicknameInput = document.getElementById('nicknameInput');
    if (nicknameInput) {
      nicknameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.saveNickname();
      });
    }
    const btnExportData = document.getElementById('btnExportData');
    if (btnExportData) btnExportData.addEventListener('click', () => this.exportData());
    const btnImportData = document.getElementById('btnImportData');
    if (btnImportData) btnImportData.addEventListener('click', () => this.importData());
    const btnClearData = document.getElementById('btnClearData');
    if (btnClearData) btnClearData.addEventListener('click', () => this.clearAllData());
    const btnCloudConfig = document.getElementById('btnCloudConfig');
    if (btnCloudConfig) btnCloudConfig.addEventListener('click', () => this.openCloudConfig());
  },

  // ==================== 导航 ====================
  navigate(page) {
    this.currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    document.querySelectorAll('.sidebar-item[data-page]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    // 更新移动端标题
    const mobileTitle = document.getElementById('mobileTitle');
    if (mobileTitle) mobileTitle.textContent = PAGE_TITLES[page] || page;

    // 关闭侧边栏
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');

    // 页面渲染刷新
    switch (page) {
      case 'home': this.renderHome(); break;
      case 'tasks': this.renderTasks(); break;
      case 'calendar': this.renderCalendar(); break;
      case 'outfits': this.renderOutfits(); break;
      case 'notes': this.renderNotes(); break;
      case 'finance': this.renderFinance(); break;
      case 'habits': this.renderHabits(); break;
      case 'birthdays': this.renderBirthdays(); break;
      case 'reviews': this.renderReviews(); break;
      case 'lookback': this.renderLookback(); break;
      case 'settings': this.renderSettings(); break;
    }

    // 更新角标
    this.updateBadges();
  },

  // ==================== 工具方法 ====================
  toast(msg, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.className = 'toast hidden';
    }, 2500);
  },

  esc(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },

  getPriorityLabel(p) {
    const labels = { 0: '急重', 1: '急轻', 2: '重缓', 3: '轻缓' };
    return labels[p != null ? p : 3] || '轻缓';
  },

  toDateStr(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  },

  fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  },

  fmtDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return this.fmtDate(iso) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },

  todayStr() {
    return this.toDateStr(new Date());
  },

  daysBetween(dateStr) {
    const target = new Date(dateStr);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
  },

  getLastMonthSameDay(date) {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() - 1);
    // 处理上月没有这一天的情况（如 3/31 → 2/28/29）
    if (d.getDate() > day) {
      d.setDate(0);
    }
    return d;
  },

  getSeason(month) {
    // month: 0-11
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  },

  // 创建 DOM 元素辅助
  el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === 'className') node.className = props[k];
        else if (k === 'textContent') node.textContent = props[k];
        else if (k === 'innerHTML') node.innerHTML = props[k];
        else if (k.startsWith('on') && typeof props[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), props[k]);
        } else if (k === 'style' && typeof props[k] === 'object') {
          Object.assign(node.style, props[k]);
        } else if (k === 'disabled') {
          if (props[k]) node.setAttribute('disabled', '');
          else node.removeAttribute('disabled');
        } else if (props[k] != null) {
          node.setAttribute(k, props[k]);
        }
      }
    }
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(c => {
          if (c == null) return;
          node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        });
      } else if (typeof children === 'string') {
        node.textContent = children;
      } else {
        node.appendChild(children);
      }
    }
    return node;
  },

  // ==================== 弹窗 ====================
  showModal(title, bodyContent, footerContent) {
    this.closeModal();
    const mask = this.el('div', { className: 'modal-mask' });
    const box = this.el('div', { className: 'modal-box' });

    const header = this.el('div', { className: 'modal-box-header' }, [
      this.el('h3', { textContent: title }),
      this.el('button', { className: 'icon-btn', textContent: '✕', onclick: () => this.closeModal() })
    ]);

    const body = this.el('div', { className: 'modal-box-body' });
    if (bodyContent) {
      if (Array.isArray(bodyContent)) {
        bodyContent.forEach(c => body.appendChild(c));
      } else if (typeof bodyContent === 'string') {
        body.innerHTML = bodyContent;
      } else {
        body.appendChild(bodyContent);
      }
    }

    const footer = this.el('div', { className: 'modal-box-footer' });
    if (footerContent) {
      if (Array.isArray(footerContent)) {
        footerContent.forEach(c => footer.appendChild(c));
      } else {
        footer.appendChild(footerContent);
      }
    }

    box.appendChild(header);
    box.appendChild(body);
    if (footerContent) box.appendChild(footer);
    mask.appendChild(box);
    mask.addEventListener('click', e => {
      if (e.target === mask) this.closeModal();
    });
    document.body.appendChild(mask);
    return { mask, box, body, footer };
  },

  closeModal() {
    const existing = document.querySelector('.modal-mask');
    if (existing) existing.remove();
  },

  // ==================== 用户配置 ====================
  async loadUserConfig() {
    const configs = await Storage.getAll('userConfig');
    this.userConfigs = {};
    configs.forEach(c => { this.userConfigs[c._id] = c; });

    // 主题
    const theme = this.userConfigs['theme'];
    if (theme && theme.value === 'dark') {
      document.body.classList.add('dark');
    }

    // 昵称
    const nickname = this.userConfigs['nickname'];
    this.nickname = nickname ? nickname.value : '';

    // 预算
    const budget = this.userConfigs['budget'];
    if (budget) this.monthBudget = budget.value || 3000;

    // 板块排序
    const order = this.userConfigs['navOrder'];
    if (order && Array.isArray(order.value)) {
      this.applyNavOrder(order.value);
    }
  },

  async saveUserConfig(id, value) {
    const doc = { _id: id, value: value, updatedAt: Date.now() };
    await Storage.put('userConfig', doc);
    this.userConfigs[id] = doc;
    if (CloudConfig.enabled) SyncEngine.push('userConfig', doc);
  },

  // ==================== 角标 ====================
  async updateBadges() {
    const tasks = await Storage.getAll('tasks');
    const pending = tasks.filter(t => !t.completed).length;
    const badge = document.getElementById('sidebarBadge-tasks');
    if (badge) badge.textContent = pending > 0 ? pending : '';
  },

  // ==================== 首页 ====================
  async renderHome() {
    // 今日日期
    const todayEl = document.getElementById('todayDate');
    if (todayEl) todayEl.textContent = this.fmtDate(this.todayStr());

    // 金句
    this.renderQuote(false);

    // 概览卡片
    await this.renderOverview();

    // 快速区
    await this.renderQuickTasks();
    await this.renderQuickEvents();
    await this.renderQuickHabits();
    this.renderQuickActions();
  },

  renderQuote(forceRefresh) {
    const card = document.getElementById('quoteCard');
    if (!card) return;
    card.innerHTML = '';

    let quoteText;
    // 如果当天有复盘，优先用复盘第一句
    if (!forceRefresh && this._todayReviewQuote) {
      quoteText = this._todayReviewQuote;
    } else {
      // 每天固定一条（用日期做种子）
      const today = this.todayStr();
      if (forceRefresh) {
        // 刷新时随机
        quoteText = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      } else {
        let seed = 0;
        for (let i = 0; i < today.length; i++) seed += today.charCodeAt(i);
        quoteText = QUOTES[seed % QUOTES.length];
      }
    }

    card.appendChild(this.el('div', { className: 'quote-text', textContent: quoteText }));
    card.appendChild(this.el('div', { className: 'quote-date', textContent: '📖 点击换一条' }));
  },

  async renderOverview() {
    const container = document.getElementById('overviewCards');
    if (!container) return;
    container.innerHTML = '';

    const today = this.todayStr();

    // 待办任务数
    const tasks = await Storage.getAll('tasks');
    const pendingTasks = tasks.filter(t => !t.completed).length;

    // 今日日程数
    const events = await Storage.getAll('events');
    const todayEvents = events.filter(e => e.date === today).length;

    // 今日打卡进度
    const habits = await Storage.getAll('habits');
    const todayChecked = habits.filter(h => h.records && h.records.includes(today)).length;
    const habitProgress = habits.length > 0 ? Math.round(todayChecked / habits.length * 100) + '%' : '0%';

    // 即将到来的纪念日
    const birthdays = await Storage.getAll('birthdays');
    const upcoming = birthdays.map(b => {
      const days = this.daysToNextBirthday(b);
      return { ...b, days };
    }).filter(b => b.days >= 0 && b.days <= 30)
      .sort((a, b) => a.days - b.days)[0];
    const birthdayText = upcoming ? (upcoming.days === 0 ? '今天' : upcoming.days + '天') : '无';

    const cards = [
      { icon: '✅', label: '待办任务', value: pendingTasks, page: 'tasks' },
      { icon: '📅', label: '今日日程', value: todayEvents, page: 'calendar' },
      { icon: '🎯', label: '今日打卡', value: habitProgress, page: 'habits' },
      { icon: '🎂', label: '即将纪念日', value: birthdayText, page: 'birthdays' }
    ];

    cards.forEach(c => {
      const card = this.el('div', { className: 'overview-card', onclick: () => this.navigate(c.page) });
      card.appendChild(this.el('div', { className: 'overview-card-icon', textContent: c.icon }));
      card.appendChild(this.el('div', { className: 'overview-card-label', textContent: c.label }));
      card.appendChild(this.el('div', { className: 'overview-card-value', textContent: c.value }));
      container.appendChild(card);
    });
  },

  // 计算距下次生日的天数
  daysToNextBirthday(b) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = b.date; // YYYY-MM-DD
    if (!dateStr) return 9999;
    const parts = dateStr.split('-');
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    let next = new Date(today.getFullYear(), month, day);
    next.setHours(0, 0, 0, 0);
    if (next < today) {
      next = new Date(today.getFullYear() + 1, month, day);
      next.setHours(0, 0, 0, 0);
    }
    return Math.round((next - today) / 86400000);
  },

  async renderQuickTasks() {
    const container = document.getElementById('quickTasks');
    if (!container) return;
    container.innerHTML = '';

    const tasks = await Storage.getAll('tasks');
    const pending = tasks.filter(t => !t.completed).sort((a, b) => {
      const pa = a.priority != null ? a.priority : 3;
      const pb = b.priority != null ? b.priority : 3;
      if (pa !== pb) return pa - pb;
      return 0;
    }).slice(0, 5);

    container.appendChild(this.el('h3', { textContent: '📋 待办任务' }));

    if (pending.length === 0) {
      container.appendChild(this.el('div', { className: 'empty-state', style: { padding: '16px' } }, [
        this.el('p', { textContent: '暂无待办任务，很棒！' })
      ]));
      return;
    }

    pending.forEach(t => {
      const item = this.el('div', { className: 'list-item' });
      const circle = this.el('div', { className: 'checkbox-circle', onclick: async (e) => {
        e.stopPropagation();
        t.completed = true;
        t.completedAt = Date.now();
        await Storage.put('tasks', t);
        if (CloudConfig.enabled) SyncEngine.push('tasks', t);
        this.renderQuickTasks();
        this.updateBadges();
        this.toast('已完成', 'success');
      }});
      item.appendChild(circle);

      const info = this.el('div', { style: { flex: '1', minWidth: '0' } });
      info.appendChild(this.el('div', { className: 'task-title truncate', textContent: t.title }));
      if (t.dueDate) {
        info.appendChild(this.el('div', { className: 'text-xs text-muted', textContent: '📅 ' + this.fmtDate(t.dueDate) }));
      }
      item.appendChild(info);
      container.appendChild(item);
    });
  },

  async renderQuickEvents() {
    const container = document.getElementById('quickEvents');
    if (!container) return;
    container.innerHTML = '';

    const events = await Storage.getAll('events');
    const today = this.todayStr();
    const todayEvents = events.filter(e => e.date === today);

    container.appendChild(this.el('h3', { textContent: '📅 今日日程' }));

    if (todayEvents.length === 0) {
      container.appendChild(this.el('div', { className: 'empty-state', style: { padding: '16px' } }, [
        this.el('p', { textContent: '今天暂无日程' })
      ]));
      return;
    }

    todayEvents.forEach(e => {
      const item = this.el('div', { className: 'list-item' });
      item.appendChild(this.el('span', { className: 'no-shrink', textContent: '🕐' }));
      item.appendChild(this.el('div', { className: 'flex-1 truncate', textContent: e.title }));
      container.appendChild(item);
    });
  },

  async renderQuickHabits() {
    const container = document.getElementById('quickHabits');
    if (!container) return;
    container.innerHTML = '';

    const habits = await Storage.getAll('habits');
    const today = this.todayStr();
    const unchecked = habits.filter(h => !h.records || !h.records.includes(today));

    container.appendChild(this.el('h3', { textContent: '🎯 今日习惯' }));

    if (unchecked.length === 0) {
      container.appendChild(this.el('div', { className: 'empty-state', style: { padding: '16px' } }, [
        this.el('p', { textContent: habits.length > 0 ? '今日习惯已全部打卡！' : '还没有添加习惯' })
      ]));
      return;
    }

    unchecked.forEach(h => {
      const item = this.el('div', { className: 'list-item' });
      const btn = this.el('button', { className: 'habit-check-btn', onclick: async (e) => {
        e.stopPropagation();
        if (!h.records) h.records = [];
        h.records.push(today);
        h.count = (h.count || 0) + 1;
        await Storage.put('habits', h);
        if (CloudConfig.enabled) SyncEngine.push('habits', h);
        this.renderQuickHabits();
        this.renderOverview();
        this.toast('打卡成功', 'success');
      }});
      item.appendChild(btn);
      item.appendChild(this.el('div', { className: 'flex-1 truncate', textContent: h.name }));
      container.appendChild(item);
    });
  },

  renderQuickActions() {
    const container = document.getElementById('quickActions');
    if (!container) return;
    container.innerHTML = '';

    const btnTask = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '➕ 快速添加任务', onclick: () => {
      this.navigate('tasks');
      setTimeout(() => { const inp = document.getElementById('tasksInput'); if (inp) inp.focus(); }, 100);
    }});
    const btnLearn = this.el('button', { className: 'btn btn-secondary btn-sm', textContent: '💡 今日所学', onclick: () => this.openQuickLearn() });
    const btnFinance = this.el('button', { className: 'btn btn-secondary btn-sm', textContent: '💰 快速记账', onclick: () => {
      this.navigate('finance');
      setTimeout(() => { const inp = document.getElementById('financeAmount'); if (inp) inp.focus(); }, 100);
    }});

    container.appendChild(btnTask);
    container.appendChild(btnLearn);
    container.appendChild(btnFinance);
  },

  openQuickLearn() {
    const today = this.todayStr();
    const textarea = this.el('textarea', { className: 'input', rows: '5', style: { width: '100%' }, placeholder: '今天学到了什么？记录一下...' });
    const linkInput = this.el('input', { className: 'input', style: { width: '100%', marginTop: '8px' }, placeholder: '相关链接（可选）' });

    const btnSave = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '💾 保存', onclick: async () => {
      const content = textarea.value.trim();
      if (!content) { this.toast('请输入内容', 'error'); return; }
      const link = linkInput.value.trim();
      const body = link ? content + '\n\n🔗 ' + link : content;
      const review = {
        _id: Storage.genId(),
        date: today,
        content: body,
        tags: ['今日所学'],
        createdAt: Date.now()
      };
      await Storage.put('reviews', review);
      if (CloudConfig.enabled) SyncEngine.push('reviews', review);
      this.closeModal();
      this.toast('已保存到每日所学', 'success');
    }});

    const btnCancel = this.el('button', { className: 'btn btn-secondary btn-sm', textContent: '取消', onclick: () => this.closeModal() });

    this.showModal('💡 今日所学 · ' + this.fmtDate(today), [textarea, linkInput], [btnCancel, btnSave]);
  },

  // ==================== 任务清单 ====================
  renderTasksFilter() {
    const container = document.getElementById('tasksFilter');
    if (!container) return;
    container.innerHTML = '';
    const filters = [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待办' },
      { key: 'done', label: '已完成' },
      { key: '0', label: '急重' },
      { key: '1', label: '急轻' },
      { key: '2', label: '重缓' },
      { key: '3', label: '轻缓' }
    ];
    filters.forEach(f => {
      const tag = this.el('button', {
        className: 'filter-tag' + (this.tasksFilter === f.key ? ' active' : ''),
        textContent: f.label,
        onclick: () => {
          this.tasksFilter = f.key;
          this.renderTasksFilter();
          this.renderTasks();
        }
      });
      container.appendChild(tag);
    });
  },

  async addTask() {
    const input = document.getElementById('tasksInput');
    if (!input) return;
    const title = input.value.trim();
    if (!title) { this.toast('请输入任务内容', 'error'); return; }
    const doc = {
      _id: Storage.generateId(),
      title: title,
      completed: false,
      priority: 3,
      dueDate: '',
      note: '',
      createdAt: Date.now()
    };
    await Storage.put('tasks', doc);
    if (CloudConfig.enabled) SyncEngine.push('tasks', doc);
    input.value = '';
    this.renderTasks();
    this.updateBadges();
    this.toast('任务已添加', 'success');
  },

  async renderTasks() {
    const list = document.getElementById('tasksList');
    if (!list) return;
    list.innerHTML = '';

    let tasks = await Storage.getAll('tasks');
    tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 筛选
    let filtered = tasks;
    if (this.tasksFilter === 'pending') {
      filtered = tasks.filter(t => !t.completed);
    } else if (this.tasksFilter === 'done') {
      filtered = tasks.filter(t => t.completed);
    } else if (['0', '1', '2', '3'].includes(this.tasksFilter)) {
      filtered = tasks.filter(t => String(t.priority || 3) === this.tasksFilter);
    }

    // 统计
    const countEl = document.getElementById('tasksCount');
    if (countEl) {
      const pending = tasks.filter(t => !t.completed).length;
      countEl.textContent = pending + ' 待办 / ' + tasks.length + ' 总计';
    }

    if (filtered.length === 0) {
      list.appendChild(this.el('div', { className: 'empty-state' }, [
        this.el('div', { className: 'empty-icon', textContent: '📭' }),
        this.el('p', { textContent: '暂无任务' })
      ]));
      return;
    }

    filtered.forEach(t => {
      const item = this.el('div', { className: 'list-item', style: { cursor: 'pointer' }, onclick: () => this.openTaskEditor(t) });

      const circle = this.el('div', {
        className: 'checkbox-circle' + (t.completed ? ' checked' : ''),
        onclick: async (e) => {
          e.stopPropagation();
          t.completed = !t.completed;
          t.completedAt = t.completed ? Date.now() : null;
          await Storage.put('tasks', t);
          if (CloudConfig.enabled) SyncEngine.push('tasks', t);
          this.renderTasks();
          this.updateBadges();
        }
      });
      item.appendChild(circle);

      const info = this.el('div', { style: { flex: '1', minWidth: '0' } });
      info.appendChild(this.el('div', { className: 'task-title truncate' + (t.completed ? ' completed' : ''), textContent: t.title }));
      const meta = this.el('div', { className: 'text-xs text-muted', style: { display: 'flex', gap: '8px' } });
      meta.appendChild(this.el('span', { className: 'tag tag-p' + (t.priority != null ? t.priority : 3), textContent: App.getPriorityLabel(t.priority) }));
      if (t.dueDate) meta.appendChild(this.el('span', { textContent: '📅 ' + this.fmtDate(t.dueDate) }));
      info.appendChild(meta);
      item.appendChild(info);

      const delBtn = this.el('button', {
        className: 'icon-btn',
        textContent: '🗑',
        onclick: async (e) => {
          e.stopPropagation();
          await Storage.delete('tasks', t._id);
          if (CloudConfig.enabled) SyncEngine.pushDelete('tasks', t._id);
          this.renderTasks();
          this.updateBadges();
          this.toast('已删除', '');
        }
      });
      item.appendChild(delBtn);
      list.appendChild(item);
    });
  },

  openTaskEditor(task) {
    const titleInput = this.el('input', { className: 'input', style: { width: '100%', marginBottom: '10px' }, value: task.title || '' });
    const prioritySelect = this.el('select', { className: 'input', style: { width: '100%', marginBottom: '10px' } });
    [0, 1, 2, 3].forEach(p => {
      const opt = this.el('option', { value: p, textContent: this.getPriorityLabel(p) });
      if ((task.priority != null ? task.priority : 3) === p) opt.selected = true;
      prioritySelect.appendChild(opt);
    });
    const dateInput = this.el('input', { type: 'date', className: 'input', style: { width: '100%', marginBottom: '10px' }, value: task.dueDate || '' });
    const noteArea = this.el('textarea', { className: 'input', rows: '4', placeholder: '备注...', style: { width: '100%' } });
    noteArea.value = task.note || '';

    const body = [
      this.el('label', { className: 'text-xs text-muted', textContent: '任务标题' }),
      titleInput,
      this.el('label', { className: 'text-xs text-muted', textContent: '优先级' }),
      prioritySelect,
      this.el('label', { className: 'text-xs text-muted', textContent: '截止日期' }),
      dateInput,
      this.el('label', { className: 'text-xs text-muted', textContent: '备注' }),
      noteArea
    ];

    const btnSave = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '💾 保存', onclick: async () => {
      task.title = titleInput.value.trim() || task.title;
      task.priority = parseInt(prioritySelect.value);
      task.dueDate = dateInput.value;
      task.note = noteArea.value;
      task.updatedAt = Date.now();
      await Storage.put('tasks', task);
      if (CloudConfig.enabled) SyncEngine.push('tasks', task);
      this.closeModal();
      this.renderTasks();
      this.updateBadges();
      this.toast('已保存', 'success');
    }});

    const btnDelete = this.el('button', { className: 'btn btn-danger btn-sm', textContent: '🗑 删除', onclick: async () => {
      await Storage.delete('tasks', task._id);
      if (CloudConfig.enabled) SyncEngine.pushDelete('tasks', task._id);
      this.closeModal();
      this.renderTasks();
      this.updateBadges();
      this.toast('已删除', '');
    }});

    this.showModal('编辑任务', body, [btnDelete, btnSave]);
  },

  // ==================== 日程规划 ====================
  async renderCalendar() {
    this.renderCalendarWidget();
    await this.renderCalendarRight();
  },

  renderCalendarWidget() {
    const container = document.getElementById('calendarWidget');
    if (!container) return;
    container.innerHTML = '';

    const view = this.calendarView;
    const year = view.getFullYear();
    const month = view.getMonth();

    // 导航栏
    const nav = this.el('div', { className: 'calendar-nav' });
    nav.appendChild(this.el('button', { className: 'icon-btn', textContent: '‹', onclick: () => {
      this.calendarView = new Date(year, month - 1, 1);
      this.renderCalendarWidget();
    }}));
    nav.appendChild(this.el('span', { className: 'calendar-month', textContent: year + '年' + (month + 1) + '月' }));
    nav.appendChild(this.el('button', { className: 'icon-btn', textContent: '›', onclick: () => {
      this.calendarView = new Date(year, month + 1, 1);
      this.renderCalendarWidget();
    }}));
    container.appendChild(nav);

    // 日历网格
    const grid = this.el('div', { className: 'calendar-grid' });
    const dayHeaders = ['日', '一', '二', '三', '四', '五', '六'];
    dayHeaders.forEach(d => grid.appendChild(this.el('div', { className: 'calendar-day-header', textContent: d })));

    // 计算第一天是星期几
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const today = this.todayStr();

    // 异步加载有事件的日期
    Storage.getAll('events').then(events => {
      const eventDates = new Set(events.map(e => e.date));
      const cells = grid.querySelectorAll('.calendar-day');
      cells.forEach(cell => {
        const dateStr = cell.dataset.date;
        if (dateStr && eventDates.has(dateStr)) {
          cell.classList.add('has-events');
        }
      });
    });

    // 上月填充
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateStr = this.toDateStr(new Date(year, month - 1, d));
      grid.appendChild(this.el('div', {
        className: 'calendar-day other-month',
        textContent: d,
        dataset: { date: dateStr },
        onclick: () => this.selectCalendarDate(dateStr)
      }));
    }

    // 本月
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = this.toDateStr(new Date(year, month, d));
      const classes = 'calendar-day' + (dateStr === today ? ' today' : '') + (dateStr === this.calendarDate ? ' selected' : '');
      grid.appendChild(this.el('div', {
        className: classes,
        textContent: d,
        dataset: { date: dateStr },
        onclick: () => this.selectCalendarDate(dateStr)
      }));
    }

    // 下月填充
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const dateStr = this.toDateStr(new Date(year, month + 1, d));
      grid.appendChild(this.el('div', {
        className: 'calendar-day other-month',
        textContent: d,
        dataset: { date: dateStr },
        onclick: () => this.selectCalendarDate(dateStr)
      }));
    }

    container.appendChild(grid);
  },

  selectCalendarDate(dateStr) {
    this.calendarDate = dateStr;
    this.renderCalendarWidget();
    this.renderCalendarRight();
  },

  async renderCalendarRight() {
    const right = document.getElementById('calendarRight');
    if (!right) return;

    // 保留工具栏，更新事件列表
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;
    eventsList.innerHTML = '';

    const allEvents = await Storage.getAll('events');
    const dateEvents = allEvents.filter(e => e.date === this.calendarDate).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    // 显示选中日期
    eventsList.appendChild(this.el('div', { className: 'text-sm text-muted mb-2', textContent: '📅 ' + this.fmtDate(this.calendarDate) + ' (' + dateEvents.length + '项)' }));

    if (dateEvents.length === 0) {
      eventsList.appendChild(this.el('div', { className: 'empty-state', style: { padding: '20px' } }, [
        this.el('p', { textContent: '当日暂无日程' })
      ]));
      return;
    }

    dateEvents.forEach(e => {
      const item = this.el('div', { className: 'list-item' });
      item.appendChild(this.el('span', { className: 'no-shrink', textContent: '🕐' }));
      item.appendChild(this.el('div', { className: 'flex-1 truncate', textContent: e.title }));
      item.appendChild(this.el('button', {
        className: 'icon-btn',
        textContent: '🗑',
        onclick: async (ev) => {
          ev.stopPropagation();
          await Storage.delete('events', e._id);
          if (CloudConfig.enabled) SyncEngine.pushDelete('events', e._id);
          this.renderCalendar();
          this.toast('已删除', '');
        }
      }));
      eventsList.appendChild(item);
    });
  },

  async addEvent() {
    const input = document.getElementById('calendarInput');
    if (!input) return;
    const title = input.value.trim();
    if (!title) { this.toast('请输入日程内容', 'error'); return; }
    const doc = {
      _id: Storage.generateId(),
      title: title,
      date: this.calendarDate || this.todayStr(),
      createdAt: Date.now()
    };
    await Storage.put('events', doc);
    if (CloudConfig.enabled) SyncEngine.push('events', doc);
    input.value = '';
    this.renderCalendar();
    this.toast('日程已添加', 'success');
  },

  // ==================== 穿搭灵感 ====================
  async renderOutfits() {
    this.renderColorAdvice();
    await this.renderOutfitsList();
  },

  renderColorAdvice() {
    const container = document.getElementById('colorAdvice');
    if (!container) return;
    container.innerHTML = '';

    const month = new Date().getMonth();
    const season = this.getSeason(month);
    const seasonName = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }[season];
    const palettes = SEASON_PALETTES[season];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];

    const card = this.el('div', { className: 'color-advice-card' });
    card.appendChild(this.el('div', { className: 'font-600', style: { fontSize: '14px', marginBottom: '4px' }, textContent: '🎨 今日配色建议' }));
    card.appendChild(this.el('div', { className: 'text-sm text-muted', textContent: seasonName + '季 · ' + palette.name }));

    const paletteDiv = this.el('div', { className: 'color-palette' });
    palette.colors.forEach(c => {
      paletteDiv.appendChild(this.el('div', { className: 'color-swatch-large', style: { background: c } }));
    });
    card.appendChild(paletteDiv);

    container.appendChild(card);
  },

  async addOutfitLink() {
    const input = document.getElementById('outfitsInput');
    if (!input) return;
    const url = input.value.trim();
    if (!url) { this.toast('请输入链接', 'error'); return; }

    // 用 prompt 弹出标题和风格
    const title = window.prompt('请输入标题：', '');
    if (title === null) return;
    const style = window.prompt('请输入风格标签（如：通勤、休闲、约会）：', '');
    if (style === null) return;

    const doc = {
      _id: Storage.generateId(),
      type: 'link',
      url: url,
      title: title || url.substring(0, 30),
      style: style || '其他',
      createdAt: Date.now()
    };
    await Storage.put('outfits', doc);
    if (CloudConfig.enabled) SyncEngine.push('outfits', doc);
    input.value = '';
    this.renderOutfitsList();
    this.toast('已收藏', 'success');
  },

  async addOutfitPhoto() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const doc = {
          _id: Storage.generateId(),
          type: 'photo',
          photo: ev.target.result,
          style: '照片',
          createdAt: Date.now()
        };
        await Storage.put('outfits', doc);
        if (CloudConfig.enabled) SyncEngine.push('outfits', doc);
        this.renderOutfitsList();
        this.toast('照片已添加', 'success');
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  },

  async renderOutfitsList() {
    const container = document.getElementById('outfitsList');
    if (!container) return;
    container.innerHTML = '';

    const allOutfits = await Storage.getAll('outfits');
    const links = allOutfits.filter(o => o.type !== 'photo').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const photos = allOutfits.filter(o => o.type === 'photo').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 按风格分组展示链接
    if (links.length > 0) {
      const groups = {};
      links.forEach(l => {
        const s = l.style || '其他';
        if (!groups[s]) groups[s] = [];
        groups[s].push(l);
      });

      Object.keys(groups).sort().forEach(style => {
        container.appendChild(this.el('div', { className: 'text-sm font-600 mt-2 mb-2', textContent: '🏷 ' + style }));
        groups[style].forEach(l => {
          const card = this.el('a', { className: 'link-card', href: l.url, target: '_blank', rel: 'noopener' });
          card.appendChild(this.el('span', { className: 'no-shrink', textContent: '🔗' }));
          card.appendChild(this.el('div', { className: 'flex-1 truncate', textContent: l.title }));
          card.appendChild(this.el('button', {
            className: 'icon-btn',
            textContent: '🗑',
            onclick: async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await Storage.delete('outfits', l._id);
              if (CloudConfig.enabled) SyncEngine.pushDelete('outfits', l._id);
              this.renderOutfitsList();
              this.toast('已删除', '');
            }
          }));
          container.appendChild(card);
        });
      });
    }

    // 照片网格
    if (photos.length > 0) {
      container.appendChild(this.el('div', { className: 'text-sm font-600 mt-3 mb-2', textContent: '📸 穿搭照片' }));
      const grid = this.el('div', { className: 'photo-grid' });
      photos.forEach(p => {
        const wrapper = this.el('div', { style: { position: 'relative' } });
        const img = this.el('img', { className: 'photo-thumb', src: p.photo, alt: '穿搭' });
        const delBtn = this.el('button', {
          className: 'icon-btn',
          textContent: '🗑',
          style: { position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,255,255,0.8)', borderRadius: '50%', width: '24px', height: '24px', fontSize: '12px' },
          onclick: async (e) => {
            e.stopPropagation();
            await Storage.delete('outfits', p._id);
            if (CloudConfig.enabled) SyncEngine.pushDelete('outfits', p._id);
            this.renderOutfitsList();
            this.toast('已删除', '');
          }
        });
        wrapper.appendChild(img);
        wrapper.appendChild(delBtn);
        grid.appendChild(wrapper);
      });
      container.appendChild(grid);
    }

    if (links.length === 0 && photos.length === 0) {
      container.appendChild(this.el('div', { className: 'empty-state' }, [
        this.el('div', { className: 'empty-icon', textContent: '👔' }),
        this.el('p', { textContent: '还没有收藏穿搭灵感' })
      ]));
    }
  },

  // ==================== 笔记备忘 ====================
  renderNotesFilter() {
    const container = document.getElementById('notesFilter');
    if (!container) return;
    container.innerHTML = '';
    const filters = [
      { key: 'all', label: '全部' },
      { key: 'pinned', label: '置顶' }
    ];
    filters.forEach(f => {
      const tag = this.el('button', {
        className: 'filter-tag' + (this.notesFilter === f.key ? ' active' : ''),
        textContent: f.label,
        onclick: () => {
          this.notesFilter = f.key;
          this.renderNotesFilter();
          this.renderNotes();
        }
      });
      container.appendChild(tag);
    });
  },

  async renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;
    container.innerHTML = '';

    let notes = await Storage.getAll('notes');

    // 筛选
    if (this.notesFilter === 'pinned') {
      notes = notes.filter(n => n.pinned);
    }

    // 搜索
    if (this.notesSearch) {
      notes = notes.filter(n =>
        (n.title || '').toLowerCase().includes(this.notesSearch) ||
        (n.content || '').toLowerCase().includes(this.notesSearch)
      );
    }

    // 排序：置顶优先，然后按更新时间倒序
    notes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });

    if (notes.length === 0) {
      container.appendChild(this.el('div', { className: 'empty-state' }, [
        this.el('div', { className: 'empty-icon', textContent: '📝' }),
        this.el('p', { textContent: this.notesSearch ? '没有找到匹配的笔记' : '还没有笔记，点击新建' })
      ]));
      return;
    }

    notes.forEach(n => {
      const card = this.el('div', { className: 'note-card', onclick: () => this.openNoteEditor(n) });
      const titleDiv = this.el('div', { className: 'note-card-title' });
      if (n.pinned) titleDiv.appendChild(this.el('span', { textContent: '📌 ', style: { marginRight: '4px' } }));
      titleDiv.appendChild(document.createTextNode(n.title || '无标题'));
      card.appendChild(titleDiv);

      card.appendChild(this.el('div', { className: 'note-card-preview', textContent: n.content || '' }));

      const meta = this.el('div', { className: 'note-card-meta' });
      meta.appendChild(this.el('span', { textContent: this.fmtDate(n.updatedAt || n.createdAt) }));
      if (n.tag) meta.appendChild(this.el('span', { className: 'tag', textContent: n.tag }));
      card.appendChild(meta);

      container.appendChild(card);
    });
  },

  openNoteEditor(note) {
    const isNew = !note;
    const data = note || { _id: Storage.generateId(), title: '', content: '', pinned: false, tag: '', createdAt: Date.now() };

    const titleInput = this.el('input', { className: 'input', style: { width: '100%', marginBottom: '10px' }, placeholder: '标题', value: data.title || '' });
    const contentArea = this.el('textarea', { className: 'input', rows: '8', placeholder: '内容...', style: { width: '100%', marginBottom: '10px' } });
    contentArea.value = data.content || '';

    // 置顶开关
    const toggleLabel = this.el('label', { className: 'flex items-center gap-2', style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' } });
    const toggleWrap = this.el('div', { className: 'toggle-switch' });
    const toggleInput = this.el('input', { type: 'checkbox' });
    if (data.pinned) toggleInput.checked = true;
    const toggleSlider = this.el('span', { className: 'toggle-slider' });
    toggleWrap.appendChild(toggleInput);
    toggleWrap.appendChild(toggleSlider);
    toggleLabel.appendChild(toggleWrap);
    toggleLabel.appendChild(this.el('span', { className: 'text-sm', textContent: '置顶' }));

    const tagInput = this.el('input', { className: 'input', style: { width: '100%', marginBottom: '10px' }, placeholder: '标签', value: data.tag || '' });

    const body = [titleInput, contentArea, toggleLabel, tagInput];

    const btnSave = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '💾 保存', onclick: async () => {
      const title = titleInput.value.trim();
      const content = contentArea.value;
      if (!title && !content) { this.toast('请输入内容', 'error'); return; }
      data.title = title;
      data.content = content;
      data.pinned = toggleInput.checked;
      data.tag = tagInput.value.trim();
      data.updatedAt = Date.now();
      await Storage.put('notes', data);
      if (CloudConfig.enabled) SyncEngine.push('notes', data);
      this.closeModal();
      this.renderNotes();
      this.toast('已保存', 'success');
    }});

    const btnDelete = this.el('button', { className: 'btn btn-danger btn-sm', textContent: '🗑 删除', onclick: async () => {
      if (isNew) { this.closeModal(); return; }
      await Storage.delete('notes', data._id);
      if (CloudConfig.enabled) SyncEngine.pushDelete('notes', data._id);
      this.closeModal();
      this.renderNotes();
      this.toast('已删除', '');
    }});

    this.showModal(isNew ? '新建笔记' : '编辑笔记', body, isNew ? [btnSave] : [btnDelete, btnSave]);
  },

  // ==================== 记账 ====================
  async renderFinance() {
    const monthEl = document.getElementById('financeMonth');
    if (monthEl) {
      const now = new Date();
      monthEl.textContent = now.getFullYear() + '年' + (now.getMonth() + 1) + '月';
    }

    await this.renderBudgetBar();
    await this.renderTransactions();
  },

  async renderBudgetBar() {
    const container = document.getElementById('budgetBar');
    if (!container) return;
    container.innerHTML = '';

    const transactions = await Storage.getAll('transactions');
    const now = new Date();
    const yearMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && (t.date || '').startsWith(yearMonth))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const budget = this.monthBudget;
    const remaining = budget - monthExpenses;
    const percent = budget > 0 ? Math.min(100, Math.round(monthExpenses / budget * 100)) : 0;
    const over = monthExpenses > budget;

    const bar = this.el('div', { className: 'budget-bar' });
    const header = this.el('div', { className: 'budget-header' });
    header.appendChild(this.el('span', { textContent: '本月预算 ¥' + budget }));
    header.appendChild(this.el('span', { textContent: '已花 ¥' + monthExpenses + (over ? ' (超支 ¥' + (monthExpenses - budget) + ')' : ' / 剩余 ¥' + remaining) }));
    bar.appendChild(header);

    const track = this.el('div', { className: 'budget-track' });
    track.appendChild(this.el('div', { className: 'budget-fill' + (over ? ' over' : ''), style: { width: percent + '%' } }));
    bar.appendChild(track);

    // 预算设置按钮
    bar.appendChild(this.el('button', { className: 'btn btn-secondary btn-sm mt-2', textContent: '⚙️ 设置预算', style: { marginTop: '8px' }, onclick: () => this.openBudgetEditor() }));

    // 7天趋势柱状图
    bar.appendChild(this.el('div', { className: 'text-sm text-muted mt-3', style: { marginTop: '12px' }, textContent: '📈 近7天支出趋势' }));
    const chartRow = this.el('div', { className: 'chart-bar-row' });
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(this.toDateStr(d));
    }
    const dayExpenses = last7Days.map(ds => {
      return transactions
        .filter(t => t.type === 'expense' && t.date === ds)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    });
    const maxExpense = Math.max(...dayExpenses, 1);
    dayExpenses.forEach(amt => {
      const height = Math.max(2, Math.round(amt / maxExpense * 70));
      const barEl = this.el('div', { className: 'chart-bar', style: { height: height + 'px' }, title: '¥' + amt });
      chartRow.appendChild(barEl);
    });
    bar.appendChild(chartRow);

    container.appendChild(bar);
  },

  openBudgetEditor() {
    const input = this.el('input', { className: 'input', type: 'number', style: { width: '100%' }, value: this.monthBudget });
    const body = [
      this.el('label', { className: 'text-sm text-muted', textContent: '月度预算（元）' }),
      input
    ];
    const btnSave = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '保存', onclick: async () => {
      const val = parseFloat(input.value);
      if (isNaN(val) || val < 0) { this.toast('请输入有效金额', 'error'); return; }
      this.monthBudget = val;
      await this.saveUserConfig('budget', val);
      this.closeModal();
      this.renderBudgetBar();
      this.toast('预算已更新', 'success');
    }});
    this.showModal('设置预算', body, [btnSave]);
  },

  async addTransaction() {
    const amountInput = document.getElementById('financeAmount');
    const typeSelect = document.getElementById('financeType');
    const categorySelect = document.getElementById('financeCategory');
    if (!amountInput) return;

    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) { this.toast('请输入有效金额', 'error'); return; }

    const doc = {
      _id: Storage.generateId(),
      amount: amount,
      type: typeSelect.value,
      category: categorySelect.value,
      date: this.todayStr(),
      createdAt: Date.now()
    };
    await Storage.put('transactions', doc);
    if (CloudConfig.enabled) SyncEngine.push('transactions', doc);
    amountInput.value = '';
    this.renderFinance();
    this.toast('已记录', 'success');
  },

  async renderTransactions() {
    const container = document.getElementById('transactionsList');
    const statsEl = document.getElementById('financeStats');
    if (!container) return;

    const transactions = await Storage.getAll('transactions');
    transactions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // 统计
    const now = new Date();
    const yearMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const monthTxns = transactions.filter(t => (t.date || '').startsWith(yearMonth));
    const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const balance = income - expense;

    if (statsEl) {
      statsEl.innerHTML = '';
      statsEl.appendChild(this.el('div', { className: 'stat-item' }, [
        this.el('div', { className: 'stat-value', textContent: '¥' + expense.toFixed(0) }),
        this.el('div', { className: 'stat-label', textContent: '支出' })
      ]));
      statsEl.appendChild(this.el('div', { className: 'stat-item' }, [
        this.el('div', { className: 'stat-value', textContent: '¥' + income.toFixed(0) }),
        this.el('div', { className: 'stat-label', textContent: '收入' })
      ]));
      statsEl.appendChild(this.el('div', { className: 'stat-item' }, [
        this.el('div', { className: 'stat-value', textContent: '¥' + balance.toFixed(0) }),
        this.el('div', { className: 'stat-label', textContent: '结余' })
      ]));
    }

    container.innerHTML = '';

    if (transactions.length === 0) {
      container.appendChild(this.el('div', { className: 'empty-state' }, [
        this.el('div', { className: 'empty-icon', textContent: '💰' }),
        this.el('p', { textContent: '还没有记录' })
      ]));
      return;
    }

    // 按日期分组
    const today = this.todayStr();
    const yesterday = this.toDateStr(new Date(Date.now() - 86400000));
    const groups = { today: [], yesterday: [], earlier: [] };
    transactions.forEach(t => {
      if (t.date === today) groups.today.push(t);
      else if (t.date === yesterday) groups.yesterday.push(t);
      else groups.earlier.push(t);
    });

    const renderGroup = (label, txns) => {
      if (txns.length === 0) return;
      const group = this.el('div', { className: 'date-group' });
      group.appendChild(this.el('div', { className: 'date-group-label', textContent: label }));
      txns.forEach(t => {
        const item = this.el('div', { className: 'list-item' });
        const sign = t.type === 'income' ? '+' : '-';
        const color = t.type === 'income' ? 'var(--success)' : 'var(--text)';
        item.appendChild(this.el('span', { className: 'no-shrink', textContent: t.type === 'income' ? '📥' : '📤' }));
        item.appendChild(this.el('div', { className: 'flex-1' }, [
          this.el('div', { className: 'truncate font-600', textContent: t.category }),
          this.el('div', { className: 'text-xs text-muted', textContent: this.fmtDate(t.date) })
        ]));
        item.appendChild(this.el('span', { className: 'font-600 no-shrink', style: { color: color }, textContent: sign + '¥' + t.amount }));
        item.appendChild(this.el('button', {
          className: 'icon-btn',
          textContent: '🗑',
          onclick: async (e) => {
            e.stopPropagation();
            await Storage.delete('transactions', t._id);
            if (CloudConfig.enabled) SyncEngine.pushDelete('transactions', t._id);
            this.renderFinance();
            this.toast('已删除', '');
          }
        }));
        group.appendChild(item);
      });
      container.appendChild(group);
    };

    renderGroup('今天', groups.today);
    renderGroup('昨天', groups.yesterday);
    renderGroup('更早', groups.earlier);
  },

  // ==================== 习惯打卡 ====================
  async addHabit() {
    const input = document.getElementById('habitsInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) { this.toast('请输入习惯名称', 'error'); return; }

    // 询问每周目标
    const goalStr = window.prompt('每周目标打卡几天？（0 或留空表示不设目标）', '7');
    let weeklyGoal = 0;
    if (goalStr) {
      weeklyGoal = parseInt(goalStr) || 0;
    }

    const doc = {
      _id: Storage.generateId(),
      name: name,
      records: [],
      count: 0,
      weeklyGoal: weeklyGoal,
      createdAt: Date.now()
    };
    await Storage.put('habits', doc);
    if (CloudConfig.enabled) SyncEngine.push('habits', doc);
    input.value = '';
    this.renderHabits();
    this.toast('习惯已添加', 'success');
  },

  async renderHabits() {
    const list = document.getElementById('habitsList');
    const summary = document.getElementById('habitsSummary');
    if (!list) return;
    list.innerHTML = '';

    const habits = await Storage.getAll('habits');
    habits.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    // 汇总
    if (summary) {
      summary.innerHTML = '';
      const today = this.todayStr();
      const todayCount = habits.filter(h => h.records && h.records.includes(today)).length;
      summary.appendChild(this.el('div', { className: 'stat-row' }, [
        this.el('div', { className: 'stat-item' }, [
          this.el('div', { className: 'stat-value', textContent: habits.length }),
          this.el('div', { className: 'stat-label', textContent: '总习惯数' })
        ]),
        this.el('div', { className: 'stat-item' }, [
          this.el('div', { className: 'stat-value', textContent: todayCount }),
          this.el('div', { className: 'stat-label', textContent: '今日已打卡' })
        ]),
        this.el('div', { className: 'stat-item' }, [
          this.el('div', { className: 'stat-value', textContent: habits.length - todayCount }),
          this.el('div', { className: 'stat-label', textContent: '待打卡' })
        ])
      ]));
    }

    if (habits.length === 0) {
      list.appendChild(this.el('div', { className: 'empty-state' }, [
        this.el('div', { className: 'empty-icon', textContent: '🎯' }),
        this.el('p', { textContent: '还没有添加习惯' })
      ]));
      return;
    }

    const today = this.todayStr();

    habits.forEach(h => {
      const records = h.records || [];
      const checkedToday = records.includes(today);

      // 连续天数
      const streak = this.calcHabitStreak(records);
      // 本周打卡数
      const weekCount = this.calcWeekCount(records);

      const item = this.el('div', { className: 'list-item', style: { alignItems: 'flex-start', flexDirection: 'column', gap: '0' } });

      // 第一行：打卡按钮 + 名称 + 统计 + 编辑
      const row1 = this.el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%' } });
      const checkBtn = this.el('button', {
        className: 'habit-check-btn' + (checkedToday ? ' checked' : ''),
        textContent: '✓',
        onclick: async () => {
          if (!h.records) h.records = [];
          if (checkedToday) {
            h.records = h.records.filter(r => r !== today);
            h.count = Math.max(0, (h.count || 0) - 1);
          } else {
            h.records.push(today);
            h.count = (h.count || 0) + 1;
          }
          await Storage.put('habits', h);
          if (CloudConfig.enabled) SyncEngine.push('habits', h);
          this.renderHabits();
          this.updateBadges();
        }
      });
      row1.appendChild(checkBtn);

      const info = this.el('div', { style: { flex: '1', minWidth: '0' } });
      info.appendChild(this.el('div', { className: 'font-600', textContent: h.name }));
      const stats = this.el('div', { className: 'text-xs text-muted', style: { display: 'flex', gap: '8px' } });
      stats.appendChild(this.el('span', { textContent: '🔥 连续' + streak + '天' }));
      stats.appendChild(this.el('span', { textContent: '总计' + (h.count || 0) + '次' }));
      if (h.weeklyGoal > 0) stats.appendChild(this.el('span', { textContent: '本周' + weekCount + '/' + h.weeklyGoal }));
      info.appendChild(stats);
      row1.appendChild(info);

      row1.appendChild(this.el('button', {
        className: 'icon-btn',
        textContent: '✏️',
        onclick: () => this.openHabitEditor(h)
      }));
      item.appendChild(row1);

      // 热力图
      const heatmap = this.el('div', { className: 'heatmap', style: { width: '100%', marginTop: '6px' } });
      for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = this.toDateStr(d);
        const hasRecord = records.includes(ds);
        // 计算该日及前几日的频率等级
        let level = 0;
        if (hasRecord) level = 4;
        heatmap.appendChild(this.el('div', {
          className: 'heatmap-cell' + (level > 0 ? ' l' + level : ''),
          title: ds + (hasRecord ? ' ✓' : '')
        }));
      }
      item.appendChild(heatmap);

      // 进度条
      if (h.weeklyGoal > 0) {
        const progress = Math.min(100, Math.round(weekCount / h.weeklyGoal * 100));
        const progressDiv = this.el('div', { style: { width: '100%', marginTop: '4px' } });
        const progressLabel = this.el('div', { className: 'text-xs text-muted', textContent: '本周进度 ' + weekCount + '/' + h.weeklyGoal + ' (' + progress + '%)' });
        const progressBar = this.el('div', { className: 'habit-progress' });
        progressBar.appendChild(this.el('div', { className: 'habit-progress-bar', style: { width: progress + '%' } }));
        progressDiv.appendChild(progressLabel);
        progressDiv.appendChild(progressBar);
        item.appendChild(progressDiv);
      }

      list.appendChild(item);
    });
  },

  calcHabitStreak(records) {
    if (!records || records.length === 0) return 0;
    const sorted = [...records].sort();
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = this.toDateStr(d);
      if (sorted.includes(ds)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  },

  calcWeekCount(records) {
    if (!records) return 0;
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=周日
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    return records.filter(r => {
      const d = new Date(r);
      d.setHours(0, 0, 0, 0);
      return d >= monday;
    }).length;
  },

  openHabitEditor(habit) {
    const nameInput = this.el('input', { className: 'input', style: { width: '100%', marginBottom: '10px' }, value: habit.name || '' });
    const goalInput = this.el('input', { className: 'input', type: 'number', min: '0', max: '7', style: { width: '100%', marginBottom: '10px' }, value: habit.weeklyGoal || 0 });

    const body = [
      this.el('label', { className: 'text-xs text-muted', textContent: '习惯名称' }),
      nameInput,
      this.el('label', { className: 'text-xs text-muted', textContent: '每周目标次数（0=不设目标）' }),
      goalInput
    ];

    const btnSave = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '💾 保存', onclick: async () => {
      const name = nameInput.value.trim();
      if (!name) { this.toast('请输入名称', 'error'); return; }
      habit.name = name;
      habit.weeklyGoal = parseInt(goalInput.value) || 0;
      habit.updatedAt = Date.now();
      await Storage.put('habits', habit);
      if (CloudConfig.enabled) SyncEngine.push('habits', habit);
      this.closeModal();
      this.renderHabits();
      this.toast('已保存', 'success');
    }});

    const btnDelete = this.el('button', { className: 'btn btn-danger btn-sm', textContent: '🗑 删除', onclick: async () => {
      await Storage.delete('habits', habit._id);
      if (CloudConfig.enabled) SyncEngine.pushDelete('habits', habit._id);
      this.closeModal();
      this.renderHabits();
      this.updateBadges();
      this.toast('已删除', '');
    }});

    this.showModal('编辑习惯', body, [btnDelete, btnSave]);
  },

  // ==================== 生日纪念日 ====================
  renderBirthdaysFilter() {
    const container = document.getElementById('birthdaysFilter');
    if (!container) return;
    container.innerHTML = '';
    const filters = [
      { key: 'all', label: '全部' },
      { key: '家人', label: '家人' },
      { key: '朋友', label: '朋友' },
      { key: '恋人', label: '恋人' },
      { key: '同事', label: '同事' }
    ];
    filters.forEach(f => {
      const tag = this.el('button', {
        className: 'filter-tag' + (this.birthdaysFilter === f.key ? ' active' : ''),
        textContent: f.label,
        onclick: () => {
          this.birthdaysFilter = f.key;
          this.renderBirthdaysFilter();
          this.renderBirthdays();
        }
      });
      container.appendChild(tag);
    });
  },

  async renderBirthdays() {
    const container = document.getElementById('birthdaysList');
    if (!container) return;
    container.innerHTML = '';

    let birthdays = await Storage.getAll('birthdays');

    // 筛选
    if (this.birthdaysFilter !== 'all') {
      birthdays = birthdays.filter(b => b.relation === this.birthdaysFilter);
    }

    // 计算距今天数并排序
    birthdays = birthdays.map(b => {
      const days = this.daysToNextBirthday(b);
      return { ...b, _days: days };
    }).sort((a, b) => a._days - b._days);

    if (birthdays.length === 0) {
      container.appendChild(this.el('div', { className: 'empty-state' }, [
        this.el('div', { className: 'empty-icon', textContent: '🎂' }),
        this.el('p', { textContent: '还没有添加纪念日' })
      ]));
      return;
    }

    birthdays.forEach(b => {
      const isToday = b._days === 0;
      const isSoon = b._days > 0 && b._days <= 7;
      const bgColor = isToday ? { background: 'rgba(20,184,166,0.1)' } : isSoon ? { background: 'rgba(245,158,11,0.08)' } : {};

      const item = this.el('div', { className: 'list-item', style: { ...bgColor, cursor: 'pointer', alignItems: 'flex-start' }, onclick: () => this.openBirthdayEditor(b) });

      const left = this.el('div', { style: { flex: '1', minWidth: '0' } });
      left.appendChild(this.el('div', { className: 'font-600', textContent: b.name + (b.isLunar ? ' 🌙' : '') }));

      const meta = this.el('div', { className: 'text-xs text-muted', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } });
      meta.appendChild(this.el('span', { textContent: this.fmtDate(b.date) }));
      if (b.relation) meta.appendChild(this.el('span', { className: 'tag', textContent: b.relation }));
      if (b.note) meta.appendChild(this.el('span', { textContent: b.note }));
      left.appendChild(meta);

      item.appendChild(left);

      // 距今天数
      const dayLabel = isToday ? '🎉 今天！' : b._days + '天后';
      item.appendChild(this.el('div', { className: 'no-shrink font-600', style: { color: isToday ? 'var(--accent)' : isSoon ? 'var(--warning)' : 'var(--text3)' }, textContent: dayLabel }));

      container.appendChild(item);
    });
  },

  openBirthdayEditor(birthday) {
    const isNew = !birthday;
    const data = birthday || { _id: Storage.generateId(), name: '', relation: '朋友', date: '', note: '', isLunar: false, createdAt: Date.now() };

    const nameInput = this.el('input', { className: 'input', style: { width: '100%', marginBottom: '10px' }, placeholder: '姓名', value: data.name || '' });

    const relationSelect = this.el('select', { className: 'input', style: { width: '100%', marginBottom: '10px' } });
    ['家人', '朋友', '恋人', '同事', '其他'].forEach(r => {
      const opt = this.el('option', { value: r, textContent: r });
      if (data.relation === r) opt.selected = true;
      relationSelect.appendChild(opt);
    });

    const dateInput = this.el('input', { type: 'date', className: 'input', style: { width: '100%', marginBottom: '10px' }, value: data.date || '' });

    const noteInput = this.el('input', { className: 'input', style: { width: '100%', marginBottom: '10px' }, placeholder: '备注', value: data.note || '' });

    const lunarLabel = this.el('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } });
    const lunarInput = this.el('input', { type: 'checkbox' });
    if (data.isLunar) lunarInput.checked = true;
    lunarLabel.appendChild(lunarInput);
    lunarLabel.appendChild(this.el('span', { className: 'text-sm', textContent: '农历' }));

    const body = [
      this.el('label', { className: 'text-xs text-muted', textContent: '姓名' }),
      nameInput,
      this.el('label', { className: 'text-xs text-muted', textContent: '关系' }),
      relationSelect,
      this.el('label', { className: 'text-xs text-muted', textContent: '日期' }),
      dateInput,
      this.el('label', { className: 'text-xs text-muted', textContent: '备注' }),
      noteInput,
      lunarLabel
    ];

    const btnSave = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '💾 保存', onclick: async () => {
      const name = nameInput.value.trim();
      const date = dateInput.value;
      if (!name) { this.toast('请输入姓名', 'error'); return; }
      if (!date) { this.toast('请选择日期', 'error'); return; }
      data.name = name;
      data.relation = relationSelect.value;
      data.date = date;
      data.note = noteInput.value.trim();
      data.isLunar = lunarInput.checked;
      data.updatedAt = Date.now();
      await Storage.put('birthdays', data);
      if (CloudConfig.enabled) SyncEngine.push('birthdays', data);
      this.closeModal();
      this.renderBirthdays();
      this.toast('已保存', 'success');
    }});

    const btnDelete = this.el('button', { className: 'btn btn-danger btn-sm', textContent: '🗑 删除', onclick: async () => {
      if (isNew) { this.closeModal(); return; }
      await Storage.delete('birthdays', data._id);
      if (CloudConfig.enabled) SyncEngine.pushDelete('birthdays', data._id);
      this.closeModal();
      this.renderBirthdays();
      this.toast('已删除', '');
    }});

    this.showModal(isNew ? '添加纪念日' : '编辑纪念日', body, isNew ? [btnSave] : [btnDelete, btnSave]);
  },

  // ==================== 每日学到 ====================
  async renderReviews() {
    await this.renderReviewStats();
    await this.renderReviewInput();
    await this.renderReviewsList();
  },

  async renderReviewStats() {
    const container = document.getElementById('reviewStats');
    if (!container) return;
    container.innerHTML = '';

    const reviews = await Storage.getAll('reviews');
    const dates = reviews.map(r => r.date).sort().reverse();

    // 连续天数
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = this.toDateStr(d);
      if (dates.includes(ds)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // 本周天数
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    const weekCount = dates.filter(d => {
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      return dd >= monday;
    }).length;

    container.appendChild(this.el('div', { className: 'review-stat' }, [
      this.el('div', { className: 'review-stat-value', textContent: streak }),
      this.el('div', { className: 'review-stat-label', textContent: '连续天数' })
    ]));
    container.appendChild(this.el('div', { className: 'review-stat' }, [
      this.el('div', { className: 'review-stat-value', textContent: weekCount }),
      this.el('div', { className: 'review-stat-label', textContent: '本周天数' })
    ]));
    container.appendChild(this.el('div', { className: 'review-stat' }, [
      this.el('div', { className: 'review-stat-value', textContent: reviews.length }),
      this.el('div', { className: 'review-stat-label', textContent: '总记录数' })
    ]));
  },

  async renderReviewInput() {
    const input = document.getElementById('reviewInput');
    const tagsInput = document.getElementById('reviewTags');
    if (!input) return;

    // 检查今天是否已有复盘
    const reviews = await Storage.getAll('reviews');
    const todayReview = reviews.find(r => r.date === this.todayStr());
    if (todayReview) {
      input.value = todayReview.content || '';
      tagsInput.value = (todayReview.tags || []).join(',');
      // 存储今日复盘的第一句供金句使用
      const firstSentence = (todayReview.content || '').split(/[。！？\n]/)[0];
      this._todayReviewQuote = firstSentence || null;
    } else {
      this._todayReviewQuote = null;
    }
  },

  async saveReview() {
    const input = document.getElementById('reviewInput');
    const tagsInput = document.getElementById('reviewTags');
    if (!input) return;
    const content = input.value.trim();
    if (!content) { this.toast('请输入内容', 'error'); return; }

    const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
    const today = this.todayStr();

    // 查找今天的复盘
    const reviews = await Storage.getAll('reviews');
    const existing = reviews.find(r => r.date === today);

    if (existing) {
      existing.content = content;
      existing.tags = tags;
      existing.updatedAt = Date.now();
      await Storage.put('reviews', existing);
      if (CloudConfig.enabled) SyncEngine.push('reviews', existing);
    } else {
      const doc = {
        _id: Storage.generateId(),
        date: today,
        content: content,
        tags: tags,
        createdAt: Date.now()
      };
      await Storage.put('reviews', doc);
      if (CloudConfig.enabled) SyncEngine.push('reviews', doc);
    }

    this.renderReviews();
    this.renderQuote(false);
    this.toast('已保存', 'success');
  },

  async renderReviewsList() {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    container.innerHTML = '';

    const reviews = await Storage.getAll('reviews');
    reviews.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (reviews.length === 0) {
      container.appendChild(this.el('div', { className: 'empty-state' }, [
        this.el('div', { className: 'empty-icon', textContent: '📓' }),
        this.el('p', { textContent: '还没有记录' })
      ]));
      return;
    }

    reviews.forEach(r => {
      const item = this.el('div', { className: 'review-item', onclick: () => this.openReviewEditor(r) });
      item.appendChild(this.el('div', { className: 'review-item-date', textContent: this.fmtDate(r.date) }));
      item.appendChild(this.el('div', { className: 'review-item-content', textContent: r.content }));

      if (r.tags && r.tags.length > 0) {
        const tagsDiv = this.el('div', { className: 'review-item-tags' });
        r.tags.forEach(t => tagsDiv.appendChild(this.el('span', { className: 'tag', textContent: t })));
        item.appendChild(tagsDiv);
      }

      container.appendChild(item);
    });
  },

  openReviewEditor(review) {
    const contentArea = this.el('textarea', { className: 'input', rows: '6', style: { width: '100%', marginBottom: '10px' } });
    contentArea.value = review.content || '';
    const tagsInput = this.el('input', { className: 'input', style: { width: '100%' }, placeholder: '标签，逗号分隔', value: (review.tags || []).join(',') });

    const body = [contentArea, tagsInput];

    const btnSave = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '💾 保存', onclick: async () => {
      const content = contentArea.value.trim();
      if (!content) { this.toast('请输入内容', 'error'); return; }
      review.content = content;
      review.tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
      review.updatedAt = Date.now();
      await Storage.put('reviews', review);
      if (CloudConfig.enabled) SyncEngine.push('reviews', review);
      this.closeModal();
      this.renderReviews();
      this.renderQuote(false);
      this.toast('已保存', 'success');
    }});

    const btnDelete = this.el('button', { className: 'btn btn-danger btn-sm', textContent: '🗑 删除', onclick: async () => {
      await Storage.delete('reviews', review._id);
      if (CloudConfig.enabled) SyncEngine.pushDelete('reviews', review._id);
      this.closeModal();
      this.renderReviews();
      this.renderQuote(false);
      this.toast('已删除', '');
    }});

    this.showModal('编辑 · ' + this.fmtDate(review.date), body, [btnDelete, btnSave]);
  },

  // ==================== 上月今日 ====================
  async renderLookback() {
    const header = document.getElementById('lookbackHeader');
    const grid = document.getElementById('lookbackGrid');
    const compare = document.getElementById('lookbackCompare');
    if (!header || !grid) return;

    // 日期选择器
    header.innerHTML = '';
    header.appendChild(this.el('h3', { textContent: '🔙 回顾 ' + this.fmtDate(this.lookbackDate) }));
    header.appendChild(this.el('div', { className: 'text-muted', textContent: '看看那天的你都在做什么' }));

    const dateInput = this.el('input', { type: 'date', className: 'input', style: { marginTop: '8px', width: 'auto' }, value: this.lookbackDate });
    dateInput.addEventListener('change', () => {
      this.lookbackDate = dateInput.value;
      this.renderLookback();
    });
    header.appendChild(dateInput);

    grid.innerHTML = '';

    const dateStr = this.lookbackDate;

    // 拉取各模块数据
    const tasks = await Storage.getAll('tasks');
    const reviews = await Storage.getAll('reviews');
    const habits = await Storage.getAll('habits');
    const notes = await Storage.getAll('notes');
    const events = await Storage.getAll('events');

    const dayTasks = tasks.filter(t => {
      const created = this.toDateStr(new Date(t.createdAt || 0));
      return created === dateStr;
    });
    const dayReview = reviews.filter(r => r.date === dateStr);
    const dayHabits = habits.filter(h => h.records && h.records.includes(dateStr));
    const dayNotes = notes.filter(n => {
      const created = this.toDateStr(new Date(n.createdAt || 0));
      return created === dateStr;
    });
    const dayEvents = events.filter(e => e.date === dateStr);

    const hasData = dayTasks.length > 0 || dayReview.length > 0 || dayHabits.length > 0 || dayNotes.length > 0 || dayEvents.length > 0;

    if (!hasData) {
      grid.appendChild(this.el('div', { className: 'lookback-card', style: { gridColumn: '1 / -1' } }, [
        this.el('div', { className: 'empty-state' }, [
          this.el('div', { className: 'empty-icon', textContent: '🌙' }),
          this.el('p', { textContent: '这天很安静' })
        ])
      ]));
    } else {
      // 任务
      if (dayTasks.length > 0) {
        const card = this.el('div', { className: 'lookback-card' });
        card.appendChild(this.el('h4', { textContent: '✅ 任务 (' + dayTasks.length + ')' }));
        dayTasks.forEach(t => {
          card.appendChild(this.el('div', { className: 'text-sm', style: { marginBottom: '4px' }, textContent: (t.completed ? '✓ ' : '○ ') + t.title }));
        });
        grid.appendChild(card);
      }

      // 日程
      if (dayEvents.length > 0) {
        const card = this.el('div', { className: 'lookback-card' });
        card.appendChild(this.el('h4', { textContent: '📅 日程 (' + dayEvents.length + ')' }));
        dayEvents.forEach(e => {
          card.appendChild(this.el('div', { className: 'text-sm', style: { marginBottom: '4px' }, textContent: '• ' + e.title }));
        });
        grid.appendChild(card);
      }

      // 每日学到
      if (dayReview.length > 0) {
        const card = this.el('div', { className: 'lookback-card' });
        card.appendChild(this.el('h4', { textContent: '📓 每日学到' }));
        dayReview.forEach(r => {
          card.appendChild(this.el('div', { className: 'text-sm', style: { lineHeight: '1.5' }, textContent: r.content }));
        });
        grid.appendChild(card);
      }

      // 习惯
      if (dayHabits.length > 0) {
        const card = this.el('div', { className: 'lookback-card' });
        card.appendChild(this.el('h4', { textContent: '🎯 习惯 (' + dayHabits.length + ')' }));
        dayHabits.forEach(h => {
          card.appendChild(this.el('div', { className: 'text-sm', style: { marginBottom: '4px' }, textContent: '✓ ' + h.name }));
        });
        grid.appendChild(card);
      }

      // 笔记
      if (dayNotes.length > 0) {
        const card = this.el('div', { className: 'lookback-card' });
        card.appendChild(this.el('h4', { textContent: '📝 笔记 (' + dayNotes.length + ')' }));
        dayNotes.forEach(n => {
          card.appendChild(this.el('div', { className: 'text-sm', style: { marginBottom: '4px' }, textContent: '• ' + (n.title || '无标题') }));
        });
        grid.appendChild(card);
      }
    }

    // 对比卡片
    if (compare) {
      compare.innerHTML = '';
      compare.appendChild(this.el('h4', { textContent: '📊 对比' }));

      const todayStr = this.todayStr();
      const todayTasks = tasks.filter(t => this.toDateStr(new Date(t.createdAt || 0)) === todayStr);
      const todayCompleted = todayTasks.filter(t => t.completed).length;
      const pastCompleted = dayTasks.filter(t => t.completed).length;
      const todayHabitCount = habits.filter(h => h.records && h.records.includes(todayStr)).length;

      const row = this.el('div', { className: 'compare-row' });
      row.appendChild(this.el('div', { className: 'compare-item' }, [
        this.el('div', { className: 'text-sm text-muted', textContent: this.fmtDate(dateStr) }),
        this.el('div', { className: 'font-600', style: { fontSize: '18px', margin: '4px 0' }, textContent: pastCompleted + ' / ' + dayTasks.length }),
        this.el('div', { className: 'text-xs text-muted', textContent: '任务完成' }),
        this.el('div', { className: 'font-600', style: { fontSize: '18px', margin: '4px 0' }, textContent: dayHabits.length }),
        this.el('div', { className: 'text-xs text-muted', textContent: '习惯打卡' })
      ]));
      row.appendChild(this.el('div', { className: 'compare-item' }, [
        this.el('div', { className: 'text-sm text-muted', textContent: '今天' }),
        this.el('div', { className: 'font-600', style: { fontSize: '18px', margin: '4px 0' }, textContent: todayCompleted + ' / ' + todayTasks.length }),
        this.el('div', { className: 'text-xs text-muted', textContent: '任务完成' }),
        this.el('div', { className: 'font-600', style: { fontSize: '18px', margin: '4px 0' }, textContent: todayHabitCount }),
        this.el('div', { className: 'text-xs text-muted', textContent: '习惯打卡' })
      ]));
      compare.appendChild(row);
    }
  },

  // ==================== 设置 ====================
  renderSettings() {
    const nicknameInput = document.getElementById('nicknameInput');
    if (nicknameInput && this.nickname) {
      nicknameInput.value = this.nickname;
    }
    this.renderThemeSwitcher();
    this.renderWidgetManager();
    this.renderCloudStatus();
  },

  renderThemeSwitcher() {
    const container = document.getElementById('themeSwitcher');
    if (!container) return;
    container.innerHTML = '';

    const isDark = document.body.classList.contains('dark');
    const lightBtn = this.el('button', {
      className: 'theme-option' + (!isDark ? ' active' : ''),
      textContent: '☀️ 浅色',
      onclick: async () => {
        document.body.classList.remove('dark');
        await this.saveUserConfig('theme', 'light');
        this.renderThemeSwitcher();
      }
    });
    const darkBtn = this.el('button', {
      className: 'theme-option' + (isDark ? ' active' : ''),
      textContent: '🌙 深色',
      onclick: async () => {
        document.body.classList.add('dark');
        await this.saveUserConfig('theme', 'dark');
        this.renderThemeSwitcher();
      }
    });
    container.appendChild(lightBtn);
    container.appendChild(darkBtn);
  },

  updateNicknameDisplay() {
    const titleEl = document.querySelector('.sidebar-title');
    if (titleEl) {
      titleEl.textContent = this.nickname ? this.nickname + '的工作台' : '个人工作台';
    }
  },

  async saveNickname() {
    const input = document.getElementById('nicknameInput');
    if (!input) return;
    const name = input.value.trim();
    this.nickname = name;
    await this.saveUserConfig('nickname', name);
    this.updateNicknameDisplay();
    this.toast('昵称已保存', 'success');
  },

  renderWidgetManager() {
    const container = document.getElementById('widgetManager');
    if (!container) return;
    container.innerHTML = '';

    const navItems = document.querySelectorAll('#sidebarNav .sidebar-item[data-page]');
    const currentOrder = Array.from(navItems).map(btn => btn.dataset.page).filter(p => NAV_ORDER.includes(p));
    const hiddenPages = this.getHiddenPages();

    currentOrder.forEach((page, idx) => {
      const item = this.el('div', {
        className: 'widget-manager-item',
        'data-page': page,
        'data-idx': idx,
        style: { cursor: 'grab', userSelect: 'none', touchAction: 'none' }
      });

      // 拖拽手柄
      const handle = this.el('span', { className: 'drag-handle', textContent: '⋮⋮', style: { cursor: 'grab' } });
      item.appendChild(handle);
      item.appendChild(this.el('span', { className: 'manager-icon', textContent: this.getPageIcon(page) }));
      item.appendChild(this.el('span', { className: 'manager-name', textContent: PAGE_TITLES[page] || page }));

      // 显示/隐藏开关
      const isVisible = !hiddenPages.includes(page);
      const toggleLabel = this.el('label', { className: 'toggle-switch' });
      const toggleInput = this.el('input', { type: 'checkbox' });
      toggleInput.checked = isVisible;
      toggleInput.addEventListener('change', () => this.toggleWidgetVisibility(page, toggleInput.checked));
      toggleLabel.appendChild(toggleInput);
      toggleLabel.appendChild(this.el('span', { className: 'toggle-slider' }));
      item.appendChild(toggleLabel);

      container.appendChild(item);
    });

    this.initDragSort(container);
  },

  initDragSort(container) {
    let dragEl = null, startIdx = -1;

    container.addEventListener('pointerdown', (e) => {
      const item = e.target.closest('.widget-manager-item');
      if (!item || e.target.closest('.toggle-switch')) return;
      e.preventDefault();
      dragEl = item;
      startIdx = parseInt(item.dataset.idx);
      dragEl.style.opacity = '0.5';
      dragEl.style.zIndex = '10';
      dragEl.style.background = 'rgba(20,184,166,0.1)';
      dragEl.style.borderColor = 'rgba(20,184,166,0.3)';
    });

    container.addEventListener('touchstart', (e) => {
      const item = e.target.closest('.widget-manager-item');
      if (!item || e.target.closest('.toggle-switch')) return;
      e.preventDefault();
      dragEl = item;
      startIdx = parseInt(item.dataset.idx);
      dragEl.style.opacity = '0.5';
      dragEl.style.zIndex = '10';
      dragEl.style.background = 'rgba(20,184,166,0.1)';
      dragEl.style.borderColor = 'rgba(20,184,166,0.3)';
    }, { passive: false });

    const onMove = (e) => {
      if (!dragEl) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const origY = dragEl._origY || (dragEl._origY = dragEl.getBoundingClientRect().top);
      dragEl.style.transform = `translateY(${clientY - origY - dragEl.getBoundingClientRect().height/2}px)`;
    };

    const onUp = async (e) => {
      if (!dragEl) return;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      dragEl.style.opacity = ''; dragEl.style.zIndex = ''; dragEl.style.background = '';
      dragEl.style.borderColor = ''; dragEl.style.transform = '';
      delete dragEl._origY;

      // 计算目标位置：看拖拽元素中心点在哪个元素之后
      const all = Array.from(container.querySelectorAll('.widget-manager-item'));
      const dragMid = clientY;
      let targetIdx = 0;
      for (let i = 0; i < all.length; i++) {
        const r = all[i].getBoundingClientRect();
        const mid = r.top + r.height / 2;
        if (dragMid > mid) targetIdx = i + 1;
      }
      // 限制范围
      if (targetIdx > all.length) targetIdx = all.length;
      
      // 调整：如果目标在起始位置之后，减 1（因为移除后索引会变）
      const finalIdx = targetIdx > startIdx ? targetIdx - 1 : targetIdx;

      if (finalIdx !== startIdx) {
        const order = Array.from(document.querySelectorAll('#sidebarNav .sidebar-item[data-page]')).map(b => b.dataset.page).filter(p => NAV_ORDER.includes(p));
        const newOrder = [...order];
        const [moved] = newOrder.splice(startIdx, 1);
        newOrder.splice(finalIdx, 0, moved);
        this.applyNavOrder(newOrder);
        await this.saveUserConfig('navOrder', newOrder);
      }
      dragEl = null;
      startIdx = -1;
      this.renderWidgetManager();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('touchend', onUp);
  },

  getHiddenPages() {
    try {
      return JSON.parse(localStorage.getItem('workbench_hidden_pages') || '[]');
    } catch { return []; }
  },

  async toggleWidgetVisibility(page, visible) {
    const hidden = this.getHiddenPages();
    if (visible) {
      const idx = hidden.indexOf(page);
      if (idx >= 0) hidden.splice(idx, 1);
    } else {
      if (!hidden.includes(page)) hidden.push(page);
    }
    localStorage.setItem('workbench_hidden_pages', JSON.stringify(hidden));
    this.applyNavVisibility();
  },

  applyNavVisibility() {
    const hidden = this.getHiddenPages();
    NAV_ORDER.forEach(page => {
      const btn = document.querySelector(`#sidebarNav .sidebar-item[data-page="${page}"]`);
      if (btn) {
        btn.style.display = hidden.includes(page) ? 'none' : '';
      }
    });
    this.renderWidgetManager();
  },

  getPageIcon(page) {
    const icons = {
      tasks: '✅', calendar: '📅', outfits: '👔', notes: '📝', finance: '💰',
      habits: '🎯', birthdays: '🎂', reviews: '📓', lookback: '🔙'
    };
    return icons[page] || '📋';
  },

  async moveWidget(order, from, to) {
    if (to < 0 || to >= order.length) return;
    const newOrder = [...order];
    const [removed] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, removed);
    this.applyNavOrder(newOrder);
    await this.saveUserConfig('navOrder', newOrder);
    this.renderWidgetManager();
  },

  applyNavOrder(order) {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;
    const homeBtn = nav.querySelector('[data-page="home"]');
    const items = {};
    NAV_ORDER.forEach(p => {
      const btn = nav.querySelector('[data-page="' + p + '"]');
      if (btn) items[p] = btn;
    });

    // 清空并重新排列
    nav.innerHTML = '';
    if (homeBtn) nav.appendChild(homeBtn);
    order.forEach(p => {
      if (items[p]) nav.appendChild(items[p]);
    });
  },

  renderCloudStatus() {
    const indicator = document.querySelector('.sync-indicator');
    const textEl = document.getElementById('syncStatusText');
    if (!indicator || !textEl) return;
    if (CloudConfig.enabled) {
      indicator.className = 'sync-indicator online';
      textEl.textContent = '已连接 (uid: ' + (CloudConfig.uid || '').substring(0, 8) + '...)';
    } else {
      indicator.className = 'sync-indicator offline';
      textEl.textContent = '未配置云同步';
    }
  },

  openCloudConfig() {
    const envInput = this.el('input', { className: 'input', style: { width: '100%', marginBottom: '10px' }, placeholder: '微信云开发环境 ID', value: CloudConfig.env || '' });
    const body = [
      this.el('p', { className: 'text-sm text-muted', style: { marginBottom: '10px' }, textContent: '填入微信云开发环境 ID 后点击保存，将自动初始化云同步。' }),
      envInput
    ];
    const btnSave = this.el('button', { className: 'btn btn-primary btn-sm', textContent: '保存并初始化', onclick: async () => {
      const env = envInput.value.trim();
      if (!env) { this.toast('请输入环境 ID', 'error'); return; }
      CloudConfig.env = env;
      this.closeModal();
      this.toast('正在初始化...', '');
      const ok = await CloudConfig.init();
      if (ok) {
        await SyncEngine.init();
        this.renderCloudStatus();
        this.toast('云同步已启用', 'success');
      } else {
        this.toast('初始化失败，请检查 SDK 是否加载', 'error');
      }
    }});
    this.showModal('配置微信云开发', body, [btnSave]);
  },

  async exportData() {
    const data = await Storage.exportAll();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workbench-backup-' + this.todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    this.toast('数据已导出', 'success');
  },

  async importData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          await Storage.importAll(data);
          this.toast('数据已导入', 'success');
          // 刷新所有页面
          await this.loadUserConfig();
          this.renderTasks();
          this.renderCalendar();
          this.renderOutfits();
          this.renderNotes();
          this.renderFinance();
          this.renderHabits();
          this.renderBirthdays();
          this.renderReviews();
          this.renderLookback();
          this.renderHome();
          this.updateBadges();
        } catch (err) {
          this.toast('导入失败：文件格式错误', 'error');
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  },

  async clearAllData() {
    // 确认弹窗
    const body = this.el('div', {}, [
      this.el('p', { textContent: '确定要清空所有本地数据吗？此操作不可恢复。' }),
      this.el('p', { className: 'text-sm text-muted', style: { marginTop: '8px' }, textContent: '建议先导出数据备份。' })
    ]);
    const btnConfirm = this.el('button', { className: 'btn btn-danger btn-sm', textContent: '确认清空', onclick: async () => {
      await Storage.clearAll();
      this.closeModal();
      this.toast('数据已清空', 'success');
      // 刷新
      this.renderTasks();
      this.renderCalendar();
      this.renderOutfits();
      this.renderNotes();
      this.renderFinance();
      this.renderHabits();
      this.renderBirthdays();
      this.renderReviews();
      this.renderLookback();
      this.renderHome();
      this.updateBadges();
    }});
    const btnCancel = this.el('button', { className: 'btn btn-secondary btn-sm', textContent: '取消', onclick: () => this.closeModal() });
    this.showModal('清空数据', body, [btnCancel, btnConfirm]);
  }
};

// 启动
document.addEventListener('DOMContentLoaded', () => App.init());
