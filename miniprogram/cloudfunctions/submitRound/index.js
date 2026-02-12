// 云函数入口文件 - 提交对局
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  console.log('[submitRound] 收到调用:', event)

  const { roomId, roundId, winnerId, entries } = event

  // 验证输入数据
  if (!roomId || !roundId || !winnerId || !entries || !Array.isArray(entries)) {
    return {
      errCode: -1,
      errMsg: '参数不完整',
      roundId: ''
    }
  }

  // 验证entries数组不为空
  if (entries.length === 0) {
    return {
      errCode: -2,
      errMsg: '对局记录不能为空',
      roundId: ''
    }
  }

  // 验证每个entry的格式
  for (const entry of entries) {
    if (!entry.playerId || typeof entry.scoreChange !== 'number') {
      return {
        errCode: -3,
        errMsg: '对局记录格式错误',
        roundId: ''
      }
    }

    // 验证分数变化是否为整数且在合理范围内（-9999到9999）
    if (!Number.isInteger(entry.scoreChange) || Math.abs(entry.scoreChange) > 9999) {
      return {
        errCode: -4,
        errMsg: '分数超出合理范围',
        roundId: ''
      }
    }
  }

  // 验证winnerId必须在entries中存在
  const winnerExists = entries.some(entry => entry.playerId === winnerId)
  if (!winnerExists) {
    return {
      errCode: -5,
      errMsg: '获胜者不在对局记录中',
      roundId: ''
    }
  }

  try {
    console.log('创建对局:', { roomId, roundId, winnerId })

    // 创建对局记录
    // 注意：数据库会自动生成 _id，前端使用 roundId 作为标识符
    await db.collection('rounds').add({
      data: {
        id: roundId,  // 使用 id 字段作为前端读取的标识
        roomId,
        timestamp: Date.now(),
        winnerId,
        entries
      }
    })

    console.log('对局创建成功')

    // 更新所有玩家总分
    const playerScores = new Map()
    for (const entry of entries) {
      const currentScore = playerScores.get(entry.playerId) || 0
      playerScores.set(entry.playerId, currentScore + entry.scoreChange)
    }

    console.log('分数变更:', playerScores)

    // 批量更新玩家分数
    const updatePromises = []
    for (const [playerId, scoreChange] of playerScores.entries()) {
      const promise = db.collection('players').where({
        playerId
      }).update({
        data: {
          totalScore: db.command.inc(scoreChange),
          lastActiveAt: Date.now()
        }
      })
      updatePromises.push(promise)
    }

    await Promise.all(updatePromises)

    console.log('玩家分数更新完成')

    return {
      errCode: 0,
      errMsg: '',
      roundId
    }
  } catch (error) {
    console.error('[submitRound] 执行失败:', error)
    return {
      errCode: -1,
      errMsg: error.message || '提交对局失败',
      roundId
    }
  }
}
