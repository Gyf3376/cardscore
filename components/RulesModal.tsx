
import React from 'react';
import { X, BookOpen, Layers, Zap, AlertCircle } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={24} />
            <h2 className="text-xl font-bold">游戏规则说明</h2>
          </div>
          <button onClick={onClose} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-600 text-sm leading-relaxed">
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold mb-1">
              <Layers size={18} /> <span>基本规则</span>
            </div>
            <p>• <b>人数：</b>3人（需3张3）或4人（需4张3），不含大小王。</p>
            <p>• <b>牌级：</b>3 &gt; 2 &gt; 1 &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4。</p>
            <p>• <b>红桃4：</b>首局由持有红桃4玩家先出，且首发牌型必须包含红桃4。</p>
            <p>• <b>必打规则：</b>若有大过的牌必须出，不能不要。</p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-rose-600 font-bold mb-1">
              <Zap size={18} /> <span>牌型说明</span>
            </div>
            <p>• <b>炸弹：</b>四张相同（4张4除外）。炸弹不能空炸，必须打过其他牌。</p>
            <p>• <b>三带二：</b>三张相同必须带两张（相同或不同皆可），无飞机。</p>
            <p>• <b>顺子：</b>3人最短5连，4人最短4连。顺子不能包含1, 2, 3。</p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600 font-bold mb-1">
              <AlertCircle size={18} /> <span>结算逻辑</span>
            </div>
            <p>• <b>单张豁免：</b>最后剩余1张牌的不算输（支付0）。</p>
            <p>• <b>顶大规则：</b>若下家报单，上家出单张必须出手中最大的一张。</p>
            <p>• <b>被关：</b>若一局未出一张牌则为“被关”，结算剩余牌数翻倍。</p>
            <p>• <b>炸弹费：</b>炸弹生效（未被更大的炸弹盖过且非空炸）时，其他所有玩家需支付炸弹费给该玩家。</p>
          </section>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-400 italic">
            本程序已根据上述规则自动计算每局得分，请在添加对局时如实填写剩余牌数和有效炸弹数。
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button 
            onClick={onClose}
            className="w-full bg-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesModal;
