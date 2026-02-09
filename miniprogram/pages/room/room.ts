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
      this.goToJoin();
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
    this.setData({ cardPrice: parseInt(e.detail.value) || 0 });
  },

  onBombFeeChange(e: WechatMiniprogram.Input) {
    this.setData({ bombFee: parseInt(e.detail.value) || 0 });
  },

  onShutOutChange(e: WechatMiniprogram.Input) {
    this.setData({ shutOut: parseInt(e.detail.value) || 0 });
  },

  onRoomIdInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value.replace(/\D/g, '');
    this.setData({ roomId: value });
  },

  /**
   * 创建房间（使用云函数）
   */
  async createRoom() {
    const app = getApp();
    const currentUser = app.globalData.currentUser;

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (!this.data.cloudReady) {
      wx.showLoading({ title: '初始化云开发...', mask: true });
      const ready = await this.initCloud();
      wx.hideLoading();
      if (!ready) {
        wx.showToast({
          title: '云开发初始化失败',
          icon: 'none'
        });
        return;
      }
      this.setData({ cloudReady: true });
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
            bombFee: this.data.bombFee,
            shutOutScore: this.data.shutOut,
            cardPrice: this.data.cardPrice
          },
          playerCount: this.data.playerCount
        }
      });

      wx.hideLoading();

      const cloudResult = result.result as any;
      if (cloudResult && cloudResult.errCode === 0) {
        const roomId = cloudResult.roomId;
        console.log('房间创建成功，房间号:', roomId);

        // 保存房间数据到本地（缓存）
        wx.setStorageSync('currentRoomId', roomId);

        // 跳转到等待页面
        console.log('准备跳转到等待页面，URL:', `/pages/waiting/waiting?roomId=${roomId}`);
        wx.redirectTo({
          url: `/pages/waiting/waiting?roomId=${roomId}`
        });
      } else {
        wx.showToast({
          title: cloudResult?.errMsg || '创建房间失败',
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
   * 加入房间（使用云函数）
   */
  async joinRoom() {
    if (this.data.roomId.length !== 6) {
      wx.showToast({
        title: '请输入6位房间码',
        icon: 'none'
      });
      return;
    }

    const app = getApp();
    const currentUser = app.globalData.currentUser;

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (!this.data.cloudReady) {
      wx.showLoading({ title: '初始化云开发...', mask: true });
      const ready = await this.initCloud();
      wx.hideLoading();
      if (!ready) {
        wx.showToast({
          title: '云开发初始化失败',
          icon: 'none'
        });
        return;
      }
      this.setData({ cloudReady: true });
    }

    wx.showLoading({ title: '加入房间中...', mask: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'joinRoom',
        data: {
          roomId: this.data.roomId,
          userId: currentUser.id,
          nickname: currentUser.name,
          avatarUrl: currentUser.avatarUrl
        }
      });

      wx.hideLoading();

      const joinResult = result.result as any;
      if (joinResult && joinResult.errCode === 0 && joinResult.exists) {
        console.log('加入房间成功，跳转到等待页面');

        // 跳转到等待页面
        wx.redirectTo({
          url: `/pages/waiting/waiting?roomId=${this.data.roomId}`
        });
      } else {
        wx.showToast({
          title: joinResult?.errMsg || '房间不存在',
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
