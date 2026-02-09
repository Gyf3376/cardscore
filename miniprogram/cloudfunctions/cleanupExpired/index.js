// 云函数入口文件 - 清理过期数据
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  console.log('[cleanupExpired] 收到调用:', event)

  const now = Date.now()

  try {
    // 删除过期对局（7天前）
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const expiredRounds = await db.collection('rounds')
      .where({
        timestamp: _.lt(sevenDaysAgo)
      })
      .get()

    if (expiredRounds.data.length > 0) {
      console.log(`找到 ${expiredRounds.data.length} 个过期对局`)
      await db.collection('rounds')
        .where({
          timestamp: _.lt(sevenDaysAgo)
        })
        .remove()
      console.log('过期对局已删除')
    }

    // 删除过期房间（30天前）
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
    const expiredRooms = await db.collection('rooms')
      .where({
        expiresAt: _.lt(thirtyDaysAgo)
      })
      .get()

    if (expiredRooms.data.length > 0) {
      console.log(`找到 ${expiredRooms.data.length} 个过期房间`)

      // 删除过期房间的玩家
      const expiredRoomIds = expiredRooms.data.map(r => r.roomId)
      for (const roomId of expiredRoomIds) {
        await db.collection('players').where({ roomId }).remove()
        await db.collection('rounds').where({ roomId }).remove()
      }

      // 删除过期房间
      await db.collection('rooms')
        .where({
          expiresAt: _.lt(thirtyDaysAgo)
        })
        .remove()
      console.log('过期房间及相关数据已删除')
    }

    return {
      errCode: 0,
      errMsg: '',
      deletedRounds: expiredRounds.data.length,
      deletedRooms: expiredRooms.data.length
    }
  } catch (error) {
    console.error('[cleanupExpired] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '清理过期数据失败',
      deletedRounds: 0,
      deletedRooms: 0
    }
  }
}
