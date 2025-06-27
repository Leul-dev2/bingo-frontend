import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, User, CheckCircle, Calendar, Clock } from 'lucide-react';

const tabs = ['Balance', 'History'];

export default function Wallet() {
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get('user');

  const [activeTab, setActiveTab] = useState(0);
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [coins, setCoins] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);

  const telegramId = urlTelegramId || localStorage.getItem('telegramId');

  useEffect(() => {
    if (urlTelegramId && urlTelegramId !== localStorage.getItem('telegramId')) {
      localStorage.setItem('telegramId', urlTelegramId);
    }
  }, [urlTelegramId]);

  useEffect(() => {
    if (!telegramId) return;

    const fetchWallet = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://bingobot-backend-bwdo.onrender.com/api/wallet?telegramId=${telegramId}`
        );
        const data = await res.json();
        setBalance(data.balance || 0);
        setPhoneNumber(data.phoneNumber || 'Unknown');
        setBonus(data.bonus || 0);
        setCoins(data.coins || 0);
      } catch (err) {
        console.error('Wallet fetch failed:', err);
      }
      setLoading(false);
    };

    fetchWallet();
  }, [telegramId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200 p-4">
      <div className="max-w-lg mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-700">Wallet</h1>
          <motion.button
            whileTap={{ rotate: 360 }}
            className="p-2 bg-purple-600 text-white rounded-lg shadow-md"
            onClick={() => window.location.reload()}
          >
            <RefreshCw />
          </motion.button>
        </div>

        {/* Phone & Verification */}
        <div className="flex items-center justify-between bg-purple-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-white">
            <User size={20} />
            <span className="font-medium">{loading ? 'Loading...' : phoneNumber}</span>
          </div>
          <div className="flex items-center space-x-1 text-green-400 font-medium">
            <CheckCircle size={18} />
            <span>Verified</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 overflow-auto">
          {tabs.map((tab, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 text-center py-2 rounded-lg font-medium transition-colors ${
                activeTab === idx
                  ? 'bg-purple-600 text-white shadow-inner'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-10 space-x-3">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full shadow-md"
                initial={{ scale: 0.6, opacity: 0.7 }}
                animate={{ scale: [0.6, 1, 0.6], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : activeTab === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
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
                <span className="text-green-400 font-medium">{bonus} Birr</span>
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
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 bg-green-400 rounded-lg text-white font-medium flex items-center justify-center space-x-2 shadow-md"
            >
              <Clock size={18} />
              <span>Convert Coin</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-purple-600 font-semibold py-10"
          >
            No recent transactions
          </motion.div>
        )}
      </div>
    </div>
  );
}
