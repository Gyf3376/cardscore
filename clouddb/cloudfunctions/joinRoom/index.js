// 云函数入口文件 - 加入房间
const cloud = require('wx-server-sdk')

exports.main = async (event, context) => {
  const { env } = context
  console.log('[joinRoom] 收到调用:', event)

  const db = cloud.database({
    env
  })

  try {
    const { roomId, userId, nickname, avatarUrl } = event

    // 获取房间信息
    const roomResult = await db.collection('rooms')
      .where({
        roomId
      })
      .limit(1)
      .get()

    if (roomResult.data.length === 0) {
      return cloud.init().database().command.aggregate({
        errCode: -1,
        errMsg: '房间不存在',
        exists: false
      })
    }

    const room = roomResult.data[0]
    console.log('获取到房间:', room)

    // 检查房间是否过期
    const now = Date.now()
    if (now > room.expiresAt) {
      console.log('房间已过期:', room.expiresAt, new Date(room.expiresAt))
      return cloud.init().database().command.aggregate({
        errCode: -2,
        errMsg: '房间已过期',
        exists: false
      })
    }

    // 检查房间是否已满
    const playersCount = await db.collection('players')
      .where({
        roomId
      })
      .count()

    console.log('当前玩家数:', playersCount.total, '最大人数:', room.playerCount)

    if (playersCount.total >= room.playerCount) {
      return cloud.init().database().command.aggregate({
        errCode: -3,
        errMsg: '房间已满',
        exists: false
      })
    }

    // 检查用户是否已在房间中
    const existingPlayer = await db.collection('players')
      .where({
        roomId,
        userId
      })
      .limit(1)
      .get()

    if (existingPlayer.data.length > 0) {
      console.log('用户已在房间中')
      // 用户已存在，直接返回现有房间状态
      return cloud.init().database().command.aggregate({
        errCode: 0,
        errMsg: '',
        exists: true,
        isHost: existingPlayer.data[0].isHost,
        playerCount: room.playerCount
      })
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
        joinedAt: now,
        lastActiveAt: now
      }
    })

    console.log('玩家加入成功')

    // 如果玩家已满，更新房间状态为 active
    if (playersCount.total + 1 >= room.playerCount) {
      await db.collection('rooms').doc(room._id).update({
        data: {
          status: 'active'
        }
      })
      console.log('房间状态更新为 active')
    }

    return cloud.init().database().command.aggregate({
      errCode: 0,
      errMsg: '',
      exists: true,
      isHost: false,
      playerCount: room.playerCount
    })

  } catch (error) {
    console.error('[joinRoom] 执行失败:', error)
    return cloud.init().database().command.aggregate({
      errCode: -1,
      errMsg: error.message || '加入房间失败',
      exists: false
    })
  }
}
