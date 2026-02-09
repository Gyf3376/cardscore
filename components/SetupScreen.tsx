
import React, { useState } from 'react';
import { Player } from '../types';
import { Users, Play, Settings, Plus, X } from 'lucide-react';

interface SetupScreenProps {
  onStart: (players: Player[], playerCount: 3 | 4, settings: { bombFee: number; shutOut: number }) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [playerCount, setPlayerCount] = useState<3 | 4>(3);
  const [names, setNames] = useState<string[]>(['玩家1', '玩家2', '玩家3', '玩家4']);
  const [bombFee, setBombFee] = useState(10);
  const [shutOut, setShutOut] = useState(30);

  const handleStart = () => {
    // FIX: Added missing avatarUrl to conform to the Player interface
    const players: Player[] = names.slice(0, playerCount).map((name, i) => ({
      id: `p${i + 1}`,
      name: name.trim() || `玩家${i + 1}`,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=p${i + 1}`,
      totalScore: 0
    }));
    onStart(players, playerCount, { bombFee, shutOut });
  };

  return (
    <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">
      <div className="bg-indigo-600 p-8 text-white text-center">
        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
          <Users size={32} />
        </div>
        <h1 className="text-2xl font-black tracking-tight">开始新游戏</h1>
        <p className="text-indigo-100 text-sm mt-1 opacity-80">配置规则并添加你的战友</p>
      </div>

      <div className="p-8 space-y-8">
        <section>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">对局人数</label>
          <div className="grid grid-cols-2 gap-4">
            {[3, 4].map(num => (
              <button
                key={num}
                onClick={() => setPlayerCount(num as 3 | 4)}
                className={`py-4 rounded-2xl border-2 font-black text-lg transition-all ${
                  playerCount === num 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-inner' 
                  : 'border-slate-100 bg-slate-50 text-slate-400'
                }`}
              >
                {num} 人对局
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">玩家昵称</label>
          {names.slice(0, playerCount).map((name, i) => (
            <div key={i} className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <span className="text-slate-300 font-bold text-xs">{i + 1}</span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const newNames = [...names];
                  newNames[i] = e.target.value;
                  setNames(newNames);
                }}
                className="w-full bg-slate-50 border-0 border-b-2 border-transparent focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-3 font-bold text-slate-700 focus:ring-0 transition-all placeholder:text-slate-300"
                placeholder="输入玩家名称..."
              />
            </div>
          ))}
        </section>

        <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Settings size={14} />
            <span className="text-xs font-bold uppercase tracking-widest">高级规则设定</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">炸弹费/人</label>
              <input 
                type="number"
                value={bombFee}
                onChange={e => setBombFee(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">“被关”固定分</label>
              <input 
                type="number"
                value={shutOut}
                onChange={e => setShutOut(parseInt(e.target.value) || 0)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </section>

        <button
          onClick={handleStart}
          className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all"
        >
          <Play fill="currentColor" size={20} />
          进入记分板
        </button>
      </div>
    </div>
  );
};

export default SetupScreen;
