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

  // 生成更安全的房间号（6位数字，带冲突检测）
  const generateRoomId = () => {
    let roomId = ''
    for (let i = 0; i < 6; i++) {
      roomId += Math.floor(Math.random() * 10).toString()
    }
    return roomId
  }

  // 检查房间ID是否已存在，最多重试10次
  let roomId = generateRoomId()
  let roomExists = true
  let retryCount = 0
  const maxRetries = 10

  while (roomExists && retryCount < maxRetries) {
    const existingRoom = await db.collection('rooms').where({
      roomId
    }).limit(1).get()

    if (existingRoom.data.length === 0) {
      roomExists = false
    } else {
      roomId = generateRoomId()
      retryCount++
    }
  }

  if (roomExists) {
    return {
      errCode: -2,
      errMsg: '生成房间号失败，请重试',
      roomId: '',
      expiresAt: ''
    }
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
