
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Info, 
  RotateCcw,
  PlusCircle,
  History,
  ChevronRight,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { Player, Round, GameState, UserProfile } from './types';
import RoundModal from './components/RoundModal';
import HistoryView from './components/HistoryView';
import RoomScreen from './components/RoomScreen';
import RulesModal from './components/RulesModal';
import ScoreBoard from './components/ScoreBoard';
import AuthScreen from './components/AuthScreen';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('card_user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('card_score_game_v3');
    if (saved) return JSON.parse(saved);
    return {
      roomId: null,
      players: [],
      rounds: [],
      playerCount: 3,
      isActive: false,
      bombBaseFee: 8,
      shutOutScore: 20,
      cardUnitPrice: 1
    };
  });

  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('card_score_game_v3', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('card_user_profile', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleStartGame = (roomId: string, players: Player[], playerCount: 3 | 4, settings: { bombFee: number; shutOut: number; cardPrice: number }) => {
    setGameState({
      roomId,
      players,
      rounds: [],
      playerCount,
      isActive: true,
      bombBaseFee: settings.bombFee,
      shutOutScore: settings.shutOut,
      cardUnitPrice: settings.cardPrice
    });
  };

  const handleAddRound = (round: Round) => {
    const newRounds = [round, ...gameState.rounds];
    const newPlayers = gameState.players.map(player => {
      const entry = round.entries.find(e => e.playerId === player.id);
      return {
        ...player,
        totalScore: player.totalScore + (entry?.scoreChange || 0)
      };
    });

    setGameState(prev => ({
      ...prev,
      rounds: newRounds,
      players: newPlayers
    }));
    setIsRoundModalOpen(false);
  };

  const handleDeleteRound = (roundId: string) => {
    const roundToDelete = gameState.rounds.find(r => r.id === roundId);
    if (!roundToDelete) return;

    const newRounds = gameState.rounds.filter(r => r.id !== roundId);
    const newPlayers = gameState.players.map(player => {
      const entry = roundToDelete.entries.find(e => e.playerId === player.id);
      return {
        ...player,
        totalScore: player.totalScore - (entry?.scoreChange || 0)
      };
    });

    setGameState(prev => ({
      ...prev,
      rounds: newRounds,
      players: newPlayers
    }));
  };

  const resetGame = () => {
    if (window.confirm('确定要解散房间并清除所有记录吗？')) {
      setGameState({
        roomId: null,
        players: [],
        rounds: [],
        playerCount: 3,
        isActive: false,
        bombBaseFee: 8,
        shutOutScore: 20,
        cardUnitPrice: 1
      });
    }
  };

  if (!currentUser) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (!gameState.isActive) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <RoomScreen currentUser={currentUser} onStart={handleStartGame} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img src={currentUser.avatarUrl} alt="me" className="w-8 h-8 rounded-full border border-slate-100" />
          <div>
            <h1 className="font-bold text-sm text-slate-800 leading-tight">房间: {gameState.roomId}</h1>
            <p className="text-[10px] text-slate-400 font-medium">微信实时同步中</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsRulesOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600">
            <Info size={20} />
          </button>
          <button onClick={resetGame} className="p-2 text-slate-400 hover:text-red-600">
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <ScoreBoard players={gameState.players} />

        {gameState.rounds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider">最近一局</p>
              <p className="text-sm text-indigo-900">
                获胜者: <span className="font-bold">{gameState.players.find(p => p.id === gameState.rounds[0].winnerId)?.name}</span>
              </p>
            </div>
            <button onClick={() => setIsHistoryOpen(true)} className="text-indigo-600 text-sm font-semibold flex items-center">
              详情 <ChevronRight size={16} />
            </button>
          </div>
        )}

        {gameState.rounds.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-300 shadow-sm">
              <Sparkles size={32} />
            </div>
            <p className="text-slate-400 text-sm">房间已就绪，开始记录对局吧！</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/90 to-transparent flex justify-center gap-4">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="flex-1 max-w-[150px] bg-white border border-slate-200 text-slate-700 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
        >
          <History size={18} />
          战报
        </button>
        <button
          onClick={() => setIsRoundModalOpen(true)}
          className="flex-[1.5] max-w-[200px] bg-[#07C160] text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-transform"
        >
          <PlusCircle size={20} />
          记录得分
        </button>
      </div>

      {isRoundModalOpen && (
        <RoundModal 
          players={gameState.players} 
          onClose={() => setIsRoundModalOpen(false)}
          onSubmit={handleAddRound}
          bombBaseFee={gameState.bombBaseFee}
          shutOutScore={gameState.shutOutScore}
          cardUnitPrice={gameState.cardUnitPrice}
        />
      )}

      {isHistoryOpen && (
        <HistoryView 
          players={gameState.players}
          rounds={gameState.rounds}
          onClose={() => setIsHistoryOpen(false)}
          onDeleteRound={handleDeleteRound}
        />
      )}

      {isRulesOpen && (
        <RulesModal onClose={() => setIsRulesOpen(false)} />
      )}
    </div>
  );
};

export default App;
