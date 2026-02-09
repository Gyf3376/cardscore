
import React, { useState, useMemo } from 'react';
import { Player, Round, RoundEntry } from '../types';
import { X, Check, Calculator, Zap, AlertCircle, Trophy, EyeOff, Ban, Sparkles } from 'lucide-react';

interface RoundModalProps {
  players: Player[];
  onClose: () => void;
  onSubmit: (round: Round) => void;
  bombBaseFee: number;
  shutOutScore: number;
  cardUnitPrice: number;
}

const RoundModal: React.FC<RoundModalProps> = ({ 
  players, 
  onClose, 
  onSubmit, 
  bombBaseFee, 
  shutOutScore,
  cardUnitPrice
}) => {
  const [winnerId, setWinnerId] = useState<string>(players[0].id);
  const [playerData, setPlayerData] = useState<Record<string, { cards: number; bombs: number; shutOut: boolean }>>(
    players.reduce((acc, p) => ({ 
      ...acc, 
      [p.id]: { cards: 0, bombs: 0, shutOut: false } 
    }), {})
  );

  const allOpponentsShutOut = useMemo(() => {
    return players
      .filter(p => p.id !== winnerId)
      .every(p => playerData[p.id].shutOut);
  }, [winnerId, playerData, players]);

  const calculateScores = (): RoundEntry[] => {
    const numPlayers = players.length;
    const bombNets: Record<string, number> = {};
    const cardNets: Record<string, number> = {};
    
    players.forEach(p => { 
      bombNets[p.id] = 0; 
      cardNets[p.id] = 0;
    });

    if (!allOpponentsShutOut) {
      players.forEach(p => {
        if (playerData[p.id].shutOut) return;
        const bombs = playerData[p.id].bombs;
        if (bombs > 0) {
          const reward = bombs * bombBaseFee * (numPlayers - 1);
          bombNets[p.id] += reward;
          players.forEach(other => {
            if (other.id !== p.id) {
              bombNets[other.id] -= (bombs * bombBaseFee);
            }
          });
        }
      });
    }

    let totalLoserPay = 0;
    players.forEach(p => {
      if (p.id !== winnerId) {
        const { cards, shutOut } = playerData[p.id];
        let cost = 0;
        if (shutOut) {
          cost = shutOutScore;
        } else if (cards === 1) {
          cost = 0;
        } else {
          cost = cards * cardUnitPrice;
        }
        
        cardNets[p.id] -= cost;
        totalLoserPay += cost;
      }
    });
    cardNets[winnerId] += totalLoserPay;

    return players.map(p => ({
      playerId: p.id,
      remainingCards: p.id === winnerId ? 0 : (playerData[p.id].shutOut ? 0 : playerData[p.id].cards),
      bombCount: (p.id === winnerId && allOpponentsShutOut) ? 0 : playerData[p.id].bombs,
      isShutOut: p.id === winnerId ? false : playerData[p.id].shutOut,
      scoreChange: bombNets[p.id] + cardNets[p.id]
    }));
  };

  const handleSumbit = () => {
    const loserWithZeroCardsAndNotShutOut = players.some(
      (p) => p.id !== winnerId && !playerData[p.id].shutOut && playerData[p.id].cards === 0
    );
    if (loserWithZeroCardsAndNotShutOut) {
      alert("输家剩余手牌不能为0张（除非是被关状态）");
      return;
    }
    onSubmit({ id: Date.now().toString(), timestamp: Date.now(), entries: calculateScores(), winnerId });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">记一局</h2>
          <button onClick={onClose} className="p-2 text-slate-300"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">谁先出完？</label>
            <div className="grid grid-cols-2 gap-3">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => setWinnerId(p.id)}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                    winnerId === p.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-50 bg-slate-50'
                  }`}
                >
                  <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-lg" />
                  <span className={`text-xs font-bold ${winnerId === p.id ? 'text-indigo-700' : 'text-slate-500'}`}>{p.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">手牌与炸弹结算</label>
            {players.map(p => {
              const isWinner = p.id === winnerId;
              const isShutOut = playerData[p.id].shutOut;
              return (
                <div key={p.id} className={`p-4 rounded-[1.5rem] border transition-all ${
                  isWinner ? 'bg-amber-50 border-amber-100' : isShutOut ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img src={p.avatarUrl} alt={p.name} className="w-8 h-8 rounded-lg border border-white" />
                      <span className="font-bold text-sm text-slate-700">{p.name}</span>
                    </div>
                    {!isWinner && (
                      <button
                        onClick={() => setPlayerData(prev => ({ ...prev, [p.id]: { ...prev[p.id], shutOut: !isShutOut } }))}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${
                          isShutOut ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        被关扣{shutOutScore}
                      </button>
                    )}
                  </div>
                  {isWinner ? (
                    allOpponentsShutOut ? (
                      <div className="bg-amber-100/50 rounded-xl p-3 text-center text-[10px] text-amber-700 font-bold">全关奖励！不计炸弹</div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-amber-600">本局炸弹：</span>
                        <div className="flex-1 flex items-center gap-2">
                          <button onClick={() => setPlayerData(prev => ({ ...prev, [p.id]: { ...prev[p.id], bombs: Math.max(0, prev[p.id].bombs - 1) } }))} className="w-8 h-8 bg-amber-100 rounded-lg">-</button>
                          <span className="flex-1 text-center font-bold">{playerData[p.id].bombs}</span>
                          <button onClick={() => setPlayerData(prev => ({ ...prev, [p.id]: { ...prev[p.id], bombs: prev[p.id].bombs + 1 } }))} className="w-8 h-8 bg-amber-200 rounded-lg">+</button>
                        </div>
                      </div>
                    )
                  ) : isShutOut ? null : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 mb-1 block">剩牌 (×{cardUnitPrice})</label>
                        <input type="number" value={playerData[p.id].cards || ''} onChange={e => setPlayerData(prev => ({ ...prev, [p.id]: { ...prev[p.id], cards: parseInt(e.target.value) || 0 } }))} className="w-full bg-slate-50 border-0 rounded-xl px-3 py-2 text-sm font-bold" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 mb-1 block">炸弹</label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPlayerData(prev => ({ ...prev, [p.id]: { ...prev[p.id], bombs: Math.max(0, prev[p.id].bombs - 1) } }))} className="w-6 h-6 bg-slate-100 rounded-lg">-</button>
                          <span className="flex-1 text-center font-bold text-xs">{playerData[p.id].bombs}</span>
                          <button onClick={() => setPlayerData(prev => ({ ...prev, [p.id]: { ...prev[p.id], bombs: prev[p.id].bombs + 1 } }))} className="w-6 h-6 bg-indigo-100 rounded-lg text-indigo-600">+</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>

        <div className="p-6">
          <button onClick={handleSumbit} className="w-full bg-[#07C160] text-white py-4 rounded-2xl font-bold text-lg shadow-lg">提交战报</button>
        </div>
      </div>
    </div>
  );
};

export default RoundModal;
