import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const urlTelegramId = searchParams.get('user');

  const [telegramId, setTelegramId] = useState('');
  const [username, setUsername] = useState('');
  const [balance, setBalance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gamesWon, setGamesWon] = useState(0);

  useEffect(() => {
    const id = urlTelegramId || localStorage.getItem('telegramId');
    if (!id) return;

    setTelegramId(id);
    fetchWallet(id);
    fetchGameStats(id);
  }, [urlTelegramId]);

  const fetchWallet = async (id) => {
    try {
      const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/wallet/${id}`);
      const data = await res.json();
      setBalance(data.balance || 0);
      setBonus(data.bonus || 0);
      setCoins(data.coins || 0);
    } catch (err) {
      console.error('Wallet fetch error:', err);
    }
  };

  const fetchGameStats = async (id) => {
    try {
      const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/profile/${id}`);
      const data = await res.json();
      setGamesWon(data.gamesWon || 0);
      setUsername(data.username || '');
    } catch (err) {
      console.error('Profile stats fetch error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#C597E6]">
      {/* Header */}
      <div className="bg-[#1E1E2D] text-white px-4 py-3 flex justify-between items-center">
        <h1 className="text-lg font-semibold">Addis Bingo</h1>
        <RefreshCw size={20} />
      </div>

      {/* Avatar + Username */}
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center text-white text-4xl font-bold">
          {username?.charAt(0)?.toUpperCase() || 'M'}
        </div>
        <div className="mt-2 text-white font-semibold text-lg">
          {username || 'M'}
        </div>
      </div>

      {/* Stats Boxes */}
      <div className="grid grid-cols-2 gap-4 px-6 pb-4">
        <div className="bg-[#B57FD6] p-4 rounded-xl text-white text-center">
          <div className="text-2xl">👛</div>
          <p className="text-sm mt-2">Balance</p>
          <p className="text-lg font-semibold">{balance} Birr</p>
        </div>
        <div className="bg-[#B57FD6] p-4 rounded-xl text-white text-center">
          <div className="text-2xl">🎁</div>
          <p className="text-sm mt-2">Bonus Wallet</p>
          <p className="text-lg font-semibold">{bonus}</p>
        </div>
        <div className="bg-[#B57FD6] p-4 rounded-xl text-white text-center">
          <div className="text-2xl">🪙</div>
          <p className="text-sm mt-2">Total Coins</p>
          <p className="text-lg font-semibold">{coins}</p>
        </div>
        <div className="bg-[#B57FD6] p-4 rounded-xl text-white text-center">
          <div className="text-2xl">🏆</div>
          <p className="text-sm mt-2">Games Won</p>
          <p className="text-lg font-semibold">{gamesWon}</p>
        </div>
      </div>

      {/* Settings Section */}
      <div className="px-6 pt-4">
        <h2 className="text-white font-semibold text-lg mb-2">Settings</h2>

        <div className="bg-[#B57FD6] rounded-xl text-white text-sm divide-y divide-purple-300">
          <div className="flex justify-between items-center p-4">
            <span>🔊 Sound</span>
            <span className="opacity-60">Toggle</span>
          </div>
          <div className="flex justify-between items-center p-4">
            <span>🌙 Dark Mode</span>
            <span className="opacity-60">Toggle</span>
          </div>
          <div className="flex justify-between items-center p-4">
            <span>👥 Invite Friends</span>
            <span className="opacity-60">Share &gt;</span>
          </div>
        </div>
      </div>

      {/* Bottom Tab Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center py-2">
        <div className="flex flex-col items-center text-purple-500 text-xs font-semibold">
          <span className="text-xl">🎮</span>
          <span>Game</span>
        </div>
        <div className="flex flex-col items-center text-gray-500 text-xs font-semibold">
          <span className="text-xl">🏆</span>
          <span>Scores</span>
        </div>
        <div className="flex flex-col items-center text-gray-500 text-xs font-semibold">
          <span className="text-xl">⏳</span>
          <span>History</span>
        </div>
        <div className="flex flex-col items-center text-gray-500 text-xs font-semibold">
          <span className="text-xl">👛</span>
          <span>Wallet</span>
        </div>
        <div className="flex flex-col items-center text-purple-500 text-xs font-semibold">
          <span className="text-xl">👤</span>
          <span>Profile</span>
        </div>
      </div>
    </div>
  );
}
