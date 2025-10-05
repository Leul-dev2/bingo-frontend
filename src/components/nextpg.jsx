import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket";

// Enhanced BingoCell with better animations
const BingoCell = React.memo(({ num, isFreeSpace, isSelected, onClick, isCalled }) => {
  return (
    <div
      onClick={onClick}
      className={`
        w-6 h-6 md:w-7 md:h-7 flex items-center justify-center 
        font-bold text-xs md:text-sm
        border border-gray-300 rounded
        cursor-pointer transition-all duration-200
        transform hover:scale-110
        ${
          isFreeSpace
            ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-gray-900"
            : isSelected
            ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-inner"
            : isCalled
            ? "bg-gradient-to-br from-blue-400 to-blue-500 text-white"
            : "bg-white text-gray-900 hover:bg-gray-50"
        }
        ${isSelected ? 'ring-1 ring-white ring-opacity-50' : ''}
      `}
    >
      {isFreeSpace ? "⭐" : num}
    </div>
  );
});

const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela, cartelaId, gameId, telegramId, GameSessionId, selectedBoards } = location.state || {};

  const bingoColors = {
    B: "bg-blue-500",
    I: "bg-red-500", 
    N: "bg-green-500",
    G: "bg-yellow-500",
    O: "bg-purple-500",
  };

  // State management
  const [randomNumber, setRandomNumber] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const [calledSet, setCalledSet] = useState(new Set());
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasEmittedGameCount, setHasEmittedGameCount] = useState(false);
  const [isGameEnd, setIsGameEnd] = useState(false);
  const [callNumberLength, setCallNumberLength] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [lastCalledLabel, setLastCalledLabel] = useState(null);
  const [showAddBoardWarning, setShowAddBoardWarning] = useState(false);

  // Multi-board states
  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedNumbersPerBoard, setSelectedNumbersPerBoard] = useState({});

  const [gameDetails, setGameDetails] = useState({
    winAmount: '-',
    playersCount: '-',
    stakeAmount: '-',
    gameType: 'Standard',
  });

  const hasJoinedRef = useRef(false);
  const saveTimeout = useRef(null);

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
    }
  }, [selectedBoards, cartelaId, cartela]);

  // Socket event handling
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    
    if (!hasJoinedRef.current && gameId && telegramId) {
      socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      hasJoinedRef.current = true;
    }

    const handleSocketConnect = () => {
      if (gameId && telegramId) {
        socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      }
    };

    const handlePlayerCountUpdate = ({ playerCount }) => setPlayerCount(playerCount);
    const handleCountdownTick = ({ countdown }) => setCountdown(countdown);
    const handleGameStart = () => setGameStarted(true);
    const handleGameEnd = () => setIsGameEnd(true);
    const handleGameReset = () => {
      setHasEmittedGameCount(false);
      setRandomNumber([]);
      setCalledSet(new Set());
      setSelectedNumbersPerBoard({});
      setCountdown(0);
      setGameStarted(false);
      setLastCalledLabel(null);
      setIsGameEnd(false);
    };

    const handleDrawnNumbersHistory = ({ gameId: receivedGameId, history }) => {
      if (receivedGameId === gameId) {
        const numbers = history.map(item => item.number);
        const labels = new Set(history.map(item => item.label));
        setRandomNumber(numbers);
        setCalledSet(labels);
        if (history.length > 0) {
          setLastCalledLabel(history[history.length - 1].label);
        }
      }
    };

    const handleNumberDrawn = ({ number, label, callNumberLength }) => {
      setRandomNumber(prev => [...prev, number]);
      setCalledSet(prev => new Set(prev).add(label));
      setCallNumberLength(callNumberLength);
      setLastCalledLabel(label);
    };

    const handleGameDetails = ({ winAmount, playersCount, stakeAmount }) => {
      setGameDetails({ winAmount, playersCount, stakeAmount });
    };

    const handleWinnerConfirmed = ({ winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId }) => {
      navigate("/winnerPage", { 
        state: { winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId } 
      });
    };

    // Register event listeners
    const events = {
      connect: handleSocketConnect,
      playerCountUpdate: handlePlayerCountUpdate,
      countdownTick: handleCountdownTick,
      gameStart: handleGameStart,
      gameEnd: handleGameEnd,
      gameReset: handleGameReset,
      drawnNumbersHistory: handleDrawnNumbersHistory,
      numberDrawn: handleNumberDrawn,
      gameDetails: handleGameDetails,
      winnerConfirmed: handleWinnerConfirmed,
    };

    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [gameId, telegramId, GameSessionId, navigate]);

  // Game count emission
  useEffect(() => {
    if (playerCount >= 2 && !hasEmittedGameCount && !gameStarted) {
      socket.emit("gameCount", { gameId, GameSessionId });
      setHasEmittedGameCount(true);
    }
  }, [playerCount, gameStarted, hasEmittedGameCount, gameId]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Enhanced click handler - selects same number across all boards
  const handleNumberClick = useCallback((num) => {
    setSelectedNumbersPerBoard(prev => {
      const newSelections = { ...prev };
      
      // Toggle this number in all boards
      Object.keys(newSelections).forEach(boardId => {
        const currentSelections = new Set(newSelections[boardId] || []);
        if (currentSelections.has(num)) {
          currentSelections.delete(num);
        } else {
          currentSelections.add(num);
        }
        newSelections[boardId] = currentSelections;
      });

      // Auto-save
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        localStorage.setItem("selectedNumbersPerBoard", JSON.stringify(
          Object.fromEntries(
            Object.entries(newSelections).map(([id, set]) => [id, [...set]])
          )
        ));
      }, 300);
      
      return newSelections;
    });
  }, []);

  // Win checking
  const checkForWin = useCallback((boardId) => {
    const selectedSet = selectedNumbersPerBoard[boardId] || new Set();
    const selectedArray = Array.from(selectedSet);

    if (selectedArray.length < 5) {
      alert("You need at least 5 numbers selected to claim BINGO!");
      return;
    }

    if (window.confirm("Are you sure you want to claim BINGO?")) {
      socket.emit("checkWinner", {
        telegramId,
        gameId,
        GameSessionId,
        cartelaId: boardId,
        selectedNumbers: selectedArray,
      });
    }
  }, [selectedNumbersPerBoard, telegramId, gameId, GameSessionId]);

  // Helper function to check if a number exists in any board
  const isNumberInAnyBoard = useCallback((number) => {
    return activeBoards.some(board => 
      board.cartela.some(row => row.includes(number))
    );
  }, [activeBoards]);

  // Check if number is called
  const isNumberCalled = useCallback((number) => {
    return Array.from(calledSet).some(label => {
      const num = label.split('-')[1];
      return parseInt(num) === number;
    });
  }, [calledSet]);

  // Single board layout (original layout)
  const renderSingleBoardLayout = () => (
    <div className="min-h-screen bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black flex flex-col items-center p-4">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-2xl text-white text-center mb-4">
        {[
          `Game ${gameId?.slice(-4) || '----'}`,
          `Players ${gameDetails.playersCount}`,
          `Stake ${gameDetails.stakeAmount}`,
          `Call ${callNumberLength}`,
        ].map((info, i) => (
          <div key={i} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-2 text-xs rounded">
            {info}
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row w-full max-w-6xl gap-4">
        {/* Called Numbers Board */}
        <div className="lg:w-2/5">
          <div className="bg-[#2a0047] p-4 rounded-lg">
            <div className="grid grid-cols-5 gap-1 mb-2">
              {["B", "I", "N", "G", "O"].map((letter, i) => (
                <div key={i} className={`text-white text-center text-sm font-bold rounded h-6 ${bingoColors[letter]}`}>
                  {letter}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[...Array(15)].map((_, rowIndex) =>
                ["B", "I", "N", "G", "O"].map((letter, colIndex) => {
                  const number = rowIndex + 1 + colIndex * 15;
                  const isCalled = calledSet.has(`${letter}-${number}`);
                  return (
                    <div
                      key={`${letter}-${number}`}
                      className={`text-center text-xs p-1 rounded ${
                        isCalled
                          ? "bg-gradient-to-b from-yellow-400 to-orange-500 text-black font-bold"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {number}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Game Controls & Board */}
        <div className="lg:w-3/5 space-y-4">
          {/* Current Number & Controls */}
          <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg p-4 text-white">
            <div className="flex justify-between items-center">
              <div className="text-center">
                <div className="text-sm">Current Number</div>
                <div className="text-2xl font-bold">{lastCalledLabel || "-"}</div>
              </div>
              <div className="text-center">
                <div className="text-sm">Countdown</div>
                <div className="text-2xl font-bold">{countdown > 0 ? countdown : "Wait"}</div>
              </div>
            </div>
          </div>

          {/* Bingo Board */}
          {activeBoards.map((board) => (
            <div key={board.cartelaId} className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg p-4">
              <div className="text-center text-yellow-400 text-sm mb-2 font-bold">
                PRIMARY BOARD
              </div>
              
              <div className="grid grid-cols-5 gap-1 mb-2">
                {["B", "I", "N", "G", "O"].map((letter, i) => (
                  <div key={i} className={`text-white text-center text-sm font-bold rounded h-6 ${bingoColors[letter]}`}>
                    {letter}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-1">
                {board.cartela.map((row, rowIndex) =>
                  row.map((num, colIndex) => {
                    const isFreeSpace = rowIndex === 2 && colIndex === 2;
                    const isSelected = (selectedNumbersPerBoard[board.cartelaId] || new Set()).has(num);
                    const isCalled = isNumberCalled(num);

                    return (
                      <BingoCell
                        key={`${board.cartelaId}-${rowIndex}-${colIndex}`}
                        num={num}
                        isFreeSpace={isFreeSpace}
                        isSelected={isSelected}
                        isCalled={isCalled}
                        onClick={() => handleNumberClick(num)}
                      />
                    );
                  })
                )}
              </div>

              <button 
                onClick={() => checkForWin(board.cartelaId)}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 px-4 py-2 text-white rounded text-sm font-bold mt-3"
              >
                BINGO!
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Dual board layout (matching your image)
  const renderDualBoardLayout = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-2">
      {/* Header - Matching your design exactly */}
      <div className="bg-white rounded-lg p-3 mb-2 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold text-gray-800">Addis Bingo</h1>
          <div className="text-right">
            <div className="text-sm text-gray-600">Count Down Started</div>
            <div className="text-lg font-bold text-green-600">{countdown > 0 ? countdown : "Ready"}</div>
          </div>
        </div>
        
        {/* Game Info Row */}
        <div className="grid grid-cols-7 gap-1 text-xs font-medium">
          <div className="bg-blue-100 rounded p-1 text-center">Game {gameId?.slice(-4) || '----'}</div>
          <div className="bg-green-100 rounded p-1 text-center">Derash {gameDetails.winAmount}</div>
          <div className="bg-yellow-100 rounded p-1 text-center">Bonus On</div>
          <div className="bg-red-100 rounded p-1 text-center">Players {gameDetails.playersCount}</div>
          <div className="bg-purple-100 rounded p-1 text-center">Stake {gameDetails.stakeAmount}</div>
          <div className="bg-indigo-100 rounded p-1 text-center">Call {callNumberLength}</div>
          <div 
            className="bg-gray-100 rounded p-1 text-center cursor-pointer"
            onClick={() => setIsAudioOn(!isAudioOn)}
          >
            Sound {isAudioOn ? "🔊" : "🔇"}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Side - Called Numbers & Current Number */}
        <div className="lg:w-1/4 space-y-4">
          {/* Current Number Display */}
          <div className="bg-white rounded-lg p-4 text-center shadow-lg">
            <div className="text-sm text-gray-600 mb-2">Current Number</div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {lastCalledLabel?.split('-')[1] || "-"}
              </div>
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {lastCalledLabel?.split('-')[0] || "B"}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">6-58</div>
          </div>

          {/* Called Numbers Board */}
          <div className="bg-white rounded-lg p-3 shadow-lg">
            <div className="grid grid-cols-5 gap-1 mb-2">
              {["B", "I", "N", "G", "O"].map((letter, i) => (
                <div key={i} className={`text-white text-center text-xs font-bold rounded h-6 flex items-center justify-center ${bingoColors[letter]}`}>
                  {letter}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1 max-h-60 overflow-y-auto">
              {[...Array(15)].map((_, rowIndex) =>
                ["B", "I", "N", "G", "O"].map((letter, colIndex) => {
                  const number = rowIndex + 1 + colIndex * 15;
                  const isCalled = calledSet.has(`${letter}-${number}`);
                  return (
                    <div
                      key={`${letter}-${number}`}
                      className={`text-center text-xs p-1 rounded ${
                        isCalled
                          ? "bg-green-500 text-white font-bold"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {number}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Dual Boards */}
        <div className="lg:w-3/4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBoards.map((board, index) => {
              const boardSelections = selectedNumbersPerBoard[board.cartelaId] || new Set();
              const selectedCount = boardSelections.size;
              const totalNumbers = 25; // 5x5 grid
              const completionPercentage = Math.round((selectedCount / totalNumbers) * 100);
              
              return (
                <div key={board.cartelaId} className="bg-white rounded-lg p-4 shadow-lg">
                  {/* Board Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-sm font-bold text-gray-700">
                      {index === 0 ? "PRIMARY BOARD" : "SECONDARY BOARD"}
                    </div>
                    <div className="text-xs bg-blue-100 rounded-full px-2 py-1">
                      {completionPercentage}% {selectedCount.toString().padStart(3, '0')}
                    </div>
                  </div>

                  {/* BINGO Header */}
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {["B", "I", "N", "G", "O"].map((letter, i) => (
                      <div key={i} className={`text-white text-center text-xs font-bold rounded h-6 flex items-center justify-center ${bingoColors[letter]}`}>
                        {letter}
                      </div>
                    ))}
                  </div>

                  {/* Bingo Grid */}
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {board.cartela.map((row, rowIndex) =>
                      row.map((num, colIndex) => {
                        const isFreeSpace = rowIndex === 2 && colIndex === 2;
                        const isSelected = boardSelections.has(num);
                        const isCalled = isNumberCalled(num);
                        const letter = ["B", "I", "N", "G", "O"][colIndex];

                        return (
                          <BingoCell
                            key={`${board.cartelaId}-${rowIndex}-${colIndex}`}
                            num={num}
                            isFreeSpace={isFreeSpace}
                            isSelected={isSelected}
                            isCalled={isCalled}
                            onClick={() => handleNumberClick(num)}
                          />
                        );
                      })
                    )}
                  </div>

                  {/* Bingo Button */}
                  <button 
                    onClick={() => checkForWin(board.cartelaId)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 rounded shadow-md transition-all"
                  >
                    BINGO! ({board.cartelaId})
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2 rounded-full font-semibold shadow-lg transition-colors"
          onClick={() => {
            if (gameId && telegramId) {
              socket.emit("joinGame", { gameId, telegramId, GameSessionId });
            }
          }}
        >
          Refresh
        </button>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to leave the game?")) {
              socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
                navigate("/");
              });
            }
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-8 py-2 rounded-full font-semibold shadow-lg transition-colors"
        >
          Leave
        </button>
      </div>

      {/* Add Board Button - Only show if single board */}
      {activeBoards.length === 1 && (
        <button
          onClick={() => {
            if (countdown < 10) {
              setShowAddBoardWarning(true);
              return;
            }
            navigate("/add-board", {
              state: {
                telegramId,
                gameId,
                GameSessionId,
                existingBoards: activeBoards,
                countdown
              }
            });
          }}
          className="fixed top-4 right-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-full font-semibold shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          + Add Board
        </button>
      )}
    </div>
  );

  // Render appropriate layout based on number of boards
  return (
    <>
      {activeBoards.length === 1 ? renderSingleBoardLayout() : renderDualBoardLayout()}

      {/* Add Board Warning Modal */}
      {showAddBoardWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm mx-4">
            <h3 className="text-lg font-bold mb-2">Cannot Add Board</h3>
            <p className="text-gray-600 mb-4">
              Countdown is too low ({countdown}s). You cannot add boards when countdown is below 10 seconds.
            </p>
            <button
              onClick={() => setShowAddBoardWarning(false)}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Game End Modal */}
      {isGameEnd && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
          <div className="bg-white p-8 rounded-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎉 Game Over</h2>
            <p className="text-gray-600 mb-6">The game has ended. Thank you for playing!</p>
            <button
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 text-white rounded-xl text-lg font-semibold"
              onClick={() => {
                socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
                  navigate("/");
                });
              }}
            >
              Leave Game
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default BingoGame;