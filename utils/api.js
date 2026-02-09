// API工具函数
const requestGeminiAPI = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      method: 'POST',
      data: data,
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

module.exports = {
  requestGeminiAPI
};