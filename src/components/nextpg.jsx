import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela } = location.state || {};

  const bingoColors = {
    B: "bg-yellow-500",
    I: "bg-green-500",
    N: "bg-blue-500",
    G: "bg-red-500",
    O: "bg-purple-500",
  };

  const [currentCall, setCurrentCall] = useState(null);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      const letterIndex = Math.floor(Math.random() * 5);
      const number = Math.floor(Math.random() * 15) + letterIndex * 15 + 1;
      const newCall = `${["B", "I", "N", "G", "O"][letterIndex]}-${number}`;

      setCurrentCall(newCall);
      setCalledNumbers((prev) =>
        prev.length < 5 ? [...prev, newCall] : [...prev.slice(1), newCall]
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleCartelaClick = (num) => {
    setSelectedNumbers((prev) => new Set(prev).add(num));
  };

  return (
    <div className="bg-purple-400 min-h-screen flex flex-col items-center p-4">
      {/* Game Info */}
      <div className="grid grid-cols-5 gap-2 mt-2">
        {["Game 100311389", "Derash", "Bonus", "Players", "Bet"].map((info, i) => (
          <button key={i} className="bg-white p-2 rounded">{info}</button>
        ))}
      </div>

      {/* Main Grid and Right Panel */}
      <div className="flex gap-2 mt-10">
        {/* Bingo Board */}
        <div className="grid grid-cols-5 gap-2 bg-purple-300 p-2 rounded-lg">
          {["B", "I", "N", "G", "O"].map((letter, i) => (
            <div key={i} className={`text-white text-center p-4 text-lg font-bold rounded ${bingoColors[letter]}`}>
              {letter}
            </div>
          ))}
          {[...Array(75)].map((_, i) => {
            const number = i + 1;
            const letter = ["B", "I", "N", "G", "O"][Math.floor(i / 15)];
            const bingoNumber = `${letter}-${number}`;

            return (
              <div
                key={i}
                className={`text-center p-2 text-lg rounded ${
                  currentCall === bingoNumber
                    ? "bg-orange-500"
                    : calledNumbers.includes(bingoNumber)
                    ? "bg-yellow-500"
                    : "bg-gray-200"
                }`}
              >
                {number}
              </div>
            );
          })}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-2">
          {/* Countdown & Current Call */}
          <div className="bg-gray-300 p-4 rounded-lg text-center">
            <p>Countdown</p>
            <p className="text-3xl font-bold">Game Started</p>
          </div>

          {/* Current Call */}
          <div className="bg-purple-600 p-4 rounded-lg text-white flex flex-col items-center">
            <p className="font-bold">Current Call</p>
            <div className={`w-16 h-16 flex items-center justify-center text-xl font-bold rounded-full ${currentCall ? bingoColors[currentCall.charAt(0)] : "bg-orange-500"}`}>
              {currentCall || "Waiting..."}
            </div>
          </div>

          {/* Called Numbers */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="text-center font-bold">Called Numbers</p>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {calledNumbers.map((num, i) => {
                const letter = num.charAt(0);
                return (
                  <div key={i} className={`p-2 text-sm text-center rounded text-white ${bingoColors[letter]}`}>
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cartella */}
          <div className="bg-purple-300 p-4 rounded-lg">
            <div className="grid grid-cols-5 gap-2">
              {["B", "I", "N", "G", "O"].map((letter, i) => (
                <div key={i} className={`text-white text-center p-2 text-lg font-bold rounded ${bingoColors[letter]}`}>
                  {letter}
                </div>
              ))}
              {cartela &&
                cartela.map((num, i) => (
                  <div
                    key={i}
                    onClick={() => handleCartelaClick(num)}
                    className={`text-center p-2 text-lg rounded cursor-pointer ${
                      selectedNumbers.has(num) ? "bg-green-500" : "bg-gray-200"
                    }`}
                  >
                    {num}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="w-full flex flex-col items-center gap-4 mt-6">
        <button className="w-full bg-orange-500 px-6 py-2 text-white rounded-lg text-lg">
          Bingo!
        </button>
        <div className="w-full flex gap-4">
          <button className="w-1/2 bg-blue-500 px-6 py-2 text-white rounded-lg text-lg">
            Refresh
          </button>
          <button onClick={() => navigate("/")} className="w-1/2 bg-red-500 px-6 py-2 text-white rounded-lg text-lg">
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default BingoGame;
