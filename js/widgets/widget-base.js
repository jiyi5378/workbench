/**
 * 板块基类
 * 所有板块继承此基类
 */
class WidgetBase {
  constructor(widgetId, config) {
    this.id = widgetId;
    this.config = config;
    this.collection = config.collection;
    this.container = null;
    this.bodyEl = null;
  }
  
  /**
   * 渲染板块卡片
   */
  render(container) {
    this.container = container;
    const expanded = localStorage.getItem(`widget_${this.id}_expanded`) !== 'false';
    
    container.innerHTML = `
      <div class="widget-card" data-widget="${this.id}">
        <div class="widget-card-header" data-action="toggle">
          <div class="widget-card-header-left">
            <div class="widget-card-icon ${this.id}">${this.config.icon}</div>
            <span class="widget-card-title">${this.config.name}</span>
          </div>
          <span class="widget-card-badge" id="badge-${this.id}"></span>
          <button class="widget-card-toggle ${expanded ? 'expanded' : ''}" data-action="toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
        <div class="widget-card-body ${expanded ? '' : 'collapsed'}">
          <div class="widget-content" id="content-${this.id}"></div>
          <div class="add-item-bar">
            <input type="text" class="input input-sm flex-1" id="input-${this.id}" placeholder="${this.config.addPlaceholder || '添加...'}" />
            <button class="btn btn-primary btn-sm" id="btnAdd-${this.id}">添加</button>
          </div>
        </div>
      </div>
    `;
    
    this.bodyEl = container.querySelector(`#content-${this.id}`);
    
    // 事件绑定
    container.querySelector('.widget-card-header').addEventListener('click', (e) => {
      if (e.target.closest('[data-action="toggle"]')) {
        this.toggleExpand(container);
      }
    });
    
    container.querySelector(`#btnAdd-${this.id}`).addEventListener('click', () => {
      this.onAdd();
    });
    
    container.querySelector(`#input-${this.id}`).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.onAdd();
    });
    
    // 加载数据
    this.loadData();
  }
  
  /**
   * 折叠/展开
   */
  toggleExpand(container) {
    const body = container.querySelector('.widget-card-body');
    const toggle = container.querySelector('.widget-card-toggle');
    body.classList.toggle('collapsed');
    toggle.classList.toggle('expanded');
    localStorage.setItem(`widget_${this.id}_expanded`, !body.classList.contains('collapsed'));
  }
  
  /**
   * 获取输入值
   */
  getInput() {
    const input = this.container?.querySelector(`#input-${this.id}`);
    const value = input?.value?.trim();
    return value;
  }
  
  /**
   * 清空输入
   */
  clearInput() {
    const input = this.container?.querySelector(`#input-${this.id}`);
    if (input) input.value = '';
  }
  
  /**
   * 更新角标
   */
  updateBadge(count) {
    const badge = this.container?.querySelector(`#badge-${this.id}`);
    if (badge) {
      badge.textContent = count > 0 ? count : '';
      badge.style.display = count > 0 ? '' : 'none';
    }
  }
  
  /**
   * 子类实现：添加条目
   */
  async onAdd() {
    // 子类覆盖
  }
  
  /**
   * 子类实现：加载数据
   */
  async loadData() {
    // 子类覆盖
  }
  
  /**
   * 刷新
   */
  refresh() {
    this.loadData();
  }
}
