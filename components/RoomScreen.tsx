
import React, { useState, useEffect } from 'react';
import { Player, UserProfile } from '../types';
import { Users, Play, Settings, Plus, X, QrCode, Share2, LogIn, ArrowRight } from 'lucide-react';

interface RoomScreenProps {
  currentUser: UserProfile;
  onStart: (roomId: string, players: Player[], playerCount: 3 | 4, settings: { bombFee: number; shutOut: number; cardPrice: number }) => void;
}

const RoomScreen: React.FC<RoomScreenProps> = ({ currentUser, onStart }) => {
  const [view, setView] = useState<'home' | 'create' | 'join' | 'waiting'>('home');
  const [roomId, setRoomId] = useState('');
  const [playerCount, setPlayerCount] = useState<3 | 4>(3);
  const [bombFee, setBombFee] = useState(8);
  const [shutOut, setShutOut] = useState(20);
  const [cardPrice, setCardPrice] = useState(1);
  
  // 当人数变化时，更新默认被关分
  useEffect(() => {
    if (playerCount === 3) setShutOut(20);
    else setShutOut(15);
  }, [playerCount]);

  // 模拟等待大厅的玩家列表
  const [joinedPlayers, setJoinedPlayers] = useState<Player[]>([
    { ...currentUser, totalScore: 0, isHost: true }
  ]);

  const generateRoomId = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setView('waiting');
  };

  const handleJoinRoom = () => {
    if (roomId.length !== 6) {
      alert('请输入6位房间码');
      return;
    }
    // 模拟加入逻辑
    const mockHost: Player = {
      id: 'h1',
      name: '房主小张',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=host`,
      totalScore: 0,
      isHost: true
    };
    setJoinedPlayers([mockHost, { ...currentUser, totalScore: 0, isHost: false }]);
    setView('waiting');
  };

  const handleInvite = () => {
    // 模拟调用 wx.showShareMenu 或复制链接
    alert(`邀请链接已复制！房间号: ${roomId}\n发送给微信好友即可加入对局。`);
    
    // 模拟一个好友加入
    if (joinedPlayers.length < playerCount) {
      setTimeout(() => {
        const newFriend: Player = {
          id: 'u' + Math.random(),
          name: `好友_${Math.floor(Math.random()*100)}`,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
          totalScore: 0
        };
        setJoinedPlayers(prev => [...prev, newFriend]);
      }, 1500);
    }
  };

  const handleFinalStart = () => {
    if (joinedPlayers.length < playerCount) {
      alert(`还差 ${playerCount - joinedPlayers.length} 人，点击邀请好友！`);
      return;
    }
    onStart(roomId, joinedPlayers, playerCount, { bombFee, shutOut, cardPrice });
  };

  if (view === 'home') {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2 mb-10">
          <div className="bg-white w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <Users size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">选择游戏方式</h2>
          <p className="text-slate-400 text-sm">与身边的战友实时同步记分</p>
        </div>
        
        <div className="grid gap-4">
          <button
            onClick={() => setView('create')}
            className="group bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-indigo-600 shadow-sm transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                <Plus size={24} />
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-800">开启新房间</div>
                <div className="text-xs text-slate-400">作为房主，设置游戏规则</div>
              </div>
            </div>
            <ArrowRight size={20} className="text-slate-300 group-hover:text-indigo-600" />
          </button>

          <button
            onClick={() => setView('join')}
            className="group bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-emerald-600 shadow-sm transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                <LogIn size={24} />
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-800">加入已有房间</div>
                <div className="text-xs text-slate-400">输入房间码或扫码进入</div>
              </div>
            </div>
            <ArrowRight size={20} className="text-slate-300 group-hover:text-emerald-600" />
          </button>
        </div>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl overflow-hidden animate-in slide-in-from-bottom-4">
        <div className="p-8 space-y-6">
          <header className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">创建房间</h2>
            <button onClick={() => setView('home')} className="text-slate-400"><X size={20} /></button>
          </header>

          <section>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">对局人数</label>
            <div className="grid grid-cols-2 gap-4">
              {[3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num as 3 | 4)}
                  className={`py-4 rounded-2xl border-2 font-black transition-all ${
                    playerCount === num 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  {num} 人场
                </button>
              ))}
            </div>
          </section>

          <section className="bg-slate-50 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-400"><Settings size={14} /> <span className="text-[10px] font-bold uppercase">高级规则</span></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">单张/元</label>
                <input type="number" value={cardPrice} onChange={e => setCardPrice(parseInt(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 font-bold text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">炸弹费/人</label>
                <input type="number" value={bombFee} onChange={e => setBombFee(parseInt(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 font-bold text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">“被关”分</label>
                <input type="number" value={shutOut} onChange={e => setShutOut(parseInt(e.target.value) || 0)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 font-bold text-sm" />
              </div>
            </div>
          </section>

          <button onClick={handleCreateRoom} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 active:scale-95 transition-all">
            生成房间码
          </button>
        </div>
      </div>
    );
  }

  if (view === 'join') {
    return (
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 space-y-8 animate-in slide-in-from-bottom-4">
        <header className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">加入房间</h2>
          <button onClick={() => setView('home')} className="text-slate-400"><X size={20} /></button>
        </header>

        <div className="space-y-4">
          <div className="text-center p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <QrCode size={48} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs text-slate-400">扫描好友的房间二维码</p>
          </div>
          
          <div className="relative">
            <input 
              type="text" 
              maxLength={6} 
              placeholder="输入6位房间码"
              value={roomId}
              onChange={e => setRoomId(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-center text-2xl font-black tracking-widest text-slate-700 placeholder:text-slate-200"
            />
          </div>
        </div>

        <button onClick={handleJoinRoom} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-100 active:scale-95 transition-all">
          进入房间
        </button>
      </div>
    );
  }

  if (view === 'waiting') {
    return (
      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-slate-800 p-8 text-center text-white relative">
          <div className="absolute top-6 right-6 bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest backdrop-blur-md">
            ROOM: {roomId}
          </div>
          <div className="w-20 h-20 bg-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users size={32} />
          </div>
          <h2 className="text-xl font-bold">准备就绪</h2>
          <p className="text-slate-400 text-xs mt-1">等待玩家加入 ({joinedPlayers.length}/{playerCount})</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: playerCount }).map((_, i) => {
              const p = joinedPlayers[i];
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center overflow-hidden ${
                    p ? 'border-emerald-500 bg-white' : 'border-slate-100 border-dashed bg-slate-50'
                  }`}>
                    {p ? (
                      <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Plus size={20} className="text-slate-200" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold truncate w-full text-center ${p ? 'text-slate-700' : 'text-slate-300'}`}>
                    {p ? p.name : '等待中'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleInvite}
              className="w-full bg-[#07C160] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-50 active:scale-95 transition-all"
            >
              <Share2 size={18} />
              邀请微信好友
            </button>
            
            <button
              onClick={handleFinalStart}
              className={`w-full py-4 rounded-2xl font-bold transition-all ${
                joinedPlayers.length === playerCount
                ? 'bg-slate-900 text-white shadow-xl active:scale-95'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              开始游戏
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default RoomScreen;
