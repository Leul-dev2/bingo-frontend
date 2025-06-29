import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { FaSyncAlt, FaUser, FaWallet, FaCoins, FaGift } from 'react-icons/fa';

const tabs = ['Balance', 'History'];

export default function Wallet({ isBlackToggleOn }) {
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

  // Styles based on toggle
  const containerBg = isBlackToggleOn
    ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900'
    : 'bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200';

  const cardBg = isBlackToggleOn ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800';

  const activeBtnBg = isBlackToggleOn ? 'bg-indigo-700 text-white shadow-inner' : 'bg-purple-600 text-white shadow-inner';
  const inactiveBtnBg = isBlackToggleOn ? 'bg-gray-700 text-gray-300' : 'bg-purple-100 text-purple-700';

  const phoneBarBg = isBlackToggleOn ? 'bg-gray-700 text-gray-200' : 'bg-purple-200 text-white';

  const headerText = isBlackToggleOn ? 'text-gray-100' : 'text-purple-700';

  const loadingDotBg = isBlackToggleOn
    ? 'bg-gray-700'
    : 'bg-gradient-to-br from-purple-400 to-pink-400';

  const btnConvertBg = isBlackToggleOn
    ? 'bg-green-600 text-white shadow-md'
    : 'bg-green-400 text-white shadow-md';

  const bonusBg = isBlackToggleOn
    ? 'bg-green-700'
    : 'bg-gradient-to-r from-green-400 to-green-600';

  const coinsBg = isBlackToggleOn
    ? 'bg-yellow-700'
    : 'bg-gradient-to-r from-yellow-400 to-yellow-600';

  const balanceBg = isBlackToggleOn
    ? 'bg-indigo-700'
    : 'bg-gradient-to-r from-purple-600 to-indigo-600';

  return (
    <div className={`min-h-screen p-4 ${containerBg}`}>
      <div className={`max-w-lg mx-auto backdrop-blur-md rounded-2xl shadow-xl p-6 space-y-6 ${cardBg}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`text-xl font-bold ${headerText}`}>Wallet</h1>
          <motion.button
            whileTap={{ rotate: 360 }}
            className="p-2 bg-purple-600 text-white rounded-lg shadow-md"
            onClick={() => window.location.reload()}
          >
            <FaSyncAlt />
          </motion.button>
        </div>

        {/* Phone & Verification */}
        <div className={`flex items-center justify-between rounded-lg p-3 ${phoneBarBg}`}>
          <div className="flex items-center space-x-2">
            <FaUser className={`text-xl ${isBlackToggleOn ? 'text-gray-200' : 'text-white'}`} />
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
                activeTab === idx ? activeBtnBg : inactiveBtnBg
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
                className={`w-8 h-8 rounded-full shadow-md ${loadingDotBg}`}
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
              className={`rounded-xl p-5 shadow-lg flex items-center justify-between ${balanceBg} text-white`}
            >
              <div className="flex items-center space-x-3">
                <FaWallet className="text-white text-3xl" />
                <span className="font-bold text-lg">Main Balance</span>
              </div>
              <span className="font-extrabold text-3xl">{balance} Birr</span>
            </motion.div>

            {/* Bonus & Coins */}
            <div className="space-y-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`rounded-xl p-4 flex items-center justify-between text-white shadow-md ${bonusBg}`}
              >
                <div className="flex items-center space-x-2">
                  <FaGift /> <span>Bonus Balance</span>
                </div>
                <span className="font-bold">{bonus} Birr</span>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`rounded-xl p-4 flex items-center justify-between text-white shadow-md ${coinsBg}`}
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
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 ${btnConvertBg}`}
            >
              <FaSyncAlt />
              <span>Convert Coin</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-center font-semibold py-10 ${
              isBlackToggleOn ? 'text-gray-300' : 'text-purple-600'
            }`}
          >
            No recent transactions
          </motion.div>
        )}
      </div>
    </div>
  );
}
