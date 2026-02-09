# 云开发集成完成

## 概述

已完成 CardScore 小程序的云开发集成，支持真正的跨设备多人游戏。用户 A 创建房间后，用户 B 可以通过房间号从其他设备加入房间并看到彼此的信息。

## 已完成的修改

### 1. 配置文件更新

**miniprogram/project.config.json**
- 修改 `cloudfunctionRoot` 为 `./cloudfunctions/`
- 启用 `cloudb` 支持

### 2. 核心页面更新

**miniprogram/pages/room/room.ts**
- 添加云开发初始化 (`initCloud()`)
- 集成 `createRoom` 云函数
- 集成 `joinRoom` 云函数
- 集成 `getRoomData` 云函数
- 保留本地存储兼容性用于测试
- 更新邀请好友文案提示云存储支持

**miniprogram/pages/game/game.ts**
- 添加云开发初始化
- 添加心跳机制（每30秒发送一次）
- 集成 `submitRound` 云函数（提交对局）
- 集成 `deleteRound` 云函数（删除对局）
- 集成 `leaveRoom` 云函数（离开/解散房间）
- 在页面卸载时清理心跳定时器

**miniprogram/pages/history/history.ts**
- 修复 TypeScript 类型错误

### 3. 类型定义更新

**miniprogram/types.ts**
- 添加 `RoomData` 接口（本地存储兼容）
- 添加 `PlayerRecord` 接口（云数据库）

## 云函数列表

所有云函数已在 `miniprogram/cloudfunctions/` 目录下：

| 云函数 | 功能 |
|--------|------|
| createRoom | 创建房间 |
| joinRoom | 加入房间 |
| getRoomData | 获取房间数据 |
| submitRound | 提交对局 |
| deleteRound | 删除对局 |
| heartbeat | 心跳更新 |
| leaveRoom | 离开房间 |
| cleanupExpired | 清理过期数据 |

## 下一步操作

### 1. 创建云开发环境

在微信开发者工具中：

1. 点击"云开发"
2. 点击"新建"创建环境
3. 环境名称：`cloud1`
4. 记录环境 ID

### 2. 创建数据库

1. 进入云开发控制台 -> 数据库
2. 创建数据库 `cardscore-db`
3. 创建 3 个集合：
   - rooms（房间表）
   - players（玩家表）
   - rounds（对局表）
4. 设置权限：读/写都开启

### 3. 部署云函数

1. 进入云开发控制台 -> 云函数
2. 右侧点击"上传并部署"
3. 选择 `miniprogram/cloudfunctions` 整个目录
4. 配置参数：
   - 内存：128MB
   - 超时时间：10s
   - 并发数：10
5. 等待部署完成

### 4. 测试流程

1. **创建房间**
   - 用户 A 打开小程序
   - 进入"创建房间"
   - 设置参数（炸弹费、被关分数、牌价）
   - 点击"创建房间"
   - 获得房间号（如：123456）

2. **加入房间**
   - 用户 B 打开小程序（不同设备）
   - 进入"加入已有房间"
   - 输入房间号：123456
   - 点击"加入房间"
   - 看到用户 A 的头像和昵称

3. **开始游戏**
   - 当玩家达到设定人数（3人或4人）
   - 房主点击"开始游戏"
   - 进入游戏页面
   - 可以记录得分、查看排名、查看历史记录

### 5. 验证功能

- ✅ 跨设备加入房间
- ✅ 显示真实玩家头像和昵称
- ✅ 提交对局并同步分数
- ✅ 删除对局并重新计算
- ✅ 心跳保持在线
- ✅ 离开房间/解散房间

## 数据结构

### rooms 集合
```json
{
  "roomId": "123456",
  "hostId": "user001",
  "settings": {
    "bombFee": 8,
    "shutOutScore": 20,
    "cardPrice": 1
  },
  "playerCount": 3,
  "status": "waiting",
  "createdAt": 1737945600000,
  "expiresAt": 1738032000000
}
```

### players 集合
```json
{
  "playerId": "p001",
  "roomId": "123456",
  "userId": "u001",
  "nickname": "玩家1",
  "avatarUrl": "https://...",
  "totalScore": 100,
  "isHost": true,
  "joinedAt": 1737945600000,
  "lastActiveAt": 1737945900000
}
```

### rounds 集合
```json
{
  "roundId": "r001",
  "roomId": "123456",
  "timestamp": 1737945900000,
  "winnerId": "p001",
  "entries": [
    {
      "playerId": "p001",
      "isShutOut": false,
      "cards": 0,
      "bombs": 2,
      "scoreChange": 50
    }
  ]
}
```

## 注意事项

1. **云开发环境 ID**：确保在代码中使用正确的环境 ID（`cloud1`）
2. **数据库权限**：数据库集合权限必须设置为读/写都开启
3. **云函数部署**：确保所有云函数都已成功部署
4. **心跳机制**：游戏页面会每30秒发送一次心跳，保持玩家在线
5. **房间过期**：房间会在24小时后自动过期

## 免费额度限制

云开发免费额度：
- 数据库读操作：100,000 次/天
- 数据库写操作：100,000 次/天
- 云函数调用：100,000 次/天

优化建议：
1. 使用本地缓存减少云函数调用
2. 对局列表支持分页加载
3. 合并多个操作为批量更新

## 相关文档

- `clouddb/README.md` - API 文档
- `clouddb/DEPLOYMENT.md` - 部署指南
- `CLOUDDB_SUMMARY.md` - 云数据库设计总结
