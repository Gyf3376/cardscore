/**
 * 微信云开发数据库设计
 *
 * 数据库表结构：
 * 1. rooms - 房间信息
 * 2. players - 玩家信息
 * 3. rounds - 对局记录
 */

// ==================== 数据库表定义 ====================

/**
 * 房间表
 */
export interface RoomRecord {
  _id?: string;
  roomId: string; // 房间号（唯一标识）
  hostId: string; // 房主用户ID
  settings: RoomSettings; // 游戏设置
  playerCount: 3 | 4; // 预设人数
  status: 'waiting' | 'active' | 'finished'; // 房间状态
  createdAt: number; // 创建时间
  expiresAt: number; // 过期时间（24小时后）
}

/**
 * 房间设置
 */
export interface RoomSettings {
  bombFee: number; // 炸弹基础费
  shutOutScore: number; // 被关扣分
  cardPrice: number; // 每张牌的单价
}

/**
 * 玩家表
 */
export interface PlayerRecord {
  _id?: string;
  playerId: string; // 玩家唯一ID
  roomId: string; // 所属房间ID
  userId: string; // 微信用户OpenID
  nickname: string; // 玩家昵称
  avatarUrl: string; // 玩家头像URL
  totalScore: number; // 总分
  isHost: boolean; // 是否为房主
  joinedAt: number; // 加入时间
  lastActiveAt: number; // 最后活跃时间
}

/**
 * 对局记录表
 */
export interface RoundRecord {
  _id?: string;
  roundId: string; // 对局唯一ID
  roomId: string; // 所属房间ID
  timestamp: number; // 对局时间戳
  winnerId: string; // 获胜者玩家ID
  entries: RoundEntry[]; // 本局玩家记录
}

/**
 * 对局条目
 */
export interface RoundEntry {
  playerId: string; // 玩家ID
  isShutOut: boolean; // 是否被关
  cards?: number; // 剩牌数（输家）
  bombs: number; // 炸弹数
  scoreChange: number; // 得分变化
}

// ==================== 云数据库初始化 ====================

const db = wx.cloud.database();

/**
 * 获取房间表引用
 */
export const roomsCollection = db.collection('rooms');

/**
 * 获取玩家表引用
 */
export const playersCollection = db.collection('players');

/**
 * 获取对局表引用
 */
export const roundsCollection = db.collection('rounds');

// ==================== 房间相关操作 ====================

/**
 * 创建房间
 */
export async function createRoom(roomData: Omit<RoomRecord, '_id'>): Promise<string> {
  const result = await roomsCollection.add({
    data: roomData,
    createdAt: db.serverDate()
  });
  return result._id;
}

/**
 * 获取房间信息
 */
export async function getRoom(roomId: string): Promise<RoomRecord | null> {
  try {
    const result = await roomsCollection
      .where({
        roomId
      })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (result.data.length > 0) {
      return result.data[0] as RoomRecord;
    }
    return null;
  } catch (error) {
    console.error('获取房间失败:', error);
    return null;
  }
}

/**
 * 更新房间状态
 */
export async function updateRoomStatus(
  _id: string,
  status: RoomRecord['status']
): Promise<boolean> {
  try {
    await roomsCollection.doc(_id).update({
      data: {
        status
      }
    });
    return true;
  } catch (error) {
    console.error('更新房间状态失败:', error);
    return false;
  }
}

/**
 * 删除房间
 */
export async function deleteRoom(_id: string): Promise<boolean> {
  try {
    await roomsCollection.doc(_id).remove();
    return true;
  } catch (error) {
    console.error('删除房间失败:', error);
    return false;
  }
}

/**
 * 清理过期房间
 */
export async function cleanupExpiredRooms(): Promise<number> {
  try {
    const now = Date.now();
    const result = await roomsCollection
      .where({
        expiresAt: db.command.lte(now)
      })
      .remove();

    return result.stats.removed;
  } catch (error) {
    console.error('清理过期房间失败:', error);
    return 0;
  }
}

// ==================== 玩家相关操作 ====================

/**
 * 加入房间（创建玩家记录）
 */
export async function joinRoom(
  playerId: string,
  userId: string,
  nickname: string,
  avatarUrl: string,
  roomId: string,
  isHost: boolean
): Promise<boolean> {
  try {
    await playersCollection.add({
      data: {
        playerId,
        userId,
        nickname,
        avatarUrl,
        roomId,
        totalScore: 0,
        isHost,
        joinedAt: db.serverDate(),
        lastActiveAt: db.serverDate()
      }
    });
    return true;
  } catch (error) {
    console.error('加入房间失败:', error);
    return false;
  }
}

/**
 * 获取房间内所有玩家
 */
export async function getRoomPlayers(roomId: string): Promise<PlayerRecord[]> {
  try {
    const result = await playersCollection
      .where({
        roomId
      })
      .orderBy('joinedAt', 'asc')
      .get();

    return result.data as PlayerRecord[];
  } catch (error) {
    console.error('获取房间玩家失败:', error);
    return [];
  }
}

/**
 * 更新玩家总分
 */
export async function updatePlayerScore(
  playerId: string,
  totalScore: number
): Promise<boolean> {
  try {
    await playersCollection
      .where({
        playerId
      })
      .update({
        data: {
          totalScore,
          lastActiveAt: db.serverDate()
        }
      });
    return true;
  } catch (error) {
    console.error('更新玩家分数失败:', error);
    return false;
  }
}

/**
 * 根据用户ID获取玩家信息
 */
export async function getPlayerByUserId(userId: string): Promise<PlayerRecord | null> {
  try {
    const result = await playersCollection
      .where({
        userId
      })
      .orderBy('lastActiveAt', 'desc')
      .limit(1)
      .get();

    if (result.data.length > 0) {
      return result.data[0] as PlayerRecord;
    }
    return null;
  } catch (error) {
    console.error('获取玩家失败:', error);
    return null;
  }
}

// ==================== 对局相关操作 ====================

/**
 * 创建对局记录
 */
export async function createRound(roundData: Omit<RoundRecord, '_id'>): Promise<string> {
  try {
    const result = await roundsCollection.add({
      data: roundData,
      timestamp: db.serverDate()
    });
    return result._id;
  } catch (error) {
    console.error('创建对局失败:', error);
    throw error;
  }
}

/**
 * 获取房间的所有对局
 */
export async function getRoomRounds(roomId: string): Promise<RoundRecord[]> {
  try {
    const result = await roundsCollection
      .where({
        roomId
      })
      .orderBy('timestamp', 'desc')
      .get();

    return result.data as RoundRecord[];
  } catch (error) {
    console.error('获取对局失败:', error);
    return [];
  }
}

/**
 * 删除对局
 */
export async function deleteRound(roundId: string): Promise<boolean> {
  try {
    await roundsCollection.doc(roundId).remove();
    return true;
  } catch (error) {
    console.error('删除对局失败:', error);
    return false;
  }
}

/**
 * 重新计算并更新所有玩家分数
 * 当删除对局时调用，重新计算总分
 */
export async function recalculatePlayersScores(roomId: string): Promise<boolean> {
  try {
    // 获取房间的所有对局
    const rounds = await getRoomRounds(roomId);
    const players = await getRoomPlayers(roomId);

    // 为每个玩家重新计算总分
    for (const player of players) {
      let totalScore = 0;

      for (const round of rounds) {
        const entry = round.entries.find(e => e.playerId === player.playerId);
        if (entry) {
          totalScore += entry.scoreChange;
        }
      }

      // 更新玩家总分
      await playersCollection
        .where({
          playerId: player.playerId
        })
        .update({
          data: {
            totalScore,
            lastActiveAt: db.serverDate()
          }
        });
    }

    return true;
  } catch (error) {
    console.error('重新计算分数失败:', error);
    return false;
  }
}

// ==================== 批量操作 ====================

/**
 * 批量更新玩家分数
 */
export async function batchUpdatePlayerScores(
  updates: Array<{ playerId: string; totalScore: number }>
): Promise<boolean> {
  try {
    const batch = updates.map(update => {
      playerId: update.playerId
    });

    const result = await playersCollection
      .where({
        playerId: db.command.in(batch)
      })
      .update({
        data: {
          totalScore: db.command.batch(updates.map(u => ({
            _id: u.playerId,
            totalScore: u.totalScore,
            lastActiveAt: db.serverDate()
          }))
        }
      });

    return result.stats.updated > 0;
  } catch (error) {
    console.error('批量更新分数失败:', error);
    return false;
  }
}
