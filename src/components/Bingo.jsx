import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const generateCartela = (selectedNumber) => {
  let numbers = new Set();
  while (numbers.size < 24) {
    let num = Math.floor(Math.random() * 130) + 1;
    if (num !== selectedNumber) numbers.add(num);
  }
  let cartela = Array.from(numbers);
  cartela.splice(12, 0, "*"); // Insert Free Space
  return cartela;
};

const Bingo = () => {
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [cartela, setCartela] = useState([]);
  const navigate = useNavigate();
  const [gameStatus, setGameStatus] = useState(""); // ✅ Empty initially
  const numbers = Array.from({ length: 130 }, (_, i) => i + 1);

  const handleNumberClick = (number) => {
    setSelectedNumber(number);
    setCartela(generateCartela(number));
    setGameStatus("Ready to Start"); // ✅ Update message
  };

  const resetGame = () => {
    setSelectedNumber(null);
    setCartela([]);
    setGameStatus(""); // ✅ Reset to empty
  };

  const startGame = () => {
    navigate("/game", { state: { cartela, selectedNumber } });
  };

  return (
    <div className="flex flex-col items-center p-4 min-h-screen bg-purple-400 text-white">
      <h1 className="text-2xl font-bold mb-4">Go Bingo</h1>

      {/* Game Info */}
      <div className="flex justify-around w-full max-w-lg mb-4">
        <div className="bg-white text-black px-4 py-2 rounded-lg text-center">
          Wallet<br /><span className="font-bold">0</span>
        </div>
        <div className="bg-white text-black px-4 py-2 rounded-lg text-center">
          Game Started<br />
          <span className="font-bold">{gameStatus}</span> {/* ✅ Starts empty */}
        </div>
        <div className="bg-white text-black px-4 py-2 rounded-lg text-center">
          Stake<br /><span className="font-bold">10</span>
        </div>
      </div>

      {/* Number Selection */}
      <div className="grid grid-cols-10 gap-2 p-2 max-w-lg w-full">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className={`w-8 h-8 text-sm flex items-center justify-center rounded-md border border-gray-300 cursor-pointer transition-all duration-200 ${
              selectedNumber === num ? "bg-green-500 text-white" : "bg-transparent border-white"
            }`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Cartela Display */}
      {cartela.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Your Cartela</h2>
          <div className="grid grid-cols-5 gap-2 p-4 bg-transparent text-white">
            {cartela.map((num, index) => (
              <div
                key={index}
                className="w-12 h-12 flex items-center justify-center border border-white rounded-lg text-lg font-bold"
              >
                {num}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={resetGame}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-600"
        >
          Refresh
        </button>
        <button
          onClick={startGame}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-orange-600"
          disabled={!selectedNumber}
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default Bingo;
