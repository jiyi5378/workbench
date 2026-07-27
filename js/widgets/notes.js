/**
 * 笔记备忘板块
 */
class NotesWidget extends WidgetBase {
  constructor() {
    super('notes', {
      name: '笔记备忘',
      icon: '📝',
      collection: 'notes',
      addPlaceholder: '写笔记...'
    });
    this.editingId = null;
  }
  
  async onAdd() {
    const title = this.getInput();
    if (!title) return;
    
    const note = {
      _id: Storage.generateId(),
      title,
      content: '',
      tags: [],
      pinned: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await Storage.put('notes', note);
    if (CloudConfig.enabled) SyncEngine.push('notes', note);
    this.clearInput();
    this.loadData();
  }
  
  async loadData() {
    if (!this.bodyEl) return;
    const notes = await Storage.getAll('notes');
    const active = notes.filter(n => !n.archived);
    active.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    
    this.updateBadge(active.length);
    
    if (active.length === 0) {
      this.bodyEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>暂无笔记</p></div>`;
      return;
    }
    
    this.bodyEl.innerHTML = active.map(note => `
      <div class="list-item flex justify-between" data-id="${note._id}" data-action="edit">
        <div class="flex items-center gap-3 flex-1" style="min-width:0">
          ${note.pinned ? '<span style="font-size:12px">📌</span>' : ''}
          <div class="flex-1" style="min-width:0">
            <div class="text-sm truncate">${this.escapeHtml(note.title)}</div>
            <div class="text-xs text-muted">${this.formatDate(note.updatedAt)}</div>
          </div>
        </div>
        <button class="icon-btn" data-action="deleteNote" data-id="${note._id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');
    
    // 事件
    this.bodyEl.querySelectorAll('[data-action="edit"]').forEach(el => {
      el.addEventListener('click', () => this.openEditor(el.dataset.id));
    });
    this.bodyEl.querySelectorAll('[data-action="deleteNote"]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        await Storage.delete('notes', el.dataset.id);
        if (CloudConfig.enabled) SyncEngine.pushDelete('notes', el.dataset.id);
        this.loadData();
      });
    });
  }
  
  async openEditor(id) {
    const note = await Storage.get('notes', id);
    if (!note) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <div class="modal" style="max-width:600px">
        <div class="modal-header">
          <h3>${note._id ? '编辑笔记' : '新建笔记'}</h3>
          <button class="icon-btn" id="closeNoteEditor">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="flex flex-col gap-3">
            <div>
              <label class="form-label">标题</label>
              <input type="text" class="input" id="noteTitle" value="${this.escapeHtml(note.title || '')}" />
            </div>
            <div>
              <label class="form-label">内容 (支持 Markdown)</label>
              <textarea class="input" id="noteContent" rows="10" style="font-family: monospace; font-size: 13px;">${this.escapeHtml(note.content || '')}</textarea>
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="notePinned" ${note.pinned ? 'checked' : ''} />
              <label class="text-sm" for="notePinned">📌 置顶</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger btn-sm" id="deleteNoteBtn">删除</button>
          <button class="btn btn-primary btn-sm" id="saveNoteBtn">保存</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const close = () => modal.remove();
    modal.querySelector('#closeNoteEditor').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    
    modal.querySelector('#saveNoteBtn').addEventListener('click', async () => {
      note.title = modal.querySelector('#noteTitle').value.trim();
      note.content = modal.querySelector('#noteContent').value;
      note.pinned = modal.querySelector('#notePinned').checked;
      note.updatedAt = new Date().toISOString();
      
      if (!note.title) { App.showToast('标题不能为空', 'error'); return; }
      
      await Storage.put('notes', note);
      if (CloudConfig.enabled) SyncEngine.push('notes', note);
      close();
      this.loadData();
    });
    
    modal.querySelector('#deleteNoteBtn').addEventListener('click', async () => {
      if (confirm('确定删除这条笔记？')) {
        await Storage.delete('notes', id);
        if (CloudConfig.enabled) SyncEngine.pushDelete('notes', id);
        close();
        this.loadData();
      }
    });
  }
  
  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return '刚刚';
    if (diff < 86400000) return `${Math.floor(diff/3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff/86400000)}天前`;
    return `${d.getMonth()+1}/${d.getDate()}`;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

WidgetRegistry.register('notes', {
  name: '笔记备忘',
  icon: '📝',
  description: 'Markdown 笔记，支持置顶和搜索',
  category: '知识',
  widgetClass: NotesWidget
});
