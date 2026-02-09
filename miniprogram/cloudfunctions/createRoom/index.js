// 云函数入口文件 - 创建房间
const cloud = require('wx-server-sdk')
const db = cloud.database({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const _ = db.command

exports.main = async (event, context) => {
  const { env } = context
  console.log('[createRoom] 收到调用:', event)

  const { userId, hostNickname, hostAvatarUrl, settings, playerCount } = event

  // 生成房间号（6位随机数字）
  const chars = '0123456789'
  let roomId = ''
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // 计算过期时间（24小时后）
  const now = Date.now()
  const expiresAt = now + 24 * 60 * 60 * 1000
  console.log('生成房间号:', roomId, '过期时间:', new Date(expiresAt))

  try {
    // 创建房间记录
    const roomData = {
      roomId,
      hostId: userId,
      settings,
      playerCount,
      status: 'waiting',
      createdAt: now,
      expiresAt
    }
    const roomResult = await db.collection('rooms').add({
      data: roomData
    })

    // 创建房主玩家记录
    await db.collection('players').add({
      data: {
        playerId: userId,
        userId,
        nickname: hostNickname,
        avatarUrl: hostAvatarUrl,
        roomId,
        totalScore: 0,
        isHost: true,
        joinedAt: now,
        lastActiveAt: now
      }
    })

    return {
      errCode: 0,
      errMsg: '',
      roomId,
      expiresAt: new Date(expiresAt).toISOString()
    }
  } catch (error) {
    console.error('[createRoom] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '创建房间失败',
      roomId: '',
      expiresAt: ''
    }
  }
}
