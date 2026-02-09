
import React from 'react';
import { Player, Round } from '../types';
import { X, Trash2, Zap } from 'lucide-react';

interface HistoryViewProps {
  players: Player[];
  rounds: Round[];
  onClose: () => void;
  onDeleteRound: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ players, rounds, onClose, onDeleteRound }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      <header className="bg-white px-4 py-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 text-slate-500"><X size={24} /></button>
          <h2 className="text-lg font-bold text-slate-800">对局流水</h2>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {rounds.length === 0 ? (
          <div className="text-center py-20 text-slate-400">暂无流水记录</div>
        ) : (
          rounds.map((round, idx) => (
            <div key={round.id} className="bg-white rounded-3xl p-5 shadow-sm space-y-4 border border-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg">第 {rounds.length - idx} 局</span>
                <button onClick={() => onDeleteRound(round.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
              </div>
              <div className="space-y-3">
                {round.entries.map(entry => {
                  const p = players.find(pl => pl.id === entry.playerId);
                  const isWinner = round.winnerId === entry.playerId;
                  return (
                    <div key={entry.playerId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={p?.avatarUrl} alt="" className="w-6 h-6 rounded-lg" />
                        <span className={`text-sm font-bold ${isWinner ? 'text-slate-800' : 'text-slate-400'}`}>{p?.name}</span>
                        {entry.isShutOut && <span className="text-[8px] bg-rose-50 text-rose-500 px-1 rounded">被关</span>}
                        {entry.bombCount > 0 && <span className="text-[8px] bg-indigo-50 text-indigo-500 px-1 rounded flex items-center gap-0.5"><Zap size={6} />{entry.bombCount}</span>}
                      </div>
                      <span className={`font-mono font-bold ${entry.scoreChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {entry.scoreChange > 0 ? '+' : ''}{entry.scoreChange}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;
