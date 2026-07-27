/**
 * 通用 UI 组件
 */
const UI = {
  /**
   * 显示弹窗
   */
  showModal({ title, content, footer, onClose }) {
    const modal = document.createElement('div');
    modal.className = 'modal-container';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="icon-btn" id="modalCloseBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const close = () => {
      modal.remove();
      if (onClose) onClose();
    };
    
    modal.querySelector('#modalCloseBtn').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    
    return { modal, close };
  },
  
  /**
   * 确认对话框
   */
  confirm({ title, message, confirmText = '确定', cancelText = '取消', onConfirm }) {
    const { close } = this.showModal({
      title,
      content: `<p class="text-sm">${message}</p>`,
      footer: `
        <button class="btn btn-secondary btn-sm" id="modalCancelBtn">${cancelText}</button>
        <button class="btn btn-danger btn-sm" id="modalConfirmBtn">${confirmText}</button>
      `
    });
    
    document.getElementById('modalConfirmBtn').addEventListener('click', () => {
      close();
      if (onConfirm) onConfirm();
    });
    
    document.getElementById('modalCancelBtn').addEventListener('click', close);
  }
};
