import bingoCards from "../assets/bingoCards.json"; // Import the JSON file
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";



function Bingo({isBlackToggleOn, setCartelaIdInParent, cartelaId, socket, otherSelectedCards, setOtherSelectedCards, emitLockRef }) {
///////saving teh tegram id and gamechoice in localstaoge /////////////////////////////////////////////////////
const [searchParams] = useSearchParams();
const urlTelegramId = searchParams.get("user");
const urlGameId = searchParams.get("game");
const location = useLocation();
//const emitLockRef = useRef(false); // prevents double emit
const prevPathRef = useRef(null);


// Store only if changed
useEffect(() => {
const storedTelegramId = localStorage.getItem("telegramId");
const storedGameId = localStorage.getItem("gameChoice");

if (urlTelegramId && urlTelegramId !== storedTelegramId) {
localStorage.setItem("telegramId", urlTelegramId);
}

if (urlGameId && urlGameId !== storedGameId) {
localStorage.setItem("gameChoice", urlGameId);
}
}, [urlTelegramId, urlGameId]);

// Use URL value if available, otherwise fallback to localStorage
const telegramId = urlTelegramId || localStorage.getItem("telegramId");
const gameId = urlGameId || localStorage.getItem("gameChoice");




//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Existing effect to load saved card on mount
// useEffect(() => {
// const savedId = sessionStorage.getItem("mySelectedCardId");
// if (savedId) {
// const selectedCard = bingoCards.find(card => card.id === Number(savedId));
// if (selectedCard) {
// setCartelaId(Number(savedId));
// setCartela(selectedCard.card);
// }
// }
// }, []);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const navigate = useNavigate();
//const [cartelaId, setCartelaId] = useState(null);
const [cartela, setCartela] = useState([]);
const [gameStatus, setGameStatus] = useState("");
const [userBalance, setUserBalance] = useState(null);
const [alertMessage, setAlertMessage] = useState("");
const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
const [response, setResponse] = useState("");
//const [otherSelectedCards, setOtherSelectedCards] = useState({});
const [count, setCount] = useState(0);
const [playerCount, setPlayerCount] = useState(0);
const [gameStarted, setGameStarted] = useState(false);
const [countdown, setCountdown] = useState(null);
const [isStarting, setIsStarting] = useState(false);
const [isSocketReady, setIsSocketReady] = useState(false);
const hasInitialSyncRun = useRef(false);
const [selectedCardData, setSelectedCardData] = useState(null); // ✅ NEW STATE: To store the full card data


const bgGradient = isBlackToggleOn
? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
: 'bg-purple-400';

const alertBg = isBlackToggleOn ? 'bg-red-900' : 'bg-red-100';
const alertText = isBlackToggleOn ? 'text-red-300' : 'text-red-700';
const alertBorder = isBlackToggleOn ? 'border-red-700' : 'border-red-500';

const cardBg = isBlackToggleOn ? 'bg-white/10' : 'bg-white';
const cardText = isBlackToggleOn ? 'text-indigo-300' : 'text-purple-400';

const myCardBg = isBlackToggleOn ? 'bg-green-600 text-white' : 'bg-green-500 text-white';
const otherCardBg = isBlackToggleOn ? 'bg-yellow-600 text-black' : 'bg-yellow-400 text-black';
const defaultCardBg = isBlackToggleOn ? 'bg-gray-700 text-white' : 'bg-purple-100 text-black';

const cellBg = isBlackToggleOn ? 'bg-gray-800 text-white' : 'bg-purple-100 text-black';

const refreshBtnBg = isBlackToggleOn ? 'bg-blue-700' : 'bg-blue-500';
const startBtnEnabledBg = isBlackToggleOn ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600';
const startBtnDisabledBg = 'bg-gray-600 cursor-not-allowed';




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
  console.log("🟢 initial Effect - Bingo component mount/update");
  if (!telegramId || !gameId) {
    console.error("Missing telegramId or gameId for game page, navigating home.");
    navigate('/');
    return;
  }

  const handleCardSelections = (cards) => {
    console.log("💡 Initial card selections received:", cards);
    const reformatted = {};
    for (const [cardId, tId] of Object.entries(cards)) {
      // ✅ MODIFIED: Use the passed `cartelaId` prop to check for your own card
      if (tId === telegramId) {
        setCartelaIdInParent(parseInt(cardId)); // Restore your own card selection
        const myCard = bingoCards.find(card => card.id === parseInt(cardId));
        if (myCard) {
          setCartela(myCard.card);
          setSelectedCardData(myCard); // Store the actual card object
        }
      } else {
        reformatted[tId] = parseInt(cardId); // Store other players' selections
      }
    }
    setOtherSelectedCards(reformatted); // Only others
  };

  const handleInitialCardStates = (data) => {
    console.log("💡 Frontend: Received initialCardStates (full board sync):", data);
    const { takenCards } = data; // Backend sends: { "cardId": { cardId: N, takenBy: 'TID', isTaken: true } }

    const newOtherSelectedCardsMap = {};
    let myCardFoundInSync = false;

    for (const cardIdStr in takenCards) {
      const cardId = Number(cardIdStr);
      const takenByTelegramId = takenCards[cardIdStr].takenBy;
      if (takenByTelegramId === telegramId) {
        setCartelaIdInParent(cardId); // Set your cardId
        const myCard = bingoCards.find(card => card.id === cardId);
        if (myCard) {
          setCartela(myCard.card);
          setSelectedCardData(myCard); // Store the actual card object
        }
        myCardFoundInSync = true;
      } else {
        newOtherSelectedCardsMap[takenByTelegramId] = cardId; // Store as { telegramId: cardId }
      }
    }
    setOtherSelectedCards(newOtherSelectedCardsMap); // Set the full map, overriding previous state

    // ✅ MODIFIED: Logic to restore user's own card based on sessionStorage
    // Only attempt to restore if your card wasn't already in the sync from backend
    if (!myCardFoundInSync) {
      const mySavedCardId = sessionStorage.getItem("mySelectedCardId");
      if (mySavedCardId && !isNaN(Number(mySavedCardId))) {
        const numMySavedCardId = Number(mySavedCardId);
        const selectedCard = bingoCards.find(card => card.id === numMySavedCardId);
        if (selectedCard) {
          setCartela(selectedCard.card);
          setCartelaIdInParent(numMySavedCardId);
          setSelectedCardData(selectedCard); // Store the actual card object
          // Also ensure your own card is reflected in `otherSelectedCards` if it wasn't
          setOtherSelectedCards(prev => ({
            ...prev,
            [telegramId]: numMySavedCardId
          }));
        } else {
          sessionStorage.removeItem("mySelectedCardId");
          setCartela([]);
          setCartelaIdInParent(null);
          setSelectedCardData(null); // Clear stored card data
          console.warn("Saved card ID not found in bingoCards data. Clearing saved selection.");
        }
      } else {
        setCartela([]);
        setCartelaIdInParent(null);
        setSelectedCardData(null); // Clear stored card data
      }
    }
    hasInitialSyncRun.current = true; // Mark sync as done for this specific mount
  };

  // This function encapsulates the initial sync logic.
  const performInitialGameSync = () => {
    if (socket.connected && telegramId && gameId) {
      // Ensure this only runs once per unique telegramId/gameId session
      const currentSyncKey = `${telegramId}-${gameId}`;
      if (hasInitialSyncRun.current === currentSyncKey) {
        console.log("Initial sync already performed for this session. Skipping.");
        return; // Avoid duplicate emissions
      }

      console.log(`Frontend: Emitting 'userJoinedGame' for gameId: ${gameId} (Lobby Phase)`);
      // ✅ MODIFIED: Explicitly for lobby phase as per your clarification
      socket.emit("userJoinedGame", { telegramId, gameId });
      console.log("Emitted userJoinedGame");

      hasInitialSyncRun.current = currentSyncKey; // Mark sync as done for this session
    } else {
      console.log("Socket not connected or missing data, deferring initial sync for lobby.");
    }
  };

  // ... (keep handleCardReleased and other socket.on listeners)

  // ✅ MODIFIED: Use the `connect` event for performing initial sync
  const handleConnectForSync = () => {
    console.log("Component: Socket connected/re-connected, performing initial sync for lobby.");
    performInitialGameSync();
  };
  socket.on("connect", handleConnectForSync);

  // ✅ MODIFIED: Ensure initial sync runs on component mount if already connected
  // This is crucial for clients who refresh or return to the lobby page.
  if (socket.connected) {
    console.log("Socket already connected on mount, performing initial sync for lobby.");
    performInitialGameSync();
  }

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected — resetting sync flag.");
    hasInitialSyncRun.current = false;
  });

  fetchUserData(telegramId); // Initial fetch of user data

  // --- Cleanup Function ---
  return () => {
    // Remove all specific listeners attached by this component
    socket.off("userconnected");
    socket.off("initialCardStates", handleInitialCardStates);
    socket.off("balanceUpdated");
    socket.off("gameStatusUpdate");
    socket.off("currentCardSelections", handleCardSelections);
    socket.off("cardConfirmed");
    socket.off("cardUnavailable");
    socket.off("cardError");
    socket.off("cardReleased", handleCardReleased);
    socket.off("gameid");
    socket.off("error");
    socket.off("cardsReset");
    socket.off("connect", handleConnectForSync); // Clean up this specific listener
    // Reset the sync flag when the component unmounts
    hasInitialSyncRun.current = false;
  };
}, [telegramId, gameId, bingoCards, navigate, socket, setCartelaIdInParent, setOtherSelectedCards]);
// ✅ ADDED DEPENDENCIES: setCartelaIdInParent, setOtherSelectedCards for completeness



const handleLocalCartelaIdChange = (newCartelaId) => {
  console.log(`🔍 Bingo.jsx: handleLocalCartelaIdChange called with: ${newCartelaId}`);
  const selectedCard = bingoCards.find(card => card.id === newCartelaId);
  if (selectedCard) {
    setCartela(selectedCard.card);
    setSelectedCardData(selectedCard); // ✅ MODIFIED: Update the new state
    if (setCartelaIdInParent) {
      setCartelaIdInParent(newCartelaId);
    }
  } else {
    setCartela([]);
    setSelectedCardData(null); // ✅ MODIFIED: Clear the new state
    if (setCartelaIdInParent) {
      setCartelaIdInParent(null);
    }
  }
};






// 🟢 Select a bingo card
const handleNumberClick = (number) => {
  console.log("Clicked button ID:", number);
  // Allow changing the card by unlocking and re-emitting
  if (emitLockRef.current && cartelaId === number) return; // Prevent double-clicking the *same* card

  const newSelectedCard = bingoCards.find(card => card.id === number);

  if (newSelectedCard) {
    // If the card is already taken by someone else, don't allow selection
    const isOtherCardTaken = Object.entries(otherSelectedCards).some(
      ([id, card]) => Number(card) === number && id !== telegramId
    );
    if (isOtherCardTaken) {
      setAlertMessage(`🚫 Card ${number} is already taken by another player.`);
      return; // Do not proceed with selection
    }

    emitLockRef.current = true; // ✅ LOCK IMMEDIATELY before emitting

    handleLocalCartelaIdChange(number); // Update local states (cartela, cartelaIdInParent, selectedCardData)
    setGameStatus("Ready to Start");

    socket.emit("cardSelected", {
      telegramId,
      gameId,
      cardId: number,
      card: newSelectedCard.card, // ✅ MODIFIED: Use the newly found card data
    });
    console.log(`Card ${number} emitted to the backend for selection.`);
  } else {
    handleLocalCartelaIdChange(null);
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


const resetGame = () => {
 window.location.reload();
 console.log("page refreshed")
};




// Real-time update
useEffect(() => {
socket.on("gameEnded", () => {
console.log("gameended ⬅️⬅️⬅️")
setGameStarted(false);
setIsStarting(false);
setAlertMessage("");
sessionStorage.removeItem("mySelectedCardId")
});

return () => socket.off("gameEnded");
}, []);

useEffect(() => {
const interval = setInterval(async () => {
try {
const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/games/${gameId}/status`);
const data = await res.json();

if (!data.isActive) {
console.log("🟢 Game is inactive now.");
setIsStarting(false);
setGameStarted(false);  // ✅ Ensure gameStarted is false if game is not active
} else {
setIsStarting(true);
setGameStarted(true);   // ✅ If active, keep this in sync
}
} catch (error) {
console.error("Status polling failed:", error);
}
}, 3000);

return () => clearInterval(interval);
}, [gameId]);




// 🟢 Join Game & Emit to Socket
const startGame = async () => {
  if (isStarting) return; // Prevent multiple clicks

  // Ensure a card is selected before trying to start
  if (!cartelaId) {
    setAlertMessage("Please select a bingo card before starting the game.");
    return;
  }

  setIsStarting(true); // Block double-clicking

  try {
    // 🧠 Step 1: Check if a game is already running (via REST API)
    const statusRes = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/games/${gameId}/status`);
    const statusData = await statusRes.json();

    if (statusData.exists && statusData.isActive) {
      setAlertMessage("🚫 A game is already running or being initialized. Please wait.");
      setIsStarting(false);
      return;
    }

    // 🟢 Step 2: Call backend REST API to 'start' the game
    // This server endpoint should handle game initialization, balance checks, etc.
    const response = await fetch("https://bingobot-backend-bwdo.onrender.com/api/games/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, telegramId }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // ✅ Game start initiated successfully by backend.
      console.log("Game start initiated successfully by backend (via REST API).");

      navigate("/game", {
        state: {
          gameId: gameId, // Use the gameId from your state
          telegramId: telegramId, // Use the telegramId from your state
          cartelaId: cartelaId, // The ID of the card the user selected in the lobby
          cartela: selectedCardData ? selectedCardData.card : cartela, // The actual card data
          playerCount: playerCount, // Current player count from lobby
        },
      });

    } else {
      // 🚨 Backend rejected the game start request
      setAlertMessage(data.error || "Error starting the game");
      console.error("Game start error:", data.error);
    }

  } catch (error) {
    setAlertMessage("Error connecting to the backend or starting game.");
    console.error("Connection error:", error);
  } finally {
    setIsStarting(false); // ✅ IMPORTANT: Always reset isStarting in finally block
  }
};

// ... (rest of the component's render logic)


return (
<>
<div className={`flex flex-col items-center p-3 pb-20 min-h-screen ${bgGradient} text-white w-full overflow-hidden`}>
{alertMessage && (
<div className="fixed top-0 left-0 w-full flex justify-center z-50">
<div className={`flex items-center max-w-sm w-full p-3 m-2 ${alertBg} ${alertBorder} border-l-4 ${alertText} rounded-md shadow-lg`}>
<svg className={`w-5 h-5 mr-2 ${alertText}`} fill="currentColor" viewBox="0 0 20 20">
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
<div className={`${cardBg} ${cardText} px-10 py-1 rounded-3xl text-center font-bold text-sm`}>
Balance<br />
<span className="font-bold">{userBalance !== null ? `${userBalance} Birr` : "Loading..."}</span>
</div>
<div className={`${cardBg} ${cardText} px-3 py-1 rounded-3xl text-center font-bold text-sm`}>
Game <br />
<span className="font-bold">{count}</span>
</div>
<div className={`${cardBg} ${cardText} px-10 py-1 rounded-3xl text-center text-sm font-bold`}>
Game Choice<br />
<span className="font-bold">{gameId} </span>
</div>
</div>

<div className="grid grid-cols-10 gap-1 py-1 px-2 max-w-lg w-full text-xs">
{numbers.map((num) => {
 // console.log(cartelaId);
const isMyCard = cartelaId === num;
const isOtherCard = Object.entries(otherSelectedCards).some(
([id, card]) => Number(card) === num && id !== telegramId
);

return (
<button
key={num}
onClick={() => handleNumberClick(num)}
disabled={isOtherCard} // 🚫 Disable until socket is ready or card is taken
className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs
           ${isMyCard ? myCardBg : isOtherCard ? otherCardBg : defaultCardBg}`}
>
{num}
</button>
);
})}
</div>

{cartela.length > 0 && (
<div className="grid grid-cols-5 gap-1 p-2 bg-transparent text-white">
{cartela.flat().map((num, index) => (
<div key={index} className={`w-10 h-10 flex items-center justify-center border border-white rounded-lg text-xs font-bold ${cellBg}`}>
{num}
</div>
))}
</div>
)}

<div className="flex gap-2 mt-3">
<button onClick={resetGame} className={`${refreshBtnBg} text-white px-3 py-1 rounded-lg shadow-md text-sm`}>
Refresh
</button>
<button
onClick={startGame}
disabled={!cartelaId || isStarting}
className={`${
       !cartelaId || isStarting ? startBtnDisabledBg : startBtnEnabledBg
     } text-white px-3 py-1 rounded-lg shadow-md text-sm`}
>
{isStarting ? "Starting..." : "Start Game"}
</button>


</div>
</div>


</>

);
};

export default Bingo;