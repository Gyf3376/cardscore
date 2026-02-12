import type { Player, Round, RoundEntry, PlayerRoundData } from './types';

/**
 * 生成6位随机房间号
 */
export function generateRoomId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 生成随机用户ID
 */
export function generateUserId(): string {
  return 'u' + Math.random().toString(36).slice(2, 11);
}

/**
 * 生成随机头像URL
 */
export function generateAvatarUrl(seed?: string): string {
  const actualSeed = seed || Math.random().toString();
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${actualSeed}`;
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return '刚刚';
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hour}:${minute}`;
  }
}

/**
 * 判断所有对手是否都被关
 */
export function isAllOpponentsShutOut(
  winnerId: string,
  playerData: Record<string, PlayerRoundData>,
  players: Player[]
): boolean {
  return players
    .filter(p => p.id !== winnerId)
    .every(p => playerData[p.id].shutOut);
}

/**
 * 计算得分
 */
export function calculateScores(
  players: Player[],
  winnerId: string,
  playerData: Record<string, PlayerRoundData>,
  bombBaseFee: number,
  shutOutScore: number,
  cardUnitPrice: number
): RoundEntry[] {
  const numPlayers = players.length;
  const bombNets: Record<string, number> = {};
  const cardNets: Record<string, number> = {};

  players.forEach(p => {
    bombNets[p.id] = 0;
    cardNets[p.id] = 0;
  });

  const allOpponentsShutOut = isAllOpponentsShutOut(winnerId, playerData, players);

  // 计算炸弹得分
  if (!allOpponentsShutOut) {
    players.forEach(p => {
      if (playerData[p.id].shutOut) return;
      const bombs = playerData[p.id].bombs;
      if (bombs > 0) {
        const reward = bombs * bombBaseFee * (numPlayers - 1);
        bombNets[p.id] += reward;
        players.forEach(other => {
          if (other.id !== p.id) {
            bombNets[other.id] -= (bombs * bombBaseFee);
          }
        });
      }
    });
  }

  // 计算剩余手牌得分
  let totalLoserPay = 0;
  players.forEach(p => {
    if (p.id !== winnerId) {
      const { cards, shutOut } = playerData[p.id];
      let cost = 0;
      if (shutOut) {
        cost = shutOutScore;
      } else if (cards === 1) {
        cost = 0;
      } else {
        cost = cards * cardUnitPrice;
      }

      cardNets[p.id] -= cost;
      totalLoserPay += cost;
    }
  });
  cardNets[winnerId] += totalLoserPay;

  return players.map(p => ({
    playerId: p.id,
    remainingCards: p.id === winnerId ? 0 : (playerData[p.id].shutOut ? 0 : playerData[p.id].cards),
    bombCount: (p.id === winnerId && allOpponentsShutOut) ? 0 : playerData[p.id].bombs,
    isShutOut: p.id === winnerId ? false : playerData[p.id].shutOut,
    scoreChange: bombNets[p.id] + cardNets[p.id]
  }));
}

/**
 * 验证输入数据
 */
export function validateRoundInput(
  players: Player[],
  winnerId: string,
  playerData: Record<string, PlayerRoundData>
): { valid: boolean; message?: string } {
  // 检查是否选择了获胜者
  if (!winnerId) {
    return {
      valid: false,
      message: '请选择获胜者'
    };
  }

  // 检查每个玩家的数据
  for (const player of players) {
    const data = playerData[player.id];

    if (!data) continue;

    // 跳过获胜者
    if (player.id === winnerId) continue;

    // 检查非获胜者的数据有效性
    if (!data.shutOut && data.cards < 0) {
      return {
        valid: false,
        message: '剩余手牌不能为负数'
      };
    }

    if (data.bombs < 0) {
      return {
        valid: false,
        message: '炸弹数不能为负数'
      };
    }
  }

  // 检查：输家剩余手牌不能为0张（除非是被关状态）
  const loserWithZeroCardsAndNotShutOut = players.some(
    p => p.id !== winnerId && !playerData[p.id].shutOut && playerData[p.id].cards === 0
  );

  if (loserWithZeroCardsAndNotShutOut) {
    return {
      valid: false,
      message: '输家剩余手牌不能为0张（除非是被关状态）'
    };
  }

  return { valid: true };
}

/**
 * 添加新局后更新玩家总分
 */
export function updatePlayersAfterRound(
  players: Player[],
  round: Round
): Player[] {
  if (!round || !round.entries || !Array.isArray(round.entries)) {
    console.error('Invalid round data:', round);
    return players;
  }

  return players.map(player => {
    const entry = round.entries.find(e => e.playerId === player.id);
    return {
      ...player,
      totalScore: player.totalScore + (entry?.scoreChange || 0)
    };
  });
}

/**
 * 删除一局后更新玩家总分
 */
export function updatePlayersAfterDelete(
  players: Player[],
  round: Round
): Player[] {
  return players.map(player => {
    const entry = round.entries.find(e => e.playerId === player.id);
    return {
      ...player,
      totalScore: player.totalScore - (entry?.scoreChange || 0)
    };
  });
}

/**
 * 获取玩家排名（按总分降序）
 */
export function getRankedPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * 获取玩家排名（所有玩家积分为0时，当前用户排在首位，否则按实际总分降序）
 */
export function getRankedPlayersForCurrentUser(players: Player[], currentUserId: string): Player[] {
  // 检查是否所有玩家积分为0
  const allZeroScores = players.every(p => p.totalScore === 0);

  if (allZeroScores) {
    // 所有积分为0时，当前用户排在首位
    const currentUser = players.find(p => p.id === currentUserId);
    const otherPlayers = players.filter(p => p.id !== currentUserId).sort((a, b) => b.totalScore - a.totalScore);

    if (currentUser) {
      return [currentUser, ...otherPlayers];
    }
    return otherPlayers;
  } else {
    // 有分数后，按实际总分降序排列
    return [...players].sort((a, b) => b.totalScore - a.totalScore);
  }
}
