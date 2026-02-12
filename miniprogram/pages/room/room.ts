Page({
  data: {
    view: 'home' as 'home' | 'create' | 'join',
    roomId: '',
    playerCount: 3 as 3 | 4,
    bombFee: 8,
    shutOut: 20,
    cardPrice: 1,
    cloudReady: false
  },

  /**
   * 页面加载
   */
  onLoad(options: any) {
    const app = getApp();
    const currentUser = app.globalData.currentUser;

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/auth/auth'
        });
      }, 1500);
      return;
    }

    console.log('页面加载，当前用户:', currentUser);

    // 检查是否有房间号参数（从分享链接进入）
    if (options && options.roomId) {
      console.log('从分享链接进入，房间号:', options.roomId);
      this.setData({ roomId: options.roomId });
      this.goToJoin();
    }

    // 尝试从本地存储加载房间数据（兼容旧版本）
    const localRoomId = wx.getStorageSync('currentRoomId');
    if (localRoomId) {
      console.log('从本地存储加载房间数据，房间号:', localRoomId);
      this.setData({ roomId: localRoomId });

      // 先检查房间状态，再决定是否加入
      this.checkRoomStatus(localRoomId).then(() => {
        if (this.data.roomId) {
          this.goToJoin();
        }
      });
    }
  },

  /**
   * 页面显示
   */
  onShow() {
    // 检查房间状态，如果房间已结束，清理本地存储
    const roomId = wx.getStorageSync('currentRoomId');
    if (roomId) {
      this.checkRoomStatus(roomId);
    }
  },

  /**
   * 检查房间状态
   */
  async checkRoomStatus(roomId: string) {
    try {
      const result = await wx.cloud.callFunction({
        name: 'getRoomData',
        data: { roomId }
      });

      const roomDataResult = result.result as any;

      if (roomDataResult && roomDataResult.errCode === 0) {
        const room = roomDataResult.room;
        if (room && room.status === 'ended') {
          console.log('检测到房间已结束，清理本地存储');
          wx.removeStorageSync('currentRoomId');
          this.setData({ roomId: '' });
          wx.showToast({
            title: '该房间已结束，请创建新房间',
            icon: 'none'
          });
        }
      }
    } catch (error) {
      console.error('检查房间状态失败:', error);
    }
  },

  /**
   * 初始化云开发
   */
  async initCloud() {
    try {
      if (!wx.cloud) {
        console.log('初始化云开发...');
        return false;
      }

      wx.cloud.init({
        traceUser: true,
      });

      console.log('云开发初始化成功');
      return true;
    } catch (error) {
      console.error('云开发初始化失败:', error);
      return false;
    }
  },

  /**
   * 返回首页
   */
  backToHome() {
    this.setData({ view: 'home', roomId: '' });
  },

  /**
   * 去创建房间
   */
  goToCreate() {
    this.setData({ view: 'create', roomId: '' });
  },

  /**
   * 去加入房间
   */
  goToJoin() {
    this.setData({ view: 'join' });
  },

  /**
   * 设置玩家数量
   */
  setPlayerCount(e: WechatMiniprogram.TouchEvent) {
    const countStr = e.currentTarget.dataset.count as string;
    const count = parseInt(countStr) as 3 | 4;
    this.setData({
      playerCount: count,
      shutOut: count === 3 ? 20 : 15
    });
  },

  /**
   * 输入变化处理
   */
  onCardPriceChange(e: WechatMiniprogram.Input) {
    const value = parseInt(e.detail.value);
    // 验证输入：非负整数，最大值1000
    const validValue = Number.isInteger(value) && value >= 0 && value <= 1000 ? value : 0;
    this.setData({ cardPrice: validValue });
  },

  onBombFeeChange(e: WechatMiniprogram.Input) {
    const value = parseInt(e.detail.value);
    // 验证输入：非负整数，最大值100
    const validValue = Number.isInteger(value) && value >= 0 && value <= 100 ? value : 0;
    this.setData({ bombFee: validValue });
  },

  onShutOutChange(e: WechatMiniprogram.Input) {
    const value = parseInt(e.detail.value);
    // 验证输入：非负整数，最大值100
    const validValue = Number.isInteger(value) && value >= 0 && value <= 100 ? value : 0;
    this.setData({ shutOut: validValue });
  },

  onRoomIdInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value.replace(/\D/g, '');
    this.setData({ roomId: value });
  },

  /**
   * 扫描二维码 - 扫码成功后自动加入房间
   */
  scanQRCode() {
    const app = getApp();
    const currentUser = app.globalData.currentUser;

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/auth/auth'
        });
      }, 1500);
      return;
    }

    wx.scanCode({
      success: async (res) => {
        console.log('扫码结果:', res);
        let scanResult = res.result as string;

        // 处理微信小程序二维码的各种格式
        // 1. mini-program路径：pages/room/room?roomId=123456
        // 2. WeChat短链接（扫码后显示提示，请使用微信扫码）
        if (scanResult.includes('mp.weixin.qq.com') || scanResult.includes('http://wx.mp')) {
          wx.showModal({
            title: '请使用微信扫码',
            content: '检测到微信小程序码，请在微信中使用"扫一扫"功能扫码',
            showCancel: false
          });
          return;
        }

        // 3. 检查是否是mini-program路径格式（包含 roomId=）
        if (!/^\d{3,6}$/.test(scanResult)) {
          // 如果不是纯数字房间号，尝试从路径中提取房间号
          if (scanResult.includes('pages/room/room') || scanResult.includes('roomId=')) {
            // 从路径中提取房间号
            const match = scanResult.match(/roomId=([^&\s]+)/);
            if (match && match[1]) {
              scanResult = match[1];
              console.log('从路径中提取房间号:', scanResult);
            } else {
              console.error('无法从二维码中提取房间号:', scanResult);
              wx.showToast({
                title: '无效的房间二维码',
                icon: 'none'
              });
              return;
            }
          } else {
            console.error('无效的扫码结果:', scanResult);
            wx.showToast({
              title: '无效的房间二维码',
              icon: 'none'
            });
            return;
          }
        }

        // 验证最终scanResult是3-6位数字并加入房间
        if (/^\d{3,6}$/.test(scanResult)) {
          wx.showLoading({ title: '加入房间中...', mask: true });

          try {
            const joinResult = await wx.cloud.callFunction({
              name: 'joinRoom',
              data: {
                roomId: scanResult,
                userId: currentUser.id,
                nickname: currentUser.name,
                avatarUrl: currentUser.avatarUrl
              }
            });

            wx.hideLoading();

            const resultData = joinResult.result as any;
            if (resultData && resultData.errCode === 0 && resultData.exists) {
              console.log('加入房间成功，跳转到等待页面');
              wx.setStorageSync('currentRoomId', scanResult);
              wx.redirectTo({
                url: `/pages/waiting/waiting?roomId=${scanResult}`
              });
            } else {
              wx.showToast({
                title: resultData?.errMsg || '房间不存在或已结束',
                icon: 'none'
              });
            }
          } catch (error) {
            console.error('扫码加入房间失败:', error);
            wx.hideLoading();
            wx.showToast({
              title: '加入房间失败',
              icon: 'none'
            });
          }
        } else {
          wx.showToast({
            title: '无效的房间二维码',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        if (err.errMsg.includes('permission')) {
          wx.showModal({
            title: '需要相机权限',
            content: '扫码需要使用您的相机，请在设置中开启相机权限',
            showCancel: false
          });
        } else {
          wx.showToast({
            title: '扫码取消或失败',
            icon: 'none'
          });
        }
      }
    });
  },

  /**
   * 创建房间
   */
  async createRoom() {
    const app = getApp();
    const currentUser = app.globalData.currentUser;

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/auth/auth'
        });
      }, 1500);
      return;
    }

    wx.showLoading({ title: '创建房间中...', mask: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'createRoom',
        data: {
          userId: currentUser.id,
          hostNickname: currentUser.name,
          hostAvatarUrl: currentUser.avatarUrl,
          settings: {
            cardPrice: this.data.cardPrice,
            bombFee: this.data.bombFee,
            shutOut: this.data.shutOut
          },
          playerCount: this.data.playerCount
        }
      });

      wx.hideLoading();

      const resultData = result.result as any;
      if (resultData && resultData.errCode === 0) {
        console.log('创建房间成功，房间号:', resultData.roomId);
        wx.setStorageSync('currentRoomId', resultData.roomId);
        wx.redirectTo({
          url: `/pages/waiting/waiting?roomId=${resultData.roomId}`
        });
      } else {
        wx.showToast({
          title: resultData?.errMsg || '创建房间失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('创建房间失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '创建房间失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加入房间（手动输入房间号）
   */
  async joinRoom() {
    const app = getApp();
    const currentUser = app.globalData.currentUser;

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.redirectTo({
          url: '/pages/auth/auth'
        });
      }, 1500);
      return;
    }

    const roomId = this.data.roomId.trim();

    if (!roomId) {
      wx.showToast({
        title: '请输入房间号',
        icon: 'none'
      });
      return;
    }

    if (!/^\d{3,6}$/.test(roomId)) {
      wx.showToast({
        title: '房间号格式错误',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '加入房间中...', mask: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'joinRoom',
        data: {
          roomId: roomId,
          userId: currentUser.id,
          nickname: currentUser.name,
          avatarUrl: currentUser.avatarUrl
        }
      });

      wx.hideLoading();

      const resultData = result.result as any;
      if (resultData && resultData.errCode === 0 && resultData.exists) {
        console.log('加入房间成功，跳转到等待页面');
        wx.setStorageSync('currentRoomId', roomId);
        wx.redirectTo({
          url: `/pages/waiting/waiting?roomId=${roomId}`
        });
      } else {
        wx.showToast({
          title: resultData?.errMsg || '房间不存在或已结束',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加入房间失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '加入房间失败',
        icon: 'none'
      });
    }
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: `加入我的扑克房间，房间号：${this.data.roomId}`,
      path: `/pages/room/room?roomId=${this.data.roomId}`,
      imageUrl: '' // 暂时不设置图片
    };
  }
});