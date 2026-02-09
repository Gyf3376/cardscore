// 云函数入口文件 - 删除对局
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('[deleteRound] 收到调用:', event)

  const { roomId, roundId } = event

  try {
    // 删除对局记录
    await db.collection('rounds').where({
      roomId,
      roundId
    }).remove()

    console.log('对局删除成功')

    // 重新计算所有玩家总分
    const roundsResult = await db.collection('rounds').where({
      roomId
    }).get()

    // 获取所有玩家
    const playersResult = await db.collection('players').where({
      roomId
    }).get()

    // 计算每个玩家的总分
    const playerScores = new Map()
    playersResult.data.forEach(player => {
      playerScores.set(player.playerId, 0)
    })

    // 遍历所有对局，累加分数
    for (const round of roundsResult.data) {
      for (const entry of round.entries) {
        const currentScore = playerScores.get(entry.playerId) || 0
        playerScores.set(entry.playerId, currentScore + entry.scoreChange)
      }
    }

    console.log('重新计算的分数:', playerScores)

    // 批量更新玩家分数
    const updatePromises = []
    for (const [playerId, totalScore] of playerScores.entries()) {
      const promise = db.collection('players').where({
        playerId
      }).update({
        data: {
          totalScore,
          lastActiveAt: Date.now()
        }
      })
      updatePromises.push(promise)
    }

    await Promise.all(updatePromises)

    console.log('玩家分数重新计算完成')

    return {
      errCode: 0,
      errMsg: '',
      roundId
    }
  } catch (error) {
    console.error('[deleteRound] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '删除对局失败',
      roundId
    }
  }
}
