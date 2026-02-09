// 云函数入口文件 - 心跳更新
const cloud = require('wx-server-sdk')

exports.main = async (event, context) => {
  const { env } = context
  console.log('[heartbeat] 收到调用:', event)

  const db = cloud.database({
    env
  })

  try {
    const { roomId, playerId } = event

    // 更新玩家最后活跃时间
    await db.collection('players').where({
      roomId,
      playerId
    }).update({
      data: {
        lastActiveAt: Date.now()
      }
    })

    console.log('心跳更新成功')

    return cloud.init().database().command.aggregate({
      errCode: 0,
      errMsg: ''
    })

  } catch (error) {
    console.error('[heartbeat] 执行失败:', error)
    return cloud.init().database().command.aggregate({
      errCode: -1,
      errMsg: error.message || '心跳更新失败'
    })
  }
}
