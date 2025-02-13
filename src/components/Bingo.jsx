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
  const [gameStatus, setGameStatus] = useState("");
  const numbers = Array.from({ length: 130 }, (_, i) => i + 1);

  const handleNumberClick = (number) => {
    setSelectedNumber(number);
    setCartela(generateCartela(number));
    setGameStatus("Ready to Start");
  };

  const resetGame = () => {
    setSelectedNumber(null);
    setCartela([]);
    setGameStatus("");
  };

  const startGame = () => {
    navigate("/game", { state: { cartela, selectedNumber } });
  };

  return (
    <div className="flex flex-col items-center p-5 min-h-screen bg-purple-400 text-white w-full overflow-hidden">
    

      {/* Game Info */}
      <div className="flex justify-around w-full max-w-lg mb-2">
        <div className="bg-white text-purple-400 px-10 py-1 rounded-3xl text-center font-bold text-sm">
          Wallet<br /><span className="font-bold">0</span>
        </div>
        <div className="bg-white text-purple-400 px-3 py-1 rounded-3xl text-center font-bold text-sm">
          Game Started<br />
          <span className="font-bold">{gameStatus}</span>
        </div>
        <div className="bg-white text-purple-400 px-10 py-1 rounded-3xl text-center text-sm font-bold">
          Stake<br /><span className="font-bold">10</span>
        </div>
      </div>

      {/* Number Selection */}
      <div className="grid grid-cols-10 gap-1 p-2 max-w-lg w-full text-xs">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className={`w-10 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs ${
              selectedNumber === num ? "bg-green-500 text-white" : "bg-purple-50 text-black"
            }`}
          >
            {num}
          </button>
        ))}
      </div>

      {/* 5x5 Grid Display */}
      {cartela.length > 0 && (
        <div className="">
          <div className="grid grid-cols-5 gap-1 p-2 bg-transparent text-white ">
            {cartela.map((num, index) => (
              <div
                key={index}
                className="w-10 h-10 flex items-center justify-center border border-white rounded-lg text-xs font-bold bg-purple-50 text-black"
              >
                {num}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={resetGame}
          className="bg-blue-500 text-white px-3 py-1 rounded-lg shadow-md text-sm"
        >
          Refresh
        </button>
        <button
          onClick={startGame}
          className="bg-orange-500 text-white px-3 py-1 rounded-lg shadow-md text-sm"
          disabled={!selectedNumber}
        >
          Start Game
        </button>
      </div>
    </div>
  );
};

export default Bingo;
