/**
 * 设置页面
 * 板块管理、云同步配置、数据管理
 */
const Settings = {
  /**
   * 打开设置面板
   */
  open() {
    document.getElementById('settingsPanel').classList.add('open');
    document.getElementById('overlay').classList.remove('hidden');
    this.renderWidgetManager();
    this.renderCloudStatus();
  },
  
  /**
   * 关闭设置面板
   */
  close() {
    document.getElementById('settingsPanel').classList.remove('open');
    document.getElementById('overlay').classList.add('hidden');
  },
  
  /**
   * 渲染板块管理列表
   */
  renderWidgetManager() {
    const container = document.getElementById('widgetManager');
    if (!container) return;
    
    const marketplace = WidgetRegistry.getMarketplace();
    
    container.innerHTML = marketplace.map((w, i) => `
      <div class="widget-manager-item" draggable="true" data-widget-id="${w.id}" data-index="${i}">
        <span class="drag-handle">⋮⋮</span>
        <span class="manager-icon">${w.icon}</span>
        <span class="manager-name">${w.name}</span>
        <span class="text-xs text-muted">${w.category}</span>
        <label class="toggle-switch">
          <input type="checkbox" ${w.enabled ? 'checked' : ''} data-widget-toggle="${w.id}" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('');
    
    // 开关事件
    container.querySelectorAll('[data-widget-toggle]').forEach(el => {
      el.addEventListener('change', async () => {
        const widgetId = el.dataset.widgetToggle;
        if (el.checked) {
          await WidgetRegistry.enableWidget(widgetId);
        } else {
          await WidgetRegistry.disableWidget(widgetId);
        }
        Dashboard.renderWidgets();
        Dashboard.refreshOverview();
      });
    });
    
    // 拖拽排序
    let dragSrcIndex = null;
    
    container.querySelectorAll('.widget-manager-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragSrcIndex = parseInt(item.dataset.index);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        container.querySelectorAll('.widget-manager-item').forEach(i => i.classList.remove('dragging'));
      });
      
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      
      item.addEventListener('drop', async (e) => {
        e.stopPropagation();
        const targetIndex = parseInt(item.dataset.index);
        if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
          const order = [...WidgetRegistry._enabledOrder];
          const [moved] = order.splice(dragSrcIndex, 1);
          order.splice(targetIndex, 0, moved);
          await WidgetRegistry.setEnabledOrder(order);
          this.renderWidgetManager();
          Dashboard.renderWidgets();
        }
        dragSrcIndex = null;
      });
    });
  },
  
  /**
   * 渲染云同步状态
   */
  renderCloudStatus() {
    const indicator = document.querySelector('#cloudSyncStatus .sync-indicator');
    const statusText = document.getElementById('syncStatusText');
    
    if (CloudConfig.enabled) {
      indicator.className = 'sync-indicator online';
      statusText.textContent = `已连接 · ${CloudConfig.env}`;
    } else if (CloudConfig.env) {
      indicator.className = 'sync-indicator offline';
      statusText.textContent = '连接失败，检查环境ID';
    } else {
      indicator.className = 'sync-indicator offline';
      statusText.textContent = '未配置云同步';
    }
  },
  
  /**
   * 打开云同步配置弹窗
   */
  openCloudConfig() {
    UI.showModal({
      title: '配置微信云开发',
      content: `
        <div class="flex flex-col gap-3">
          <div class="form-row">
            <label class="form-label">环境 ID (env)</label>
            <input type="text" class="input" id="cloudEnvInput" value="${CloudConfig.env || ''}" placeholder="例如: your-env-id-xxx" />
          </div>
          <p class="text-xs text-muted">
            在微信云开发控制台 → 设置 → 环境设置中可找到环境ID。<br/>
            配置后需要刷新页面才能生效。
          </p>
        </div>
      `,
      footer: `
        <button class="btn btn-primary btn-sm" id="saveCloudBtn">保存并刷新</button>
      `
    });
    
    document.getElementById('saveCloudBtn').addEventListener('click', () => {
      const env = document.getElementById('cloudEnvInput').value.trim();
      CloudConfig.env = env;
      localStorage.setItem('workbench_cloud_env', env);
      App.showToast('环境ID已保存，即将刷新页面', 'success');
      setTimeout(() => location.reload(), 1500);
    });
  }
};

// 初始化设置页面事件
document.addEventListener('DOMContentLoaded', () => {
  // 从 localStorage 恢复 env 配置
  const savedEnv = localStorage.getItem('workbench_cloud_env');
  if (savedEnv) {
    CloudConfig.env = savedEnv;
  }
});
