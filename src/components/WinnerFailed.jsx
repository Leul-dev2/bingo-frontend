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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-3 animate-pulse">
          Not a Winner 😔
        </h1>
        <p className="text-gray-700 mb-6">{message}</p>

        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-1">Last 2 Numbers Drawn:</h3>
          <div className="flex justify-center gap-3">
            {lastTwoNumbers.map((num, index) => (
              <div
                key={index}
                className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shadow"
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-5 rounded-xl shadow-inner">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Your Bingo Card</h2>
          <p className="text-sm text-gray-500 mb-4">Card ID: <span className="font-mono">{cardId}</span></p>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {card.map((row, rowIndex) =>
              row.map((num, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`flex items-center justify-center p-2 rounded-lg font-bold text-lg transition-colors duration-200 ${getCellColor(num)}`}
                >
                  {num}
                </div>
              ))
            )}
          </div>

          <div className="border-t pt-4 text-left">
            <h3 className="font-semibold text-gray-800 mb-2">Why your claim failed:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                <span className="font-semibold text-emerald-600">Green</span>: Correctly marked numbers.
              </li>
              <li>
                <span className="font-semibold text-yellow-500">Yellow</span>: Last two numbers drawn.
              </li>
              <li>
                <span className="font-semibold text-red-600">Red</span>: This number was part of your winning line, but NOT one of the last two drawn. The last number in a win must be a recent one!
              </li>
            </ul>
          </div>
        </div>

        <button
          onClick={playAgain}
          className="mt-8 w-full py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold rounded-full shadow-md transition-transform transform hover:scale-105"
        >
          Play Agains
        </button>
      </div>
    </div>
  );
};

export default WinnerFailed;
