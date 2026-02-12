import type { UserProfile, GameState } from './types';

App<IAppOption>({
  globalData: {
    currentUser: null,
    gameState: null
  },

  onLaunch(this: any, options: any) {
    // 初始化云开发环境（使用默认环境）
    wx.cloud.init({
      traceUser: true,
    });

    // 处理扫码进入（scene参数）
    if (options && options.scene) {
      const scene = options.scene as number;
      console.log('从扫码进入小程序，scene:', scene);

      // scene是房间号，直接跳转到等待页面
      const roomId = scene.toString();
      if (/^\d{3,6}$/.test(roomId)) {
        // 延迟跳转，确保用户信息已加载
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/room/room?roomId=${roomId}`
          });
        }, 500);
      }
    }

    // 加载用户信息
    const user = wx.getStorageSync('card_user_profile');
    if (user) {
      this.globalData.currentUser = user;
    }

    // 加载游戏状态
    const game = wx.getStorageSync('card_score_game_v3');
    if (game) {
      this.globalData.gameState = game;
    }
  },

  saveUser(user: UserProfile) {
    this.globalData.currentUser = user;
    wx.setStorageSync('card_user_profile', user);
  },

  saveGameState(gameState: GameState) {
    this.globalData.gameState = gameState;
    wx.setStorageSync('card_score_game_v3', gameState);
  },

  clearGameState() {
    this.globalData.gameState = null;
    wx.removeStorageSync('card_score_game_v3');
  }
});
