/**
 * CloudBase 配置
 * 用户填入自己的环境 ID 后即可启用云同步
 */
const CloudConfig = {
  // 微信云开发环境 ID - 请替换为你自己的环境 ID
  env: '',
  
  // 是否启用云同步（有 env 且 SDK 加载成功时自动设为 true）
  enabled: false,
  
  // CloudBase 实例
  app: null,
  db: null,
  auth: null,
  
  // 当前用户 uid
  uid: null,
  
  /**
   * 初始化 CloudBase
   * 返回 true 表示初始化成功
   */
  async init() {
    if (!this.env || this.env === '') {
      console.log('[CloudConfig] 未配置环境 ID，跳过云同步');
      return false;
    }
    
    if (typeof cloudbase === 'undefined') {
      console.warn('[CloudConfig] CloudBase SDK 未加载');
      return false;
    }
    
    try {
      this.app = cloudbase.init({ env: this.env });
      this.db = this.app.database();
      this.auth = this.app.auth({ persistence: 'local' });
      
      // 匿名登录
      const loginState = await this.auth.getLoginState();
      if (!loginState) {
        await this.auth.signInAnonymously();
      }
      
      const state = await this.auth.getLoginState();
      this.uid = state.user.uid;
      this.enabled = true;
      
      console.log('[CloudConfig] CloudBase 初始化成功, uid:', this.uid);
      return true;
    } catch (err) {
      console.error('[CloudConfig] 初始化失败:', err);
      this.enabled = false;
      return false;
    }
  }
};
