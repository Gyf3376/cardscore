import { calculateScores, isAllOpponentsShutOut, validateRoundInput } from '../../utils';
import type { Player, Round, PlayerRoundData } from '../../types';

Component({
  properties: {
    players: {
      type: Array,
      value: []
    },
    bombBaseFee: {
      type: Number,
      value: 8
    },
    shutOutScore: {
      type: Number,
      value: 20
    },
    cardUnitPrice: {
      type: Number,
      value: 1
    },
    defaultWinnerId: {
      type: String,
      value: ''
    }
  },

  data: {
    winnerId: '',
    playerData: {} as Record<string, PlayerRoundData>,
    allOpponentsShutOut: false
  },

  observers: {
    'players': function(players: Player[]) {
      if (players && players.length > 0) {
        const winnerId = players[0].id;
        const playerData = players.reduce((acc: Record<string, PlayerRoundData>, p) => {
          acc[p.id] = { cards: 0, bombs: 0, shutOut: false };
          return acc;
        }, {});

        this.setData({
          winnerId,
          playerData,
          allOpponentsShutOut: false
        });
      }
    },
    'defaultWinnerId': function(defaultWinnerId: string) {
      if (defaultWinnerId && this.data.players.length > 0) {
        // 设置默认选中的用户
        this.setData({ winnerId: defaultWinnerId });
      }
    },
    'winnerId, playerData': function(winnerId: string, playerData: Record<string, PlayerRoundData>) {
      const allOpponentsShutOut = isAllOpponentsShutOut(winnerId, playerData, this.properties.players);
      this.setData({ allOpponentsShutOut });
    }
  },

  methods: {
    /**
     * 阻止事件冒泡（点击内容区域不关闭弹窗）
     */
    stopPropagation() {
      // 空方法，仅用于阻止事件冒泡
    },

    /**
     * 选择获胜者
     */
    selectWinner(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id;
      this.setData({ winnerId: id });
    },

    /**
     * 切换被关状态
     */
    toggleShutOut(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id;
      const { playerData } = this.data;
      playerData[id].shutOut = !playerData[id].shutOut;
      this.setData({ playerData });
    },

    /**
     * 修改剩余牌数
     */
    onCardsChange(e: WechatMiniprogram.Input) {
      const id = e.currentTarget.dataset.id;
      const value = parseInt(e.detail.value) || 0;
      const { playerData } = this.data;
      playerData[id].cards = value;
      this.setData({ playerData });
    },

    /**
     * 增加炸弹
     */
    incrementBombs(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id;
      const { playerData } = this.data;
      playerData[id].bombs++;
      this.setData({ playerData });
    },

    /**
     * 减少炸弹
     */
    decrementBombs(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id;
      const { playerData } = this.data;
      playerData[id].bombs = Math.max(0, playerData[id].bombs - 1);
      this.setData({ playerData });
    },

    /**
     * 判断是否获胜者
     */
    isWinner(id: string): boolean {
      return id === this.data.winnerId;
    },

    /**
     * 获取卡片样式类
     */
    getCardClass(id: string): string {
      const { winnerId, playerData } = this.data;
      if (id === winnerId) {
        return 'winner';
      }
      if (playerData[id]?.shutOut) {
        return 'shutout';
      }
      return '';
    },

    /**
     * 关闭弹窗
     */
    handleClose() {
      this.triggerEvent('close');
    },

    /**
     * 提交记录
     */
    handleSubmit() {
      const { winnerId, playerData } = this.data;
      const { bombBaseFee, shutOutScore, cardUnitPrice, players } = this.properties;

      const validation = validateRoundInput(players, winnerId, playerData);
      if (!validation.valid) {
        wx.showToast({
          title: validation.message!,
          icon: 'none'
        });
        return;
      }

      const entries = calculateScores(
        players,
        winnerId,
        playerData,
        bombBaseFee,
        shutOutScore,
        cardUnitPrice
      );

      const round: Round = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        entries,
        winnerId
      };

      this.triggerEvent('submit', round);
    }
  }
});
