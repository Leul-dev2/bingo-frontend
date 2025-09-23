import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket"; // ✅ Shared socket instance



const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela, cartelaId, gameId, telegramId, GameSessionId } = location.state || {};

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
  // ✅ New state to manage audio on/off
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [audioPrimed, setAudioPrimed] = useState(false);
  const [failedBingo, setFailedBingo] = useState(null);
  const [lastCalledLabel, setLastCalledLabel] = useState(null);

    const [gameDetails, setGameDetails] = useState({
    winAmount: '-',
    playersCount: '-',
    stakeAmount: '-',
  });

  const hasJoinedRef = useRef(false);

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
      console.log("inside socket 🤪🚀⭐", isGameEnd);
      if (gameId && telegramId) {
         socket.emit("joinGame", { gameId, telegramId, GameSessionId });
      }
    };
    const handlePlayerCountUpdate = ({ playerCount }) => setPlayerCount(playerCount);
    const handleCountdownTick = ({ countdown }) => setCountdown(countdown);
    const handleGameStart = () => setGameStarted(true);
    const handleGameEnd = () => {
      console.log("gameEnd is called 🤪🚀⭐", isGameEnd);
      setIsGameEnd(true);
    } 
    const handleGameReset = () => {
      console.log("🔄 Game reset received, allowing new gameCount emit");
      setHasEmittedGameCount(false);
      setRandomNumber([]);
      setCalledSet(new Set());
      setSelectedNumbers(new Set());
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
    // This callback runs after the server receives the "playerLeave" event
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

  // Use the correct, consistent path with a leading slash
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


  

 const handleCartelaClick = (num) => {
  setSelectedNumbers((prev) => {
    const newSelection = new Set(prev);
    if (newSelection.has(num)) {
      newSelection.delete(num);
    } else {
      newSelection.add(num);
    }
    localStorage.setItem("selectedNumbers", JSON.stringify([...newSelection]));
    return newSelection;
  });
};

  
  const checkForWin = (selectedSet, telegramId) => {
    const markedNumbers = new Set(selectedSet);
    const drawnNumbers = new Set(randomNumber); // Numbers that have been drawn
    const selectedArray = Array.from(selectedSet); // 🔁 Convert Set to Array

    let matchedCellsGlobal = [];
    let lastWinnerCells = [];
    let allWinnerCells = [];
    let lastMatchedPattern = "";

    const countLinePatterns = () => {
      let matchedRows = 0;
      let matchedCols = 0;
      let matchedDiagonals = 0;

      // Check rows
      cartela.forEach((row, rowIndex) => {
        const matchedCells = row
          .map((num, colIndex) =>
            num === "FREE" || drawnNumbers.has(num) && markedNumbers.has(num)
              ? [rowIndex, colIndex]
              : null
          )
          .filter((cell) => cell !== null);

        // Check if the row is fully matched
        if (matchedCells.length === row.length) {
          matchedRows += 1;
          matchedCells.forEach((cell) => {
            const [r, c] = cell;
            matchedCellsGlobal.push(cartela[r][c]);
          });
          lastMatchedPattern = `Row ${rowIndex + 1}`;
          lastWinnerCells = matchedCells;
          allWinnerCells.push(...matchedCells);
          setLastWinnerCells(matchedCells); // Store matched cells in state
        }
      });

      // Check columns
      for (let col = 0; col < 5; col++) {
        const matchedCells = [];
        for (let row = 0; row < 5; row++) {
          const num = cartela[row][col];
          if (num === "FREE" || drawnNumbers.has(num) && markedNumbers.has(num)) {
            matchedCells.push([row, col]);
          }
        }
        if (matchedCells.length === 5) {
          matchedCols += 1;
          matchedCells.forEach((cell) => {
            const [r, c] = cell;
            matchedCellsGlobal.push(cartela[r][c]);
          });
          lastMatchedPattern = `Column ${col + 1}`;
          lastWinnerCells = matchedCells;
          allWinnerCells.push(...matchedCells);
          setLastWinnerCells(matchedCells); // Store matched cells in state
        }
      }

      // Check diagonals
      const mainDiagonal = [0, 1, 2, 3, 4].map((i) => [i, i]);
      const antiDiagonal = [0, 1, 2, 3, 4].map((i) => [i, 4 - i]);

      // Check main diagonal
      if (mainDiagonal.every(([row, col]) => cartela[row][col] === "FREE" || drawnNumbers.has(cartela[row][col]) && markedNumbers.has(cartela[row][col]))) {
        matchedDiagonals += 1;
        mainDiagonal.forEach(([r, c]) => matchedCellsGlobal.push(cartela[r][c]));
        lastMatchedPattern = "Main Diagonal";
        lastWinnerCells = mainDiagonal;
        allWinnerCells.push(...mainDiagonal);
        setLastWinnerCells(mainDiagonal); // Store matched cells in state
      }

      // Check anti-diagonal
      if (antiDiagonal.every(([row, col]) => cartela[row][col] === "FREE" || drawnNumbers.has(cartela[row][col]) && markedNumbers.has(cartela[row][col]))) {
        matchedDiagonals += 1;
        antiDiagonal.forEach(([r, c]) => matchedCellsGlobal.push(cartela[r][c]));
        lastMatchedPattern = "Anti Diagonal";
        lastWinnerCells = antiDiagonal;
        allWinnerCells.push(...antiDiagonal);
        setLastWinnerCells(antiDiagonal); // Store matched cells in state
      }

     // console.log("Last matched pattern:", lastMatchedPattern);
     // console.log("Winning cells:", lastWinnerCells);
      return matchedRows + matchedCols + matchedDiagonals;
    };

    const winCount = countLinePatterns();

    const winnerPattern = Array(25).fill(false); // Assuming a 5x5 board
    lastWinnerCells.forEach(([row, col]) => {
      const index = row * 5 + col;
      winnerPattern[index] = true;
    });

    // if (winCount > 0) {
    //   // alert(`Bingo! Winning Pattern: ${lastMatchedPattern}`);
    //   declareWinner(winnerPattern, telegramId);
    //   return lastMatchedPattern;
    // } else {
    //   alert("You are not a winner yet! Keep playing.");
    // }

    socket.emit("checkWinner", {
      telegramId,
      gameId,
      GameSessionId,
      cartelaId, 
      selectedNumbers: selectedArray,        // player card ID
    });

  console.log("Sending to backend:", {
  telegramId,
  gameId,
  cartelaId,
  selectedNumbers: selectedArray
});
  };


  useEffect(() => {
  if (!socket) return;

  socket.on("gameStateSync", (state) => {
    setDrawnNumbers(state.drawnNumbers);
    setGameActive(state.isActive);
    setPrize(state.prizeAmount);
    setWinnerPattern(state.winnerPattern);
    setBoard(state.board);
    setBoardNumber(state.boardNumber);
  });

  socket.on("youAreWinner", (winnerData) => {
    navigate("/winner", { state: winnerData });
  });

  return () => {
    socket.off("gameStateSync");
    socket.off("youAreWinner");
  };
}, [socket]);


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




// useEffect(() => {
//   const handleWinnerFound = ({ winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId, GameSessionId }) => {
//     navigate("/winnerPage", {
//       state: {
//         winnerName,
//         prizeAmount,
//         board,
//         winnerPattern,
//         boardNumber,
//         playerCount,
//         telegramId,
//         gameId,
//         GameSessionId
//       }
//     });
//   };

// }, [navigate]);


  

  return (
    <div className="bg-gradient-to-b from-[#1a002b] via-[#2d003f] to-black min-h-screen flex flex-col items-center p-1 pb-3 w-full max-w-screen overflow-hidden">
    <div className="grid grid-cols-5 sm:grid-cols-5 gap-1 w-full text-white text-center mt-2 mb-2">
        {[
          `Players: ${gameDetails.playersCount}`, // Correct way to display players count
          `Prize: ${gameDetails.winAmount}`, // Correct way to display win amount
          `Call: ${callNumberLength}`, // Correct way to display called numbers
          `Stake: ${gameDetails.stakeAmount}`, // Correct way to display stake amount
        ].map((info, i) => (
          <button key={i} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded w-full">
            {info}
          </button>
        ))}
      <button
          onClick={() => {
            if (!isAudioOn) {
              // User is trying to enable audio — prime it
              const audio = new Audio(`audio/audio1.mp3`);
              audio.volume = 0; // Silent play to satisfy browser
              audio
                .play()
                .then(() => {
                  audio.pause();
                  audio.currentTime = 0;
                  console.log("✅ Audio unlocked");
                  setIsAudioOn(true); // Enable audio
                })
                .catch((err) => {
                  console.warn("❌ Audio unlock failed:", err);
                  alert("Audio could not be enabled. Please try clicking again.");
                });
            } else {
              setIsAudioOn(false); // Mute audio
            }
          }}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold p-1 text-xs rounded w-full"
        >
          {`${isAudioOn ? "🔊" : "🔇"}`}
      </button>

    </div>

      <div className="flex flex-wrap w-full">
        <div className="w-[45%] flex justify-center">
          <div className="grid grid-cols-5 bg-[#2a0047] p-1 gap-2 rounded-lg text-xs w-[90%] ">
          {["B", "I", "N", "G", "O"].map((letter, i) => (
            <div key={i} className={`text-white text-center text-xs font-bold rounded-full h-4 w-6 ${bingoColors[letter]}`}>
              {letter}
            </div>
          ))}
          {[...Array(15)].map((_, rowIndex) =>
            ["B", "I", "N", "G", "O"].map((letter, colIndex) => {
              const number = rowIndex + 1 + colIndex * 15;
              const randomNumberLabel = `${letter}-${number}`;

              return (
                <div
                  key={randomNumberLabel}
                  className={`text-center rounded ${
                   calledSet.has(randomNumberLabel) // Check if number has been drawn
                      ? "bg-gradient-to-b from-yellow-400 to-orange-500 text-black" // Mark all drawn numbers
                      : "bg-gray-800 text-gray-400 font-bold"
                  }`}
                >
                  {number}
                </div>
              );
            })
          )}
          </div>
        </div>

        <div className="w-[55%] flex flex-col items-center gap-1">
          <div className="bg-gray-300 p-2 rounded-lg text-center text-xs w-[90%] flex-row flex items-center h-[7%] justify-around">
            <p>Countdown</p>
            <p className="text-lg font-bold">{countdown > 0 ? countdown : "Wait"}</p>
          </div>

      <div className="bg-gradient-to-b from-purple-800 to-purple-900 rounded-lg text-white flex flex-row justify-around items-center w-full max-w-md mx-auto">
     <p className="font-bold text-xs">Current Number</p>
        <div className="flex justify-center items-center gap-4">
          {/* Main Display for Last Drawn Number */}
        <div className="w-14 h-14 flex items-center justify-center text-xl font-extrabold rounded-full shadow-[0_0_20px_#37ebf3] bg-[#37ebf3] text-purple-900">
            {lastCalledLabel ? lastCalledLabel : "-"}
        </div>
           </div>
      </div>


       {/* Called Numbers Section */}
<div className="bg-gradient-to-b from-gray-800 to-gray-900 p-2 rounded-lg w-full max-w-md mx-auto">
  <p className="text-center font-bold text-xs sm:text-sm text-yellow-400 md:text-base mb-1">Recent Calls</p>
   <div className="flex justify-center gap-2 sm:gap-4">
  {randomNumber.slice(-4, -1).map((num, index)  => {
      // Define an array of colors for the backgrounds
      const colors = [
        "bg-red-800", // Red
        "bg-green-800", // Green
        "bg-blue-800", // Blue
      ];

      return (
        <div
          key={index}
          className={`w-6 h-6 sm:w-6 sm:h-6 md:w-6 md:h-6 flex items-center justify-center 
                      text-base text-xs md:text-sm font-extrabold rounded-full shadow-xl text-white
                      ${colors[index]}`}
        >
          {num}
        </div>
      );
    })}
  </div>
  <div className="grid grid-cols-5 gap-1 mt-2 text-xs sm:text-sm">
    {calledNumbers.map((num, i) => {
      const letter = num.charAt(0);
      return (
        <div key={i} className={`p-2 text-center rounded text-white ${bingoColors[letter]} text-xs sm:text-sm`}>
          {num}
        </div>
      );
    })}
  </div>
</div>

{/* Bingo Card */}
{cartela.length > 0 && (
  <div className="bg-gradient-to-b from-purple-800 to-purple-900 p-4 rounded-lg w-full max-w-md mx-auto h-[80%]">
    
    {/* BINGO Header */}
    <div className="grid grid-cols-5 gap-1 mb-2">
      {["B", "I", "N", "G", "O"].map((letter, i) => (
        <div
          key={i}
          className="md:w-10 md:h-10 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-white text-base sm:text-lg bg-gradient-to-b from-purple-700 to-purple-900 rounded-lg shadow-md"
        >
          {letter}
        </div>
      ))}
    </div>

    {/* Bingo Numbers Grid */}
    <div className="grid grid-cols-5  h-[90%]">
      {cartela.map((row, rowIndex) =>
        row.map((num, colIndex) => {
          const isFreeSpace = rowIndex === 2 && colIndex === 2; // Middle space (FREE)
          const isSelected = selectedNumbers.has(num); // Check if number is marked

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleCartelaClick(num)} // Click to mark
              className={`md:w-10 md:h-10 w-8 h-8 flex items-center justify-center font-bold text-sm sm:text-lg border rounded-lg shadow-md cursor-pointer transition
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
        })
      )}
    </div>
  </div>
 )}

        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-2 mt-2">
       <button onClick={() => checkForWin(selectedNumbers, telegramId)} 
        className="w-[95%] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 px-4 py-2 text-white rounded-4xl text-lg font-bold shadow-lg transition-all duration-200" >
          Bingo!
        </button>
        <div className="w-full flex gap-3 justify-center">
            <button
               className=" bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 px-12 h-6 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
              onClick={() => {
                // Re-emit joinGame to force a state synchronization from the backend
                if (gameId && telegramId) {
                  socket.emit("joinGame", { gameId, telegramId, GameSessionId });
                  console.log("Forced refresh: Re-emitted joinGame to synchronize state.");
                  // Optional: Reset any client-side-only UI states if necessary
                  // setSomeTemporaryUIState(false);
                } else {
                  console.warn("Cannot force refresh: gameId or telegramId missing.");
                  // Fallback to full refresh if critical data is missing (unlikely if in game)
                  window.location.reload();
                }
              }}
            >
              Refresh
          </button>
          <button
            onClick={() => {
             socket.emit("playerLeave", { gameId: String(gameId), GameSessionId, telegramId }, () => {
                console.log("player leave emited🎯🎯", GameSessionId );
                navigate("/");
              });
            }}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 px-12 h-6 text-white rounded-full text-sm font-semibold shadow-md transition-all duration-200"
          >
            Leave
          </button>

        </div>
      </div>

     {isGameEnd && (
        <div className="fixed inset-0 flex items-center justify-center  bg-opacity-80 backdrop-blur-sm z-50 transition-opacity duration-300">
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
                console.log("player leave emited🎯🎯", GameSessionId );
                navigate("/");
              });
            }} >
              Leave Game
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

export default BingoGame;
