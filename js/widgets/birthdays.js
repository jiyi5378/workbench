/**
 * 生日纪念日板块
 */
class BirthdaysWidget extends WidgetBase {
  constructor() {
    super('birthdays', {
      name: '生日纪念日',
      icon: '🎂',
      collection: 'birthdays',
      addPlaceholder: '姓名'
    });
  }
  
  async onAdd() {
    const name = this.getInput();
    if (!name) return;
    this.clearInput();
    this.openAddModal(name);
  }
  
  async openAddModal(defaultName = '') {
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>添加纪念日</h3>
          <button class="icon-btn" id="closeBdayModal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="flex flex-col gap-3">
            <div class="form-row">
              <label class="form-label">姓名/名称</label>
              <input type="text" class="input" id="bdayName" value="${this.escapeHtml(defaultName)}" placeholder="如: 妈妈" />
            </div>
            <div class="form-row">
              <label class="form-label">关系/类型</label>
              <select class="input" id="bdayRelation">
                <option value="家人">家人</option>
                <option value="朋友">朋友</option>
                <option value="恋人">恋人</option>
                <option value="同事">同事</option>
                <option value="生日">生日</option>
                <option value="纪念日">纪念日</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div class="form-row">
              <label class="form-label">日期</label>
              <input type="date" class="input" id="bdayDate" />
            </div>
            <div class="form-row">
              <label class="form-label">备注</label>
              <input type="text" class="input" id="bdayNotes" placeholder="可选" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary btn-sm" id="saveBdayBtn">保存</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('#closeBdayModal').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    
    modal.querySelector('#saveBdayBtn').addEventListener('click', async () => {
      const name = modal.querySelector('#bdayName').value.trim();
      const date = modal.querySelector('#bdayDate').value;
      
      if (!name) { App.showToast('请输入姓名', 'error'); return; }
      if (!date) { App.showToast('请选择日期', 'error'); return; }
      
      const bday = {
        _id: Storage.generateId(),
        name,
        relation: modal.querySelector('#bdayRelation').value,
        date,
        notes: modal.querySelector('#bdayNotes').value.trim(),
        createdAt: new Date().toISOString()
      };
      
      await Storage.put('birthdays', bday);
      if (CloudConfig.enabled) SyncEngine.push('birthdays', bday);
      close();
      this.loadData();
    });
  }
  
  async loadData() {
    if (!this.bodyEl) return;
    const birthdays = await Storage.getAll('birthdays');
    
    // 计算距离下一个生日/纪念日的天数
    const today = new Date();
    const enriched = birthdays.map(b => {
      const bDate = new Date(b.date);
      const thisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
      let nextDate;
      if (thisYear >= today) {
        nextDate = thisYear;
      } else {
        nextDate = new Date(today.getFullYear() + 1, bDate.getMonth(), bDate.getDate());
      }
      const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
      return { ...b, daysUntil, nextDate };
    });
    
    enriched.sort((a, b) => a.daysUntil - b.daysUntil);
    
    this.updateBadge(enriched.length);
    
    if (enriched.length === 0) {
      this.bodyEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🎂</div><p>添加生日或纪念日</p></div>`;
      return;
    }
    
    this.bodyEl.innerHTML = enriched.map(b => {
      const isSoon = b.daysUntil <= 7;
      const isToday = b.daysUntil === 0;
      const relationIcon = { '家人': '👨‍👩‍👧', '朋友': '🤝', '恋人': '💕', '同事': '💼', '生日': '🎂', '纪念日': '💝', '其他': '📌' };
      
      return `
        <div class="list-item flex justify-between">
          <div class="flex items-center gap-2 flex-1" style="min-width:0">
            <span style="font-size:18px">${relationIcon[b.relation] || '📌'}</span>
            <div class="flex-1" style="min-width:0">
              <div class="text-sm truncate">${this.escapeHtml(b.name)}</div>
              <div class="text-xs text-muted">${b.relation} · ${b.date}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 no-shrink">
            <span class="text-sm" style="color: ${isToday ? 'var(--accent)' : isSoon ? 'var(--warning)' : 'var(--text-muted)'}; font-weight:600">
              ${isToday ? '🎉 今天!' : isSoon ? `${b.daysUntil}天后` : `${b.daysUntil}天`}
            </span>
            <button class="icon-btn" data-action="deleteBday" data-id="${b._id}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    this.bodyEl.querySelectorAll('[data-action="deleteBday"]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.delete('birthdays', el.dataset.id);
        if (CloudConfig.enabled) SyncEngine.pushDelete('birthdays', el.dataset.id);
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

WidgetRegistry.register('birthdays', {
  name: '生日纪念日',
  icon: '🎂',
  description: '记录重要日期，倒计时提醒',
  category: '生活',
  widgetClass: BirthdaysWidget
});
