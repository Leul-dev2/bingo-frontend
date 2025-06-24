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
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Addis Bingo</h1>
          <RefreshCw size={20} />
        </div>

        {/* User Info */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="font-medium">👤 {username || 'Player'}</span>
            </div>
            <div className="text-right text-sm text-gray-500">
              ID: {telegramId || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Balance Section */}
        <div className="p-4 border-b space-y-4">
          <div>
            <h2 className="text-gray-500 text-sm">Main Balance</h2>
            <p className="text-xl font-bold">{balance} Birr</p>
          </div>
          <div>
            <h2 className="text-gray-500 text-sm">Bonus Wallet</h2>
            <p className="text-xl font-bold">{bonus}</p>
          </div>
          <div>
            <h2 className="text-gray-500 text-sm">Total Coins</h2>
            <p className="text-xl font-bold">{coins}</p>
          </div>
          <div>
            <h2 className="text-gray-500 text-sm">Games Won</h2>
            <p className="text-xl font-bold">{gamesWon}</p>
          </div>
        </div>

        {/* Settings Section */}
        <div className="p-4 border-b">
          <div className="mb-3">
            <h2 className="font-medium">Settings</h2>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span>Sound</span>
            <span className="text-gray-400">Toggle</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span>Dark Mode</span>
            <span className="text-gray-400">Toggle</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Invite Friends</span>
            <span className="text-gray-400">Share &gt;</span>
          </div>
        </div>

        
      </main>
    </div>
  );
}
