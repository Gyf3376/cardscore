import type { Player, Round } from '../../types';

Page({
  // 配置下拉刷新
  enablePullDownRefresh: true,

  data: {
    players: [] as Player[],
    rounds: [] as any[],  // 修改为包含玩家信息的回合列表
    refreshing: false
  },

  onLoad() {
    const app = getApp();
    const gameState = app.globalData.gameState;

    if (!gameState) {
      wx.navigateBack();
      return;
    }

    // 预处理回合数据，添加玩家信息
    const enrichedRounds = this.enrichRoundsWithPlayers(gameState.rounds, gameState.players);

    this.setData({
      players: gameState.players,
      rounds: enrichedRounds
    });
  },

  /**
   * 预处理回合数据，将玩家信息添加到每个条目
   */
  enrichRoundsWithPlayers(rounds: Round[], players: Player[]) {
    return rounds.map(round => ({
      ...round,
      entries: round.entries.map(entry => {
        const player = players.find(p => p.id === entry.playerId);
        return {
          ...entry,
          playerName: player?.name || '未知',
          playerAvatarUrl: player?.avatarUrl || ''
        };
      })
    }));
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    console.log('下拉刷新历史记录');
    await this.refreshHistoryData();
    wx.stopPullDownRefresh();
  },

  /**
   * 从云端刷新历史记录
   */
  async refreshHistoryData() {
    const app = getApp();
    const gameState = app.globalData.gameState;

    if (!gameState?.roomId) {
      return;
    }

    if (this.data.refreshing) {
      return;
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

        // 转换云端回合数据格式
        const formattedRounds: Round[] = cloudRounds.map((r: any) => ({
          id: r.id || r._id || r.roundId,
          winnerId: r.winnerId,
          timestamp: r.timestamp,
          entries: r.entries
        }));

        // 检查是否有新回合
        const currentRoundIds = new Set(this.data.rounds.map((r: Round) => r.id));
        const newRounds = formattedRounds.filter((r: Round) => !currentRoundIds.has(r.id));

        if (newRounds.length > 0) {
          console.log(`发现 ${newRounds.length} 条新回合记录`);

          // 预处理新回合数据，添加玩家信息
          const enrichedNewRounds = this.enrichRoundsWithPlayers(newRounds, roomDataResult.players || []);

          // 合并现有回合和新回合
          const existingRounds = this.data.rounds;
          const allRounds = [...existingRounds, ...enrichedNewRounds];

          // 更新游戏状态和历史记录
          const newGameState = {
            ...gameState,
            rounds: formattedRounds
          };
          app.saveGameState(newGameState);

          this.setData({ rounds: allRounds });

          wx.showToast({
            title: `已更新 ${newRounds.length} 条新记录`,
            icon: 'success'
          });
        } else {
          console.log('没有新回合记录');
        }
      }
    } catch (error) {
      console.error('刷新历史记录失败:', error);
    } finally {
      this.setData({ refreshing: false });
    }
  },

  /**
   * 获取玩家信息
   */
  getPlayer(playerId: string): Player {
    return this.data.players.find((p: Player) => p.id === playerId) || {
      id: playerId,
      name: '未知',
      avatarUrl: '',
      totalScore: 0
    };
  },

  /**
   * 判断是否获胜者
   */
  isWinner(winnerId: string, playerId: string): boolean {
    return winnerId === playerId;
  },

  /**
   * 删除一局
   */
  deleteRound(e: WechatMiniprogram.TouchEvent) {
    const roundId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这局记录吗？',
      confirmText: '删除',
      confirmColor: '#e11d48',
      success: (res) => {
        if (res.confirm) {
          // 调用上一页的删除方法
          const pages = getCurrentPages();
          const gamePage = pages[pages.length - 2] as any;

          if (gamePage && gamePage.deleteRound) {
            gamePage.deleteRound(roundId);
          }

          // 更新当前页面数据
          const newRounds = this.data.rounds.filter((r: Round) => r.id !== roundId);
          this.setData({ rounds: newRounds });

          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 返回
   */
  goBack() {
    wx.navigateBack();
  }
});
