// 云函数入口文件 - 获取房间数据
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 建议的数据库索引配置，以提高查询性能：
// - rooms 集合: roomId (唯一索引)
// - players 集合: roomId + joinedAt (复合索引)
// - rounds 集合: roomId + timestamp (复合索引)
// - rounds 集合: id (唯一索引)

exports.main = async (event, context) => {
  console.log('[getRoomData] 收到调用:', event)

  const { roomId } = event

  try {
    // 并行获取房间信息、玩家列表、对局列表
    // 注意：limit(1) 限制房间查询只返回一条记录，提高性能
    const [roomResult, playersResult, roundsResult] = await Promise.all([
      db.collection('rooms').where({ roomId }).limit(1).get(),
      db.collection('players').where({ roomId }).orderBy('joinedAt', 'asc').limit(10).get(),
      db.collection('rounds').where({ roomId }).orderBy('timestamp', 'desc').limit(100).get()
    ])

    if (roomResult.data.length === 0) {
      console.log('房间不存在')
      return {
        errCode: -1,
        errMsg: '房间不存在',
        room: null,
        players: [],
        rounds: []
      }
    }

    const room = roomResult.data[0]
    console.log('获取到房间:', room)

    // 转换玩家数据格式以匹配前端 Player 接口
    const players = playersResult.data.map(player => ({
      id: player.playerId,
      name: player.nickname,
      avatarUrl: player.avatarUrl,
      totalScore: player.totalScore,
      isHost: player.isHost
    }))

    // 计算当前在线玩家数量（最近5分钟内有活动）
    const now = Date.now()
    const activeThreshold = 5 * 60 * 1000 // 5分钟
    const activePlayers = players.filter(
      p => (now - p.lastActiveAt) < activeThreshold
    )

    console.log('在线玩家数:', activePlayers.length)

    return {
      errCode: 0,
      errMsg: '',
      room: {
        ...room,
        status: room.status
      },
      players: players,
      rounds: roundsResult.data,
      activePlayerCount: activePlayers.length
    }
  } catch (error) {
    console.error('[getRoomData] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '获取房间数据失败',
      room: null,
      players: [],
      rounds: []
    }
  }
}
