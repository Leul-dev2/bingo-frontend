import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela, selectedNumber } = location.state || {};

  // Game state variables
  const [gameId] = useState("100311389"); // Example game ID
  const [player] = useState("Derash");
  const [bonus] = useState("Bonus");
  const [players] = useState("Players");
  const [bet] = useState("Bet");
  const [countdown] = useState(29); // Example countdown timer
  const [currentCall] = useState(74); // Example current call

  const bingoColors = ["bg-orange-500", "bg-green-500", "bg-blue-500", "bg-yellow-500", "bg-red-500"];

  return (
    <div className="bg-purple-400 min-h-screen flex flex-col items-center p-4">
      {/* Top Section - Game Info */}
      <div className="grid grid-cols-5 gap-2 mt-2">
        <button className="bg-white p-2 rounded">Game {gameId}</button>
        <button className="bg-white p-2 rounded">{player}</button>
        <button className="bg-white p-2 rounded">{bonus}</button>
        <button className="bg-white p-2 rounded">{players}</button>
        <button className="bg-white p-2 rounded">{bet}</button>
      </div>

      {/* Main Grid Layout */}
      <div className="flex gap-6 mt-10">
        {/* Bingo Grid */}
        <div className="grid grid-cols-5 gap-2 bg-purple-300 p-2 rounded-lg">
          {["B", "I", "N", "G", "O"].map((letter, i) => (
            <div key={i} className={`text-white text-center p-4 text-lg font-bold rounded ${bingoColors[i]}`}>
              {letter}
            </div>
          ))}
          {[...Array(75)].map((_, i) => (
            <div key={i} className="bg-gray-200 text-center p-2 text-lg rounded">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Right Panel - Countdown & Current Call */}
        <div className="flex flex-col gap-4">
          <div className="bg-gray-300 p-4 rounded-lg text-center">
            <p>Countdown</p>
            <p className="text-3xl font-bold">{countdown}</p>
          </div>
          <div className="bg-purple-600 p-4 rounded-lg text-white relative">
            <p className="font-bold">Current Call</p>
            <div className="absolute top-0 right-0 w-10 h-10 bg-orange-500 rounded-full"></div>
          </div>
          
          {/* Player's Bingo Board */}
          <div className="bg-purple-300 p-4 rounded-lg">
            <div className="grid grid-cols-5 gap-2">
              {["B", "I", "N", "G", "O"].map((letter, i) => (
                <div key={i} className={`text-white text-center p-2 text-lg font-bold rounded ${bingoColors[i]}`}>
                  {letter}
                </div>
              ))}
              {[...Array(25)].map((_, i) => (
                <div
                  key={i}
                  className={`text-center p-2 text-lg rounded ${i + 1 === currentCall ? "bg-green-500" : "bg-gray-200"}`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <p className="text-center mt-2">Board number {currentCall}</p>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex gap-4 mt-6">
        <button className="bg-orange-500 px-6 py-2 text-white rounded-lg text-lg">Bingo!</button>
        <button className="bg-blue-500 px-6 py-2 text-white rounded-lg text-lg">Refresh</button>
        <button onClick={() => navigate("/")} className="bg-red-500 px-6 py-2 text-white rounded-lg text-lg">
          Leave
        </button>
      </div>
    </div>
  );
};

export default BingoGame;
