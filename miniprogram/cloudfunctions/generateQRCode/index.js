// 云函数入口文件 - 生成房间二维码
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  console.log('[generateQRCode] 收到调用:', event)

  const { roomId } = event

  if (!roomId) {
    return {
      errCode: -1,
      errMsg: '房间号不能为空',
      buffer: null
    }
  }

  try {
    // 尝试生成二维码，如果API不可用则返回房间号用于客户端生成
    console.log('[generateQRCode] 尝试调用微信API...')

    let qrData = null
    let result = null
    try {
      result = await cloud.openapi.wxacode.createQRCode({
        path: `pages/room/room?roomId=${roomId}`,
        width: 430
      })
      qrData = result.buffer
    } catch (apiError) {
      console.log('[generateQRCode] 微信API调用失败:', apiError.errCode, apiError.errMsg)
      // API不可用，返回房间号让客户端处理
      if (apiError.errCode === -604101) {
        console.log('[generateQRCode] API权限不足，返回房间号让客户端生成')
        return {
          errCode: 0,
          errMsg: '',
          roomId: roomId,  // 返回房间号让客户端生成二维码
          useClientSide: true  // 标记使用客户端生成
        }
      }
      throw apiError
    }

    // API调用成功，处理返回的buffer
    console.log('[generateQRCode] 二维码生成成功，房间号:', roomId)

    // 检查buffer是否存在
    if (!qrData) {
      console.log('[generateQRCode] buffer is null/undefined')
      return {
        errCode: -3,
        errMsg: 'API返回数据为空，请检查API配置',
        debugInfo: {
          hasBuffer: !!result?.buffer,
          resultKeys: result ? Object.keys(result) : [],
          resultType: typeof result
        }
      }
    }

    // 将Buffer转换为base64字符串返回（JSON不能直接序列化ArrayBuffer）
    const base64 = qrData.toString('base64')
    console.log('[generateQRCode] base64 length:', base64.length)

    return {
      errCode: 0,
      errMsg: '',
      buffer: base64,
      contentType: result?.contentType || 'image/png'
    }
  } catch (error) {
    console.error('[generateQRCode] 执行失败:', error)
    return {
      errCode: -2,
      errMsg: error.message || '生成二维码失败',
      buffer: null
    }
  }
}
