import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket";

const BingoCell = React.memo(({ num, isFreeSpace, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`md:w-10 md:h-10 w-8 h-8 flex items-center justify-center font-extrabold text-md sm:text-lg border rounded-lg shadow-md cursor-pointer transition
        ${
          isFreeSpace
            ? "bg-gradient-to-b from-green-400 to-green-600 text-white"
            : isSelected
            ? "bg-gradient-to-b from-green-400 to-green-600 text-white"
            : "bg-white text-black"
        }`}
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

  // Multi-board states
  const [activeBoards, setActiveBoards] = useState([]);
  const [selectedNumbersPerBoard, setSelectedNumbersPerBoard] = useState({});

  const [gameDetails, setGameDetails] = useState({
    winAmount: '-',
    playersCount: '-',
    stakeAmount: '-',
  });

  const hasJoinedRef = useRef(false);

  // ✅ Initialize boards
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

  // ✅ NEW: Auto-check for wins when numbers are selected
  const autoCheckForWin = (boardId, newSelections) => {
    const selectedArray = Array.from(newSelections);
    
    // Only check if we have at least 5 selected numbers (minimum for bingo)
    if (selectedArray.length >= 5) {
      socket.emit("checkWinner", {
        telegramId,
        gameId,
        GameSessionId,
        cartelaId: boardId, 
        selectedNumbers: selectedArray,
      });
    }
  };

  // ✅ UPDATED: Sync number selection across all boards
  const handleCartelaClick = (num, boardId) => {
    setSelectedNumbersPerBoard(prev => {
      const newSelections = { ...prev };
      
      // 1. Update the clicked board
      const currentBoardSelections = new Set(prev[boardId] || []);
      if (currentBoardSelections.has(num)) {
        currentBoardSelections.delete(num);
      } else {
        currentBoardSelections.add(num);
      }
      newSelections[boardId] = currentBoardSelections;
      
      // 2. Auto-check for win on this board
      autoCheckForWin(boardId, currentBoardSelections);
      
      // 3. Sync this number to all other boards where it exists
      activeBoards.forEach(board => {
        if (board.cartelaId !== boardId) {
          // Check if this number exists in the other board
          const numberExistsInBoard = board.cartela.flat().includes(num);
          if (numberExistsInBoard) {
            const otherBoardSelections = new Set(prev[board.cartelaId] || []);
            if (currentBoardSelections.has(num)) {
              // If selected in clicked board, select in other boards
              otherBoardSelections.add(num);
            } else {
              // If deselected in clicked board, deselect in other boards
              otherBoardSelections.delete(num);
            }
            newSelections[board.cartelaId] = otherBoardSelections;
            
            // Auto-check for win on the other board too
            autoCheckForWin(board.cartelaId, otherBoardSelections);
          }
        }
      });
      
      return newSelections;
    });

    // For single board compatibility
    if (activeBoards.length === 1) {
      const newSelection = new Set(selectedNumbers);
      if (newSelection.has(num)) {
        newSelection.delete(num);
      } else {
        newSelection.add(num);
      }
      setSelectedNumbers(newSelection);
      autoCheckForWin(boardId, newSelection);
    }

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      localStorage.setItem("selectedNumbers", JSON.stringify([...selectedNumbers]));
      localStorage.setItem("selectedNumbersPerBoard", JSON.stringify(
        Object.fromEntries(
          Object.entries(selectedNumbersPerBoard).map(([id, set]) => [id, [...set]])
        )
      ));
    }, 300);
  };

  // Socket event handlers and other effects remain the same...
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

  const playAudioForNumber = (number) => {
    if (!isAudioOn) return;
    const audio = new Audio(`/audio/audio${number}.mp3`); 
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error(`🔊 Failed to play audio ${number}:`, error);
    });
  };

  useEffect(() => {
    if (playerCount >= 2 && !hasEmittedGameCount && !gameStarted) {
      socket.emit("gameCount", { gameId, GameSessionId });
      setHasEmittedGameCount(true);
    }
  }, [playerCount, gameStarted, hasEmittedGameCount, gameId, gracePlayers]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ✅ UPDATED: Manual win check (for BINGO button)
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

  useEffect(() => {
    const savedAudioState = localStorage.getItem("isAudioOn");
    if (savedAudioState !== null) {
      setIsAudioOn(savedAudioState === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("isAudioOn", isAudioOn);
  }, [isAudioOn]);

  return (
    <div className="bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black min-h-screen flex flex-col items-center p-1 pb-3 w-full max-w-screen overflow-hidden">
      {/* Game Info Bar - FIXED SIZE */}
      <div className="grid grid-cols-5 sm:grid-cols-5 gap-1 w-full text-white text-center mt-2 mb-2">
        {[
          `Players: ${gameDetails.playersCount}`,
          `Prize: ${gameDetails.winAmount}`,
          `Call: ${callNumberLength}`,
          `Stake: ${gameDetails.stakeAmount}`,
        ].map((info, i) => (
          <button key={i} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded w-full">
            {info}
          </button>
        ))}
        <button
          onClick={() => {
            if (!isAudioOn) {
              const audio = new Audio(`audio/audio1.mp3`);
              audio.volume = 0;
              audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                setIsAudioOn(true);
              }).catch((err) => {
                console.warn("❌ Audio unlock failed:", err);
                alert("Audio could not be enabled. Please try clicking again.");
              });
            } else {
              setIsAudioOn(false);
            }
          }}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded w-full"
        >
          {`${isAudioOn ? "🔊" : "🔇"}`}
        </button>
      </div>

      {/* ✅ UPDATED: Consistent Layout - Same size for single and multi-board */}
      <div className="flex flex-col w-full max-w-md mx-auto space-y-2">
        {/* Called Numbers Board - FIXED SIZE */}
        <div className="bg-[#2a0047] p-2 rounded-lg w-full">
          <div className="grid grid-cols-5 gap-1 mb-1">
            {["B", "I", "N", "G", "O"].map((letter, i) => (
              <div key={i} className={`text-white text-center text-xs font-bold rounded-full h-4 w-6 ${bingoColors[letter]}`}>
                {letter}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[...Array(15)].map((_, rowIndex) =>
              ["B", "I", "N", "G", "O"].map((letter, colIndex) => {
                const number = rowIndex + 1 + colIndex * 15;
                const randomNumberLabel = `${letter}-${number}`;
                return (
                  <div
                    key={randomNumberLabel}
                    className={`text-center rounded text-xs h-6 flex items-center justify-center ${
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

        {/* Game Controls - FIXED SIZE */}
        <div className="flex gap-2 w-full">
          <div className="bg-gray-300 p-2 rounded-lg text-center text-xs flex-1 flex items-center justify-center">
            <div>
              <p>Countdown</p>
              <p className="text-lg font-bold">{countdown > 0 ? countdown : "Wait"}</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg text-white flex-1 flex flex-col items-center justify-center p-2">
            <p className="font-bold text-xs">Current Number</p>
            <div className="w-12 h-12 flex items-center justify-center text-lg font-extrabold rounded-full shadow-[0_0_20px_#37ebf3] bg-[#37ebf3] text-purple-900 mt-1">
              {lastCalledLabel ? lastCalledLabel : "-"}
            </div>
          </div>
        </div>

        {/* Recent Calls - FIXED SIZE */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-2 rounded-lg w-full">
          <p className="text-center font-bold text-xs text-yellow-400 mb-1">Recent Calls</p>
          <div className="flex justify-center gap-2">
            {randomNumber.slice(-4, -1).map((num, index) => {
              const colors = ["bg-red-800", "bg-green-800", "bg-blue-800"];
              return (
                <div
                  key={index}
                  className={`w-6 h-6 flex items-center justify-center text-xs font-extrabold rounded-full shadow-xl text-white ${colors[index]}`}
                >
                  {num}
                </div>
              );
            })}
          </div>
        </div>

        {/* ✅ UPDATED: Bingo Boards - CONSISTENT SIZE */}
        <div className="space-y-3">
          {activeBoards.map((board, boardIndex) => {
            const isSelected = selectedNumbersPerBoard[board.cartelaId] || new Set();
            
            return (
              <div key={board.cartelaId} className="bg-gradient-to-b from-purple-800 to-purple-900 p-3 rounded-lg w-full">
                {/* Board Header */}
                <div className="text-center text-yellow-400 text-sm mb-2 font-bold">
                  {boardIndex === 0 ? "PRIMARY BOARD" : `BOARD ${boardIndex + 1}`}
                </div>
                
                {/* BINGO Header */}
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {["B", "I", "N", "G", "O"].map((letter, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 flex items-center justify-center font-bold text-white text-sm rounded-full ${bingoColors[letter]}`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                {/* Bingo Numbers Grid - FIXED SIZE */}
                <div className="grid grid-cols-5 gap-1">
                  {board.cartela.map((row, rowIndex) =>
                    row.map((num, colIndex) => {
                      const isFreeSpace = rowIndex === 2 && colIndex === 2;
                      const isSelectedNum = isSelected.has(num);

                      return (
                        <BingoCell
                          key={`${board.cartelaId}-${rowIndex}-${colIndex}`}
                          num={num}
                          isFreeSpace={isFreeSpace}
                          isSelected={isSelectedNum}
                          onClick={() => handleCartelaClick(num, board.cartelaId)}
                        />
                      );
                    })
                  )}
                </div>

                {/* BINGO Button */}
                <button 
                  onClick={() => checkForWin(board.cartelaId)}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 px-4 py-2 text-white rounded-4xl text-sm font-bold shadow-lg transition-all duration-200 mt-2"
                >
                  BINGO! (Board {board.cartelaId})
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Board Button */}
        {activeBoards.length === 1 && (
          <button
            onClick={navigateToAddBoard}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-4 py-2 text-white rounded-4xl text-sm font-bold shadow-lg transition-all duration-200"
          >
            + Add Another Board
          </button>
        )}
      </div>

      {/* Action Buttons - FIXED SIZE */}
      <div className="w-full max-w-md flex gap-3 justify-center mt-3">
        <button
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-14 h-8 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
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
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 px-14 h-8 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
        >
          Leave
        </button>
      </div>

      {/* Modals remain the same */}
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

      {isGameEnd && (
        <div className="fixed inset-0 flex items-center justify-center bg-opacity-80 backdrop-blur-sm z-50 transition-opacity duration-300">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              🎉 Game Over
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The game has ended. You may now leave the room.
            </p>
            <button
              className="w-1/2 bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-white rounded-lg text-lg font-semibold shadow-md"
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