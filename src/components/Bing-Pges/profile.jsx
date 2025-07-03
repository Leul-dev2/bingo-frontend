import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { FaSyncAlt, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';


export default function Profile({ setIsBlackToggleOn, isBlackToggleOn }) {
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get('user');

  const [telegramId, setTelegramId] = useState('');
  const [username, setUsername] = useState('');
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  // On mount, initialize toggle from localStorage
  useEffect(() => {
    const storedToggle = localStorage.getItem('blackToggle');
    if (storedToggle !== null) {
      setIsBlackToggleOn(storedToggle === 'true');
    }
  }, [setIsBlackToggleOn]);

  // Handler updates state and localStorage
  const toggleBlackToggle = () => {
    setIsBlackToggleOn((prev) => {
      localStorage.setItem('blackToggle', String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const id = urlTelegramId || localStorage.getItem('telegramId');
    if (!id) return;
    setTelegramId(id);
    setLoading(true);

    // Fetch wallet data (query param) then fetch profile stats
    const fetchWallet = fetch(
      `https://bingobot-backend-bwdo.onrender.com/api/wallet?telegramId=${id}`
    )
      .then((res) => res.json())
      .then((data) => {
        setBalance(data.balance || 0);
        setBonus(data.bonus || 0);
        setCoins(data.coins || 0);
      })
      .catch((err) => console.error('Wallet fetch error:', err));

    const fetchProfile = fetch(
      `https://bingobot-backend-bwdo.onrender.com/api/profile/${id}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUsername(data.username || '');
          setGamesWon(data.gamesWon || 0);
        } else {
          console.error('Profile data error:', data.message);
        }
      })
      .catch((err) => console.error('Profile fetch error:', err));

    Promise.all([fetchWallet, fetchProfile]).finally(() => setLoading(false));
  }, [urlTelegramId]);

  /////////////////////////////////////////////////////////////////////////
 
 const handleInvite = () => {
  const inviteLink = 'https://t.me/bossbingosbot'; // replace with your bot link
  const shareText = encodeURIComponent('Check out this awesome bot: ' + inviteLink);
  const telegramShareUrl = `https://t.me/share/url?text=${shareText}`; // Removed `url` param
  window.open(telegramShareUrl, '_blank');
};


////////////////////////////////////////////////////////////////////
  // Dynamic style classes based on toggle
  const bgGradient = isBlackToggleOn
    ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
    : 'bg-gradient-to-br from-purple-200 via-purple-300 to-purple-200';

  const cardBg = isBlackToggleOn
    ? 'bg-white/10 backdrop-blur-md'
    : 'bg-white/80 backdrop-blur-md';

  const cardShadow = isBlackToggleOn
    ? 'shadow-[0_0_15px_3px_rgba(255,255,255,0.15)]'
    : 'shadow-xl';

  const headerText = isBlackToggleOn ? 'text-indigo-300' : 'text-purple-700';

  const borderColor = isBlackToggleOn ? 'border-gray-700' : 'border-purple-200';

  const toggleBorderColor = isBlackToggleOn ? 'bg-white/20' : 'bg-gray-300';

  return (
    <div className={`min-h-screen ${bgGradient} p-4`}>
      <div className={`max-w-lg mx-auto rounded-2xl p-6 space-y-6 ${cardBg} ${cardShadow}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className={`text-xl font-bold ${headerText}`}>Profile</h1>
          <motion.button
            whileTap={{ rotate: 360 }}
            className="p-2 bg-purple-600 text-white rounded-lg shadow-md"
            onClick={() => window.location.reload()}
          >
            <FaSyncAlt />
          </motion.button>
        </div>

        {/* Avatar & Username */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center py-4"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
            {loading ? '...' : username.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className={`mt-2 font-semibold text-lg ${headerText}`}>
            {loading ? 'Loading...' : username}
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
            { label: 'Balance', value: balance, icon: <FaUser />, color: 'from-purple-500 to-purple-700' },
            { label: 'Bonus Wallet', value: bonus, icon: <FaUser />, color: 'from-green-400 to-green-600' },
            { label: 'Coins', value: coins, icon: <FaUser />, color: 'from-yellow-400 to-yellow-600' },
            { label: 'Games Won', value: gamesWon, icon: <FaUser />, color: 'from-blue-400 to-blue-600' }
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
              <div className="text-xl font-bold">{loading ? '...' : stat.value}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Invite Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-6 flex justify-center"
        >
          <button
            onClick={handleInvite}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-all"
          >
            📢 Invite Friends
          </button>
        </motion.div>


        <motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 1.3 }}
  className="mt-2 flex justify-center"
>
  <button
    onClick={() => navigate('/PaymentForm')}
    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition-all"
  >
    💳 Go to Payment
  </button>
</motion.div>




        {/* Settings */}
        <motion.div
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className={`flex justify-between items-center p-3 border-t mt-4 ${borderColor}`}
        >
          <span className={headerText}>🖤 Black Toggle</span>
          <button
            onClick={toggleBlackToggle}
            aria-pressed={isBlackToggleOn}
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 focus:outline-none ${
              isBlackToggleOn ? 'bg-black' : toggleBorderColor
            }`}
          >
            <span
              className={`block w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                isBlackToggleOn ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
