import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket";

// Enhanced BingoCell with better responsiveness
const BingoCell = React.memo(({ num, isFreeSpace, isSelected, onClick, isCalled }) => {
  return (
    <div
      onClick={onClick}
      className={`
        w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10
        flex items-center justify-center 
        font-extrabold text-xs xs:text-sm sm:text-md md:text-lg
        border-2 rounded-lg shadow-md cursor-pointer transition-all duration-200
        transform hover:scale-105 active:scale-95
        ${
          isFreeSpace
            ? "bg-gradient-to-b from-yellow-300 to-yellow-500 text-gray-900 border-yellow-400"
            : isSelected
            ? "bg-gradient-to-b from-green-400 to-green-600 text-white border-green-500"
            : isCalled
            ? "bg-gradient-to-b from-blue-400 to-blue-500 text-white border-blue-400"
            : "bg-white text-black border-gray-300 hover:bg-gray-50"
        }
        ${isSelected ? 'ring-2 ring-white ring-opacity-50' : ''}
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
    B: "bg-yellow-500",
    I: "bg-green-500",
    N: "bg-blue-500",
    G: "bg-red-500",
    O: "bg-purple-500",
  };

  // State management
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
  const [showAddBoardWarning, setShowAddBoardWarning] = useState(false);

  // Multi-board states
  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedNumbersPerBoard, setSelectedNumbersPerBoard] = useState({});

  const [gameDetails, setGameDetails] = useState({
    winAmount: '-',
    playersCount: '-',
    stakeAmount: '-',
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
      setSelectedNumbers(new Set());
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
      setSelectedNumbers(new Set());
      setSelectedNumbersPerBoard({});
      setCountdown(0);
      setGameStarted(false);
      setLastCalledLabel(null);
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
      setRandomNumber((prev) => [...prev, number]);
      setCalledSet((prev) => new Set(prev).add(label));
      setCallNumberLength(callNumberLength);
      setLastCalledLabel(label);

      if (isAudioOn) {
        playAudioForNumber(number);
      }
    };

    const handleBingoClaimFailed = ({ message, reason, telegramId, gameId, cardId, card, lastTwoNumbers, selectedNumbers }) => {
      navigate("/winnerFailed", { 
        state: { message, reason, telegramId, gameId, cardId, card, lastTwoNumbers, selectedNumbers } 
      });
    };

    const handleGameDetails = ({ winAmount, playersCount, stakeAmount }) => {
      setGameDetails({ winAmount, playersCount, stakeAmount });
    };

    const handleWinnerConfirmed = ({ winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId }) => {
      navigate("/winnerPage", { state: { winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId } });
    };

    const handleWinnerError = () => {
      socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
        navigate("/");
      });
    };

    // Event listeners
    socket.on("connect", handleSocketConnect);
    socket.on("playerCountUpdate", handlePlayerCountUpdate);
    socket.on("countdownTick", handleCountdownTick);
    socket.on("gameStart", handleGameStart);
    socket.on("gameEnd", handleGameEnd);
    socket.on("gameReset", handleGameReset);
    socket.on("drawnNumbersHistory", handleDrawnNumbersHistory);
    socket.on("numberDrawn", handleNumberDrawn);
    socket.on("gameDetails", handleGameDetails);
    socket.on("winnerConfirmed", handleWinnerConfirmed);
    socket.on("winnerError", handleWinnerError);
    socket.on("bingoClaimFailed", handleBingoClaimFailed);

    return () => {
      socket.off("connect", handleSocketConnect);
      socket.off("playerCountUpdate", handlePlayerCountUpdate);
      socket.off("countdownTick", handleCountdownTick);
      socket.off("gameStart", handleGameStart);
      socket.off("gameEnd", handleGameEnd);
      socket.off("gameReset", handleGameReset);
      socket.off("drawnNumbersHistory", handleDrawnNumbersHistory);
      socket.off("numberDrawn", handleNumberDrawn);
      socket.off("gameDetails", handleGameDetails);
      socket.off("winnerConfirmed", handleWinnerConfirmed);
      socket.off("winnerError", handleWinnerError); 
      socket.off("bingoClaimFailed", handleBingoClaimFailed);
    };
  }, [gameId, telegramId, GameSessionId, navigate, isAudioOn]);

  // Audio function
  const playAudioForNumber = (number) => {
    if (!isAudioOn) return;
    const audio = new Audio(`/audio/audio${number}.mp3`); 
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error(`🔊 Failed to play audio ${number}:`, error);
    });
  };

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
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ✅ ENHANCED: Handle number clicks - sync across all boards
  const handleNumberClick = useCallback((num, boardId) => {
    if (activeBoards.length === 1) {
      // Single board - original behavior
      const newSelection = new Set(selectedNumbers);
      if (newSelection.has(num)) {
        newSelection.delete(num);
      } else {
        newSelection.add(num);
      }
      setSelectedNumbers(newSelection);
      setSelectedNumbersPerBoard(prev => ({
        ...prev,
        [boardId]: newSelection
      }));
    } else {
      // Multi-board - sync across all boards
      setSelectedNumbersPerBoard(prev => {
        const newSelections = { ...prev };
        
        // Check if number exists in any board
        const numberExistsInAnyBoard = activeBoards.some(board => 
          board.cartela.some(row => row.includes(num))
        );

        if (numberExistsInAnyBoard) {
          // Toggle this number in ALL boards where it exists
          Object.keys(newSelections).forEach(bId => {
            const currentSelections = new Set(newSelections[bId] || []);
            if (currentSelections.has(num)) {
              currentSelections.delete(num);
            } else {
              currentSelections.add(num);
            }
            newSelections[bId] = currentSelections;
          });
        } else {
          // Original behavior for current board only
          const currentBoardSelections = new Set(prev[boardId] || []);
          if (currentBoardSelections.has(num)) {
            currentBoardSelections.delete(num);
          } else {
            currentBoardSelections.add(num);
          }
          newSelections[boardId] = currentBoardSelections;
        }

        return newSelections;
      });
    }

    // Save to localStorage
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      localStorage.setItem("selectedNumbers", JSON.stringify([...selectedNumbers]));
      localStorage.setItem("selectedNumbersPerBoard", JSON.stringify(
        Object.fromEntries(
          Object.entries(selectedNumbersPerBoard).map(([id, set]) => [id, [...set]])
        )
      ));
    }, 300);
  }, [activeBoards, selectedNumbers]);

  // Check win function
  const checkForWin = (boardId) => {
    let selectedSet;
    let boardCartelaId;
    
    if (activeBoards.length === 1) {
      selectedSet = selectedNumbers;
      boardCartelaId = cartelaId;
    } else {
      selectedSet = selectedNumbersPerBoard[boardId] || new Set();
      const board = activeBoards.find(b => b.cartelaId === boardId);
      boardCartelaId = boardId;
    }

    const selectedArray = Array.from(selectedSet);

    socket.emit("checkWinner", {
      telegramId,
      gameId,
      GameSessionId,
      cartelaId: boardCartelaId, 
      selectedNumbers: selectedArray,
    });
  };

  // Navigate to add board
  const navigateToAddBoard = () => {
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
  };

  // Audio priming
  const primeAudio = () => {
    if (!isAudioOn) {
      const audio = new Audio(`/audio/audio1.mp3`);
      audio.volume = 0;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          setIsAudioOn(true);
        })
        .catch((err) => {
          console.warn("❌ Audio unlock failed:", err);
          alert("Audio could not be enabled. Please try clicking again.");
        });
    } else {
      setIsAudioOn(false);
    }
  };

  // Load/save audio state
  useEffect(() => {
    const savedAudioState = localStorage.getItem("isAudioOn");
    if (savedAudioState !== null) {
      setIsAudioOn(savedAudioState === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("isAudioOn", isAudioOn);
  }, [isAudioOn]);

  // Check if number is called
  const isNumberCalled = useCallback((number) => {
    return Array.from(calledSet).some(label => {
      const num = label.split('-')[1];
      return parseInt(num) === number;
    });
  }, [calledSet]);

  // Responsive layout classes based on board count
  const getLayoutClasses = () => {
    if (activeBoards.length === 1) {
      return {
        container: "flex flex-col lg:flex-row w-full h-full",
        leftPanel: "lg:w-2/5 xl:w-1/3",
        rightPanel: "lg:w-3/5 xl:w-2/3",
        boardsContainer: "space-y-4"
      };
    } else {
      return {
        container: "flex flex-col xl:flex-row w-full h-full",
        leftPanel: "xl:w-1/3",
        rightPanel: "xl:w-2/3",
        boardsContainer: "grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 max-h-full overflow-hidden"
      };
    }
  };

  const layoutClasses = getLayoutClasses();

  return (
    <div className="bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black min-h-screen flex flex-col p-2 overflow-hidden">
      {/* Header Stats - Responsive */}
      <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 gap-1 xs:gap-2 mb-2">
        {[
          `Players: ${gameDetails.playersCount}`,
          `Prize: ${gameDetails.winAmount}`,
          `Call: ${callNumberLength}`,
          `Stake: ${gameDetails.stakeAmount}`,
        ].map((info, i) => (
          <div key={i} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 xs:p-2 text-xs rounded text-center truncate">
            {info}
          </div>
        ))}
        <button
          onClick={primeAudio}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 xs:p-2 text-xs rounded w-full col-span-3 xs:col-span-1"
        >
          {`Sound ${isAudioOn ? "🔊" : "🔇"}`}
        </button>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 ${layoutClasses.container} gap-3 md:gap-4 overflow-hidden`}>
        
        {/* Left Panel - Called Numbers */}
        <div className={`${layoutClasses.leftPanel} flex flex-col gap-3 md:gap-4`}>
          {/* Called Numbers Board */}
          <div className="bg-[#2a0047] p-2 sm:p-3 rounded-lg flex-1 overflow-hidden">
            <div className="grid grid-cols-5 gap-1 mb-2">
              {["B", "I", "N", "G", "O"].map((letter, i) => (
                <div key={i} className={`text-white text-center text-xs sm:text-sm font-bold rounded-full h-6 sm:h-7 flex items-center justify-center ${bingoColors[letter]}`}>
                  {letter}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1 text-xs h-[calc(100%-2rem)] overflow-y-auto">
              {[...Array(15)].map((_, rowIndex) =>
                ["B", "I", "N", "G", "O"].map((letter, colIndex) => {
                  const number = rowIndex + 1 + colIndex * 15;
                  const randomNumberLabel = `${letter}-${number}`;
                  return (
                    <div
                      key={randomNumberLabel}
                      className={`text-center rounded p-1 ${
                        calledSet.has(randomNumberLabel)
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

        {/* Right Panel - Game Controls & Boards */}
        <div className={`${layoutClasses.rightPanel} flex flex-col gap-3 md:gap-4 overflow-hidden`}>
          
          {/* Game Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {/* Countdown */}
            <div className="bg-gray-300 p-2 sm:p-3 rounded-lg text-center">
              <p className="text-xs sm:text-sm">Countdown</p>
              <p className="text-lg sm:text-xl font-bold">{countdown > 0 ? countdown : "Wait"}</p>
            </div>

            {/* Current Number */}
            <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg text-white flex flex-col sm:flex-row justify-around items-center p-2 sm:p-3">
              <p className="font-bold text-xs sm:text-sm">Current Number</p>
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-extrabold rounded-full shadow-[0_0_20px_#37ebf3] bg-[#37ebf3] text-purple-900">
                {lastCalledLabel ? lastCalledLabel.split('-')[1] : "-"}
              </div>
            </div>

            {/* Recent Calls */}
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-2 sm:p-3 rounded-lg col-span-2 sm:col-span-1">
              <p className="text-center font-bold text-xs sm:text-sm text-yellow-400 mb-1">Recent Calls</p>
              <div className="flex justify-center gap-2">
                {randomNumber.slice(-3).map((num, index) => {
                  const colors = ["bg-red-600", "bg-green-600", "bg-blue-600"];
                  return (
                    <div
                      key={index}
                      className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm font-extrabold rounded-full shadow-xl text-white"
                      style={{ backgroundColor: colors[index] }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bingo Boards */}
          <div className={`flex-1 ${layoutClasses.boardsContainer} overflow-y-auto pb-2`}>
            {activeBoards.map((board, boardIndex) => {
              const boardSelections = selectedNumbersPerBoard[board.cartelaId] || new Set();
              
              return (
                <div key={board.cartelaId} className="bg-gradient-to-b from-purple-800 to-purple-900 p-3 sm:p-4 rounded-lg">
                  {/* Board Header */}
                  <div className="text-center text-yellow-400 text-sm mb-2 font-bold">
                    {boardIndex === 0 ? "PRIMARY BOARD" : "SECONDARY BOARD"}
                  </div>
                  
                  {/* BINGO Header */}
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {["B", "I", "N", "G", "O"].map((letter, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-white text-xs sm:text-sm rounded-full"
                        style={{ backgroundColor: bingoColors[letter].replace('bg-', '') }}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>

                  {/* Bingo Numbers Grid */}
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {board.cartela.map((row, rowIndex) =>
                      row.map((num, colIndex) => {
                        const isFreeSpace = rowIndex === 2 && colIndex === 2;
                        const isSelectedNum = boardSelections.has(num);
                        const isCalled = isNumberCalled(num);

                        return (
                          <BingoCell
                            key={`${board.cartelaId}-${rowIndex}-${colIndex}`}
                            num={num}
                            isFreeSpace={isFreeSpace}
                            isSelected={isSelectedNum}
                            isCalled={isCalled}
                            onClick={() => handleNumberClick(num, board.cartelaId)}
                          />
                        );
                      })
                    )}
                  </div>

                  {/* Bingo Button */}
                  <button 
                    onClick={() => checkForWin(board.cartelaId)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 px-4 py-2 text-white rounded-full text-sm font-bold shadow-lg transition-all duration-200"
                  >
                    BINGO! {activeBoards.length > 1 && `(Board ${boardIndex + 1})`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add Board Button */}
          {activeBoards.length === 1 && (
            <button
              onClick={navigateToAddBoard}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-4 py-3 text-white rounded-full text-base font-bold shadow-lg transition-all duration-200"
            >
              + Add Another Board
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex gap-3 justify-center mt-3 pt-2 border-t border-gray-700">
        <button
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-8 sm:px-12 py-2 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
          onClick={() => {
            if (gameId && telegramId) {
              socket.emit("joinGame", { gameId, telegramId, GameSessionId });
            } else {
              window.location.reload();
            }
          }}
        >
          Refresh
        </button>
        <button
          onClick={() => {
            socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
              navigate("/");
            });
          }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 px-8 sm:px-12 py-2 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
        >
          Leave
        </button>
      </div>

      {/* Modals */}
      {showAddBoardWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full">
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

      {isGameEnd && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎉 Game Over</h2>
            <p className="text-gray-600 mb-6">The game has ended. You may now leave the room.</p>
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
    </div>
  );
};

export default BingoGame;