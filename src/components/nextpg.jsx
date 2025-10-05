import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket";

const BingoCell = React.memo(({ num, isFreeSpace, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`w-12 h-12 flex items-center justify-center font-bold text-sm border border-gray-400 rounded cursor-pointer transition-colors
        ${
          isFreeSpace
            ? "bg-yellow-400 text-gray-900"
            : isSelected
            ? "bg-green-500 text-white"
            : "bg-white text-gray-900 hover:bg-gray-100"
        }`}
    >
      {isFreeSpace ? "★" : num}
    </div>
  );
});

const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela, cartelaId, gameId, telegramId, GameSessionId, selectedBoards } = location.state || {};

  const [randomNumber, setRandomNumber] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());
  const [countdown, setCountdown] = useState(0);
  const [calledSet, setCalledSet] = useState(new Set());
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasEmittedGameCount, setHasEmittedGameCount] = useState(false);
  const [isGameEnd, setIsGameEnd] = useState(false);
  const [callNumberLength, setCallNumberLength] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [lastCalledLabel, setLastCalledLabel] = useState(null);

  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedNumbersPerBoard, setSelectedNumbersPerBoard] = useState({});

  const [gameDetails, setGameDetails] = useState({
    winAmount: '-',
    playersCount: '-',
    stakeAmount: '10',
  });

  const hasJoinedRef = useRef(false);

  // Initialize boards
  useEffect(() => {
    if (selectedBoards && selectedBoards.length > 0) {
      setActiveBoards(selectedBoards);
      const initialSelections = {};
      selectedBoards.forEach(board => {
        initialSelections[board.cartelaId] = new Set();
      });
      setSelectedNumbersPerBoard(initialSelections);
    } else if (cartelaId && cartela) {
      setActiveBoards([{ cartelaId, cartela }]);
      setSelectedNumbersPerBoard({ [cartelaId]: new Set() });
      setSelectedNumbers(new Set());
    }
  }, [selectedBoards, cartelaId, cartela]);

  // Socket events
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    if (!hasJoinedRef.current && gameId && telegramId) {
      socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      hasJoinedRef.current = true;
    }

    const handleGameDetails = ({ winAmount, playersCount, stakeAmount }) => {
      setGameDetails({ winAmount, playersCount, stakeAmount });
    };

    const handleCountdownTick = ({ countdown }) => setCountdown(countdown);
    const handleNumberDrawn = ({ number, label, callNumberLength }) => {
      setRandomNumber(prev => [...prev, number]);
      setCalledSet(prev => new Set(prev).add(label));
      setCallNumberLength(callNumberLength);
      setLastCalledLabel(label);
    };

    socket.on("gameDetails", handleGameDetails);
    socket.on("countdownTick", handleCountdownTick);
    socket.on("numberDrawn", handleNumberDrawn);

    return () => {
      socket.off("gameDetails", handleGameDetails);
      socket.off("countdownTick", handleCountdownTick);
      socket.off("numberDrawn", handleNumberDrawn);
    };
  }, [gameId, telegramId, GameSessionId]);

  // Handle number click - sync across boards
  const handleNumberClick = useCallback((num, boardId) => {
    setSelectedNumbersPerBoard(prev => {
      const newSelections = { ...prev };
      
      // Toggle this number in ALL boards
      Object.keys(newSelections).forEach(bId => {
        const currentSelections = new Set(newSelections[bId] || []);
        if (currentSelections.has(num)) {
          currentSelections.delete(num);
        } else {
          currentSelections.add(num);
        }
        newSelections[bId] = currentSelections;
      });
      
      return newSelections;
    });
  }, []);

  const checkForWin = (boardId) => {
    const selectedSet = selectedNumbersPerBoard[boardId] || new Set();
    const selectedArray = Array.from(selectedSet);
    
    socket.emit("checkWinner", {
      telegramId,
      gameId,
      GameSessionId,
      cartelaId: boardId, 
      selectedNumbers: selectedArray,
    });
  };

  const navigateToAddBoard = () => {
    navigate("/add-board", {
      state: {
        telegramId,
        gameId,
        GameSessionId,
        existingBoards: activeBoards,
        countdown
      }
    });
  };

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header - Exact match from image */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Addis Bingo</h1>
        
        {/* Game Info Table */}
        <div className="grid grid-cols-7 gap-1 mb-4 text-xs font-medium">
          <div className="bg-blue-100 p-2 rounded">Game {gameId?.slice(-6) || 'IF7923'}</div>
          <div className="bg-green-100 p-2 rounded">Derash {gameDetails.winAmount}</div>
          <div className="bg-yellow-100 p-2 rounded">Bonus On</div>
          <div className="bg-red-100 p-2 rounded">Players {gameDetails.playersCount}</div>
          <div className="bg-purple-100 p-2 rounded">Stake {gameDetails.stakeAmount}</div>
          <div className="bg-indigo-100 p-2 rounded">Call {callNumberLength}</div>
          <div className="bg-gray-100 p-2 rounded">Sound (4)</div>
        </div>

        {/* Count Down Section */}
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <div className="text-lg font-bold text-gray-800 mb-2">
            {countdown > 0 ? `Count Down Started - ${countdown}s` : "Count Down"}
          </div>
          <div className="flex justify-center items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Current Call</div>
              <div className="text-xl font-bold text-green-600">
                {lastCalledLabel || "6-58"}
              </div>
            </div>
            <div className="flex gap-2">
              {["B", "I", "N", "G", "O"].map(letter => (
                <div key={letter} className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  {letter}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bingo Boards */}
      <div className={`grid ${activeBoards.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-6 mb-6`}>
        {activeBoards.map((board, boardIndex) => {
          const boardSelections = selectedNumbersPerBoard[board.cartelaId] || new Set();
          const selectedCount = boardSelections.size;
          const completionPercentage = Math.round((selectedCount / 24) * 100); // 24 numbers (excluding free space)
          
          return (
            <div key={board.cartelaId} className="bg-white border-2 border-gray-300 rounded-lg p-4">
              {/* Board Header with Percentage */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-bold text-gray-800">
                  {boardIndex === 0 ? "PRIMARY BOARD" : "SECONDARY BOARD"}
                </div>
                <div className="text-sm font-bold bg-blue-100 px-3 py-1 rounded-full">
                  {completionPercentage}% {selectedCount.toString().padStart(3, '0')}
                </div>
              </div>

              {/* BINGO Header */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {["B", "I", "N", "G", "O"].map((letter, i) => (
                  <div key={i} className="bg-blue-600 text-white text-center py-2 font-bold rounded">
                    {letter}
                  </div>
                ))}
              </div>

              {/* Bingo Numbers Grid */}
              <div className="grid grid-cols-5 gap-2">
                {board.cartela.map((row, rowIndex) =>
                  row.map((num, colIndex) => {
                    const isFreeSpace = rowIndex === 2 && colIndex === 2;
                    const isSelected = boardSelections.has(num);

                    return (
                      <BingoCell
                        key={`${board.cartelaId}-${rowIndex}-${colIndex}`}
                        num={num}
                        isFreeSpace={isFreeSpace}
                        isSelected={isSelected}
                        onClick={() => handleNumberClick(num, board.cartelaId)}
                      />
                    );
                  })
                )}
              </div>

              {/* BINGO Button */}
              <button 
                onClick={() => checkForWin(board.cartelaId)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg mt-4 text-lg"
              >
                BINGO! {activeBoards.length > 1 && `(${board.cartelaId})`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Action Buttons - Bottom */}
      <div className="flex justify-center gap-4 mb-8">
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold">
          Refresh
        </button>
        <button className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold">
          Leave
        </button>
        {activeBoards.length === 1 && (
          <button 
            onClick={navigateToAddBoard}
            className="bg-purple-500 hover:bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold"
          >
            Add Board
          </button>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-3">
        <div className="flex justify-around">
          {["Game", "Scores", "History", "Wallet", "Profile"].map(item => (
            <button key={item} className="text-sm font-medium">
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BingoGame;