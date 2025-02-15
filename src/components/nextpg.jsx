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

  const [allCalledNumbers, setAllCalledNumbers] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());
  const [countdown, setCountdown] = useState(15);
  const [calledSet, setCalledSet] = useState(new Set()); // Track called numbers

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      callNewNumber(); // Call first number immediately after countdown
      const interval = setInterval(callNewNumber, 3000);
      return () => clearInterval(interval);
    }
  }, [countdown]);

  const callNewNumber = () => {
    if (calledSet.size >= 75) return; // Stop calling after all numbers are used

    let newCall;
    do {
      const letterIndex = Math.floor(Math.random() * 5);
      const number = Math.floor(Math.random() * 15) + letterIndex * 15 + 1;
      newCall = `${["B", "I", "N", "G", "O"][letterIndex]}-${number}`;
    } while (calledSet.has(newCall)); // Ensure unique number

    setCurrentCall(newCall);
    setCalledSet((prev) => new Set(prev).add(newCall));
    setAllCalledNumbers((prev) => [...prev, newCall]);
    setCalledNumbers((prev) =>
      prev.length < 5 ? [...prev, newCall] : [...prev.slice(1), newCall]
    );
  };

  const handleCartelaClick = (num) => {
    setSelectedNumbers((prev) => {
      const newSelection = new Set(prev);
  
      if (newSelection.has(num)) {
        newSelection.delete(num); // Deselect if already selected
      } else {
        newSelection.add(num); // Select if not already selected
      }

      localStorage.setItem("selectedNumbers", JSON.stringify([...newSelection]));
      return newSelection;
    });
  };

  const checkForWin = () => {
    if (selectedNumbers.size >= 5) {
      navigate("/win", {
        state: {
          winnerName: "Aki",
          prizeAmount: 40,
          board: cartela.map((num) => ({ value: num, selected: selectedNumbers.has(num) })),
          boardNumber: 74,
        },
      });
    }
  };

  return (
    <div className="bg-purple-400 min-h-screen flex flex-col items-center p-2 w-full max-w-screen overflow-hidden">
      <div className="grid grid-cols-5 sm:grid-cols-5 gap-1 w-full p-2 bg-purple-600 text-white text-center">
        {["Game 100311389", "Derash", "Bonus", "Players", "Bet"].map((info, i) => (
          <button key={i} className="bg-white text-black p-1 text-sm rounded w-full">
            {info}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap w-full mt-4">
        <div className="w-1/2 flex justify-center">
          <div className="grid grid-cols-5 gap-1 bg-purple-300 p-2 rounded-lg text-xs w-[90%]">
            {["B", "I", "N", "G", "O"].map((letter, i) => (
              <div key={i} className={`text-white text-center p-2 font-bold rounded ${bingoColors[letter]}`}>
                {letter}
              </div>
            ))}
            {[...Array(15)].map((_, rowIndex) =>
              ["B", "I", "N", "G", "O"].map((letter, colIndex) => {
                const number = rowIndex + 1 + colIndex * 15;
                const bingoNumber = `${letter}-${number}`;
                return (
                  <div
                    key={bingoNumber}
                    className={`text-center p-1 rounded ${
                      currentCall === bingoNumber
                        ? "bg-orange-500"
                        : calledSet.has(bingoNumber)
                        ? "bg-yellow-500"
                        : "bg-gray-200"
                    }`}
                  >
                    {number}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="w-1/2 flex flex-col items-center gap-2">
          <div className="bg-gray-300 p-2 rounded-lg text-center text-xs w-[90%]">
            <p>Countdown</p>
            <p className="text-lg font-bold">{countdown > 0 ? countdown : "Game Started"}</p>
          </div>

          <div className="bg-purple-600 p-2 rounded-lg text-white flex flex-col items-center w-[90%]">
            <p className="font-bold text-sm">Current Call</p>
            <div className={`w-16 h-16 flex items-center justify-center text-lg font-extrabold rounded-full shadow-lg ${currentCall ? bingoColors[currentCall.charAt(0)] : "bg-orange-500"}`}>
              {currentCall || "Waiting..."}
            </div>
          </div>

          <div className="bg-gray-100 p-2 rounded-lg w-[90%]">
            <p className="text-center font-bold text-sm">Called Numbers</p>
            <div className="grid grid-cols-5 gap-1 mt-1 text-xs">
              {calledNumbers.map((num, i) => {
                const letter = num.charAt(0);
                return (
                  <div key={i} className={`p-1 text-xs text-center rounded text-white ${bingoColors[letter]}`}>
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-purple-300 p-2 rounded-lg w-[90%]">
            <div className="grid grid-cols-5 gap-1 text-xs">
              {["B", "I", "N", "G", "O"].map((letter, i) => (
                <div key={i} className={`text-white text-center p-1 font-bold rounded ${bingoColors[letter]}`}>
                  {letter}
                </div>
              ))}
              {cartela &&
                cartela.map((num, i) => (
                  <div
                    key={i}
                    onClick={() => handleCartelaClick(num)}
                    className={`text-center p-1 rounded cursor-pointer ${
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

      <div className="w-full flex flex-col items-center gap-2 mt-4">
        <button onClick={checkForWin} className="w-full bg-orange-500 px-4 py-2 text-white rounded-lg text-lg">
          Bingo!
        </button>
        <div className="w-full flex gap-2">
          <button className="w-1/2 bg-blue-500 px-4 py-2 text-white rounded-lg text-lg">
            Refresh
          </button>
          <button onClick={() => navigate("/")} className="w-1/2 bg-red-500 px-4 py-2 text-white rounded-lg text-lg">
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default BingoGame;
