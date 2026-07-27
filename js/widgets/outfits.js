/**
 * 穿搭灵感板块
 * 每日配色建议 + 小红书链接收藏
 */
class OutfitsWidget extends WidgetBase {
  constructor() {
    super('outfits', {
      name: '穿搭灵感',
      icon: '👔',
      collection: 'outfits',
      addPlaceholder: '粘贴小红书链接...'
    });
  }
  
  async onAdd() {
    const url = this.getInput();
    if (!url) return;
    
    const title = prompt('给这个穿搭起个名字：', '新收藏');
    if (!title) return;
    
    const style = prompt('风格标签（如：温柔甜美、极简通勤）：', '休闲');
    
    const outfit = {
      _id: Storage.generateId(),
      title,
      xhsUrl: url,
      style: style || '休闲',
      tags: [],
      notes: '',
      createdAt: new Date().toISOString()
    };
    
    await Storage.put('outfits', outfit);
    if (CloudConfig.enabled) SyncEngine.push('outfits', outfit);
    this.clearInput();
    this.loadData();
  }
  
  async loadData() {
    if (!this.bodyEl) return;
    const outfits = await Storage.getAll('outfits');
    this.updateBadge(outfits.length);
    
    // 生成每日配色建议
    const colorAdvice = this.generateColorAdvice();
    
    let html = `
      <div class="mb-3" style="background:var(--bg-input); border-radius:var(--radius); padding:12px 14px;">
        <div class="text-sm font-weight:600 mb-2">🎨 今日配色建议</div>
        <div class="text-xs text-muted mb-2">${colorAdvice.reason}</div>
        <div class="color-palette">
          ${colorAdvice.colors.map(c => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
              <div class="color-swatch-large" style="background:${c.hex}"></div>
              <span class="text-xs text-muted">${c.name}</span>
            </div>
          `).join('')}
        </div>
        <div class="text-xs text-muted mt-2">风格建议：${colorAdvice.styleTips}</div>
      </div>
      
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-weight:500">📌 我的穿搭收藏</span>
        <span class="text-xs text-muted">${outfits.length}条</span>
      </div>
    `;
    
    // 按风格分组
    const byStyle = {};
    outfits.forEach(o => {
      const s = o.style || '其他';
      if (!byStyle[s]) byStyle[s] = [];
      byStyle[s].push(o);
    });
    
    if (outfits.length === 0) {
      html += `<div class="empty-state"><div class="empty-icon">👔</div><p>粘贴小红书穿搭链接收藏</p></div>`;
    } else {
      Object.entries(byStyle).forEach(([style, items]) => {
        html += `<div class="text-xs text-muted mb-1" style="font-weight:500">${style}</div>`;
        items.forEach(o => {
          html += `
            <a class="link-card" href="${this.escapeHtml(o.xhsUrl)}" target="_blank" rel="noopener">
              <span class="link-card-icon">🔗</span>
              <span class="link-card-text truncate">${this.escapeHtml(o.title)}</span>
              <button class="icon-btn" data-action="deleteOutfit" data-id="${o._id}" onclick="event.preventDefault();event.stopPropagation();">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </a>
          `;
        });
      });
    }
    
    this.bodyEl.innerHTML = html;
    
    this.bodyEl.querySelectorAll('[data-action="deleteOutfit"]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await Storage.delete('outfits', el.dataset.id);
        if (CloudConfig.enabled) SyncEngine.pushDelete('outfits', el.dataset.id);
        this.loadData();
      });
    });
  }
  
  /**
   * 根据日期、季节生成每日配色建议
   */
  generateColorAdvice() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();
    
    // 季节判断
    let season, palettes;
    if (month >= 2 && month <= 4) {
      season = '春';
      palettes = [
        { colors: [{hex:'#F5E6CA',name:'奶油白'},{hex:'#B8D4E3',name:'雾蓝'},{hex:'#D4A574',name:'卡其'}], reason: '春日柔和色调，温暖而不张扬', styleTips: '宽松针织+直筒裤，奶油白为主色调' },
        { colors: [{hex:'#E8D5B7',name:'燕麦'},{hex:'#A8C8A0',name:'鼠尾草绿'},{hex:'#F0F0F0',name:'米白'}], reason: '清新自然的大地色系', styleTips: '棉麻衬衫+休闲裤，清爽舒适' },
        { colors: [{hex:'#D4C5E2',name:'薰衣草紫'},{hex:'#F5F0E8',name:'暖白'},{hex:'#9DB5B2',name:'灰绿'}], reason: '温柔又带点春日浪漫', styleTips: '针织开衫+白T+休闲裤，温柔慵懒' },
      ];
    } else if (month >= 5 && month <= 7) {
      season = '夏';
      palettes = [
        { colors: [{hex:'#FFFFFF',name:'纯白'},{hex:'#87CEEB',name:'天蓝'},{hex:'#D4E4F0',name:'浅灰蓝'}], reason: '夏季清凉配色，视觉降温', styleTips: '白T/白衬衫+浅蓝牛仔裤，极简清爽' },
        { colors: [{hex:'#F5F5DC',name:'米白'},{hex:'#B0C4DE',name:'浅钢蓝'},{hex:'#E8E8E8',name:'浅灰'}], reason: '简约冷淡风，夏天不闷热', styleTips: '亚麻衬衫+短裤，舒适透气' },
        { colors: [{hex:'#FFFDD0',name:'奶油'},{hex:'#C9B8A8',name:'奶茶'},{hex:'#A8C8C0',name:'薄荷绿'}], reason: '温柔奶茶色系，夏季也可甜美', styleTips: '浅色Polo+卡其短裤，温柔又干净' },
      ];
    } else if (month >= 8 && month <= 10) {
      season = '秋';
      palettes = [
        { colors: [{hex:'#8B6914',name:'焦糖'},{hex:'#D2B48C',name:'驼色'},{hex:'#F5F5F0',name:'奶白'}], reason: '经典秋季暖色调', styleTips: '风衣+高领毛衣，层次感搭配' },
        { colors: [{hex:'#6B4423',name:'深棕'},{hex:'#C4A882',name:'沙色'},{hex:'#2F4F4F',name:'深灰绿'}], reason: '复古英伦风配色', styleTips: '格纹外套+纯色内搭，质感满满' },
        { colors: [{hex:'#A0522D',name:'砖红'},{hex:'#DEB887',name:'原木色'},{hex:'#F0E6D3',name:'暖灰'}], reason: '温暖文艺的秋季配色', styleTips: '针织衫+灯芯绒裤，温柔文艺风' },
      ];
    } else {
      season = '冬';
      palettes = [
        { colors: [{hex:'#2C2C2C',name:'炭灰'},{hex:'#4A4A5A',name:'深蓝灰'},{hex:'#E8E0D5',name:'奶油'}], reason: '冬季沉稳高级感', styleTips: '大衣+高领毛衣，深色为主亮色点缀' },
        { colors: [{hex:'#1C1C1C',name:'黑'},{hex:'#8B0000',name:'酒红'},{hex:'#D3D3D3',name:'浅灰'}], reason: '经典黑白配，加入酒红提亮', styleTips: '黑色大衣+酒红围巾，点睛之笔' },
        { colors: [{hex:'#3B3B4F',name:'藏蓝'},{hex:'#C9B99A',name:'杏色'},{hex:'#696969',name:'中灰'}], reason: '沉稳中带着温柔', styleTips: '藏蓝大衣+杏色毛衣，温柔又稳重' },
      ];
    }
    
    // 根据日期选择
    const idx = (day - 1) % palettes.length;
    const palette = palettes[idx];
    
    return {
      season,
      colors: palette.colors,
      reason: palette.reason,
      styleTips: palette.styleTips
    };
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

WidgetRegistry.register('outfits', {
  name: '穿搭灵感',
  icon: '👔',
  description: '每日配色建议 + 小红书链接收藏',
  category: '生活',
  widgetClass: OutfitsWidget
});
