# CardScore 云开发部署指南

## 目录

1. [文件结构说明](#文件结构说明)
2. [云开发环境创建](#云开发环境创建)
3. [云函数部署](#云函数部署)
4. [数据库配置](#数据库配置)
5. [本地集成](#本地集成)
6. [测试说明](#测试说明)

## 文件结构说明

```
miniprogram/
├── cloudfunctions/          # 云函数目录
│   ├── createRoom/       # 创建房间
│   ├── joinRoom/         # 加入房间
│   ├── getRoomData/       # 获取房间数据
│   ├── submitRound/       # 提交对局
│   ├── deleteRound/       # 删除对局
│   ├── heartbeat/         # 心跳更新
│   ├── leaveRoom/         # 离开房间
│   └── cleanupExpired/    # 清理过期数据
├── database.ts            # 数据库类型定义和操作
├── cloudfunctions.ts       # 云函数接口定义
├── package.json          # 云函数包配置
├── README.md             # API文档
└── DEPLOYMENT.md         # 本文档
```

## 云开发环境创建

### 步骤

1. **打开微信开发者工具**

2. **创建新的云开发环境**

   a. 点击工具栏右侧"云开发"按钮
   b. 选择"云开发"（注意：不是"云函数"）
   c. 点击"新建"创建环境
   d. 环境名称：`cloud1`（生产环境）
   e. 创建开发环境（可选，用于测试）：`cardscore-dev`

### 重要配置

- **环境 ID**：创建后会显示在环境列表中
- **基础库版本**：建议设置为 3.5.0 或以上
- **关联小程序**：在项目设置中关联小程序

## 云函数部署

### 方法一：微信开发者工具（推荐）

1. **上传云函数代码**

   a. 在云开发控制台，选择云函数
   b. 右侧点击"上传并部署"
   c. 选择文件：选择 `miniprogram/cloudfunctions` 整个目录
   d. 配置参数：
      - 内存：128MB
      - 超时时间：10s
      - 并发数：10

2. **等待部署完成**

   部署成功后，所有云函数状态变为"已部署"

### 方法二：命令行部署（可选）

```bash
# 安装微信云函数 CLI
npm install -g @cloudbase/cli

# 登录微信云开发
wx-cloud login

# 部署所有云函数
wx-cloud functions:deploy miniprogram/cloudfunctions

# 部署数据库配置（如需单独部署）
wx-cloud database:deploy clouddb
```

## 数据库配置

### 步骤

1. **在云开发控制台创建数据库**

   a. 云开发控制台 -> 数据库
   b. 点击"新建"创建数据库
   c. 数据库名称：`cardscore-db`
   d. 创建 3 个集合：

#### 2.1. rooms 集合

| 字段名 | 类型 | 说明 |
|---------|------|------|
| roomId | String | 房间号（唯一） |
| hostId | String | 房主用户 ID |
| settings | Object | 游戏设置 |
| playerCount | Number | 玩家人数 |
| status | String | 房间状态 |
| createdAt | Date | 创建时间 |
| expiresAt | Date | 过期时间 |

**索引设置：**
- 单字段索引：`roomId`（唯一索引）
- 复合索引：无（简单查询为主）

#### 2.2. players 集合

| 字段名 | 类型 | 说明 |
|---------|------|------|
| playerId | String | 玩家唯一 ID |
| roomId | String | 所属房间 ID |
| userId | String | 微信用户 OpenID |
| nickname | String | 玩家昵称 |
| avatarUrl | String | 玩家头像 URL |
| totalScore | Number | 总分 |
| isHost | Boolean | 是否为房主 |
| joinedAt | Date | 加入时间 |
| lastActiveAt | Date | 最后活跃时间 |

**索引设置：**
- 复合索引：`roomId_playerId`
- 单字段索引：`userId`
- 单字段索引：`lastActiveAt`（降序）

#### 2.3. rounds 集合

| 字段名 | 类型 | 说明 |
|---------|------|------|
| roundId | String | 对局唯一 ID |
| roomId | String | 所属房间 ID |
| timestamp | Date | 对局时间戳 |
| winnerId | String | 获胜者玩家 ID |
| entries | Array | 对局条目数组 |

**索引设置：**
- 复合索引：`roomId`
- 单字段索引：`timestamp`（降序）
- 单字段索引：`roundId`

### 权限设置

在数据库设置中配置权限：

```json
{
  "read": true,
  "write": true
}
```

## 本地集成

### 1. 初始化云开发

在 `app.ts` 中添加：

```typescript
import '../clouddb/database'

App({
  onLaunch() {
    this.initCloud();
  },

  initCloud() {
    try {
      // 初始化云开发
      if (!wx.cloud) {
        wx.cloud.init({
          traceUser: true,    // 开启用户追踪
          env: 'cloud1'  // 生产环境，开发留空
        });
      }
      console.log('云开发初始化成功');
    } catch (error) {
      console.error('云开发初始化失败:', error);
    }
  }
});
```

### 2. 替换本地存储为云函数调用

#### 创建房间

```typescript
// 修改 room.ts 中的 createRoom 方法
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

    wx.hideLoading();

    if (result.result.errCode === 0) {
      this.setData({
        roomId: result.result.roomId,
        view: 'waiting'
      });

      // 保存到本地状态（用于缓存）
      wx.setStorageSync('currentRoomId', result.result.roomId);
    } else {
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

#### 加入房间

```typescript
// 修改 room.ts 中的 joinRoom 方法
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

    if (result.result.errCode === 0 && result.result.exists) {
      this.setData({
        joinedPlayers: result.result.players,
        view: 'waiting'
      });

      // 保存到本地状态
      wx.setStorageSync('currentRoomId', this.data.roomId);
    } else {
      wx.showToast({
        title: result.result.errMsg || '房间不存在',
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

#### 提交对局

```typescript
// 在 round-modal.ts 中调用提交对局
async handleSubmit() {
  wx.showLoading({ title: '提交中...', mask: true });

  try {
    const app = getApp();
    const result = await wx.cloud.callFunction({
      name: 'submitRound',
      data: {
        roomId: app.globalData.roomId,
        roundId: generateRoundId(),
        winnerId: this.data.innerId,
        entries: calculatedEntries
      }
    });

    wx.hideLoading();

    if (result.result.errCode === 0) {
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });

      // 通知游戏页面刷新数据
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

#### 定时心跳

```typescript
// 在 game.ts 中添加定时心跳
Page({
  data: {
    heartbeatTimer: null as number | null
  },

  onLoad() {
    // 每30秒发送一次心跳
    this.data.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  },

  onUnload() {
    if (this.data.heartbeatTimer) {
      clearInterval(this.data.heartbeatTimer);
    }
  },

  async sendHeartbeat() {
    try {
      await wx.cloud.callFunction({
        name: 'heartbeat',
        data: {
          roomId: this.data.roomId,
          playerId: this.data.currentUser.id
        }
      });
    } catch (error) {
      console.error('心跳发送失败:', error);
    }
  }
});
```

## 测试说明

### 本地测试（开发环境）

1. 在 project.config.json 中切换到开发环境

2. 在微信开发者工具中 -> 云开发 -> 设置 -> 切换到开发环境

3. 测试各个云函数：

#### 测试创建房间

```bash
# 微信开发者工具 -> 云开发 -> 云函数
# 选择 createRoom -> 点击"测试" -> 传参
{
  "userId": "test_user_001",
  "hostNickname": "测试玩家",
  "hostAvatarUrl": "https://example.com/avatar.jpg",
  "settings": {
    "bombFee": 8,
    "shutOutScore": 20,
    "cardPrice": 1
  },
  "playerCount": 3
}
```

#### 测试加入房间

```bash
# 使用创建房间返回的 roomId
{
  "roomId": "123456",
  "userId": "test_user_002",
  "nickname": "测试玩家2",
  "avatarUrl": "https://example.com/avatar2.jpg"
}
```

#### 测试获取房间数据

```bash
{
  "roomId": "123456"
}
```

### 性能优化建议

1. **本地缓存**：将房间数据缓存到本地存储，减少云函数调用
2. **心跳优化**：根据玩家活跃度调整心跳频率
3. **分页加载**：对局列表支持分页加载
4. **防抖处理**：避免短时间内重复操作

### 常见问题排查

#### Q1: 云函数调用失败

```
错误信息：云函数未找到
```

**A：** 检查云函数是否已部署成功
**B：** 检查云开发环境是否正确

#### Q2: 数据库操作失败

```
错误信息：权限不足
```

**A：** 检查数据库权限设置（读/写）
**B：** 检查是否正确初始化了云开发

#### Q3: 房间号冲突

```
现象：两个房间使用了相同的房间号
```

**A：** 数据库设置了 roomId 唯一索引
**B：** 检查创建房间时的随机数生成逻辑

#### Q4: 玩家分数不正确

```
现象：删除对局后分数没有更新
```

**A：** 检查 deleteRound 云函数的重新计算逻辑
**B：** 检查客户端是否正确处理了返回数据

## 监控与日志

### 云函数日志

每个云函数都包含了详细的 console.log，可以在云开发控制台查看：

```javascript
console.log('[createRoom] 收到调用:', event)
console.log('[joinRoom] 收到调用:', event)
console.log('[submitRound] 收到调用:', event)
```

### 本地调试

在小程序中使用 `wx.cloud.getWXContext().DATABASE()` 查看数据：

```typescript
const db = wx.cloud.getWXContext().DATABASE()
const result = await db.collection('rooms').get()
console.log('数据库查询结果:', result)
```

## 成本控制

### 免费额度

云开发免费额度：
- 数据库读操作：100,000 次/天
- 数据库写操作：100,000 次/天
- 云函数调用：100,000 次/天

建议优化：
1. 合并多个查询为一次批量操作
2. 使用本地缓存减少云函数调用
3. 对局列表分页加载
4. 延迟非关键操作

### 监控建议

建议使用云开发监控功能：
1. 设置告警规则（如调用失败率超过阈值）
2. 定期查看云函数日志
3. 监控数据库操作次数

## 后续优化方向

1. **实时同步**：使用云开发实时数据库实现玩家实时状态同步
2. **离线模式**：使用本地存储支持离线游戏
3. **聊天功能**：添加房间内聊天
4. **统计功能**：记录游戏统计、玩家历史等
5. **推送通知**：轮到开始时推送通知
6. **AI 辅助**：根据历史数据智能推荐策略

## 联系与支持

- 微信云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/
- 云数据库文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/database
- 云函数文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/guide/functions
- 微信社区：https://developers.weixin.qq.com/community/
