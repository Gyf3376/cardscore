// 云函数入口文件 - 心跳更新
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('[heartbeat] 收到调用:', event)

  const { roomId, playerId } = event

  try {
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

    return {
      errCode: 0,
      errMsg: ''
    }
  } catch (error) {
    console.error('[heartbeat] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '心跳更新失败'
    }
  }
}
