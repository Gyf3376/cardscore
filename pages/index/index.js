// 首页逻辑
Page({
  data: {
    // 页面数据
  },

  onLoad: function(options) {
    // 页面加载
  },

  startChat: function() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    });
  }
});