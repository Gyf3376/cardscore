// 引入二维码生成库（使用微信云API）
const generateQRCode = require('../../utils/qrcode').generateQRCode;

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    roomId: {
      type: String,
      value: ''
    }
  },

  data: {},

  lifetimes: {
    attached() {
      console.log('qrcode-modal 组件已挂载');
    },

    ready() {
      console.log('qrcode-modal 组件 ready');
    }
  },

  observers: {
    'visible, roomId': function(visible, roomId) {
      console.log('observers 触发 - visible:', visible, 'roomId:', roomId);
      if (visible && roomId) {
        console.log('准备生成二维码...');
        // 延迟绘制，确保 canvas 已挂载
        setTimeout(() => {
          this.generateQRCode();
        }, 100);
      }
    }
  },

  methods: {
    /**
     * 阻止事件冒泡
     */
    stopPropagation() {
      // 空方法，仅用于阻止事件冒泡
    },

    /**
     * 关闭弹窗
     */
    handleClose() {
      this.triggerEvent('close');
    },

    /**
     * 复制房间号
     */
    copyRoomId() {
      const { roomId } = this.properties;
      wx.setClipboardData({
        data: roomId,
        success: () => {
          wx.showToast({
            title: '房间号已复制',
            icon: 'success',
            duration: 2000
          });
        }
      });
    },

    /**
     * 使用微信云API生成真实二维码
     */
    generateQRCode() {
      const { roomId } = this.properties;
      console.log('开始生成二维码，房间号:', roomId);

      // 调用云API生成二维码
      generateQRCode(roomId, {
        width: 280,
        backgroundColor: '{"r":255,"g":255,"b":255}',
        lineColor: '{"r":0,"g":0,"b":0}'
      }).then(buffer => {
        // 将buffer转换为base64用于显示
        const base64 = wx.arrayBufferToBase64(buffer);
        const qrcodeUrl = `data:image/png;base64,${base64}`;

        console.log('二维码生成成功，准备绘制到canvas');

        // 获取canvas节点并绘制
        const query = wx.createSelectorQuery().in(this);
        query.select('#qrcode-canvas')
          .fields({ node: true, size: true })
          .exec((res) => {
            if (!res || !res[0] || !res[0].node) {
              console.error('Canvas node not found');
              return;
            }

            console.log('Canvas 节点获取成功');
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            const dpr = wx.getSystemInfoSync().pixelRatio;

            // 设置 canvas 实际尺寸 (340rpx ≈ 170px)
            const canvasSize = 170;
            canvas.width = canvasSize * dpr;
            canvas.height = canvasSize * dpr;
            ctx.scale(dpr, dpr);

            console.log('Canvas 尺寸已设置:', canvas.width, 'x', canvas.height);

            // 创建图片对象
            const img = canvas.createImage();

            img.onload = () => {
              // 清空画布
              ctx.clearRect(0, 0, canvasSize, canvasSize);
              // 绘制二维码图片
              ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
              console.log('二维码绘制完成');
            };

            img.onerror = (err) => {
              console.error('图片加载失败:', err);
              wx.showToast({
                title: '二维码显示失败',
                icon: 'none',
                duration: 2000
              });
            };

            // 设置图片源（base64）
            img.src = qrcodeUrl;
          });
      }).catch(err => {
        console.error('生成二维码失败:', err);
        wx.showToast({
          title: '生成二维码失败',
          icon: 'none',
          duration: 2000
        });
      });
    }
  }
});
