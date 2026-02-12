// 云函数入口文件 - 加入房间
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('[joinRoom] 收到调用:', event)

  const { roomId, userId, nickname, avatarUrl } = event

  // 验证输入参数
  if (!roomId || typeof roomId !== 'string' || roomId.length !== 6) {
    return {
      errCode: -4,
      errMsg: '房间号格式错误',
      exists: false
    }
  }

  if (!userId || typeof userId !== 'string') {
    return {
      errCode: -5,
      errMsg: '用户ID不能为空',
      exists: false
    }
  }

  if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
    return {
      errCode: -6,
      errMsg: '昵称不能为空',
      exists: false
    }
  }

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms')
      .where({
        roomId
      })
      .limit(1)
      .get()

    if (roomResult.data.length === 0) {
      return {
        errCode: -1,
        errMsg: '房间不存在',
        exists: false
      }
    }

    const room = roomResult.data[0]

    // 验证房间 playerCount 是否在合理范围内
    if (!room.playerCount || typeof room.playerCount !== 'number' || room.playerCount < 3 || room.playerCount > 4) {
      return {
        errCode: -7,
        errMsg: '房间配置错误',
        exists: false
      }
    }

    // 检查房间是否过期
    const now = Date.now()
    if (now > room.expiresAt) {
      console.log('房间已过期:', room.expiresAt, new Date(room.expiresAt))
      return {
        errCode: -2,
        errMsg: '房间已过期',
        exists: false
      }
    }

    // 获取当前房间内所有玩家
    const playersResult = await db.collection('players')
      .where({
        roomId
      })
      .orderBy('joinedAt', 'asc')
      .get()

    const currentPlayers = playersResult.data
    console.log('当前房间玩家:', currentPlayers)

    // 检查用户是否已在房间中
    const existingPlayer = currentPlayers.find(p => p.userId === userId)

    if (existingPlayer) {
      console.log('用户已在房间中')

      // 用户已存在，直接返回现有房间状态
      return {
        errCode: 0,
        errMsg: '',
        exists: true,
        isHost: existingPlayer.isHost,
        players: currentPlayers,
        settings: room.settings,
        playerCount: room.playerCount
      }
    }

    // 检查房间是否已满
    if (currentPlayers.length >= room.playerCount) {
      return {
        errCode: -3,
        errMsg: '房间已满',
        exists: false
      }
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

    // 获取更新后的玩家列表
    const updatedPlayersResult = await db.collection('players')
      .where({
        roomId
      })
      .orderBy('joinedAt', 'asc')
      .get()

    // 转换玩家数据格式以匹配前端 Player 接口
    const players = updatedPlayersResult.data.map(player => ({
      id: player.playerId,
      name: player.nickname,
      avatarUrl: player.avatarUrl,
      totalScore: player.totalScore,
      isHost: player.isHost
    }))

    // 注意：不自动更新房间状态为 active
    // 房间状态只有当某位玩家点击"开始游戏"按钮时才会被更新
    // 这是通过 startGame 云函数完成的

    return {
      errCode: 0,
      errMsg: '',
      exists: true,
      isHost: false,
      players: players,
      settings: room.settings,
      playerCount: room.playerCount
    }
  } catch (error) {
    console.error('[joinRoom] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '加入房间失败',
      exists: false
    }
  }
}
