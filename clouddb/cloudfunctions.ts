/**
 * 微信云开发云函数
 *
 * 云函数列表：
 * 1. createRoom - 创建房间
 * 2. joinRoom - 加入房间
 * 3. submitRound - 提交对局
 * 4. deleteRound - 删除对局
 * 5. getRoomData - 获取房间数据（玩家、对局）
 * 6. leaveRoom - 离开房间
 * 7. heartbeat - 心跳更新（保持玩家在线）
 * 8. cleanupExpired - 清理过期数据
 */

import {
  RoomRecord,
  PlayerRecord,
  RoundRecord,
  RoundEntry
} from './database';

// ==================== 创建房间云函数 ====================

/**
 * 创建房间云函数
 *
 * 参数：
 * - hostId: 房主ID
 * - hostNickname: 房主昵称
 * - hostAvatarUrl: 房主头像
 * - settings: 游戏设置
 * - playerCount: 玩家人数
 */
export const createRoom = async (event: {
  userId: string;
  hostNickname: string;
  hostAvatarUrl: string;
  settings: {
    bombFee: number;
    shutOutScore: number;
    cardPrice: number;
  };
  playerCount: 3 | 4;
}) => {
  const { userId, hostNickname, hostAvatarUrl, settings, playerCount } = event;

  const wxContext = wx.cloud.getWXContext();
  const db = wxContext.database();

  try {
    // 生成房间号（6位随机数字）
    const roomId = generateRoomId();

    // 计算过期时间（24小时后）
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    // 创建房间记录
    const roomData: Omit<RoomRecord, '_id'> = {
      roomId,
      hostId: userId,
      settings,
      playerCount,
      status: 'waiting',
      createdAt: now,
      expiresAt
    };

    const result = await db.collection('rooms').add({
      data: roomData
    });

    // 创建房主玩家记录
    await db.collection('players').add({
      data: {
        playerId: userId,
        userId,
        nickname: hostNickname,
        avatarUrl: hostAvatarUrl,
        roomId: roomId,
        totalScore: 0,
        isHost: true,
        joinedAt: db.serverDate(),
        lastActiveAt: db.serverDate()
      }
    });

    return {
      errCode: 0,
      errMsg: '',
      roomId,
      expiresAt: new Date(expiresAt).toISOString()
    };
  } catch (error) {
    console.error('创建房间失败:', error);
    return {
      errCode: -1,
      errMsg: error.message || '创建房间失败',
      roomId: ''
    };
  }
};

/**
 * 生成房间号
 */
function generateRoomId(): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ==================== 加入房间云函数 ====================

/**
 * 加入房间云函数
 *
 * 参数：
 * - roomId: 房间号
 * - userId: 用户ID
 * - nickname: 用户昵称
 * - avatarUrl: 用户头像
 */
export const joinRoom = async (event: {
  roomId: string;
  userId: string;
  nickname: string;
  avatarUrl: string;
}) => {
  const { roomId, userId, nickname, avatarUrl } = event;

  const wxContext = wx.cloud.getWXContext();
  const db = wxContext.database();

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms')
      .where({
        roomId
      })
      .limit(1)
      .get();

    if (roomResult.data.length === 0) {
      return {
        errCode: -1,
        errMsg: '房间不存在',
        exists: false
      };
    }

    const room = roomResult.data[0];

    // 检查房间是否过期
    const now = Date.now();
    if (now > room.expiresAt) {
      return {
        errCode: -2,
        errMsg: '房间已过期',
        exists: false
      };
    }

    // 检查房间是否已满
    const playersCount = await db.collection('players')
      .where({
        roomId
      })
      .count();

    if (playersCount.total >= room.playerCount) {
      return {
        errCode: -3,
        errMsg: '房间已满',
        exists: false
      };
    }

    // 检查用户是否已在房间中
    const existingPlayer = await db.collection('players')
      .where({
        roomId,
        userId
      })
      .limit(1)
      .get();

    if (existingPlayer.data.length > 0) {
      // 用户已存在，直接返回现有房间状态
      return {
        errCode: 0,
        errMsg: '',
        exists: true,
        isHost: existingPlayer.data[0].isHost,
        playerCount: room.playerCount
      };
    }

    // 创建新玩家记录
    await db.collection('players').add({
      data: {
        playerId: userId,
        userId,
        nickname,
        avatarUrl,
        roomId,
        totalScore: 0,
        isHost: false,
        joinedAt: db.serverDate(),
        lastActiveAt: db.serverDate()
      }
    });

    // 如果玩家已满，更新房间状态为 active
    if (playersCount.total + 1 >= room.playerCount) {
      await db.collection('rooms').doc(room._id).update({
        data: {
          status: 'active'
        }
      });
    }

    return {
      errCode: 0,
      errMsg: '',
      exists: true,
      isHost: false,
      playerCount: room.playerCount
    };
  } catch (error) {
    console.error('加入房间失败:', error);
    return {
      errCode: -1,
      errMsg: error.message || '加入房间失败',
      exists: false
    };
  }
};

// ==================== 获取房间数据云函数 ====================

/**
 * 获取房间完整数据（玩家和对局）
 *
 * 参数：
 * - roomId: 房间号
 */
export const getRoomData = async (event: { roomId: string }) => {
  const { roomId } = event;

  const wxContext = wx.cloud.getWXContext();
  const db = wxContext.database();

  try {
    // 并行获取房间信息、玩家列表、对局列表
    const [roomResult, playersResult, roundsResult] = await Promise.all([
      db.collection('rooms').where({ roomId }).limit(1).get(),
      db.collection('players').where({ roomId }).orderBy('joinedAt', 'asc').get(),
      db.collection('rounds').where({ roomId }).orderBy('timestamp', 'desc').get()
    ]);

    if (roomResult.data.length === 0) {
      return {
        errCode: -1,
        errMsg: '房间不存在',
        room: null,
        players: [],
        rounds: []
      };
    }

    const room = roomResult.data[0];

    // 计算当前在线玩家数量（最近5分钟内有活动）
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5分钟
    const activePlayers = playersResult.data.filter(
      p => (now - p.lastActiveAt) < activeThreshold
    );

    return {
      errCode: 0,
      errMsg: '',
      room,
      players: playersResult.data,
      rounds: roundsResult.data,
      activePlayerCount: activePlayers.length
    };
  } catch (error) {
    console.error('获取房间数据失败:', error);
    return {
      errCode: -1,
      errMsg: error.message || '获取房间数据失败',
      room: null,
      players: [],
      rounds: []
    };
  }
};

// ==================== 提交对局云函数 ====================

/**
 * 提交对局云函数
 *
 * 参数：
 * - roomId: 房间号
 * - roundId: 对局ID
 * - winnerId: 获胜者ID
 * - entries: 玩家对局数据
 */
export const submitRound = async (event: {
  roomId: string;
  roundId: string;
  winnerId: string;
  entries: RoundEntry[];
}) => {
  const { roomId, roundId, winnerId, entries } = event;

  const wxContext = wx.cloud.getWXContext();
  const db = wxContext.database();

  try {
    // 创建对局记录
    await db.collection('rounds').add({
      data: {
        roundId,
        roomId,
        timestamp: db.serverDate(),
        winnerId,
        entries
      }
    });

    // 更新所有玩家总分
    for (const entry of entries) {
      await db.collection('players').where({ playerId: entry.playerId }).update({
        data: {
          totalScore: db.command.inc(entry.scoreChange),
          lastActiveAt: db.serverDate()
        }
      });
    }

    return {
      errCode: 0,
      errMsg: '',
      roundId
    };
  } catch (error) {
    console.error('提交对局失败:', error);
    return {
      errCode: -1,
      errMsg: error.message || '提交对局失败',
      roundId
    };
  }
};

// ==================== 删除对局云函数 ====================

/**
 * 删除对局并重新计算分数
 *
 * 参数：
 * - roomId: 房间号
 * - roundId: 对局ID
 */
export const deleteRound = async (event: { roomId: string; roundId: string }) => {
  const { roomId, roundId } = event;

  const wxContext = wx.cloud.getWXContext();
  const db = wxContext.database();

  try {
    // 获取所有相关数据
    const [roundsResult, playersResult] = await Promise.all([
      db.collection('rounds').where({ roomId }).orderBy('timestamp', 'desc').get(),
      db.collection('players').where({ roomId }).get()
    ]);

    // 查找要删除的对局
    const round = roundsResult.data.find(r => r.roundId === roundId);
    if (!round) {
      return {
        errCode: -1,
        errMsg: '对局不存在'
      };
    }

    // 删除对局
    await db.collection('rounds').doc(round._id).remove();

    // 重新计算所有玩家总分
    const playerScores = new Map<string, number>();
    for (const player of playersResult.data) {
      playerScores.set(player.playerId, player.totalScore);
    }

    for (const r of roundsResult.data) {
      for (const entry of r.entries) {
        if (playerScores.has(entry.playerId)) {
          playerScores.set(
            entry.playerId,
            playerScores.get(entry.playerId) + entry.scoreChange
          );
        }
      }
    }

    // 批量更新玩家分数
    for (const [playerId, totalScore] of playerScores.entries()) {
      await db.collection('players').where({ playerId }).update({
        data: {
          totalScore,
          lastActiveAt: db.serverDate()
        }
      });
    }

    return {
      errCode: 0,
      errMsg: ''
    };
  } catch (error) {
    console.error('删除对局失败:', error);
    return {
      errCode: -1,
      errMsg: error.message || '删除对局失败'
    };
  }
};

// ==================== 心跳云函数 ====================

/**
 * 更新玩家最后活跃时间
 * 保持玩家在线状态，定期调用
 *
 * 参数：
 * - roomId: 房间号
 * - playerId: 玩家ID
 */
export const heartbeat = async (event: { roomId: string; playerId: string }) => {
  const { roomId, playerId } = event;

  const wxContext = wx.cloud.getWXContext();
  const db = wxContext.database();

  try {
    await db.collection('players').where({
      roomId,
      playerId
    }).update({
      data: {
        lastActiveAt: db.serverDate()
      }
    });

    return {
      errCode: 0,
      errMsg: ''
    };
  } catch (error) {
    console.error('心跳更新失败:', error);
    return {
      errCode: -1,
      errMsg: error.message || '心跳更新失败'
    };
  }
};

// ==================== 离开房间云函数 ====================

/**
 * 玩家离开房间
 *
 * 参数：
 * - roomId: 房间号
 * - playerId: 玩家ID
 */
export const leaveRoom = async (event: { roomId: string; playerId: string }) => {
  const { roomId, playerId } = event;

  const wxContext = wx.cloud.getWXContext();
  const db = wxContext.database();

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms').where({ roomId }).limit(1).get();

    if (roomResult.data.length === 0) {
      return {
        errCode: -1,
        errMsg: '房间不存在'
      };
    }

    const room = roomResult.data[0];
    const isHost = room.hostId === playerId;

    if (isHost) {
      // 房主离开，删除房间
      await db.collection('rooms').doc(room._id).remove();

      // 删除房间内所有玩家
      await db.collection('players').where({ roomId }).remove();

      // 删除房间内所有对局
      await db.collection('rounds').where({ roomId }).remove();
    } else {
      // 普通玩家离开，删除玩家记录
      await db.collection('players').where({
        roomId,
        playerId
      }).remove();

      // 检查房间是否还有其他玩家
      const playersCount = await db.collection('players').where({ roomId }).count();

      // 如果没有玩家了，更新房间状态
      if (playersCount.total === 0) {
        await db.collection('rooms').doc(room._id).update({
          data: {
            status: 'waiting'
          }
        });
      }
    }

    return {
      errCode: 0,
      errMsg: ''
    };
  } catch (error) {
    console.error('离开房间失败:', error);
    return {
      errCode: -1,
      errMsg: error.message || '离开房间失败'
    };
  }
};

// ==================== 清理过期数据云函数 ====================

/**
 * 定时清理过期房间和对局
 *
 * 参数：无（定时触发）
 */
export const cleanupExpired = async () => {
  const wxContext = wx.cloud.getWXContext();
  const db = wxContext.database();
  const now = Date.now();

  try {
    // 清理超过7天的对局记录
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const roundsDeleteResult = await db.collection('rounds')
      .where({
        timestamp: db.command.lt(sevenDaysAgo)
      })
      .remove();

    // 清理超过30天的房间记录
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const roomsDeleteResult = await db.collection('rooms')
      .where({
        expiresAt: db.command.lt(thirtyDaysAgo)
      })
      .remove();

    return {
      errCode: 0,
      errMsg: '',
      deletedRounds: roundsDeleteResult.stats.removed,
      deletedRooms: roomsDeleteResult.stats.removed
    };
  } catch (error) {
    console.error('清理过期数据失败:', error);
    return {
      errCode: -1,
      errMsg: error.message || '清理过期数据失败'
    };
  }
};
