// 微信小程序入口文件
App({
  globalData: {
    geminiApiKey: null
  },
  
  onLaunch: function () {
    // 小程序初始化
    this.loadConfig();
  },
  
  loadConfig: function() {
    // 从本地存储或服务器加载配置
    const apiKey = wx.getStorageSync('gemini_api_key');
    if(apiKey) {
      this.globalData.geminiApiKey = apiKey;
    }
  }
})