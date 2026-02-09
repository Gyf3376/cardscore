// 云函数入口文件 - 清理过期数据
const cloud = require('wx-server-sdk')

exports.main = async (event, context) => {
  const { env } = context
  console.log('[cleanupExpired] 收到调用')

  const db = cloud.database({
    env
  })

  try {
    const now = Date.now()
    console.log('当前时间:', new Date(now))

    // 清理超过7天的对局记录
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    console.log('清理7天前的时间:', new Date(sevenDaysAgo))

    const roundsDeleteResult = await db.collection('rounds')
      .where({
        timestamp: db.command.lt(sevenDaysAgo)
      })
      .remove()

    console.log('删除过期对局:', roundsDeleteResult.stats.removed)

    // 清理超过30天的房间记录
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    console.log('清理30天前的时间:', new Date(thirtyDaysAgo))

    const roomsDeleteResult = await db.collection('rooms')
      .where({
        expiresAt: db.command.lt(thirtyDaysAgo)
      })
      .remove()

    console.log('删除过期房间:', roomsDeleteResult.stats.removed)

    return cloud.init().database().command.aggregate({
      errCode: 0,
      errMsg: '',
      deletedRounds: roundsDeleteResult.stats.removed,
      deletedRooms: roomsDeleteResult.stats.removed
    })

  } catch (error) {
    console.error('[cleanupExpired] 执行失败:', error)
    return cloud.init().database().command.aggregate({
      errCode: -1,
      errMsg: error.message || '清理过期数据失败'
    })
  }
}
