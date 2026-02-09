// 云函数入口文件 - 提交对局
const cloud = require('wx-server-sdk')

exports.main = async (event, context) => {
  const { env } = context
  console.log('[submitRound] 收到调用:', event)

  const db = cloud.database({
    env
  })

  try {
    const { roomId, roundId, winnerId, entries } = event

    console.log('创建对局:', { roomId, roundId, winnerId })

    // 创建对局记录
    const roundResult = await db.collection('rounds').add({
      data: {
        roundId,
        roomId,
        timestamp: Date.now(),
        winnerId,
        entries
      }
    })

    console.log('对局创建成功')

    // 更新所有玩家总分
    for (const entry of entries) {
      await db.collection('players').where({ playerId: entry.playerId }).update({
        data: {
          totalScore: db.command.inc(entry.scoreChange),
          lastActiveAt: Date.now()
        }
      })
    }

    console.log('玩家分数更新完成')

    return cloud.init().database().command.aggregate({
      errCode: 0,
      errMsg: '',
      roundId
    })

  } catch (error) {
    console.error('[submitRound] 执行失败:', error)
    return cloud.init().database().command.aggregate({
      errCode: -1,
      errMsg: error.message || '提交对局失败',
      roundId
    })
  }
}
