// 云函数入口文件 - 开始游戏
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('[startGame] 收到调用:', event)

  const { roomId } = event

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get()

    if (roomResult.data.length === 0) {
      return {
        errCode: -1,
        errMsg: '房间不存在'
      }
    }

    const room = roomResult.data[0]

    // 获取房间内所有玩家
    const playersResult = await db.collection('players')
      .where({ roomId })
      .orderBy('joinedAt', 'asc')
      .get()

    // 更新房间状态为 active（游戏进行中）
    await db.collection('rooms').doc(room._id).update({
      data: {
        status: 'active'
      }
    })

    console.log('房间状态更新为 active')

    // 转换玩家数据格式
    const players = playersResult.data.map(player => ({
      id: player.playerId,
      name: player.nickname,
      avatarUrl: player.avatarUrl,
      totalScore: player.totalScore,
      isHost: player.isHost
    }))

    return {
      errCode: 0,
      errMsg: '',
      roomId,
      players,
      playerCount: room.playerCount,
      settings: room.settings
    }
  } catch (error) {
    console.error('[startGame] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '开始游戏失败'
    }
  }
}
