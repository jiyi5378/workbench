/**
 * GitHub 云同步引擎
 * 把全部本地数据序列化为 JSON，存到仓库里的 data/workbench-data.json
 * 通过 GitHub REST API 读写，实现跨浏览器/跨设备同步
 */
const GitHubSync = {
  owner: 'jiyi5378',
  repo: 'workbench',
  branch: 'main',
  path: 'data/workbench-data.json',
  token: '',
  _enabled: false,
  lastSync: 0,

  // ===== 初始化（读取本地保存的 token） =====
  init() {
    this.token = localStorage.getItem('github_token') || '';
    this._enabled = !!this.token;
    const ls = localStorage.getItem('github_last_sync');
    this.lastSync = ls ? parseInt(ls, 10) : 0;
  },

  isEnabled() {
    return this._enabled && !!this.token;
  },

  // ===== 保存 token =====
  saveToken(token) {
    this.token = (token || '').trim();
    if (this.token) {
      localStorage.setItem('github_token', this.token);
      this._enabled = true;
    } else {
      localStorage.removeItem('github_token');
      this._enabled = false;
    }
  },

  _apiUrl() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.path}?ref=${this.branch}`;
  },

  _headers() {
    return {
      'Authorization': 'Bearer ' + this.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };
  },

  // UTF-8 安全 base64 编码/解码
  _b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  },
  _b64decode(b64) {
    return decodeURIComponent(escape(atob(b64)));
  },

  // ===== 从云端拉取数据，覆盖本地 =====
  async pull() {
    if (!this.isEnabled()) return false;
    try {
      const res = await fetch(this._apiUrl(), { headers: this._headers() });
      if (res.status === 404) {
        // 云端还没有文件，不用覆盖
        return false;
      }
      if (!res.ok) {
        console.warn('[GitHubSync] 拉取失败:', res.status);
        return false;
      }
      const json = await res.json();
      const content = this._b64decode(json.content);
      const data = JSON.parse(content);
      await Storage.importAll(data);
      this._markSynced();
      return true;
    } catch (err) {
      console.error('[GitHubSync] 拉取异常:', err);
      return false;
    }
  },

  // ===== 把本地全量数据推送到云端 =====
  async push() {
    if (!this.isEnabled()) return false;
    try {
      const data = await Storage.exportAll();
      const content = this._b64encode(JSON.stringify(data, null, 2));

      // 先尝试获取现有文件 SHA（更新需要）
      let sha = null;
      try {
        const head = await fetch(this._apiUrl(), { headers: this._headers() });
        if (head.ok) {
          const hj = await head.json();
          sha = hj.sha || null;
        }
      } catch (e) { /* 文件不存在 */ }

      const body = {
        message: 'workbench: sync data ' + new Date().toISOString(),
        content: content,
        branch: this.branch
      };
      if (sha) body.sha = sha;

      const res = await fetch(this._apiUrl(), {
        method: 'PUT',
        headers: this._headers(),
        body: JSON.stringify(body)
      });

      if (res.ok || res.status === 201) {
        this._markSynced();
        return true;
      }
      console.warn('[GitHubSync] 推送失败:', res.status);
      return false;
    } catch (err) {
      console.error('[GitHubSync] 推送异常:', err);
      return false;
    }
  },

  _markSynced() {
    this.lastSync = Date.now();
    localStorage.setItem('github_last_sync', String(this.lastSync));
  },

  formatLastSync() {
    if (!this.lastSync) return '从未同步';
    const d = new Date(this.lastSync);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
};
