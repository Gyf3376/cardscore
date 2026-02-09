// 云函数入口文件 - 离开房间
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('[leaveRoom] 收到调用:', event)

  const { roomId, playerId } = event

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms').where({ roomId }).limit(1).get()

    if (roomResult.data.length === 0) {
      console.log('房间不存在')
      return {
        errCode: -1,
        errMsg: '房间不存在'
      }
    }

    const room = roomResult.data[0]
    console.log('找到房间:', room)

    // 判断是否为房主
    const isHost = room.hostId === playerId

    if (isHost) {
      // 房主离开，删除房间及所有相关数据
      console.log('房主离开，删除房间')

      // 删除房间内所有玩家
      await db.collection('players').where({ roomId }).remove()

      // 删除房间内所有对局
      await db.collection('rounds').where({ roomId }).remove()

      // 删除房间记录
      await db.collection('rooms').doc(room._id).remove()

      console.log('房间及所有数据已删除')
    } else {
      // 普通玩家离开，只删除玩家记录
      console.log('普通玩家离开')

      await db.collection('players').where({
        roomId,
        playerId
      }).remove()

      console.log('玩家记录已删除')

      // 检查房间是否还有其他玩家
      const playersCount = await db.collection('players').where({ roomId }).count()

      if (playersCount.total === 0) {
        // 没有玩家了，删除房间
        await db.collection('rounds').where({ roomId }).remove()
        await db.collection('rooms').doc(room._id).remove()
        console.log('房间已删除')
      }
    }

    return {
      errCode: 0,
      errMsg: '',
      isHost
    }
  } catch (error) {
    console.error('[leaveRoom] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '离开房间失败',
      isHost: false
    }
  }
}
