// 云函数入口文件 - 获取房间数据
const cloud = require('wx-server-sdk')

exports.main = async (event, context) => {
  const { env } = context
  console.log('[getRoomData] 收到调用:', event)

  const db = cloud.database({
    env
  })

  try {
    const { roomId } = event

    // 并行获取房间信息、玩家列表、对局列表
    const [roomResult, playersResult, roundsResult] = await Promise.all([
      db.collection('rooms').where({ roomId }).limit(1).get(),
      db.collection('players').where({ roomId }).orderBy('joinedAt', 'asc').get(),
      db.collection('rounds').where({ roomId }).orderBy('timestamp', 'desc').get()
    ])

    if (roomResult.data.length === 0) {
      console.log('房间不存在')
      return cloud.init().database().command.aggregate({
        errCode: -1,
        errMsg: '房间不存在',
        room: null,
        players: [],
        rounds: []
      })
    }

    const room = roomResult.data[0]
    console.log('获取到房间:', room)

    // 计算当前在线玩家数量（最近5分钟内有活动）
    const now = Date.now()
    const activeThreshold = 5 * 60 * 1000 // 5分钟
    const activePlayers = playersResult.data.filter(
      p => (now - p.lastActiveAt) < activeThreshold
    )

    console.log('在线玩家数:', activePlayers.length)

    return cloud.init().database().command.aggregate({
      errCode: 0,
      errMsg: '',
      room,
      players: playersResult.data,
      rounds: roundsResult.data,
      activePlayerCount: activePlayers.length
    })

  } catch (error) {
    console.error('[getRoomData] 执行失败:', error)
    return cloud.init().database().command.aggregate({
      errCode: -1,
      errMsg: error.message || '获取房间数据失败',
      room: null,
      players: [],
      rounds: []
    })
  }
}
