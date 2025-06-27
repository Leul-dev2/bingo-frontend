import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, User, CheckCircle } from 'lucide-react';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get('user');

  const [telegramId, setTelegramId] = useState('');
  const [username, setUsername] = useState('');
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = urlTelegramId || localStorage.getItem('telegramId');
    if (!id) return;
    setTelegramId(id);
    setLoading(true);

    // Fetch profile and wallet in parallel
    Promise.all([
      fetch(`https://bingobot-backend-bwdo.onrender.com/api/profile/${id}`).then(res => res.json()),
      fetch(`https://bingobot-backend-bwdo.onrender.com/api/wallet/${id}`).then(res => res.json())
    ])
      .then(([profileData, walletData]) => {
        setUsername(profileData.username || '');
        setGamesWon(profileData.gamesWon || 0);
        setBalance(walletData.balance || 0);
        setBonus(walletData.bonus || 0);
        setCoins(walletData.coins || 0);
      })
      .catch(err => console.error('Fetch error:', err))
      .finally(() => setLoading(false));
  }, [urlTelegramId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200 p-4">
      <div className="max-w-lg mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-purple-700">Profile</h1>
          <motion.button
            whileTap={{ rotate: 360 }}
            className="p-2 bg-purple-600 text-white rounded-lg shadow-md"
            onClick={() => window.location.reload()}
          >
            <RefreshCw />
          </motion.button>
        </div>

        {/* Avatar & Username */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-4"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
            {username.charAt(0).toUpperCase() || 'M'}
          </div>
          <div className="mt-2 text-purple-700 font-semibold text-lg">
            {username || 'User'}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-4"
        >
          {[
            { label: 'Balance', value: balance, icon: '💳', color: 'from-purple-500 to-purple-700' },
            { label: 'Bonus Wallet', value: bonus, icon: '🎁', color: 'from-green-400 to-green-600' },
            { label: 'Total Coins', value: coins, icon: '🪙', color: 'from-yellow-400 to-yellow-600' },
            { label: 'Games Won', value: gamesWon, icon: '🏆', color: 'from-blue-400 to-blue-600' }
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 flex flex-col items-center justify-center text-white shadow-lg`}
            >
              <div className="text-3xl">{stat.icon}</div>
              <div className="mt-2 text-sm">{stat.label}</div>
              <div className="text-xl font-bold">{loading ? '...' : `${stat.value}`}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-4 space-y-2 shadow-inner"
        >
          <div className="text-purple-700 font-semibold">Settings</div>
          {['Sound', 'Dark Mode', 'Invite Friends'].map((item, idx) => (
            <motion.div
              key={item}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 + idx * 0.1 }}
              className="flex justify-between items-center p-3 border-b last:border-b-0 border-purple-200"
            >
              <span>{item === 'Invite Friends' ? '👥 ' + item : item === 'Sound' ? '🔊 ' + item : '🌙 ' + item}</span>
              <span className="opacity-60">{item === 'Invite Friends' ? 'Share >' : 'Toggle'}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
