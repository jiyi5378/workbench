/**
 * 板块注册表
 * 管理所有板块的注册、启用、排序
 */
const WidgetRegistry = {
  // 所有已注册的板块定义
  _widgets: {},
  
  // 用户启用的板块列表（按顺序）
  _enabledOrder: [],
  
  // 默认板块顺序
  DEFAULT_ORDER: ['tasks', 'calendar', 'notes', 'finance', 'habits', 'birthdays', 'outfits'],
  
  /**
   * 注册板块
   */
  register(widgetId, definition) {
    this._widgets[widgetId] = definition;
  },
  
  /**
   * 获取板块定义
   */
  get(widgetId) {
    return this._widgets[widgetId];
  },
  
  /**
   * 获取所有已注册板块
   */
  getAll() {
    return Object.entries(this._widgets).map(([id, def]) => ({
      id,
      ...def
    }));
  },
  
  /**
   * 获取已启用的板块（按顺序）
   */
  getEnabled() {
    return this._enabledOrder
      .map(id => this._widgets[id])
      .filter(Boolean);
  },
  
  /**
   * 设置启用的板块和顺序
   */
  async setEnabledOrder(order) {
    this._enabledOrder = order;
    await Storage.put('userConfig', {
      _id: 'widgetOrder',
      order: order
    });
  },
  
  /**
   * 启用板块
   */
  async enableWidget(widgetId) {
    if (!this._enabledOrder.includes(widgetId)) {
      this._enabledOrder.push(widgetId);
      await this.setEnabledOrder(this._enabledOrder);
    }
  },
  
  /**
   * 禁用板块
   */
  async disableWidget(widgetId) {
    this._enabledOrder = this._enabledOrder.filter(id => id !== widgetId);
    await this.setEnabledOrder(this._enabledOrder);
  },
  
  /**
   * 从本地存储加载用户配置
   */
  async loadConfig() {
    const config = await Storage.get('userConfig', 'widgetOrder');
    if (config && config.order) {
      this._enabledOrder = config.order.filter(id => this._widgets[id]);
    } else {
      this._enabledOrder = [...this.DEFAULT_ORDER];
      await this.setEnabledOrder(this._enabledOrder);
    }
  },
  
  /**
   * 板块市场（所有可选板块）
   */
  getMarketplace() {
    return this.getAll().map(w => ({
      ...w,
      enabled: this._enabledOrder.includes(w.id)
    }));
  }
};
