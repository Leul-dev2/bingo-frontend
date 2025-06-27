import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../socket.js"; // ✅ Shared socket instance

const BingoGame = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartela, cartelaId, gameId, telegramId } = location.state || {};

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

  const hasJoinedRef = useRef(false);




  ////////////////////////////////////////////////////////////////////////////////

  const handleLeave = () => {
  sessionStorage.removeItem("mySelectedCardId"); // Clear the selected card
  navigate("/"); // Navigate back to home page
};


////////////////////////////////////////////////////////////////////////////////

  // 1️⃣ Connect socket and joinGame
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    if (!hasJoinedRef.current && gameId && telegramId) {
      socket.emit("joinGame", { gameId, telegramId });
      hasJoinedRef.current = true;
    }

    // Cleanup on unmount
    return () => {
      socket.off("playerCountUpdate");
      socket.off("countdownUpdate");
      socket.off("countdownTick");
      socket.off("gameStart");
      socket.off("numberDrawn");
      // Optionally disconnect:
      // socket.disconnect();
    };
  }, [gameId, telegramId]);

  // 2️⃣ Handle player count updates
  useEffect(() => {
    socket.on("playerCountUpdate", ({ playerCount }) => {
      console.log("✅ Player count received:", playerCount);
      setPlayerCount(playerCount);
    });

    socket.on("countdownUpdate", ({ countdown }) => {
      setCountdown(countdown);
    });
  }, []);

  // 3️⃣ Request to start game if enough players
 useEffect(() => {
  // Game has already started or gameCount has already been sent — don't emit again
  if (gameStarted || hasEmittedGameCount) return;

  // Only emit when minimum players are ready and game hasn't been triggered yet
  if (playerCount >= 2) {
    console.log("✅ Emitting gameCount to server...");
    socket.emit("gameCount", { gameId });
    setHasEmittedGameCount(true);
  }
}, [playerCount, gameStarted, hasEmittedGameCount]);


useEffect(() => {
  socket.on("gameReset", () => {
    console.log("🔄 Game reset received, allowing new gameCount emit");
    setHasEmittedGameCount(false);
  });

  return () => {
    socket.off("gameReset");
  };
}, []);


  // 4️⃣ Countdown and game start
  useEffect(() => {
    socket.on("countdownTick", ({ countdown }) => {
      setCountdown(countdown);
    });

    socket.on("gameStart", () => {
      setGameStarted(true);
    });
  }, []);

  // 5️⃣ Local countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 6️⃣ Handle number draw
  useEffect(() => {
    socket.on("numberDrawn", ({ number, label }) => {
      setRandomNumber((prev) => [...prev, number]);
      setCalledSet((prev) => new Set(prev).add(label));
    });
  }, []);
  
  // Log all drawn numbers less frequently or use a callback
  // useEffect(() => {
  //   if (randomNumber.length > 0) {
  //     //console.log("🎯 All Drawn Numbers:", randomNumber);
  //   }
  // }, [randomNumber]);

  const handleCartelaClick = (num) => {
    setSelectedNumbers((prev) => {
      const newSelection = new Set(prev);
  
      if (newSelection.has(num)) {
        newSelection.delete(num); // Unmark if already selected
      } else {
        newSelection.add(num); // Mark the number
      }
  
      //console.log("Marked numbers inside handleclick:", newSelection);
      localStorage.setItem("selectedNumbers", JSON.stringify([...newSelection]));
      
      // Check win after every selection
    //  setTimeout(() => checkForWin(newSelection), 100);
      
      return newSelection;
    });
  };
  
  const checkForWin = (selectedNumbers, telegramId) => {
    const markedNumbers = new Set(selectedNumbers); // Marked numbers by the player
    const drawnNumbers = new Set(randomNumber); // Numbers that have been drawn

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

    if (winCount > 0) {
      // alert(`Bingo! Winning Pattern: ${lastMatchedPattern}`);
      declareWinner(winnerPattern, telegramId);
      return lastMatchedPattern;
    } else {
      alert("You are not a winner yet! Keep playing.");
    }
  };



//console.log("card numbersss", cartela);

const declareWinner = (winnerPattern, telegramId) => {
  const board = cartela.map((row, rowIndex) =>
    row.map((num, colIndex) => ({
      value: num,
      selected: selectedNumbers.has(num),
      isWinning: lastWinnerCells.some(([r, c]) => r === rowIndex && c === colIndex)
    }))
  );

  const winnerData = {
    telegramId,
    gameId,
    board,
    winnerPattern,
    cartelaId
  };

  // Send all winner data to backend
  socket.emit("winner", winnerData);
};


useEffect(() => {
  const handleWinnerFound = ({ winnerName, prizeAmount, board, winnerPattern, boardNumber, playerCount, telegramId, gameId }) => {
    //alert("winner found");
    navigate("/winnerPage", {
      state: {
        winnerName,
        prizeAmount,
        board,
        winnerPattern,
        boardNumber,
        playerCount,
        telegramId,
        gameId
      }
    });
  };

  socket.on("winnerfound", handleWinnerFound);

  return () => {
    socket.off("winnerfound", handleWinnerFound);
  };
}, [navigate]);


  

  return (
    <div className="bg-purple-400 min-h-screen flex flex-col items-center p-2 w-full max-w-screen overflow-hidden">
      <div className="grid grid-cols-5 sm:grid-cols-5 gap-1 w-full p-2 bg-purple-600 text-white text-center">
        {[gameId, playerCount, telegramId, "Players", "Bet"].map((info, i) => (
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
              const randomNumberLabel = `${letter}-${number}`;

              return (
                <div
                  key={randomNumberLabel}
                  className={`text-center p-1 rounded ${
                   calledSet.has(randomNumberLabel) // Check if number has been drawn
                      ? "bg-yellow-500" // Mark all drawn numbers
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

          <div className="bg-purple-600 p-4 rounded-lg text-white flex flex-col items-center w-full max-w-md mx-auto">
  <p className="font-bold text-sm sm:text-base mb-2">Last 4 Calls</p>
  
  <div className="flex justify-center gap-2 sm:gap-4">
    {randomNumber.slice(-3).map((num, index) => {
      // Define an array of colors for the backgrounds
      const colors = [
        "bg-red-500", // Red
        "bg-green-500", // Green
        "bg-blue-500", // Blue
        "bg-yellow-500", // Yellow
      ];

      return (
        <div
          key={index}
          className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center 
                      text-base sm:text-lg md:text-xl font-extrabold rounded-full shadow-xl 
                      ${colors[index] || "bg-gray-500"}`}
        >
          {num}
        </div>
      );
    })}
  </div>
</div>


       {/* Called Numbers Section */}
<div className="bg-gray-100 p-2 rounded-lg w-full max-w-md mx-auto">
  <p className="text-center font-bold text-xs sm:text-sm md:text-base">Called Numbers</p>
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
  <div className="bg-purple-300 p-4 rounded-lg w-full max-w-md mx-auto">
    
    {/* BINGO Header */}
    <div className="grid grid-cols-5 gap-1 mb-2">
      {["B", "I", "N", "G", "O"].map((letter, i) => (
        <div
          key={i}
          className="md:w-10 md:h-10 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-white text-base sm:text-lg bg-purple-700 rounded-lg shadow-md"
        >
          {letter}
        </div>
      ))}
    </div>

    {/* Bingo Numbers Grid */}
    <div className="grid grid-cols-5 gap-1">
      {cartela.map((row, rowIndex) =>
        row.map((num, colIndex) => {
          const isFreeSpace = rowIndex === 2 && colIndex === 2; // Middle space (FREE)
          const isSelected = selectedNumbers.has(num); // Check if number is marked

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleCartelaClick(num)} // Click to mark
              className={`md:w-10 md:h-10 w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-sm sm:text-lg border rounded-lg shadow-md cursor-pointer transition
                ${
                  isFreeSpace
                    ? "bg-green-500 text-white" // Free space
                    : isSelected
                    ? "bg-green-500 text-white" // Marked number
                    : "bg-white text-black border-gray-400"
                }`}
            >
              {isFreeSpace ? "*" : num}
            </div>
          );
        })
      )}
    </div>
  </div>
 )}

        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-2 mt-4">
       <button onClick={() => checkForWin(selectedNumbers, telegramId)} className="w-full bg-orange-500 px-4 py-2 text-white rounded-lg text-lg">
          Bingo!
        </button>
        <div className="w-full flex gap-2">
          <button className="w-1/2 bg-blue-500 px-4 py-2 text-white rounded-lg text-lg">
            Refresh
          </button>
          <button onClick={handleLeave} className="w-1/2 bg-green-500 px-4 py-2 text-white rounded-lg text-lg">
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default BingoGame;
