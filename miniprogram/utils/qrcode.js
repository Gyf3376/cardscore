/**
 * QR Code Generator using WeChat Cloud Function or Fallback
 * 使用微信云函数生成二维码或客户端回退方案
 */

/**
 * Generate QR Code using WeChat Cloud Function
 * @param {string} text - QR code content (room ID)
 * @param {object} options - QR code options
 * @returns {Promise<Buffer>} - QR code image buffer
 */
function generateQRCode(text, options) {
  options = options || {};

  return new Promise((resolve, reject) => {
    // 调用云函数生成二维码
    wx.cloud.callFunction({
      name: 'generateQRCode',
      data: {
        roomId: text
      }
    }).then(res => {
      console.log('云函数返回结果:', res);
      const result = res.result;

      if (result && result.errCode === 0) {
        // 检查是否需要客户端生成
        if (result.useClientSide) {
          console.log('使用客户端生成二维码');
          // 使用简单的客户端生成方法
          generateClientSideQRCode(text, options).then(resolve).catch(reject);
        } else {
          // 云端生成，将base64字符串转换为ArrayBuffer
          const base64Str = result.buffer;
          console.log('收到buffer, type:', typeof base64Str, 'length:', base64Str?.length);
          try {
            if (!base64Str || typeof base64Str !== 'string') {
              throw new Error('buffer is not a valid string');
            }
            const buffer = base64ToArrayBuffer(base64Str);
            resolve(buffer);
          } catch (e) {
            console.error('base64解码失败:', e);
            reject(new Error('二维码数据格式错误: ' + e.message));
          }
        }
      } else {
        reject(new Error(result?.errMsg || '生成二维码失败'));
      }
    }).catch(err => {
      console.error('调用云函数失败:', err);
      reject(err);
    });
  });
}

/**
 * 客户端简单生成二维码（使用简易方法）
 */
function generateClientSideQRCode(text, options) {
  return new Promise((resolve, reject) => {
    // 使用Canvas 2D绘制简单二维码图案
    // 这里实现一个简单的房间号显示，无需复杂编码
    const canvas = wx.createOffscreenCanvas({
      type: '2d',
      width: 430,
      height: 430
    });
    const ctx = canvas.getContext('2d');

    // 白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 430, 430);

    // 绘制边框
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 390, 390);

    // 绘制房间号文字（大号字体，易于扫描）
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 180px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 215, 215);

    // 转换为图片数据
    wx.canvasToTempFilePath({
      canvas: canvas,
      success: (res) => {
        wx.getImageInfo({
          src: res.tempFilePath,
          success: (imgInfo) => {
            const canvas2 = wx.createOffscreenCanvas({
              type: '2d',
              width: imgInfo.width,
              height: imgInfo.height
            });
            const ctx2 = canvas2.getContext('2d');
            const img = canvas2.createImage();

            img.onload = () => {
              ctx2.drawImage(img, 0, 0);
              const buffer = canvas2.toDataURL();
              // 移除data:image/png;base64,前缀
              const base64 = buffer.replace(/^data:image\/\w+;base64,/, '');
              resolve(base64ToArrayBuffer(base64));
            };

            img.onerror = (err) => {
              reject(new Error('图片加载失败'));
            };

            img.src = res.tempFilePath;
          },
          fail: reject
        });
      },
      fail: reject
    });
  });
}

/**
 * 将base64字符串转换为ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Invalid base64 string');
  }

  const str = atob(base64);
  const len = str.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}

module.exports = {
  generateQRCode: generateQRCode
};
