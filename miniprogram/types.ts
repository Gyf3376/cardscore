/**
 * 玩家信息
 */
export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  totalScore: number;
  isHost?: boolean;
}

/**
 * 单局记录条目
 */
export interface RoundEntry {
  playerId: string;
  remainingCards: number;
  bombCount: number;
  isShutOut: boolean;
  scoreChange: number;
}

/**
 * 单局记录
 */
export interface Round {
  id: string;
  timestamp: number;
  entries: RoundEntry[];
  winnerId: string;
}

/**
 * 游戏状态
 */
export interface GameState {
  roomId: string | null;
  players: Player[];
  rounds: Round[];
  playerCount: 3 | 4;
  isActive: boolean;
  bombBaseFee: number;
  shutOutScore: number;
  cardUnitPrice: number;
}

/**
 * 用户信息
 */
export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
}

/**
 * 玩家单局数据
 */
export interface PlayerRoundData {
  cards: number;
  bombs: number;
  shutOut: boolean;
}

/**
 * 记分弹窗数据
 */
export interface RoundFormData {
  winnerId: string;
  playerData: Record<string, PlayerRoundData>;
}

/**
 * 房间设置
 */
export interface RoomSettings {
  bombFee: number;
  shutOut: number;
  cardPrice: number;
}

/**
 * 房间数据（兼容本地存储）
 */
export interface RoomData {
  players: Player[];
  playerCount: 3 | 4;
  settings: RoomSettings;
  host: {
    isHost: boolean;
  };
  createdAt: number;
}

/**
 * 玩家记录（云数据库）
 */
export interface PlayerRecord {
  _id?: string;
  playerId: string;
  roomId: string;
  userId: string;
  nickname: string;
  avatarUrl: string;
  totalScore: number;
  isHost: boolean;
  joinedAt: number;
  lastActiveAt: number;
}
