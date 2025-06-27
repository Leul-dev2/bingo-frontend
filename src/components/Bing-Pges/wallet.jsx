import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { FaSyncAlt, FaUser, FaWallet, FaCoins, FaGift } from 'react-icons/fa';

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

    setLoading(true);
    fetch(`https://bingobot-backend-bwdo.onrender.com/api/wallet?telegramId=${telegramId}`)
      .then(res => res.json())
      .then(data => {
        setBalance(data.balance || 0);
        setBonus(data.bonus || 0);
        setCoins(data.coins || 0);
        setPhoneNumber(data.phoneNumber || 'Unknown');
      })
      .catch(err => console.error('Wallet fetch failed:', err))
      .finally(() => setLoading(false));
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
            <FaSyncAlt />
          </motion.button>
        </div>

        {/* Phone & Verification */}
        <div className="flex items-center justify-between bg-purple-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-white">
            <FaUser className="text-xl" />
            <span className="font-medium">{loading ? 'Loading...' : phoneNumber}</span>
          </div>
          <div className="flex items-center space-x-1 text-green-400 font-medium">
            <FaSyncAlt />
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
            className="space-y-6"
          >
            {/* Main Balance Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <FaWallet className="text-white text-3xl" />
                <span className="text-white font-bold text-lg">Main Balance</span>
              </div>
              <span className="text-white font-extrabold text-3xl">
                {balance} Birr
              </span>
            </motion.div>

            {/* Bonus & Coins */}
            <div className="space-y-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-r from-green-400 to-green-600 rounded-xl p-4 flex items-center justify-between text-white shadow-md"
              >
                <div className="flex items-center space-x-2">
                  <FaGift /> <span>Bonus Balance</span>
                </div>
                <span className="font-bold">{bonus} Birr</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl p-4 flex items-center justify-between text-white shadow-md"
              >
                <div className="flex items-center space-x-2">
                  <FaCoins /> <span>Coins</span>
                </div>
                <span className="font-bold">{coins}</span>
              </motion.div>
            </div>

            {/* Convert Coin Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 bg-green-400 rounded-lg text-white font-semibold flex items-center justify-center space-x-2 shadow-md"
            >
              <FaSyncAlt />
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
