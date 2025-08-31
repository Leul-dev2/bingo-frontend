import bingoCards from "../assets/bingoCards.json"; // Import the JSON file
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";


// Initialize socket connection
//const socket = io("https://bingobot-backend-bwdo.onrender.com");

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
const lastRequestIdRef = useRef(0); 


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
const res = await fetch(`https://api.bingoogame.com/api/users/getUser?telegramId=${telegramId}`);
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
console.log("🟢 initial Effect")
if (!telegramId || !gameId) {
console.error("Missing telegramId or gameId for game page.");
navigate('/');
return;
}

//localStorage.setItem("telegramId", telegramId

const handleCardSelections = (cards) => {
  console.log("💡 Initial card selections received:", cards);
  const reformatted = {};

   if (lastRequestIdRef.current > 0) {
    console.log("⚠ Skipping selections update due to pending request");
    return;
  }
  
  for (const [cardId, tId] of Object.entries(cards)) {
    if (tId === telegramId) {
      setCartelaIdInParent(parseInt(cardId)); // 👈 Restore your own card selection
      console.log("🍔🍔🍔 card is set", cardId);
    } else {
      reformatted[tId] = parseInt(cardId);     // 👈 Store other players' selections
    }
  }

  setOtherSelectedCards(reformatted); // 👈 Only others
};


const handleCardReleased = ({ telegramId: releasedTelegramId, cardId }) => {
console.log(`💡 Card ${cardId} released by ${releasedTelegramId}`);
setOtherSelectedCards((prev) => {
const newState = { ...prev };
// Ensure we delete only if the released card matches the one currently held by that user
if (newState[releasedTelegramId] === cardId) {
delete newState[releasedTelegramId];
}
return newState;
});
};

const handleInitialCardStates = (data) => {
    console.log("💡 Frontend: Received initialCardStates (full board sync):", data);
    const { takenCards } = data; // Backend sends: { "cardId": { cardId: N, takenBy: 'TID', isTaken: true } }

    if (lastRequestIdRef.current > 0) {
      console.log("⚠ Skipping initial restore because a newer request is pending.");
      return;
    }


    const newOtherSelectedCardsMap = {};
    for (const cardId in takenCards) {
        const takenByTelegramId = takenCards[cardId].takenBy;
        newOtherSelectedCardsMap[takenByTelegramId] = Number(cardId); // Store as { telegramId: cardId }
    }
    setOtherSelectedCards(newOtherSelectedCardsMap); // Set the full map, overriding previous state

    // --- Restore User's Own Card (Crucial for consistent display) ---
    const mySavedCardId = sessionStorage.getItem("mySelectedCardId");
    console.log("🔥🔥🔥🔥 my saved card", mySavedCardId);
    if (mySavedCardId && !isNaN(Number(mySavedCardId))) {
        const numMySavedCardId = Number(mySavedCardId);
       const selectedCardData = bingoCards.find(card => card.id === numMySavedCardId);
        if (selectedCardData) {
            setCartela(selectedCardData.card);
            setCartelaIdInParent(numMySavedCardId); // Ensure parent (App.jsx) state is also updated
            // Also ensure your own card is reflected in `otherSelectedCards`
            // if it wasn't already included by the backend's `initialCardStates` (it should be, but as a safeguard)
            setOtherSelectedCards(prev => ({
                ...prev,
                [telegramId]: numMySavedCardId
            }));
        } else {
             // If saved card ID doesn't exist in bingoCards, clear it
            sessionStorage.removeItem("mySelectedCardId");
            setCartela([]);
            setCartelaIdInParent(null);
            console.warn("Saved card ID not found in bingoCards data. Clearing saved selection.");
        }
    } else {
        // If no saved card, ensure UI and parent state are clear
        setCartela([]);
        setCartelaIdInParent(null);
    }
    // --- End Restore User's Own Card ---

    hasInitialSyncRun.current = true; // Mark sync as done for this specific mount
};

// This function encapsulates the initial sync logic.
const performInitialGameSync = () => {
  
// console.log("Attempting initial game sync...");
if (socket.connected && telegramId && gameId) {
// Ensure this only runs once per unique telegramId/gameId session
const currentSyncKey = `${telegramId}-${gameId}`;
if (hasInitialSyncRun.current === currentSyncKey) {
// console.log("Initial sync already performed for this session.");
return; // Avoid duplicate emissions
}

// console.log("Emitting userJoinedGame and re-emitting saved card...");
 console.log(`Frontend: Emitting 'userJoinedGame' for gameId: ${gameId}`);
socket.emit("userJoinedGame", { telegramId, gameId });
 console.log("sending emit [userJoinedGame]");
console.log("sending emit")


//const mySavedCardId = sessionStorage.getItem("mySelectedCardId");
// const mySavedCard = bingoCards.find(card => card.id === Number(mySavedCardId));
//if () {
// socket.emit("cardSelected", {
// telegramId,
// gameId,
// cardId: Number(mySavedCardId),
// card: mySavedCard.card,
// });
}
// Emit joinUser if it's still necessary and separate from userJoinedGame
//socket.emit("joinUser", { telegramId }); // Consider if this is redundant with userJoinedGame

//hasInitialSyncRun.current = currentSyncKey; // Mark sync as done for this session
// } else {
// // console.log("Socket not connected or missing data, deferring initial sync.");
// }
};


socket.on("initialCardStates", handleInitialCardStates);
socket.on("userconnected", (res) => { setResponse(res.telegramId); });
//socket.on("roundEnded", handleReset);
socket.on("balanceUpdated", (newBalance) => { setUserBalance(newBalance); });
socket.on("gameStatusUpdate", (status) => { setGameStatus(status); });
socket.on("currentCardSelections", handleCardSelections);
socket.on("cardConfirmed", (data) => {
  console.log("DEBUG: Frontend received cardConfirmed data:", data);

  // Ignore stale confirmations
  if (data.requestId !== lastRequestIdRef.current) {
    console.warn(`Ignoring stale confirmation. Current: ${lastRequestIdRef.current}, Received: ${data.requestId}`);
    return;
  }

  const confirmedCardId = Number(data.cardId);
  setCartelaIdInParent(confirmedCardId);
  setCartela(data.card);
  sessionStorage.setItem("mySelectedCardId", data.cardId);
  setGameStatus("Ready to Start");

   // ✅ Safe to allow new requests now
  lastRequestIdRef.current = 0;
});

socket.on("cardUnavailable", ({ cardId }) => {
setAlertMessage(`🚫 Card ${cardId} is already taken by another player.`);
setCartela([]);
setCartelaIdInParent(null);
sessionStorage.removeItem("mySelectedCardId");
});

socket.on("cardError", ({ message }) => {
    // Show an error message to the user
    setAlertMessage(message || "Card selection failed.");
    
    // Explicitly set the player as cardless
    setCartela([]); // Clear the visual card data
    setCartelaIdInParent(null); // Clear the parent state's card ID
    sessionStorage.removeItem("mySelectedCardId"); // Remove the card from local storage

    // Release the request lock
    lastRequestIdRef.current = 0;
});
// socket.on("otherCardSelected", ({ telegramId: otherId, cardId }) => {
// setOtherSelectedCards((prev) => ({
// ...prev,
// [otherId]: cardId,
// }));
// });
socket.on("cardReleased", handleCardReleased); // New listener for card release
socket.on("gameid", (data) => { setCount(data.numberOfPlayers); 
  console.log("number of players recived", data.numberOfPlayers);
});
socket.on("error", (err) => {
console.error(err);
setAlertMessage(err.message);
});
socket.on("cardsReset", ({ gameId: resetGameId }) => {
if (resetGameId === gameId) {
setOtherSelectedCards({});
setCartela([]);
setCartelaIdInParent(null);
sessionStorage.removeItem("mySelectedCardId");
// console.log("🔄 Cards have been reset for this game.");
hasInitialSyncRun.current = false; // Allow re-sync on next mount if desired
}
});

// --- Initial Sync Logic ---
// Option A: If socket is already connected when component mounts
performInitialGameSync();
const handleConnectForSync = () => {
    // Only perform sync if it hasn't been done for this mount yet
    if (!hasInitialSyncRun.current) {
        console.log("Component: Socket re-connected/connected, performing initial sync.");
        performInitialGameSync();
    }
};
socket.on("connect", handleConnectForSync);

socket.on("disconnect", () => {
// console.log("🔴 Socket disconnected — resetting sync flag.");
hasInitialSyncRun.current = false;
});



fetchUserData(telegramId); // Initial fetch of user data

// --- Cleanup Function ---
return () => {
// Remove all specific listeners attached by this component
socket.off("userconnected");
//socket.off("roundEnded", handleReset);
socket.off("initialCardStates", handleInitialCardStates);
socket.off("balanceUpdated");
socket.off("gameStatusUpdate");
socket.off("currentCardSelections", handleCardSelections);
socket.off("cardConfirmed");
socket.off("cardUnavailable");
socket.off("cardError");
// socket.off("otherCardSelected");
socket.off("cardReleased", handleCardReleased);
socket.off("gameid");
socket.off("error");
socket.off("cardsReset");
socket.off("connect", handleConnectForSync); // Clean up this specific listener
// Reset the sync flag when the component unmounts
hasInitialSyncRun.current = false;
};
}, [telegramId, gameId, bingoCards, navigate, socket]); 





const handleLocalCartelaIdChange = (newCartelaId) => {
  console.log(`🔍 Bingo.jsx: handleLocalCartelaIdChange called with: ${newCartelaId}`); // <--- ADD THIS LINE
    // Update local cartela for rendering
    const selectedCard = bingoCards.find(card => card.id === newCartelaId);
    if (selectedCard) {
      setCartela(selectedCard.card);
      // Inform the parent (App.jsx) about the new cartelaId
      if (setCartelaIdInParent) {
        setCartelaIdInParent(newCartelaId);
      }
    } else {
      setCartela([]); // Clear card if not found
      if (setCartelaIdInParent) {
        setCartelaIdInParent(null); // Inform parent to clear
      }
    }
  };



// 🟢 Select a bingo card
const handleNumberClick = (number) => {
  console.log("Clicked button ID:", number);

  if (emitLockRef.current && number === cartelaId) return; // prevent double click on same card
  if (emitLockRef.current && number !== cartelaId) {
    emitLockRef.current = false; // Allow changing the card
  }

  const selectedCard = bingoCards.find(card => card.id === number);
  if (!selectedCard) {
    handleLocalCartelaIdChange(null); 
    console.error("Card not found for ID:", number);
    return;
  }

  // Increment requestId
  lastRequestIdRef.current += 1;
  const requestId = lastRequestIdRef.current;

  emitLockRef.current = true; // Lock click

  // Optimistic UI update
  handleLocalCartelaIdChange(number);
  setCartela(selectedCard.card);
  setGameStatus("Ready to Start");

  // Send request to backend with requestId
  socket.emit("cardSelected", {
    telegramId,
    gameId,
    cardId: number,
    card: selectedCard.card,
    requestId
  });
  console.log(`Card emitted to backend with requestId: ${requestId}`);
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
const res = await fetch(`https://api.bingoogame.com/api/games/${gameId}/status`);
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
    if (isStarting) return;

    setIsStarting(true); // Block double-clicking

    try {
        // ... (Step 1: Check game status remains the same)
        const statusRes = await fetch(`https://api.bingoogame.com/api/games/${gameId}/status`);
        const statusData = await statusRes.json();

        if (statusData.exists && statusData.isActive) {
            alert("🚫 A game is already running or being initialized. Please wait.");
            setIsStarting(false);
            return;
        }

        // ... (Step 2: Start game fetch call remains the same)
        const response = await fetch("https://api.bingoogame.com/api/games/start", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ gameId, telegramId, cardId: cartelaId }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const { GameSessionId: currentSessionId } = data;

            // ⭐ Step 3: Game is ready, join the socket room.
            socket.emit("joinGame", {
                gameId,
                telegramId,
                GameSessionId: currentSessionId
            });

            // ✅ Step 4: Immediately navigate to the game page.
            // The API response is the source of truth, so this is safe.
            navigate("/game", {
                state: {
                    gameId,
                    telegramId,
                    GameSessionId: currentSessionId,
                    cartelaId,
                    cartela,
                    playerCount: 1, // Start with 1, the new page will update it
                },
            });

            // ❌ Removed the socket.off("gameId").on("gameId", ...) listener
            // as it is no longer needed. The `Maps` call is now
            // triggered by the API response itself, which is faster.

        } else {
            setAlertMessage(data.error || "Error starting the game");
            console.error("Game start error:", data.error);
        }
    } catch (error) {
        setAlertMessage("Error connecting to the backend");
        console.error("Connection error:", error);
    } finally {
        setIsStarting(false);
    }
};


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