/* ============================================================
   吉伊卡哇 (Chiikawa) 主题注入脚本 — 个人工作台 workbench
   与 chiikawa-theme.css 配套使用。非侵入式：不修改原 app.js，
   只在运行时往主题切换器插入一个「🐹 吉伊卡哇」按钮，并注入角色贴图。
   角色图片目录：同级的 chiikawa-assets/（可改下方 ASSET_BASE）
   ============================================================ */
(function () {
  'use strict';
  var ASSET_BASE = 'chiikawa-assets/';
  var STORE_KEY = 'wb-theme-chiikawa';
  // 侧栏三只角色（栗子馒头 / 飞鼠 / 吉伊）
  var SIDEBAR_CHARS = ['kuri-manju.png', 'momonga.png', 'chiichi-serious.png'];

  function applyChiikawa() {
    document.body.classList.add('chiikawa');
    document.body.classList.remove('dark');
    var opts = document.querySelectorAll('#themeSwitcher .theme-option');
    opts.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-theme') === 'chiikawa');
    });
    try { localStorage.setItem(STORE_KEY, 'chiikawa'); } catch (e) {}
  }

  function clearChiikawa() {
    document.body.classList.remove('chiikawa');
    var b = document.querySelector('#themeSwitcher .theme-option[data-theme="chiikawa"]');
    if (b) b.classList.remove('active');
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  }

  function injectButton() {
    var sw = document.getElementById('themeSwitcher');
    if (!sw) return;
    if (sw.querySelector('.theme-option[data-theme="chiikawa"]')) return; // 已存在
    var btn = document.createElement('button');
    btn.className = 'theme-option';
    btn.setAttribute('data-theme', 'chiikawa');
    btn.textContent = '🐹 吉伊卡哇';
    btn.addEventListener('click', applyChiikawa);
    sw.appendChild(btn);
    // 原「浅色/深色」按钮点击时，退出吉伊卡哇主题，保持互斥
    sw.querySelectorAll('.theme-option').forEach(function (b) {
      var t = b.getAttribute('data-theme');
      if (t && t !== 'chiikawa' && !b.getAttribute('data-chiikawa-hook')) {
        b.setAttribute('data-chiikawa-hook', '1');
        b.addEventListener('click', clearChiikawa);
      }
    });
    // 反映已保存状态
    var saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (saved === 'chiikawa') applyChiikawa();
  }

  function injectDeco() {
    // 侧栏顶部：三只角色
    var sb = document.querySelector('.sidebar-header');
    if (sb && !sb.querySelector('.chiikawa-sidebar-chars')) {
      var row = document.createElement('div');
      row.className = 'chiikawa-sidebar-chars';
      SIDEBAR_CHARS.forEach(function (f) {
        var img = document.createElement('img');
        img.src = ASSET_BASE + f;
        img.alt = '';
        img.className = 'chiikawa-char';
        row.appendChild(img);
      });
      sb.appendChild(row);
    }
    // 首页右下角：吉伊+乌萨奇+小八 叠叠乐贴图
    if (!document.querySelector('.chiikawa-sticker')) {
      var st = document.createElement('img');
      st.src = ASSET_BASE + 'chiikawa-group.png';
      st.alt = '';
      st.className = 'chiikawa-sticker';
      document.body.appendChild(st);
    }
    // 移动端顶栏：一只吉伊
    var mb = document.querySelector('.mobile-topbar');
    if (mb && !mb.querySelector('.chiikawa-mobile-char')) {
      var m = document.createElement('img');
      m.src = ASSET_BASE + 'chiichi-playful.png';
      m.alt = '';
      m.className = 'chiikawa-mobile-char';
      mb.appendChild(m);
    }
  }

  function init() {
    injectButton();
    injectDeco();
  }

  // 设置页的主题切换器是动态渲染的，用观察器保证按钮始终存在
  if (document.getElementById('themeSwitcher')) {
    init();
  }
  var mo = new MutationObserver(function () {
    if (document.getElementById('themeSwitcher')) injectButton();
  });
  mo.observe(document.body, { childList: true, subtree: true });

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
