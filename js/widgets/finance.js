/**
 * 记账板块
 */
class FinanceWidget extends WidgetBase {
  constructor() {
    super('finance', {
      name: '记账',
      icon: '💰',
      collection: 'transactions',
      addPlaceholder: '金额'
    });
    this.currentMonth = new Date();
    this.showExpense = true;
  }
  
  async onAdd() {
    const amountStr = this.getInput();
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) { App.showToast('请输入有效金额', 'error'); return; }
    
    const transaction = {
      _id: Storage.generateId(),
      type: this.showExpense ? 'expense' : 'income',
      amount,
      category: this.showExpense ? '餐饮' : '工资',
      date: new Date().toISOString().split('T')[0],
      note: '',
      createdAt: new Date().toISOString()
    };
    
    await Storage.put('transactions', transaction);
    if (CloudConfig.enabled) SyncEngine.push('transactions', transaction);
    this.clearInput();
    this.loadData();
  }
  
  async loadData() {
    if (!this.bodyEl) return;
    const transactions = await Storage.getAll('transactions');
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    // 当月交易
    const monthStart = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const monthEnd = `${year}-${String(month+1).padStart(2,'0')}-31`;
    
    const monthTx = transactions.filter(t => t.date >= monthStart && t.date <= monthEnd);
    const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    this.updateBadge(monthTx.length);
    
    let html = `
      <div class="stat-row mb-3">
        <div class="stat-item">
          <div class="stat-value" style="color: var(--danger)">-¥${totalExpense.toFixed(0)}</div>
          <div class="stat-label">支出</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: var(--success)">+¥${totalIncome.toFixed(0)}</div>
          <div class="stat-label">收入</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: ${totalIncome - totalExpense >= 0 ? 'var(--success)' : 'var(--danger)'}">¥${(totalIncome - totalExpense).toFixed(0)}</div>
          <div class="stat-label">结余</div>
        </div>
      </div>
      
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <button class="btn btn-xs ${this.showExpense ? 'btn-primary' : 'btn-secondary'}" data-action="showExpense">支出</button>
          <button class="btn btn-xs ${!this.showExpense ? 'btn-primary' : 'btn-secondary'}" data-action="showIncome">收入</button>
        </div>
        <span class="text-xs text-muted">${year}年${month+1}月</span>
      </div>
    `;
    
    const filtered = monthTx.filter(t => this.showExpense ? t.type === 'expense' : t.type === 'income');
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt.localeCompare(a.createdAt));
    
    if (filtered.length === 0) {
      html += `<div class="text-xs text-muted text-center mt-3">暂无记录</div>`;
    } else {
      html += filtered.map(t => `
        <div class="list-item flex justify-between">
          <div class="flex items-center gap-2">
            <span>${this.getCategoryIcon(t.category)}</span>
            <div>
              <div class="text-sm">${this.escapeHtml(t.category)}</div>
              <div class="text-xs text-muted">${t.date} ${t.note ? '· ' + this.escapeHtml(t.note) : ''}</div>
            </div>
          </div>
          <div>
            <span class="text-sm" style="color: ${t.type === 'expense' ? 'var(--danger)' : 'var(--success)'}; font-weight:600">
              ${t.type === 'expense' ? '-' : '+'}¥${t.amount.toFixed(2)}
            </span>
            <button class="icon-btn" data-action="deleteTx" data-id="${t._id}" style="margin-left:4px">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      `).join('');
    }
    
    this.bodyEl.innerHTML = html;
    
    this.bodyEl.querySelector('[data-action="showExpense"]')?.addEventListener('click', () => {
      this.showExpense = true; this.loadData();
    });
    this.bodyEl.querySelector('[data-action="showIncome"]')?.addEventListener('click', () => {
      this.showExpense = false; this.loadData();
    });
    this.bodyEl.querySelectorAll('[data-action="deleteTx"]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.delete('transactions', el.dataset.id);
        if (CloudConfig.enabled) SyncEngine.pushDelete('transactions', el.dataset.id);
        this.loadData();
      });
    });
  }
  
  getCategoryIcon(cat) {
    const icons = { '餐饮': '🍜', '交通': '🚗', '购物': '🛍️', '娱乐': '🎮', '住房': '🏠', '医疗': '💊', '教育': '📚', '工资': '💼', '理财': '📈', '其他': '📌' };
    return icons[cat] || '📌';
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

WidgetRegistry.register('finance', {
  name: '记账',
  icon: '💰',
  description: '记录收支，月度统计',
  category: '生活',
  widgetClass: FinanceWidget
});
