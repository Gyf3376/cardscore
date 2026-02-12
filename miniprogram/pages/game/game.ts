import { getRankedPlayersForCurrentUser, updatePlayersAfterRound, updatePlayersAfterDelete } from '../../utils';
import type { GameState, Player, Round, UserProfile } from '../../types';

Page({
  // 配置下拉刷新
  enablePullDownRefresh: true,

  data: {
    currentUser: null as UserProfile | null,
    gameState: null as GameState | null,
    sortedPlayers: [] as Player[],
    showRoundModal: false,
    lastRoundWinner: '',
    cloudReady: false,
    heartbeatTimer: null as number | null,
    refreshing: false
  },

  onLoad() {
    const app = getApp();
    const currentUser = app.globalData.currentUser;
    const gameState = app.globalData.gameState;

    if (!gameState || !gameState.isActive) {
      wx.redirectTo({
        url: '/pages/room/room'
      });
      return;
    }

    // 初始化云开发
    this.initCloud();

    const sortedPlayers = getRankedPlayersForCurrentUser(gameState.players, currentUser.id);
    const lastRoundWinner = gameState.rounds.length > 0
      ? gameState.players.find((p: Player) => p.id === gameState.rounds[0].winnerId)?.name || ''
      : '';

    this.setData({
      currentUser,
      gameState,
      sortedPlayers,
      lastRoundWinner
    });

    // 启动心跳机制
    this.startHeartbeat();
  },

  onUnload() {
    // 清理心跳定时器
    this.stopHeartbeat();
  },

  /**
   * 页面隐藏时清理定时器，防止内存泄漏
   */
  onHide() {
    this.stopHeartbeat();
  },

  /**
   * 停止心跳定时器
   */
  stopHeartbeat() {
    if (this.data.heartbeatTimer) {
      clearInterval(this.data.heartbeatTimer);
      this.setData({ heartbeatTimer: null });
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
        env: 'cloud1-8gaynlop5b6eab9a'
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
   * 启动心跳机制
   */
  startHeartbeat() {
    // 每30秒发送一次心跳
    const timer = setInterval(() => {
      this.sendHeartbeat();
    }, 30000) as unknown as number;

    this.setData({ heartbeatTimer: timer });

    // 立即发送一次
    this.sendHeartbeat();
  },

  /**
   * 发送心跳
   */
  async sendHeartbeat() {
    if (!this.data.cloudReady || !this.data.currentUser || !this.data.gameState?.roomId) {
      return;
    }

    try {
      await wx.cloud.callFunction({
        name: 'heartbeat',
        data: {
          roomId: this.data.gameState.roomId,
          playerId: this.data.currentUser.id
        }
      });
    } catch (error) {
      console.error('心跳发送失败:', error);
    }
  },

  /**
   * 打开记分弹窗
   */
  openRoundModal() {
    const gameState = this.data.gameState;
    const currentUser = this.data.currentUser;

    if (!gameState || !currentUser) {
      wx.showToast({
        title: '游戏状态异常',
        icon: 'none'
      });
      return;
    }

    // 对玩家进行排序，让当前用户排在首位
    const sortedPlayers = [...gameState.players].sort((a, b) => {
      if (a.id === currentUser.id) return -1; // 当前用户排在首位
      if (b.id === currentUser.id) return 1;  // 其他用户排在后面
      return 0; // 其他情况保持原有顺序
    });

    // 默认选中当前用户
    const defaultWinnerId = currentUser.id;

    this.setData({
      showRoundModal: true,
      sortedPlayers,
      defaultWinnerId
    });
  },

  /**
   * 关闭记分弹窗
   */
  closeRoundModal() {
    this.setData({ showRoundModal: false });
  },

  /**
   * 提交新局记录
   */
  async onRoundSubmit(e: any) {
    const round: Round = e.detail;
    const gameState = this.data.gameState;

    if (!gameState) {
      wx.showToast({
        title: '游戏状态异常',
        icon: 'none'
      });
      return;
    }

    if (!this.data.cloudReady) {
      wx.showToast({
        title: '云开发未初始化',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...', mask: true });

    try {
      // 调用云函数提交对局
      const result = await wx.cloud.callFunction({
        name: 'submitRound',
        data: {
          roomId: gameState.roomId,
          roundId: round.id,
          winnerId: round.winnerId,
          entries: round.entries
        }
      });

      wx.hideLoading();

      if (result.result && (result.result as any).errCode === 0) {
        // 更新本地状态
        const newRounds = [round, ...gameState.rounds];
        const newPlayers = updatePlayersAfterRound(gameState.players, round);

        const newGameState: GameState = {
          ...gameState,
          rounds: newRounds,
          players: newPlayers
        };

        const app = getApp();
        app.saveGameState(newGameState);

        const sortedPlayers = getRankedPlayersForCurrentUser(newPlayers, this.data.currentUser?.id || '');
        const winner = newPlayers.find(p => p.id === round.winnerId);

        this.setData({
          gameState: newGameState,
          sortedPlayers,
          lastRoundWinner: winner?.name || '',
          showRoundModal: false
        });

        wx.showToast({
          title: '记录已保存',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: (result.result as any)?.errMsg || '提交失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('提交对局失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    }
  },

  /**
   * 删除一局记录
   */
  async deleteRound(roundId: string) {
    const gameState = this.data.gameState;

    if (!gameState) {
      wx.showToast({
        title: '游戏状态异常',
        icon: 'none'
      });
      return;
    }

    const roundToDelete = gameState.rounds.find((r: Round) => r.id === roundId);

    if (!roundToDelete) return;

    if (!this.data.cloudReady) {
      wx.showToast({
        title: '云开发未初始化',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '删除中...', mask: true });

    try {
      // 调用云函数删除对局
      const result = await wx.cloud.callFunction({
        name: 'deleteRound',
        data: {
          roomId: gameState.roomId,
          roundId: roundId
        }
      });

      wx.hideLoading();

      if (result.result && (result.result as any).errCode === 0) {
        // 更新本地状态
        const newRounds = gameState.rounds.filter((r: Round) => r.id !== roundId);
        const newPlayers = updatePlayersAfterDelete(gameState.players, roundToDelete);

        const newGameState: GameState = {
          ...gameState,
          rounds: newRounds,
          players: newPlayers
        };

        const app = getApp();
        app.saveGameState(newGameState);

        const sortedPlayers = getRankedPlayersForCurrentUser(newPlayers, this.data.currentUser?.id || '');
        const lastRoundWinner = newRounds.length > 0
          ? newPlayers.find(p => p.id === newRounds[0].winnerId)?.name || ''
          : '';

        this.setData({
          gameState: newGameState,
          sortedPlayers,
          lastRoundWinner
        });

        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: (result.result as any)?.errMsg || '删除失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('删除对局失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 跳转到历史记录
   */
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  /**
   * 跳转到规则说明
   */
  goToRules() {
    wx.navigateTo({
      url: '/pages/rules/rules'
    });
  },

  /**
   * 重置游戏（离开房间）
   */
  async resetGame() {
    const gameState = this.data.gameState;
    if (!gameState?.roomId) return;

    const currentUser = this.data.currentUser;
    if (!currentUser) return;

    // 判断是否为房主
    const isHost = gameState.players.find((p: Player) => p.id === currentUser.id)?.isHost;

    wx.showModal({
      title: isHost ? '确认解散房间' : '确认离开房间',
      content: isHost
        ? '确定要解散房间并清除所有记录吗？其他玩家将无法继续游戏。'
        : '确定要离开房间吗？',
      confirmText: '确定',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          if (this.data.cloudReady) {
            wx.showLoading({ title: '处理中...', mask: true });

            try {
              // 调用云函数离开房间
              await wx.cloud.callFunction({
                name: 'leaveRoom',
                data: {
                  roomId: gameState.roomId,
                  userId: currentUser.id,
                  isHost: isHost || false
                }
              });

              wx.hideLoading();
            } catch (error) {
              console.error('离开房间失败:', error);
              wx.hideLoading();
            }
          }

          // 清理本地状态
          const app = getApp();
          app.clearGameState();
          wx.removeStorageSync('currentRoomId');

          wx.redirectTo({
            url: '/pages/room/room'
          });
        }
      }
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    const gameState = this.data.gameState;
    return {
      title: `扑克计分 - 房间号：${gameState?.roomId}`,
      path: `/pages/room/room?roomId=${gameState?.roomId}`
    };
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    console.log('下拉刷新，获取最新数据');
    await this.refreshGameData();
    wx.stopPullDownRefresh();
  },

  /**
   * 从云端刷新游戏数据（回合记录和玩家积分）
   */
  async refreshGameData() {
    const gameState = this.data.gameState;
    if (!gameState?.roomId || !this.data.cloudReady) {
      return;
    }

    if (this.data.refreshing) {
      return; // 防止重复刷新
    }

    this.setData({ refreshing: true });

    try {
      // 调用云函数获取房间数据
      const result = await wx.cloud.callFunction({
        name: 'getRoomData',
        data: { roomId: gameState.roomId }
      });

      const roomDataResult = result.result as any;

      if (roomDataResult && roomDataResult.errCode === 0) {
        const cloudRounds = roomDataResult.rounds || [];
        const cloudPlayers = roomDataResult.players || [];

        // 转换云端回合数据格式
        const formattedRounds: Round[] = cloudRounds.map((r: any) => ({
          id: r.id || r._id || r.roundId,
          winnerId: r.winnerId,
          timestamp: r.timestamp,
          entries: r.entries
        }));

        // 同步玩家数据（包括头像、昵称等）
        // 使用云端玩家的最新数据
        const newPlayers: Player[] = cloudPlayers.map((cp: any) => {
          const localPlayer = gameState.players.find((lp: Player) => lp.id === cp.id);
          return {
            ...localPlayer,
            id: cp.id,
            name: cp.name,
            avatarUrl: cp.avatarUrl,
            totalScore: cp.totalScore,
            isHost: cp.isHost
          } as Player;
        });

        // 检查是否有新回合
        const currentRoundIds = new Set(gameState.rounds.map((r: Round) => r.id));
        const newRounds = formattedRounds.filter((r: Round) => !currentRoundIds.has(r.id));

        // 始终更新游戏状态（即使没有新回合也要同步玩家数据）
        const newGameState: GameState = {
          ...gameState,
          rounds: formattedRounds,
          players: newPlayers
        };

        const app = getApp();
        app.saveGameState(newGameState);

        const sortedPlayers = getRankedPlayersForCurrentUser(newPlayers, this.data.currentUser?.id || '');
        const lastRoundWinner = formattedRounds.length > 0
          ? newPlayers.find((p: Player) => p.id === formattedRounds[0].winnerId)?.name || ''
          : '';

        this.setData({
          gameState: newGameState,
          sortedPlayers,
          lastRoundWinner
        });

        if (newRounds.length > 0) {
          console.log(`发现 ${newRounds.length} 条新回合记录`);
          wx.showToast({
            title: `已更新 ${newRounds.length} 条新记录`,
            icon: 'success'
          });
        } else {
          console.log('已同步最新玩家数据');
        }
      }
    } catch (error) {
      console.error('刷新游戏数据失败:', error);
    } finally {
      this.setData({ refreshing: false });
    }
  },

  /**
   * 根据所有回合重新计算玩家总分
   */
  recalculatePlayerScores(originalPlayers: Player[], allRounds: Round[]): Player[] {
    // 初始化玩家分数为0
    const players = originalPlayers.map((p: Player) => ({
      ...p,
      totalScore: 0
    }));

    // 累加所有回合的得分
    allRounds.forEach(round => {
      round.entries.forEach(entry => {
        const player = players.find(p => p.id === entry.playerId);
        if (player) {
          player.totalScore += entry.scoreChange;
        }
      });
    });

    return players;
  }
});
