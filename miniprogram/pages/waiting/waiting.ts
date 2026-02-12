import type { Player, GameState } from '../../types';

Page({
  // 配置下拉刷新
  enablePullDownRefresh: true,

  data: {
    roomId: '',
    playerCount: 3 as 3 | 4,
    joinedPlayers: [] as Player[],
    isHost: false,
    cloudReady: false,
    pollingTimer: null as number | null,
    canStartGame: false,
    isRefreshing: false // 添加刷新标志，防止竞态条件
  },

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

    console.log('等待页面加载，当前用户:', currentUser);

    // 检查是否有房间号参数
    if (options && options.roomId) {
      this.setData({ roomId: options.roomId });
      this.loadRoomData(options.roomId);
    } else {
      // 没有房间号，返回首页
      wx.navigateBack();
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
      this.setData({ cloudReady: true });
      return true;
    } catch (error) {
      console.error('云开发初始化失败:', error);
      return false;
    }
  },

  /**
   * 开始轮询房间数据
   */
  startPolling() {
    // 先停止之前的轮询
    this.stopPolling();

    console.log('开始轮询房间数据，房间号:', this.data.roomId);

    // 立即刷新一次
    this.refreshRoomData();

    // 每3秒刷新一次
    const timer = setInterval(() => {
      this.refreshRoomData();
    }, 3000);

    this.setData({ pollingTimer: timer });
  },

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.data.pollingTimer) {
      console.log('停止轮询');
      clearInterval(this.data.pollingTimer);
      this.setData({ pollingTimer: null });
    }
  },

  /**
   * 刷新房间数据
   */
  async refreshRoomData() {
    if (!this.data.roomId) {
      return;
    }

    // 防止竞态条件：如果上一次刷新还在进行中，则跳过本次刷新
    if (this.data.isRefreshing) {
      return;
    }

    this.setData({ isRefreshing: true });

    try {
      const result = await wx.cloud.callFunction({
        name: 'getRoomData',
        data: { roomId: this.data.roomId }
      });

      const roomDataResult = result.result as any;

      if (roomDataResult && roomDataResult.errCode === 0) {
        // 检查云端返回的房间状态
        if (roomDataResult.room?.status === 'active') {
          console.log('游戏已开始（云端检测），准备跳转到游戏页面');
          this.stopPolling();

          // 从云端数据构建游戏状态并保存到本地
          const app = getApp();
          const gameState: GameState = {
            roomId: this.data.roomId,
            players: roomDataResult.players,
            rounds: roomDataResult.rounds || [],
            playerCount: roomDataResult.room.playerCount || this.data.playerCount,
            isActive: true,
            bombBaseFee: roomDataResult.room.settings?.bombFee || 0,
            shutOutScore: roomDataResult.room.settings?.shutOut || 0,
            cardUnitPrice: roomDataResult.room.settings?.cardPrice || 0
          };

          app.saveGameState(gameState);
          console.log('游戏状态已保存，跳转到游戏页面');

          wx.redirectTo({
            url: '/pages/game/game'
          });
          return;
        }

        // 检查玩家列表是否有变化
        const currentPlayers = this.data.joinedPlayers;
        const newPlayers = roomDataResult.players || [];

        // 玩家数量或顺序变化时才更新
        if (JSON.stringify(currentPlayers) !== JSON.stringify(newPlayers)) {
          console.log('玩家列表更新:', newPlayers);

          const canStart = newPlayers.length >= (roomDataResult.room.playerCount || this.data.playerCount);

          this.setData({
            joinedPlayers: newPlayers,
            canStartGame: canStart
          });
        }

        // 更新房间信息（如果有的话）
        if (roomDataResult.room && roomDataResult.room.playerCount) {
          this.setData({
            playerCount: roomDataResult.room.playerCount
          });
        }
      }
    } catch (error) {
      console.error('刷新房间数据失败:', error);
    } finally {
      this.setData({ isRefreshing: false });
    }
  },

  /**
   * 加载房间数据
   */
  async loadRoomData(roomId: string) {
    console.log('开始加载房间数据，房间号:', roomId);

    try {
      const result = await wx.cloud.callFunction({
        name: 'getRoomData',
        data: { roomId }
      });

      const roomDataResult = result.result as any;

      if (roomDataResult && roomDataResult.errCode !== 0) {
        wx.showToast({
          title: roomDataResult.errMsg || '获取房间数据失败',
          icon: 'none'
        });
        console.error('获取房间数据失败:', result);
        return;
      }

      console.log('获取到房间数据:', roomDataResult);

      const canStart = (roomDataResult.players || []).length >= (roomDataResult.room.playerCount || 3);

      this.setData({
        joinedPlayers: roomDataResult.players || [],
        playerCount: roomDataResult.room.playerCount || 3,
        isHost: roomDataResult.isHost || false,
        canStartGame: canStart
      });

      // 开始轮询
      this.startPolling();
    } catch (error) {
      console.error('加载房间数据失败:', error);
    }
  },

  /**
   * 邀请好友
   */
  inviteFriend() {
    wx.showShareMenu({
      withShareTicket: true
    });

    wx.setClipboardData({
      data: this.data.roomId,
      success: () => {
        wx.showToast({
          title: '房间号已复制',
          icon: 'success'
        });
      }
    });

    wx.showModal({
      title: '邀请好友',
      content: `房间号：${this.data.roomId}\n\n由于使用云存储，所有设备都能加入房间！\n\n请将房间号分享给好友，好友可在"加入房间"界面输入该房间号加入。`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 开始游戏
   */
  async startGame() {
    const { roomId, playerCount, joinedPlayers } = this.data;

    if (joinedPlayers.length < playerCount) {
      wx.showToast({
        title: `还差 ${playerCount - joinedPlayers.length} 人，点击邀请好友！`,
        icon: 'none'
      });
      return;
    }

    const app = getApp();

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
    }

    wx.showLoading({ title: '开始游戏中...', mask: true });

    try {
      // 调用云函数开始游戏
      const result = await wx.cloud.callFunction({
        name: 'startGame',
        data: { roomId }
      });

      wx.hideLoading();

      const startResult = result.result as any;
      if (startResult && startResult.errCode === 0) {
        console.log('游戏开始成功');

        const settings = {
          bombFee: startResult.settings?.bombFee || 0,
          shutOutScore: startResult.settings?.shutOutScore || 0,
          cardPrice: startResult.settings?.cardPrice || 0
        };

        const gameState: GameState = {
          roomId,
          players: startResult.players,
          rounds: [],
          playerCount: startResult.playerCount || playerCount,
          isActive: true,
          bombBaseFee: settings.bombFee,
          shutOutScore: settings.shutOutScore,
          cardUnitPrice: settings.cardPrice
        };

        app.saveGameState(gameState);

        wx.redirectTo({
          url: '/pages/game/game'
        });
      } else {
        wx.showToast({
          title: startResult?.errMsg || '开始游戏失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('开始游戏失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '开始游戏失败',
        icon: 'none'
      });
    }
  },

  /**
   * 返回首页
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 页面卸载
   */
  onUnload() {
    // 停止轮询
    this.stopPolling();
  }
});
