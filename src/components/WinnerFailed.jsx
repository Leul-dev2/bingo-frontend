import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const WinnerFailed = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    message,
    reason,
    telegramId,
    gameId,
    cardId,
    card,
    lastTwoNumbers,
    selectedNumbers,
  } = location.state || {};

  if (!card || !lastTwoNumbers || !selectedNumbers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6 text-center">
        <h1 className="text-3xl font-extrabold text-red-600 mb-3">Oops! Something went wrong.</h1>
        <p className="text-gray-600 mb-6 max-w-md">
          It looks like the game data wasn't loaded correctly. Please return to the game and try again.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold py-2 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105"
        >
          Go Back
        </button>
      </div>
    );
  }

  const flatCard = card.flat();
  const winningPatternNumbers = flatCard.filter((num) =>
    new Set(selectedNumbers).has(num)
  );

  const getCellColor = (num) => {
    const isSelected = selectedNumbers.includes(num);
    const isLastTwo = lastTwoNumbers.includes(num);
    const isWinningNumber = winningPatternNumbers.includes(num);

    if (reason === "recent_number_mismatch" && isWinningNumber && !isLastTwo) {
      return "bg-red-500 text-white border-2 border-red-700";
    }
    if (isSelected && isLastTwo) {
      return "bg-emerald-600 text-white border-2 border-emerald-800";
    }
    if (isSelected) {
      return "bg-emerald-500 text-white";
    }
    if (isLastTwo) {
      return "bg-yellow-400 text-gray-800 border-2 border-yellow-600";
    }
    return "bg-gray-200 text-gray-800";
  };

  const playAgain = () => {
    const myTelegramId = localStorage.getItem("telegramId");
    navigate(`/?user=${myTelegramId}&game=${gameId}`);
  };

 return (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 p-4">
    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-10 max-w-xl w-full text-center relative overflow-hidden">
      
      {/* Animated Sad Emoji */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-100 rounded-full blur-2xl opacity-30"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-100 rounded-full blur-2xl opacity-30"></div>
      
      <h1 className="text-4xl font-extrabold text-red-600 mb-3 animate-pulse drop-shadow">
        በመጨረሻዎቹ  ሁለት ቁጥሮች አልተዘጋም!
      </h1>
      <p className="text-gray-600 text-lg mb-6">{message}</p>

      {/* Last Numbers */}
      <div className="mb-8">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-2">
          መጨረሻ ላይ የወጡት ቁጥሮች
        </h3>
        <div className="flex justify-center gap-4">
          {lastTwoNumbers.map((num, index) => (
            <div
              key={index}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white text-lg font-bold flex items-center justify-center shadow-lg hover:scale-110 transform transition"
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Bingo Card */}
      <div className="bg-gray-50 p-6 rounded-2xl shadow-inner">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Bingo Card</h2>
        <p className="text-sm text-gray-500 mb-4">
          Card ID: <span className="font-mono text-gray-700">{cardId}</span>
        </p>
        <div className="grid grid-cols-5 gap-2">
          {card.map((row, rowIndex) =>
            row.map((num, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`flex items-center justify-center py-3 rounded-xl font-bold text-lg transition duration-200 ${getCellColor(
                  num
                )}`}
              >
                {num}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Play Again Button */}
      <button
        onClick={playAgain}
        className="mt-5 w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white text-lg font-bold rounded-full shadow-lg transition-transform transform hover:scale-105 active:scale-95"
      >
        Play Again
      </button>
    </div>
  </div>
);

};

export default WinnerFailed;
