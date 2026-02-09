// 云函数入口文件 - 离开房间
const cloud = require('wx-server-sdk')

exports.main = async (event, context) => {
  const { env } = context
  console.log('[leaveRoom] 收到调用:', event)

  const db = cloud.database({
    env
  })

  try {
    const { roomId, playerId } = event

    // 获取房间信息
    const roomResult = await db.collection('rooms').where({ roomId }).limit(1).get()

    if (roomResult.data.length === 0) {
      console.log('房间不存在')
      return cloud.init().database().command.aggregate({
        errCode: -1,
        errMsg: '房间不存在'
      })
    }

    const room = roomResult.data[0]
    const isHost = room.hostId === playerId

    console.log('找到房间:', room, '是否房主:', isHost)

    if (isHost) {
      // 房主离开，删除房间及所有相关数据
      console.log('房主离开，删除房间')
      await db.collection('rooms').doc(room._id).remove()

      // 删除房间内所有玩家
      await db.collection('players').where({ roomId }).remove()

      // 删除房间内所有对局
      await db.collection('rounds').where({ roomId }).remove()

      console.log('房间及所有数据已删除')
    } else {
      // 普通玩家离开，删除玩家记录
      console.log('普通玩家离开，删除玩家记录')
      await db.collection('players').where({
        roomId,
        playerId
      }).remove()

      // 检查房间是否还有其他玩家
      const playersCount = await db.collection('players').where({ roomId }).count()

      // 如果没有玩家了，更新房间状态
      if (playersCount.total === 0) {
        await db.collection('rooms').doc(room._id).update({
          data: {
            status: 'waiting'
          }
        })
        console.log('房间状态更新为 waiting')
      } else {
        console.log('房间还有其他玩家，状态保持')
      }
    }

    return cloud.init().database().command.aggregate({
      errCode: 0,
      errMsg: ''
    })

  } catch (error) {
    console.error('[leaveRoom] 执行失败:', error)
    return cloud.init().database().command.aggregate({
      errCode: -1,
      errMsg: error.message || '离开房间失败'
    })
  }
}
