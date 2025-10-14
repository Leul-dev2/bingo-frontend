import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  FaSyncAlt, FaUser, FaWallet, FaCoins, FaGift, FaArrowDown, FaArrowUp
} from 'react-icons/fa';

const tabs = ['Balance', 'History'];

export default function Wallet({ isBlackToggleOn }) {
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get('user');

  const [activeTab, setActiveTab] = useState(0);

  // Wallet data states
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [coins, setCoins] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);

  // History data states
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState({ deposits: [], withdrawals: [] });
  const [filter, setFilter] = useState('all');

  const telegramId = urlTelegramId || localStorage.getItem('telegramId') || '593680186';

  // Rate limit handling states for balance
  const [retryAfterBalance, setRetryAfterBalance] = useState(0);
  const [rateLimitErrorBalance, setRateLimitErrorBalance] = useState('');

  // Rate limit handling states for history
  const [retryAfterHistory, setRetryAfterHistory] = useState(0);
  const [rateLimitErrorHistory, setRateLimitErrorHistory] = useState('');

  // Save telegramId to localStorage if changed
  useEffect(() => {
    if (urlTelegramId && urlTelegramId !== localStorage.getItem('telegramId')) {
      localStorage.setItem('telegramId', urlTelegramId);
    }
  }, [urlTelegramId]);

  // Countdown timer for balance retry
  useEffect(() => {
    if (retryAfterBalance <= 0) return;
    const timer = setTimeout(() => setRetryAfterBalance(retryAfterBalance - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryAfterBalance]);

  // Countdown timer for history retry
  useEffect(() => {
    if (retryAfterHistory <= 0) return;
    const timer = setTimeout(() => setRetryAfterHistory(retryAfterHistory - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryAfterHistory]);

useEffect(() => {
  if (!telegramId) return;

  // If retry timers active, wait
  if ((activeTab === 0 && retryAfterBalance > 0) || (activeTab === 1 && retryAfterHistory > 0)) {
    return;
  }

  if (activeTab === 0) {
    setLoading(true);
    setRateLimitErrorBalance('');
    setRetryAfterBalance(0);
  } else if (activeTab === 1) {
    setHistoryLoading(true);
    setRateLimitErrorHistory('');
    setRetryAfterHistory(0);
  }

  fetch(`https://adminedashbordbackend.onrender.com/api/wallet?telegramId=${telegramId}`)
    .then(async res => {
      if (res.status === 429) {
        const json = await res.json();
        if (activeTab === 0) {
          setRateLimitErrorBalance(json.error || 'Too many requests. Please wait before trying again.');
          setRetryAfterBalance(json.retryAfter || 5);
          setLoading(false);
        } else if (activeTab === 1) {
          setRateLimitErrorHistory(json.error || 'Too many requests. Please wait before trying again.');
          setRetryAfterHistory(json.retryAfter || 5);
          setHistoryLoading(false);
        }
        return null;
      }
      return res.json();
    })
    .then(data => {
      if (!data) return;
      if (activeTab === 0) {
        setBalance(data.balance || 0);
        setBonus(data.bonus || 0);
        setCoins(data.coins || 0);
        setPhoneNumber(data.phoneNumber || 'Unknown');
      } else if (activeTab === 1) {
        setHistoryData({
          deposits: data.deposits || [],
          withdrawals: data.withdrawals || []
        });
      }
    })
    .catch(err => {
      console.error('Wallet fetch failed:', err);
    })
    .finally(() => {
      if (activeTab === 0) setLoading(false);
      if (activeTab === 1) setHistoryLoading(false);
    });
}, [telegramId, activeTab, retryAfterBalance, retryAfterHistory]);

  const filteredHistory = [
    ...(filter === 'all' || filter === 'deposit' ? historyData.deposits.map(tx => ({ ...tx, type: 'deposit' })) : []),
    ...(filter === 'all' || filter === 'withdraw' ? historyData.withdrawals.map(tx => ({ ...tx, type: 'withdraw' })) : []),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Status Badge
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500 text-white',
      processing: 'bg-blue-500 text-white',
      paid: 'bg-green-600 text-white',
      success: 'bg-green-600 text-white',
      failed: 'bg-red-500 text-white',
      rejected: 'bg-gray-500 text-white',
    };
    return colors[status] || 'bg-gray-400 text-white';
  };

  // Theming
  const containerBg = isBlackToggleOn ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' : 'bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200';
  const cardBg = isBlackToggleOn ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800';
  const activeBtnBg = isBlackToggleOn ? 'bg-indigo-700 text-white shadow-inner' : 'bg-purple-600 text-white shadow-inner';
  const inactiveBtnBg = isBlackToggleOn ? 'bg-gray-700 text-gray-300' : 'bg-purple-100 text-purple-700';
  const phoneBarBg = isBlackToggleOn ? 'bg-gray-700 text-gray-200' : 'bg-purple-200 text-white';
  const headerText = isBlackToggleOn ? 'text-gray-100' : 'text-purple-700';
  const loadingDotBg = isBlackToggleOn ? 'bg-gray-700' : 'bg-gradient-to-br from-purple-400 to-pink-400';
  const btnConvertBg = isBlackToggleOn ? 'bg-green-600 text-white shadow-md' : 'bg-green-400 text-white shadow-md';
  const bonusBg = isBlackToggleOn ? 'bg-green-700' : 'bg-gradient-to-r from-green-400 to-green-600';
  const coinsBg = isBlackToggleOn ? 'bg-yellow-700' : 'bg-gradient-to-r from-yellow-400 to-yellow-600';
  const balanceBg = isBlackToggleOn ? 'bg-indigo-700' : 'bg-gradient-to-r from-purple-600 to-indigo-600';

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

        {/* Rate Limit Banner for balance */}
        <AnimatePresence>
          {retryAfterBalance > 0 && (
            <motion.div
              key="rate-limit-balance"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center gap-3 px-4 py-2 rounded-full shadow-md 
                         bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-yellow-900 mb-4"
            >
              <FaSyncAlt className="w-5 h-5 animate-spin-slow text-yellow-800" />
              <span className="font-medium">{rateLimitErrorBalance} Retry in <strong>{retryAfterBalance}</strong> second{retryAfterBalance > 1 ? 's' : ''}.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phone Info */}
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Balance Card */}
            <motion.div whileHover={{ scale: 1.02 }} className={`rounded-xl p-5 shadow-lg flex items-center justify-between ${balanceBg} text-white`}>
              <div className="flex items-center space-x-3">
                <FaWallet className="text-white text-3xl" />
                <span className="font-bold text-lg">Main Balance</span>
              </div>
              <span className="font-extrabold text-3xl">{balance} Birr</span>
            </motion.div>

            {/* Bonus & Coins */}
            <div className="space-y-4">
              <motion.div whileHover={{ scale: 1.02 }} className={`rounded-xl p-4 flex items-center justify-between text-white shadow-md ${bonusBg}`}>
                <div className="flex items-center space-x-2">
                  <FaGift /> <span>Bonus Balance</span>
                </div>
                <span className="font-bold">{bonus} Birr</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} className={`rounded-xl p-4 flex items-center justify-between text-white shadow-md ${coinsBg}`}>
                <div className="flex items-center space-x-2">
                  <FaCoins /> <span>Coins</span>
                </div>
                <span className="font-bold">{coins}</span>
              </motion.div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 ${btnConvertBg}`}
            >
              <FaSyncAlt />
              <span>Convert Coin</span>
            </motion.button>
          </motion.div>
        ) : (
          <>
            {/* Rate Limit Banner for history */}
            <AnimatePresence>
              {retryAfterHistory > 0 && (
                <motion.div
                  key="rate-limit-history"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center gap-3 px-4 py-2 rounded-full shadow-md 
                             bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 text-yellow-900 mb-4"
                >
                  <FaSyncAlt className="w-5 h-5 animate-spin-slow text-yellow-800" />
                  <span className="font-medium">{rateLimitErrorHistory} Retry in <strong>{retryAfterHistory}</strong> second{retryAfterHistory > 1 ? 's' : ''}.</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* Filter Buttons */}
              <div className="flex justify-center space-x-2 mb-4">
                {['all', 'deposit', 'withdraw'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-2 rounded-full font-medium ${filter === type ? activeBtnBg : inactiveBtnBg}`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* History */}
              {historyLoading ? (
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
              ) : filteredHistory.length === 0 ? (
                <div className={`text-center font-semibold py-10 ${isBlackToggleOn ? 'text-gray-300' : 'text-purple-600'}`}>
                  No transactions
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredHistory.map((tx, index) => (
                    <div key={index} className={`rounded-lg p-4 shadow-md flex flex-col space-y-1 ${
                      isBlackToggleOn ? 'bg-gray-700 text-white' : 'bg-purple-100 text-purple-900'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {tx.type === 'deposit' ? <FaArrowDown className="text-green-500" /> : <FaArrowUp className="text-red-500" />}
                          <div>
                            <div className="font-bold capitalize">{tx.type}</div>
                            <div className="text-sm opacity-70">{new Date(tx.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="font-bold text-lg">{tx.amount} Br</div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="opacity-70">Tx Ref: <span className="font-mono">{tx.tx_ref}</span></div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
