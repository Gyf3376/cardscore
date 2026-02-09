// 云函数入口文件 - 删除对局
const cloud = require('wx-server-sdk')

exports.main = async (event, context) => {
  const { env } = context
  console.log('[deleteRound] 收到调用:', event)

  const db = cloud.database({
    env
  })

  try {
    const { roomId, roundId } = event

    console.log('删除对局:', { roomId, roundId })

    // 获取所有相关数据
    const [roundsResult, playersResult] = await Promise.all([
      db.collection('rounds').where({ roomId }).orderBy('timestamp', 'desc').get(),
      db.collection('players').where({ roomId }).get()
    ])

    // 查找要删除的对局
    const round = roundsResult.data.find(r => r.roundId === roundId)
    if (!round) {
      console.log('对局不存在')
      return cloud.init().database().command.aggregate({
        errCode: -1,
        errMsg: '对局不存在'
      })
    }

    console.log('找到对局:', round)
    console.log('当前对局数:', roundsResult.data.length)

    // 删除对局
    await db.collection('rounds').doc(round._id).remove()

    console.log('对局已删除')

    // 重新计算所有玩家总分
    const playerScores = new Map()
    for (const player of playersResult.data) {
      playerScores.set(player.playerId, player.totalScore)
    }

    console.log('初始分数:', playerScores)

    for (const r of roundsResult.data) {
      for (const entry of r.entries) {
        if (playerScores.has(entry.playerId)) {
          const newScore = playerScores.get(entry.playerId) + entry.scoreChange
          playerScores.set(entry.playerId, newScore)
        }
      }
    }

    console.log('重新计算后的分数:', playerScores)

    // 批量更新玩家分数
    for (const [playerId, totalScore] of playerScores.entries()) {
      await db.collection('players').where({ playerId }).update({
        data: {
          totalScore,
          lastActiveAt: Date.now()
        }
      })
    }

    console.log('玩家分数更新完成')

    return cloud.init().database().command.aggregate({
      errCode: 0,
      errMsg: ''
    })

  } catch (error) {
    console.error('[deleteRound] 执行失败:', error)
    return cloud.init().database().command.aggregate({
      errCode: -1,
      errMsg: error.message || '删除对局失败'
    })
  }
}
