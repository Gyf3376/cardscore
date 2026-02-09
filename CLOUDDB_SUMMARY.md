# 微信云开发数据设计完成

## 📦 概述

已完成 CardScore 小程序的微信云开发数据库和云函数设计，解决了本地存储无法跨设备通信的问题。

## 📁 已创建的文件

### 1. 数据库设计文件
- `clouddb/database.ts` - 数据库表结构和操作函数
- `clouddb/cloudfunctions.ts` - 云函数接口定义
- `clouddb/README.md` - 完整 API 文档和使用示例

### 2. 云函数文件
每个云函数都有独立的目录和入口文件：

```
miniprogram/cloudfunctions/
├── createRoom/index.js      # 创建房间
├── joinRoom/index.js          # 加入房间
├── getRoomData/index.js       # 获取房间数据
├── submitRound/index.js       # 提交对局
├── deleteRound/index.js       # 删除对局
├── heartbeat/index.js         # 心跳更新
├── leaveRoom/index.js         # 离开房间
└── cleanupExpired/index.js    # 清理过期数据
```

### 3. 配置文件
- `clouddb/package.json` - 云函数包配置
- `clouddb/package.json` - 数据库配置
- `miniprogram/project.config.json` - 已更新支持云函数

### 4. 文档
- `clouddb/README.md` - API 文档
- `clouddb/DEPLOYMENT.md` - 完整部署指南

## 🗄️ 数据表设计

### rooms（房间表）
- 主键：_id（自动生成）
- 主要字段：
  - roomId: 房间号（6位随机数）
  - hostId: 房主用户ID
  - settings: 游戏设置（炸弹费、被关分数、牌价）
  - playerCount: 3 或 4
  - status: waiting/active/finished
  - expiresAt: 过期时间（24小时）

### players（玩家表）
- 主键：playerId
- 主要字段：
  - userId: 微信用户OpenID
  - nickname: 玩家昵称
  - avatarUrl: 玩家头像URL
  - totalScore: 总分
  - isHost: 是否为房主
  - joinedAt: 加入时间
  - lastActiveAt: 最后活跃时间
  - roomId: 所属房间ID

### rounds（对局表）
- 主键：_id（自动生成）
- 主要字段：
  - roundId: 对局唯一ID
  - roomId: 所属房间ID
  - timestamp: 对局时间戳
  - winnerId: 获胜者ID
  - entries: 对局条目数组
    - playerId: 玩家ID
    - isShutOut: 是否被关
    - cards: 剩牌数（输家）
    - bombs: 炸弹数
    - scoreChange: 得分变化

## ☁️ 云函数列表

| 函数名 | 功能 | 说明 |
|--------|------|------|
| createRoom | 创建房间 | 生成房间号，保存房间和房主数据 |
| joinRoom | 加入房间 | 验证房间，添加玩家，更新状态 |
| getRoomData | 获取房间数据 | 获取房间、所有玩家、所有对局 |
| submitRound | 提交对局 | 创建对局记录，更新玩家分数 |
| deleteRound | 删除对局 | 删除对局，重新计算所有玩家分数 |
| heartbeat | 心跳更新 | 更新玩家最后活跃时间 |
| leaveRoom | 离开房间 | 房主删除房间，普通玩家离开房间 |
| cleanupExpired | 清理过期数据 | 清理7天前的对局和30天前的房间 |

## 🚀 部署步骤

### 1. 创建云开发环境
1. 打开微信开发者工具
2. 点击"云开发"
3. 创建新环境（命名为 `cloud1`）
4. 记录环境 ID

### 2. 创建数据库
1. 在云开发控制台 -> 数据库
2. 点击"新建"创建数据库 `cardscore-db`
3. 创建 3 个集合：rooms、players、rounds
4. 设置索引（按文档要求）
5. 设置权限：读/写都开启

### 3. 部署云函数
1. 在云开发控制台 -> 云函数
2. 右侧点击"上传并部署"
3. 选择整个 `miniprogram/cloudfunctions` 目录
4. 配置参数：128MB内存，10s超时，10并发
5. 等待部署完成

### 4. 更新小程序配置
已在 `miniprogram/project.config.json` 中添加：
```json
{
  "cloudfunctionRoot": "./cloudfunctions/",
  "cloudb": true
}
```

### 5. 初始化云开发
在 `app.ts` 中添加初始化代码：
```typescript
if (!wx.cloud) {
  wx.cloud.init({
    traceUser: true,
    env: 'cloud1'
  });
}
```

## 📝 集成到小程序

### 创建房间示例
```typescript
// 替换 room.ts 中的本地存储逻辑
const result = await wx.cloud.callFunction({
  name: 'createRoom',
  data: {
    userId: this.data.currentUser.id,
    hostNickname: this.data.currentUser.name,
    hostAvatarUrl: this.data.currentUser.avatarUrl,
    settings: { bombFee, shutOutScore, cardPrice },
    playerCount: 3
  }
});
```

### 加入房间示例
```typescript
// 替换 room.ts 中的本地存储逻辑
const result = await wx.cloud.callFunction({
  name: 'joinRoom',
  data: {
    roomId: this.data.roomId,
    userId: this.data.currentUser.id,
    nickname: this.data.currentUser.name,
    avatarUrl: this.data.currentUser.avatarUrl
  }
});

if (result.result.errCode === 0 && result.result.exists) {
  this.setData({
    joinedPlayers: result.result.players,
    view: 'waiting'
  });
}
```

## 💡 关键特性

### 1. 跨设备支持
- 房间数据存储在云端，所有设备都能访问
- 真实玩家信息同步（头像、昵称）

### 2. 房间管理
- 房间状态追踪（等待/进行中/完成）
- 房间过期机制（24小时）
- 房主删除房间的权限控制

### 3. 数据一致性
- 对局记录与房间关联
- 玩家分数实时计算
- 删除对局后自动重新计算

### 4. 在线状态
- 心跳机制保持玩家在线
- 5分钟无活动视为离线

### 5. 数据清理
- 定时清理过期对局（7天）
- 定时清理过期房间（30天）

## ⚠️ 注意事项

### 云开发免费额度限制
- 数据库操作：100,000 次/天
- 云函数调用：100,000 次/天
- 超过后需要等待第二天恢复

### 优化建议
1. 使用本地缓存减少云函数调用
2. 对局列表支持分页加载
3. 合并多个操作为批量更新
4. 非关键操作可以延迟执行

### 测试建议
1. 先在开发环境测试所有云函数
2. 测试完后切换到生产环境
3. 使用微信开发者工具控制台查看日志

## 📖 文档位置

完整的使用文档和部署指南请查看：
- `clouddb/README.md` - API 文档和调用示例
- `clouddb/DEPLOYMENT.md` - 详细部署步骤和测试说明

## ✅ 完成清单

- ✅ 数据库表设计完成（rooms, players, rounds）
- ✅ 云函数实现完成（8个核心函数）
- ✅ 小程序配置文件已更新
- ✅ 部署文档已创建
- ✅ 本地集成示例代码已提供
- ✅ 数据库索引优化建议已说明
- ✅ 错误处理和日志记录已添加

## 🎯 后续工作建议

1. **实时同步**：使用云开发实时数据库
2. **聊天功能**：添加房间内即时通讯
3. **推送通知**：轮到开始时推送提醒
4. **排行榜**：基于历史数据生成排行榜
5. **数据统计**：记录玩家游戏数据、胜率等
6. **成就系统**：添加游戏成就和奖励
