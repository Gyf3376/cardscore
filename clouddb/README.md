# CardScore 微信云开发配置

## 概述

本项目使用微信云开发数据库和云函数来支持跨设备多人游戏。

## 数据库表结构

### 1. rooms（房间表）

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 云数据库自动生成 |
| roomId | string | 房间号（6位随机数字，唯一） |
| hostId | string | 房主用户ID |
| settings | object | 游戏设置 { bombFee, shutOutScore, cardPrice } |
| playerCount | number | 3 或 4 |
| status | string | waiting/active/finished |
| createdAt | number | 创建时间 |
| expiresAt | number | 过期时间（24小时后） |

### 2. players（玩家表）

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 云数据库自动生成 |
| playerId | string | 玩家唯一ID |
| roomId | string | 所属房间ID |
| userId | string | 微信用户OpenID |
| nickname | string | 玩家昵称 |
| avatarUrl | string | 玩家头像URL |
| totalScore | number | 总分 |
| isHost | boolean | 是否为房主 |
| joinedAt | number | 加入时间 |
| lastActiveAt | number | 最后活跃时间 |

### 3. rounds（对局表）

| 字段 | 类型 | 说明 |
|------|------|------|
| _id | string | 云数据库自动生成 |
| roundId | string | 对局唯一ID |
| roomId | string | 所属房间ID |
| timestamp | number | 对局时间戳 |
| winnerId | string | 获胜者玩家ID |
| entries | array | 对局玩家记录数组 |

**对局条目 entries 数组项：**
- playerId: string - 玩家ID
- isShutOut: boolean - 是否被关
- cards: number - 剩牌数（输家）
- bombs: number - 炸弹数
- scoreChange: number - 得分变化

## 云函数列表

### 1. createRoom（创建房间）
**调用方式：** `wx.cloud.callFunction({ name: 'createRoom', data: {... } })`

**参数：**
```javascript
{
  userId: 'xxx',           // 用户ID
  hostNickname: 'xxx',    // 房主昵称
  hostAvatarUrl: 'xxx',   // 房主头像
  settings: {
    bombFee: 8,
    shutOutScore: 20,
    cardPrice: 1
  },
  playerCount: 3
}
```

**返回：**
```javascript
{
  errCode: 0,            // 0成功，其他为失败
  errMsg: '',             // 错误信息
  roomId: '123456',     // 生成的房间号
  expiresAt: '2024...'    // 过期时间
}
```

### 2. joinRoom（加入房间）
**调用方式：** `wx.cloud.callFunction({ name: 'joinRoom', data: {... } })`

**参数：**
```javascript
{
  roomId: '123456',  // 房间号
  userId: 'xxx',      // 用户ID
  nickname: 'xxx',    // 用户昵称
  avatarUrl: 'xxx'    // 用户头像
}
```

**返回：**
```javascript
{
  errCode: 0,           // 0成功，-1房间不存在，-2已过期，-3已满
  errMsg: '',             // 错误信息
  exists: true,         // 房间是否存在
  isHost: false,         // 是否为房主
  playerCount: 3         // 房间总人数
}
```

### 3. getRoomData（获取房间数据）
**调用方式：** `wx.cloud.callFunction({ name: 'getRoomData', data: { roomId: '123456' } })`

**参数：**
```javascript
{
  roomId: '123456'
}
```

**返回：**
```javascript
{
  errCode: 0,
  errMsg: '',
  room: { ... },           // 房间信息
  players: [...],          // 所有玩家列表
  rounds: [...],           // 所有对局列表
  activePlayerCount: 3      // 当前在线玩家数（5分钟内活跃）
}
```

### 4. submitRound（提交对局）
**调用方式：** `wx.cloud.callFunction({ name: 'submitRound', data: {... } })`

**参数：**
```javascript
{
  roomId: '123456',  // 房间号
  roundId: 'round_xxx', // 对局ID
  winnerId: 'xxx',      // 获胜者ID
  entries: [              // 玩家对局数据
    {
      playerId: 'xxx',
      isShutOut: false,
      cards: 5,
      bombs: 0,
      scoreChange: -5
    },
    ...
  ]
}
```

**返回：**
```javascript
{
  errCode: 0,          // 0成功，其他为失败
  errMsg: '',           // 错误信息
  roundId: 'round_xxx'  // 对局ID
}
```

### 5. deleteRound（删除对局）
**调用方式：** `wx.cloud.callFunction({ name: 'deleteRound', data: { roomId: '123456', roundId: 'round_xxx' } })`

**参数：**
```javascript
{
  roomId: '123456',   // 房间号
  roundId: 'round_xxx' // 对局ID
}
```

**返回：**
```javascript
{
  errCode: 0,          // 0成功，其他为失败
  errMsg: ''           // 错误信息
}
```

**说明：** 删除对局后会自动重新计算所有玩家的总分。

### 6. heartbeat（心跳更新）
**用途：** 定期调用（如每30秒），保持玩家在线状态

**调用方式：** `wx.cloud.callFunction({ name: 'heartbeat', data: { roomId: '123456', playerId: 'xxx' } })`

**参数：**
```javascript
{
  roomId: '123456',   // 房间号
  playerId: 'xxx'        // 玩家ID
}
```

**返回：**
```javascript
{
  errCode: 0,          // 0成功，其他为失败
  errMsg: ''           // 错误信息
}
```

### 7. leaveRoom（离开房间）
**调用方式：** `wx.cloud.callFunction({ name: 'leaveRoom', data: { roomId: '123456', playerId: 'xxx' } })`

**参数：**
```javascript
{
  roomId: '123456',   // 房间号
  playerId: 'xxx'        // 玩家ID
}
```

**返回：**
```javascript
{
  errCode: 0,          // 0成功，其他为失败
  errMsg: ''           // 错误信息
}
```

**说明：**
- 房主离开：删除房间及所有相关数据
- 普通玩家离开：删除玩家记录，更新房间状态

### 8. cleanupExpired（清理过期数据）
**用途：** 定时任务（如每天凌晨），清理过期数据

**调用方式：** `wx.cloud.callFunction({ name: 'cleanupExpired' })`

**返回：**
```javascript
{
  errCode: 0,                // 0成功，其他为失败
  errMsg: '',                 // 错误信息
  deletedRounds: 15,          // 删除的对局数量
  deletedRooms: 3            // 删除的房间数量
}
```

## 集成到小程序

### 1. 初始化云开发

在 `app.ts` 中添加：

```typescript
// 初始化云开发
try {
  if (!wx.cloud) {
    wx.cloud.init({
      traceUser: true,
      env: 'cloud1' // 生产环境，开发环境留空
    });
  }
} catch (error) {
  console.error('云开发初始化失败:', error);
}
```

### 2. 示例：创建房间

```typescript
// 在 room.ts 中调用创建房间
async createRoom() {
  wx.showLoading({ title: '创建房间中...', mask: true });

  try {
    const result = await wx.cloud.callFunction({
      name: 'createRoom',
      data: {
        userId: this.data.currentUser.id,
        hostNickname: this.data.currentUser.name,
        hostAvatarUrl: this.data.currentUser.avatarUrl,
        settings: {
          bombFee: this.data.bombFee,
          shutOutScore: this.data.shutOut,
          cardPrice: this.data.cardPrice
        },
        playerCount: this.data.playerCount
      }
    });

    if (result.result.errCode === 0) {
      wx.hideLoading();
      this.setData({
        roomId: result.result.roomId,
        view: 'waiting'
      });
    } else {
      wx.hideLoading();
      wx.showToast({
        title: result.result.errMsg || '创建房间失败',
        icon: 'none'
      });
    }
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: '创建房间失败',
      icon: 'none'
    });
  }
}
```

### 3. 示例：加入房间

```typescript
// 在 room.ts 中调用加入房间
async joinRoom() {
  wx.showLoading({ title: '加入房间中...', mask: true });

  try {
    const result = await wx.cloud.callFunction({
      name: 'joinRoom',
      data: {
        roomId: this.data.roomId,
        userId: this.data.currentUser.id,
        nickname: this.data.currentUser.name,
        avatarUrl: this.data.currentUser.avatarUrl
      }
    });

    wx.hideLoading();

    if (result.result.errCode === 0) {
      if (result.result.exists) {
        this.setData({
          joinedPlayers: result.result.players,
          view: 'waiting'
        });
      } else {
        wx.showToast({
          title: result.result.errMsg || '房间不存在',
          icon: 'none'
        });
      }
    } else {
      wx.showToast({
        title: result.result.errMsg || '加入房间失败',
        icon: 'none'
      });
    }
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: '加入房间失败',
      icon: 'none'
    });
  }
}
```

### 4. 示例：提交对局

```typescript
// 在 round-modal.ts 中调用提交对局
async handleSubmit() {
  const app = getApp();
  wx.showLoading({ title: '提交中...', mask: true });

  try {
    const result = await wx.cloud.callFunction({
      name: 'submitRound',
      data: {
        roomId: app.globalData.roomId,
        roundId: generateRoundId(),
        winnerId: this.data.winnerId,
        entries: calculatedEntries
      }
    });

    wx.hideLoading();

    if (result.result.errCode === 0) {
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });
      this.triggerEvent('submit', roundData);
    } else {
      wx.showToast({
        title: result.result.errMsg || '提交失败',
        icon: 'none'
      });
    }
  } catch (error) {
    wx.hideLoading();
    wx.showToast({
      title: '提交失败',
      icon: 'none'
    });
  }
}
```

### 5. 定时心跳

```typescript
// 在 game.ts 中添加定时心跳
Page({
  data: {
    heartbeatTimer: null as number | null
  },

  onLoad() {
    this.startHeartbeat();
  },

  startHeartbeat() {
    // 每30秒发送一次心跳
    this.data.heartbeatTimer = setInterval(() => {
      wx.cloud.callFunction({
        name: 'heartbeat',
        data: {
          roomId: this.data.roomId,
          playerId: this.data.currentUser.id
        }
      });
    }, 30000);
  },

  onUnload() {
    if (this.data.heartbeatTimer) {
      clearInterval(this.data.heartbeatTimer);
    }
  }
});
```

## 数据库安全规则

### 权限设置

在云开发控制台中设置数据库权限：

```json
{
  "read": true,    // 允许读取
  "write": true   // 允许写入
}
```

### 索引设置

为提高查询性能，建议创建以下索引：

```javascript
// rooms 集合索引
{
  "roomId": 1,        // 单字段索引
  "createdAt": -1       // 降序索引
}

// players 集合索引
{
  "roomId_playerId": 1,   // 复合索引
  "userId": 1,          // 单字段索引
  "lastActiveAt": -1    // 降序索引
}

// rounds 集合索引
{
  "roomId": 1,         // 单字段索引
  "timestamp": -1       // 降序索引
  "roundId": 1          // 单字段索引
}
```

## 部署步骤

### 1. 创建云开发环境

1. 打开微信开发者工具
2. 点击"云开发"按钮
3. 创建新的云开发环境（命名为 cardscore）
4. 记录环境 ID（格式：cardscore-xxxxx）

### 2. 上传云函数

将 `clouddb/cloudfunctions.ts` 目录下的所有云函数上传到云开发环境：
- createRoom
- joinRoom
- getRoomData
- submitRound
- deleteRound
- heartbeat
- leaveRoom
- cleanupExpired

每个云函数需要单独创建文件（例如 `miniprogram/cloudfunctions/createRoom/index.js`）。

### 3. 配置数据库

1. 在云开发控制台 -> 数据库 -> 创建集合
2. 创建集合：rooms、players、rounds
3. 设置权限：读取、写入
4. 创建索引（见上方）

### 4. 小程序配置

更新 `project.config.json`：

```json
{
  "cloudfunctionRoot": "./cloudfunctions/",
  "cloudb": true
}
```

## 费用控制

### 云函数免费额度
- 免费额度：100,000 次/天
- 每次云函数调用消耗：1 次额度

### 数据库免费额度
- 免费额度：500,000 次/天
- 每次数据库操作消耗：1 次额度

### 优化建议
1. **本地缓存**：在小程序端缓存房间数据，减少云函数调用
2. **批量操作**：使用批量更新玩家分数，减少数据库操作
3. **心跳优化**：可根据活跃度调整心跳频率（如活跃用户30秒，非活跃用户5分钟）
4. **定时清理**：在夜间低谷时段执行清理任务
5. **分页加载**：对局列表支持分页加载

## 常见问题

### Q1: 云函数调用超时
**A：** 设置合理超时时间（如10秒），并添加重试机制

### Q2: 数据库并发限制
**A：** 注意数据库并发限制，避免同时发起过多操作

### Q3: 房间号重复
**A：** 数据库设置 roomId 为唯一索引，确保不会重复

## 安全注意事项

1. **用户身份验证**：所有操作都需要验证用户 ID
2. **房间归属检查**：只有房主能删除房间，普通玩家只能离开
3. **数据一致性**：删除对局时必须重新计算分数
4. **防止作弊**：关键数据（如分数）由服务端计算，前端只负责展示
5. **权限验证**：每个操作验证用户是否属于该房间
