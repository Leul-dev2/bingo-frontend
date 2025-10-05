import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket"; // ✅ Shared socket instance

// ✅ Enhanced and Memoized BingoCell for better performance and style
const BingoCell = React.memo(({ num, isFreeSpace, isSelected, onClick, isCalled }) => {
  const cellClasses = `
    w-full aspect-square flex items-center justify-center font-extrabold text-sm md:text-lg lg:text-xl rounded-lg shadow-md transition-all duration-300 transform
    hover:scale-105 active:scale-95 cursor-pointer
    ${isFreeSpace ? "bg-gradient-to-b from-green-400 to-green-600 text-white" : ""}
    ${isSelected ? "bg-gradient-to-b from-green-400 to-green-600 text-white" : "bg-white text-black"}
    ${isCalled ? "!bg-gradient-to-b !from-yellow-400 !to-orange-500 !text-black" : ""}
  `;

  return (
    <div onClick={onClick} className={cellClasses}>
      {isFreeSpace ? "⭐" : num}
    </div>
  );
});

// Helper for called numbers board.
const bingoLetters = ["B", "I", "N", "G", "O"];

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

  const [randomNumber, setRandomNumber] = useState([]);
  const [calledNumbers, setCalledNumbers] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState(new Set());
  const [countdown, setCountdown] = useState(0);
  const [calledSet, setCalledSet] = useState(new Set());
  const [lastWinnerCells, setLastWinnerCells] = useState([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [winnerFound, setWinnerFound] = useState(false);
  const [hasEmittedGameCount, setHasEmittedGameCount] = React.useState(false);
  const [gracePlayers, setGracePlayers] = useState([]);
  const [isGameEnd, setIsGameEnd] = useState(false);
  const [callNumberLength, setCallNumberLength] = useState(0);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [audioPrimed, setAudioPrimed] = useState(false);
  const [failedBingo, setFailedBingo] = useState(null);
  const [lastCalledLabel, setLastCalledLabel] = useState(null);
  const [showAddBoardWarning, setShowAddBoardWarning] = useState(false);
  const saveTimeout = useRef(null);

  // ✅ Multi-board states
  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedNumbersPerBoard, setSelectedNumbersPerBoard] = useState({});

  const [gameDetails, setGameDetails] = useState({
    winAmount: '-',
    playersCount: '-',
    stakeAmount: '-',
  });

  const hasJoinedRef = useRef(false);

  // ✅ UPDATED: Initialize boards - supports both single and multi-board
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

  useEffect(() => {
    // 1. Initial Connection and Join Game Logic
    if (!socket.connected) {
      socket.connect();
    }
    if (!hasJoinedRef.current && gameId && telegramId) {
      socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      hasJoinedRef.current = true;
    }

    // 2. All Event Listeners in a Single Place
    const handleSocketConnect = () => {
      console.log("✅ Socket.IO connected or reconnected!");
      if (gameId && telegramId) {
        socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      }
    };
    const handlePlayerCountUpdate = ({ playerCount }) => setPlayerCount(playerCount);
    const handleCountdownTick = ({ countdown }) => setCountdown(countdown);
    const handleGameStart = () => setGameStarted(true);
    const handleGameEnd = () => setIsGameEnd(true);

    const handleGameReset = () => {
      console.log("🔄 Game reset received, allowing new gameCount emit");
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
      console.log("⭐⭐ numbers drawn", number);
      setRandomNumber((prev) => [...prev, number]);
      setCalledSet((prev) => new Set(prev).add(label));
      setCallNumberLength(callNumberLength);
      setLastCalledLabel(label);

      // ✅ Conditionally play audio based on the isAudioOn state
      if (isAudioOn) {
        playAudioForNumber(number);
      }
    };

    const handleBingoClaimFailed = ({ message, reason, telegramId, gameId, cardId, card, lastTwoNumbers, selectedNumbers }) => {
      navigate("/winnerFailed", {
        state: {
          message,
          reason,
          telegramId,
          gameId,
          cardId,
          card,
          lastTwoNumbers,
          selectedNumbers
        }
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
        console.log("player leave emited🎯🎯", GameSessionId);
        navigate("/");
      });
    };

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

    // 3. Cleanup Function
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

  // ✅ New: Function to dynamically play the correct audio file
  const playAudioForNumber = (number) => {
    if (!isAudioOn) return;
    const audio = new Audio(`/audio/audio${number}.mp3`);
    audio.currentTime = 0;
    console.log("audio is triggereed 🎯🎯");
    audio.play().catch((error) => {
      console.error(`🔊 Failed to play audio ${number}:`, error);
    });
  };

  // 3️⃣ Request to start game if enough players
  useEffect(() => {
    if (
      playerCount >= 2 &&
      !hasEmittedGameCount &&
      !gameStarted
    ) {
      console.log("✅ Emitting gameCount to server...");
      socket.emit("gameCount", { gameId, GameSessionId });
      setHasEmittedGameCount(true);
    }
  }, [playerCount, gameStarted, hasEmittedGameCount, gameId, gracePlayers]);

  // 5️⃣ Local countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ✅ UPDATED: Handle board clicks for multi-board
  const handleCartelaClick = useCallback((num, boardId) => {
    setSelectedNumbersPerBoard(prev => {
      const newSelections = { ...prev };
      const currentBoardSelections = new Set(prev[boardId] || []);
      
      if (currentBoardSelections.has(num)) {
        currentBoardSelections.delete(num);
      } else {
        currentBoardSelections.add(num);
      }
      
      newSelections[boardId] = currentBoardSelections;
      return newSelections;
    });

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      localStorage.setItem("selectedNumbersPerBoard", JSON.stringify(
        Object.fromEntries(
          Object.entries(selectedNumbersPerBoard).map(([id, set]) => [id, [...set]])
        )
      ));
    }, 300);
  }, [selectedNumbersPerBoard]);

  // ✅ UPDATED: Check win for specific board
  const checkForWin = useCallback((boardId) => {
    let selectedSet = selectedNumbersPerBoard[boardId] || new Set();
    const selectedArray = Array.from(selectedSet);

    socket.emit("checkWinner", {
      telegramId,
      gameId,
      GameSessionId,
      cartelaId: boardId,
      selectedNumbers: selectedArray,
    });

    console.log("Sending to backend:", {
      telegramId,
      gameId,
      cartelaId: boardId,
      selectedNumbers: selectedArray
    });
  }, [selectedNumbersPerBoard, telegramId, gameId, GameSessionId]);

  // ✅ NEW: Navigate to add board
  const navigateToAddBoard = useCallback(() => {
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
  }, [countdown, navigate, telegramId, gameId, GameSessionId, activeBoards]);

  // ✅ Load saved state on mount
  useEffect(() => {
    const savedAudioState = localStorage.getItem("isAudioOn");
    if (savedAudioState !== null) {
      setIsAudioOn(savedAudioState === "true");
    }
  }, []);

  // ✅ Save whenever it changes
  useEffect(() => {
    localStorage.setItem("isAudioOn", isAudioOn);
  }, [isAudioOn]);

  return (
    <div className="bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black min-h-screen flex flex-col items-center p-4 md:p-8 w-full max-w-screen overflow-hidden font-sans">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full max-w-lg mx-auto text-white text-center mb-4">
        {[
          `Players: ${gameDetails.playersCount}`,
          `Prize: ${gameDetails.winAmount}`,
          `Call: ${callNumberLength}`,
          `Stake: ${gameDetails.stakeAmount}`,
        ].map((info, i) => (
          <button key={i} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-2 text-xs rounded-full md:rounded-lg w-full shadow-md">
            {info}
          </button>
        ))}
        <button
          onClick={() => {
            if (!isAudioOn) {
              const audio = new Audio(`/audio/audio1.mp3`);
              audio.volume = 0;
              audio
                .play()
                .then(() => {
                  audio.pause();
                  audio.currentTime = 0;
                  console.log("✅ Audio unlocked");
                  setIsAudioOn(true);
                })
                .catch((err) => {
                  console.warn("❌ Audio unlock failed:", err);
                  alert("Audio could not be enabled. Please try clicking again.");
                });
            } else {
              setIsAudioOn(false);
            }
          }}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold p-2 text-xs rounded-full md:rounded-lg w-full shadow-md"
        >
          {`${isAudioOn ? "🔊 Audio On" : "🔇 Audio Off"}`}
        </button>
      </div>

      <div className="flex flex-col-reverse md:flex-row md:space-x-8 w-full max-w-6xl mt-4">
        {/* Called Numbers Board Section - Now on the left for a classic layout */}
        <div className="md:w-1/3 flex flex-col items-center">
          <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg text-white p-4 w-full flex flex-col items-center shadow-lg mb-4">
            <p className="font-bold text-sm mb-2 text-yellow-400">Current Number</p>
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-3xl md:text-4xl font-extrabold rounded-full shadow-[0_0_20px_#37ebf3] bg-[#37ebf3] text-purple-900 animate-pulse">
              {lastCalledLabel ? lastCalledLabel.split('-')[1] : "-"}
            </div>
          </div>
          
          <div className="bg-gray-900 p-2 rounded-lg w-full text-center shadow-lg">
            <p className="font-bold text-xs sm:text-sm text-yellow-400 mb-1">Recent Calls</p>
            <div className="grid grid-cols-5 gap-1 w-full text-xs">
              {["B", "I", "N", "G", "O"].map((letter, i) => (
                <div key={i} className={`text-white text-center font-bold h-6 flex items-center justify-center rounded-lg ${bingoColors[letter]}`}>
                  {letter}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1 mt-1 text-white">
              {Array.from({ length: 15 }).map((_, rowIndex) =>
                ["B", "I", "N", "G", "O"].map((letter, colIndex) => {
                  const number = rowIndex + 1 + colIndex * 15;
                  const randomNumberLabel = `${letter}-${number}`;
                  const isCalled = calledSet.has(randomNumberLabel);
                  return (
                    <div
                      key={randomNumberLabel}
                      className={`w-full aspect-square flex items-center justify-center rounded-lg font-semibold
                        ${isCalled ? "bg-yellow-500 text-black shadow-inner" : "bg-gray-800 text-gray-400"}`}
                    >
                      {number}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bingo Cards Section - Now on the right */}
        <div className="md:w-2/3 flex flex-col items-center mt-8 md:mt-0">
          <div className="bg-gray-300 text-gray-800 p-2 rounded-lg text-center text-sm w-full font-semibold flex items-center justify-between shadow-md mb-4">
            <span>Countdown</span>
            <span className="text-xl font-bold text-red-600 ml-2">{countdown > 0 ? countdown : "Waiting..."}</span>
          </div>
          
          <div className="w-full space-y-4">
            {activeBoards.map((board, boardIndex) => {
              const isSelected = selectedNumbersPerBoard[board.cartelaId] || new Set();
              
              return (
                <div key={board.cartelaId} className="bg-gradient-to-b from-purple-800 to-purple-900 p-4 rounded-lg w-full shadow-xl">
                  <div className="text-center text-yellow-400 text-sm mb-2 font-bold">
                    {boardIndex === 0 ? "PRIMARY BOARD" : `BOARD #${boardIndex + 1}`}
                  </div>
                  
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {["B", "I", "N", "G", "O"].map((letter, i) => (
                      <div
                        key={i}
                        className={`w-full aspect-square flex items-center justify-center font-bold text-white text-sm rounded-lg ${bingoColors[letter]} shadow-inner`}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {board.cartela.map((row, rowIndex) =>
                      row.map((num, colIndex) => {
                        const isFreeSpace = rowIndex === 2 && colIndex === 2;
                        const isSelectedNum = isSelected.has(num);
                        const isCalled = calledSet.has(`${bingoLetters[colIndex]}-${num}`);

                        return (
                          <BingoCell
                            key={`${board.cartelaId}-${rowIndex}-${colIndex}`}
                            num={num}
                            isFreeSpace={isFreeSpace}
                            isSelected={isSelectedNum}
                            isCalled={isCalled}
                            onClick={() => handleCartelaClick(num, board.cartelaId)}
                          />
                        );
                      })
                    )}
                  </div>

                  <button 
                    onClick={() => checkForWin(board.cartelaId)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 px-4 py-2 text-white rounded-full text-sm font-bold shadow-lg transition-all duration-200 mt-3"
                  >
                    BINGO! (Board #{board.cartelaId})
                  </button>
                </div>
              );
            })}
          </div>

          {activeBoards.length === 1 && (
            <button
              onClick={navigateToAddBoard}
              className="w-full mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-4 py-3 text-white rounded-full text-lg font-bold shadow-lg transition-all duration-200"
            >
              + Add Another Board
            </button>
          )}
        </div>
      </div>

      <div className="w-full flex gap-3 justify-center mt-6 max-w-md">
        <button
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 py-2 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
          onClick={() => {
            if (gameId && telegramId) {
              socket.emit("joinGame", { gameId, telegramId, GameSessionId });
              console.log("Forced refresh: Re-emitted joinGame to synchronize state.");
            } else {
              console.warn("Cannot force refresh: gameId or telegramId missing.");
              window.location.reload();
            }
          }}
        >
          Refresh
        </button>
        <button
          onClick={() => {
            socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
              console.log("player leave emited🎯🎯", GameSessionId);
              navigate("/");
            });
          }}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 py-2 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
        >
          Leave
        </button>
      </div>

      {showAddBoardWarning && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm mx-4 text-center">
            <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Cannot Add Board</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
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
        <div className="fixed inset-0 flex items-center justify-center bg-opacity-80 backdrop-blur-sm z-50 transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 animate-pulse">
              🎉 Game Over
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The game has ended. You may now leave the room.
            </p>
            <button
              className="w-1/2 bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-white rounded-lg text-lg font-semibold shadow-md"
              onClick={() => {
                socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
                  console.log("player leave emited🎯🎯", GameSessionId);
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