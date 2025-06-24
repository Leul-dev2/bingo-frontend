import { useState, useEffect } from 'react';
import { ChevronLeft, RefreshCw, User, CheckCircle, Calendar, Clock } from 'lucide-react';

const tabs = ['Balance', 'History'];

export default function Wallet() {
  const [activeTab, setActiveTab] = useState(0);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    // TODO: fetch(`/api/wallet`) to get { balance, bonus, coins }
    // Simulate async load:
    setTimeout(() => {
      setBalance(0);
      setBonus(0);
      setCoins(3);
    }, 300);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-purple-200">
      {/* Header */}
      <header className="flex items-center px-4 py-2 bg-purple-600 text-white">
        <button><ChevronLeft size={24} /></button>
        <h1 className="flex-1 text-center font-semibold">Addis Bingo</h1>
        <button><RefreshCw size={24} /></button>
      </header>

      {/* Title */}
      <div className="px-4 mt-4 flex items-center justify-center space-x-2">
        <h2 className="text-2xl font-semibold text-white">Wallet</h2>
        <RefreshCw className="text-white" size={20} />
      </div>

      <main className="flex-1 p-4 space-y-4">
        <div className="bg-purple-300 rounded-xl p-4 space-y-4">
          {/* Phone & Verification */}
          <div className="flex items-center justify-between bg-purple-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-white">
              <User size={20} />
              <span className="font-medium">0902464535</span>
            </div>
            <div className="flex items-center space-x-1 text-green-400 font-medium">
              <CheckCircle size={18} />
              <span>Verified</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2">
            {tabs.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`flex-1 text-center py-2 rounded-lg font-medium transition ${
                  activeTab === idx
                    ? 'border-b-2 border-white text-white bg-purple-300'
                    : 'text-purple-100 bg-purple-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Balance View */}
          {activeTab === 0 && (
            <div className="space-y-4">
              {/* Main Balance */}
              <div className="flex justify-between items-center">
                <div className="text-white font-semibold text-lg">Main Balance</div>
                <div className="text-white font-bold text-2xl">{balance} Birr</div>
              </div>

              {/* Bonus & Coins */}
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-purple-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-white">
                    <Calendar size={18} />
                    <span>Bonus Balance</span>
                  </div>
                  <span className="text-green-400 font-medium">{bonus}</span>
                </div>
                <div className="flex items-center justify-between bg-purple-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-white">
                    <Clock size={18} />
                    <span>Coins</span>
                  </div>
                  <span className="text-yellow-300 font-medium">{coins}</span>
                </div>
              </div>

              {/* Convert Coin Button */}
              <button className="w-full py-3 bg-green-400 rounded-lg text-white font-medium flex items-center justify-center space-x-2">
                <Clock size={18} />
                <span>Convert Coin</span>
              </button>
            </div>
          )}

          {/* History View Placeholder */}
          {activeTab === 1 && (
            <div className="text-center text-white font-medium py-6">
              No recent transactions
            </div>
          )}
        </div>
      </main>

    
    </div>
  );
}
