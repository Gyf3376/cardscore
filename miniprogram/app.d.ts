// 小程序全局类型定义
interface IAppOption {
  globalData: {
    currentUser: UserProfile | null;
    gameState: GameState | null;
  };
  onLaunch(): void;
  saveUser(user: UserProfile): void;
  saveGameState(gameState: GameState): void;
  clearGameState(): void;
}

// 扩展 App 类型
interface App {
  globalData: {
    currentUser: UserProfile | null;
    gameState: GameState | null;
  };
  saveUser(user: UserProfile): void;
  saveGameState(gameState: GameState): void;
  clearGameState(): void;
}

// 扩充 Page 数据类型
declare interface PageData {
  [key: string]: any;
}
