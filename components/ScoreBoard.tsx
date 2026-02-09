
import React from 'react';
import { Player } from '../types';
import { Award, TrendingUp, TrendingDown } from 'lucide-react';

interface ScoreBoardProps {
  players: Player[];
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ players }) => {
  const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-5 border-b border-slate-50 flex items-center justify-between">
        <h2 className="text-slate-800 font-bold flex items-center gap-2 text-sm">
          <Award className="text-amber-500" size={18} />
          实时积分榜
        </h2>
        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">
          LIVE SYNC
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {sortedPlayers.map((player, index) => (
          <div key={player.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={player.avatarUrl} alt={player.name} className="w-12 h-12 rounded-2xl border-2 border-white shadow-sm object-cover" />
                <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm
                  ${index === 0 ? 'bg-amber-400 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {index + 1}
                </div>
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  {player.name}
                  {player.isHost && <span className="text-[8px] bg-slate-100 text-slate-400 px-1 rounded uppercase">Host</span>}
                </p>
                <div className="flex items-center gap-1">
                  {player.totalScore >= 0 ? (
                    <TrendingUp size={10} className="text-emerald-500" />
                  ) : (
                    <TrendingDown size={10} className="text-rose-500" />
                  )}
                  <span className={`text-[10px] font-bold ${player.totalScore >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {player.totalScore >= 0 ? '赢' : '输'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xl font-black ${player.totalScore >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                {player.totalScore > 0 && '+'}{player.totalScore}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreBoard;
