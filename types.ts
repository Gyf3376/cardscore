
export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  totalScore: number;
  isHost?: boolean;
}

export interface RoundEntry {
  playerId: string;
  remainingCards: number;
  bombCount: number;
  isShutOut: boolean;
  scoreChange: number;
}

export interface Round {
  id: string;
  timestamp: number;
  entries: RoundEntry[];
  winnerId: string;
}

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

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string;
}
