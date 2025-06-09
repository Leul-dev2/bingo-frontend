import bingoCards from "../assets/bingoCards.json"; // Import the JSON file
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { io } from "socket.io-client";

// http://localhost:5173/?user=637145475&game=10

// Initialize socket connection
const socket = io("https://bingobot-backend-bwdo.onrender.com");

function Bingo() {
  const [searchParams] = useSearchParams();
  const telegramId = searchParams.get("user"); // Get telegramId from URL query parameters
  const gameId = searchParams.get("game"); // Get gameId from URL query parameters
  // const telegramId = 637145475; // Get telegramId from URL query parameters
  // const gameId = 10;
  const navigate = useNavigate();
  const [cartelaId, setCartelaId] = useState(null);
  const [cartela, setCartela] = useState([]);
  const [gameStatus, setGameStatus] = useState("");
  const [userBalance, setUserBalance] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const numbers = Array.from({ length: 130 }, (_, i) => i + 1);
  const [response, setResponse] = useState("");
  const [otherSelectedCards, setOtherSelectedCards] = useState({});
  const [count, setCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);




  // 🟢 Fetch User Balance from REST
  const fetchUserData = async (id) => {
    try {
      const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/users/getUser?telegramId=${telegramId}`);
      if (!res.ok) throw new Error("User not found");
      const data = await res.json();
      setUserBalance(data.balance);
    } catch (err) {
      console.error(err);
      setAlertMessage("Error fetching user data.");
    }
  };

  // 🟢 Initial Effect to Fetch & Setup Socket
useEffect(() => {
  if (!telegramId) return;


  fetchUserData(telegramId);
  // When loading game, maybe in useEffect or login flow
   localStorage.setItem("telegramId", telegramId);


  // Setup all socket listeners first
const handleCardSelections = (cards) => {
  console.log("💡 Initial card selections received:", cards);
  const reformatted = {};

  for (const [cardId, telegramId] of Object.entries(cards)) {
    reformatted[telegramId] = parseInt(cardId); // Ensure same type as num
  }

  setOtherSelectedCards(reformatted);
};

  socket.on("userconnected", (res) => {
    setResponse(res.telegramId);
  });

  socket.on("balanceUpdated", (newBalance) => {
    setUserBalance(newBalance);
  });

  socket.on("gameStatusUpdate", (status) => {
    setGameStatus(status);
  });

  socket.on("currentCardSelections", handleCardSelections);

  socket.on("cardConfirmed", (data) => {
    setCartela(data.card);
    setCartelaId(data.cardId);
    setGameStatus("Ready to Start");
  });

  socket.on("otherCardSelected", ({ telegramId, cardId }) => {
    setOtherSelectedCards((prev) => ({
      ...prev,
      [telegramId]: cardId,
    }));
  });

  socket.on("gameid", (data) => {
    console.log("user joined")
    setCount(data.numberOfPlayers);
  });

  socket.on("error", (err) => {
    console.error(err);
    setAlertMessage(err.message);
  });

   socket.on("cardsReset", ({ gameId: resetGameId }) => {
    if (resetGameId === gameId) {
      setOtherSelectedCards({});
      setCartela([]);
      setCartelaId(null);
      console.log("🔄 Cards have been reset for this game.");
    }
  });

  // Emit after all listeners are set up
  socket.emit("joinUser", { telegramId });
  socket.emit("userJoinedGame", { telegramId, gameId });

  return () => {
    socket.off("userconnected");
    socket.off("balanceUpdated");
    socket.off("gameStatusUpdate");
    socket.off("currentCardSelections", handleCardSelections);
    socket.off("cardConfirmed");
    socket.off("otherCardSelected");
    socket.off("gameid");
    socket.off("error");
    socket.off("cardsReset");
  };
}, [telegramId, navigate]);


  useEffect(() => {
    if (!socket) return;
    const handleCardAvailable = ({ cardId }) => {
      setOtherSelectedCards((prevCards) => {
        const updated = { ...prevCards };
        for (const key in updated) {
          if (updated[key] === cardId) {
            delete updated[key];
            break;  
          }
        }
        return updated;
      });
    };
  
    socket.on("cardAvailable", handleCardAvailable);
  
    return () => {
      socket.off("cardAvailable", handleCardAvailable);
    };
  }, [socket]);
  

  // 🟢 Select a bingo card
  const handleNumberClick = (number) => {
    const selectedCard = bingoCards.find(card => card.id === number);
    if (selectedCard) {
      setCartela(selectedCard.card);
      setCartelaId(number);
      setGameStatus("Ready to Start");
      // Emit selected card event to the server
      socket.emit("cardSelected", {
        telegramId,
        gameId,
        cardId: number,
        card: selectedCard.card,
      });      
    } else {
      console.error("Card not found for ID:", number);
    }
  };


useEffect(() => {

  // Game start handler
  socket.on("gameStart", () => {
    setGameStarted(true);
  });

  return () => {
    socket.off("gameStart");
  };
}, []);

useEffect(() => {

  // Game start handler
  socket.on("gameFinished", () => {
    setGameStarted(false);
  });

  return () => {
    socket.off("gameFinished");
  };
}, []);


  // useEffect(() => {
  //   // Handle your own card confirmation
  //   socket.on('cardConfirmed', (data) => {
  //     setCartela(data.card);
  //     setCartelaId(data.cardId);
  //     setGameStatus("Ready to Start");
  //   });
  
  //   // Handle other users' selected cards
  //   socket.on('otherCardSelected', ({ telegramId, cardId }) => {
  //     setOtherSelectedCards(prev => ({
  //       ...prev,
  //       [telegramId]: cardId,
  //     }));
  //   });

  //   socket.on("gameid", (data) => {
  //       setCount(data.numberOfPlayers);
      
  //   });

  
  //   return () => {
  //     socket.off('cardConfirmed');
  //     socket.off('otherCardSelected');
  //     socket.off("gameid");
  //   };
  // }, [socket]);
  
  

  const resetGame = () => {
    setCartelaId(null);
    setCartela([]);
    setGameStatus("");
  };

  // 🟢 Join Game & Emit to Socket
 const startGame = async () => {
  if (gameStarted || isStarting) {
    alert("Please wait until the active game ends.");
    return;
  }

  setIsStarting(true); // 🚫 Block further clicks

  try {
    const response = await fetch("https://bingobot-backend-bwdo.onrender.com/api/games/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gameId,
        telegramId
      }),
    });

    const data = await response.json();

    if (response.ok) {
      socket.off("playerCountUpdate").on("playerCountUpdate", ({ playerCount }) => {
        console.log(`Players in the game room ${gameId}: ${playerCount}`);
        setPlayerCount(playerCount);
      });

      socket.off("gameId").on("gameId", (res) => {
        const { gameId: receivedGameId, telegramId: receivedTelegramId } = res;

        if (receivedGameId && receivedTelegramId) {
          navigate("/game", {
            state: {
              gameId: receivedGameId,
              telegramId: receivedTelegramId,
              cartela,
              playerCount,
            },
          });
        } else {
          setAlertMessage("Invalid game or user data received!");
        }
      });

      socket.emit("joinGame", { gameId, telegramId });

    } else {
      setAlertMessage(data.error || "Error starting the game");
      console.error("Game start error:", data.error);
    }

  } catch (error) {
    setAlertMessage("Error connecting to the backend");
    console.error("Connection error:", error);
  } finally {
    setIsStarting(false); // ✅ Allow retry only after the request finishes
  }
};

  

  return (
    <div className="flex flex-col items-center p-5 min-h-screen bg-purple-400 text-white w-full overflow-hidden">
      {alertMessage && (
        <div className="fixed top-0 left-0 w-full flex justify-center z-50">
          <div className="flex items-center max-w-sm w-full p-3 m-2 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md shadow-lg">
            <svg className="w-5 h-5 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zM9 7a1 1 0 012 0v3a1 1 0 01-2 0V7zm1 6a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
            <span className="flex-1 text-sm">{alertMessage}</span>
            <button className="text-gray-500 hover:text-gray-700" onClick={() => setAlertMessage("")}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-around w-full max-w-lg mb-2">
        <div className="bg-white text-purple-400 px-10 py-1 rounded-3xl text-center font-bold text-sm">
          Balance<br />
          <span className="font-bold">{userBalance !== null ? `${userBalance} Birr` : "Loading..."}</span>
        </div>
        <div className="bg-white text-purple-400 px-3 py-1 rounded-3xl text-center font-bold text-sm">
          Game <br />
          <span className="font-bold">{count}</span>
        </div>
        <div className="bg-white text-purple-400 px-10 py-1 rounded-3xl text-center text-sm font-bold">
          Game Choice<br />
          <span className="font-bold">{gameId} </span>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-1 p-2 max-w-lg w-full text-xs">
   {numbers.map((num) => {
    const isMyCard = cartelaId === num;
    const isOtherCard = Object.values(otherSelectedCards).includes(num);
    //const isOtherCard = (num) => Object.keys(otherSelectedCards).includes(num.toString());
    // const isOtherCard = otherSelectedCards.hasOwnProperty(num.toString());

    return (
      <button
        key={num}
        onClick={() => handleNumberClick(num)}
        disabled={isOtherCard}
        className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs
          ${isMyCard ? "bg-green-500 text-white"
            : isOtherCard ? "bg-yellow-400 text-black"
            : "bg-purple-100 text-black"}`}
      >
        {num}
      </button>
    );
  })}
    </div>

      {cartela.length > 0 && (
        <div className="grid grid-cols-5 gap-1 p-2 bg-transparent text-white">
          {cartela.flat().map((num, index) => (
            <div key={index} className="w-10 h-10 flex items-center justify-center border border-white rounded-lg text-xs font-bold bg-purple-100 text-black">
              {num}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={resetGame} className="bg-blue-500 text-white px-3 py-1 rounded-lg shadow-md text-sm">
          Refresh
        </button>
       <button
        onClick={startGame}
        disabled={!cartelaId || isStarting}
        className={`${
          !cartelaId || isStarting ? "bg-gray-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
        } text-white px-3 py-1 rounded-lg shadow-md text-sm`}
        >
        {isStarting ? "Starting..." : "Start Game"}
      </button>

      </div>
    </div>
  );
};

export default Bingo;
