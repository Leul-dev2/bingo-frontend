import bingoCards from "../assets/bingoCards.json";
import { useEffect, useState, useRef, useCallback } from "react"; // Added useCallback
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
// Assuming socket is passed as a prop from App.jsx, which is correct based on your code

function Bingo({ isBlackToggleOn, setCartelaIdInParent, cartelaId, socket }) {
    // ... (existing localStorage and URL search params logic - KEEP AS IS) ...
    const [searchParams] = useSearchParams();
    const urlTelegramId = searchParams.get("user");
    const urlGameId = searchParams.get("game");
    const location = useLocation();
    const emitLockRef = useRef(false);
    const prevPathRef = useRef(null);

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

    const telegramId = urlTelegramId || localStorage.getItem("telegramId");
    const gameId = urlGameId || localStorage.getItem("gameChoice");

    // ... (navigate, cartela state, gameStatus, userBalance, alertMessage, etc. - KEEP AS IS) ...
    const navigate = useNavigate();
    const [cartela, setCartela] = useState([]); // This is the card numbers, not the ID
    const [gameStatus, setGameStatus] = useState("");
    const [userBalance, setUserBalance] = useState(null);
    const [alertMessage, setAlertMessage] = useState("");
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

    // ⭐ REFACTORED: otherSelectedCards will now be { "cardId": "telegramId" }
    const [otherSelectedCards, setOtherSelectedCards] = useState({});

    const [playerCount, setPlayerCount] = useState(0);
    const [gameStarted, setGameStarted] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [isStarting, setIsStarting] = useState(false);
    const hasInitialSyncRun = useRef(false); // Renamed for clarity, will store a flag like 'true' or 'false'

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

    // ... (bgGradient, alertBg, cardBg, etc. - KEEP AS IS) ...

    // 🟢 Fetch User Balance from REST (KEEP AS IS)
    const fetchUserData = async (id) => {
        try {
            const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/users/getUser?telegramId=${id}`); // Use 'id' from argument
            if (!res.ok) throw new Error("User not found");
            const data = await res.json();
            setUserBalance(data.balance);
        } catch (err) {
            console.error(err);
            setAlertMessage("Error fetching user data.");
        }
    };


    // ⭐ NEW/REVISED: Handle initial state from backend (now sent as 'initialCardStates')
    const handleInitialCardStates = useCallback((data) => {
        console.log("💡 Frontend: Received initialCardStates:", data);
        const { takenCards } = data; // 'takenCards' is { 'cardId': { cardId: N, takenBy: 'TID' } }

        setOtherSelectedCards(currentOtherCards => {
            const newState = {}; // Start with an empty object for a fresh sync

            // Populate with cards taken by others
            for (const cardId in takenCards) {
                const takenByTelegramId = takenCards[cardId].takenBy;
                if (String(takenByTelegramId) !== String(telegramId)) { // Only add if taken by someone else
                    newState[cardId] = takenByTelegramId;
                }
            }

            // If the current user has a card selected (cartelaId prop), ensure it's visually marked
            // This is handled by the `isMyCard` logic in JSX, but useful to keep in mind
            return newState;
        });

        // ⭐ Ensure my own selected card is visually set
        if (cartelaId) {
             const selectedCardData = bingoCards.find(card => card.id === cartelaId);
             if (selectedCardData) {
                 setCartela(selectedCardData.card);
             }
        }
        hasInitialSyncRun.current = true; // Mark sync as done for this session
    }, [telegramId, cartelaId]); // Add cartelaId to dependencies

    // ⭐ REVISED: Handle card released event
    const handleCardReleased = useCallback(({ telegramId: releasedTelegramId, cardId }) => {
        console.log(`💡 Card ${cardId} released by ${releasedTelegramId}`);
        setOtherSelectedCards((prev) => {
            const newState = { ...prev };
            // If the released card was previously marked as taken, remove it
            if (newState[cardId] === releasedTelegramId || !newState[cardId]) { // Ensure it's the right owner or if it was just taken
                delete newState[cardId];
            }
            return newState;
        });
    }, []);

    // ⭐ REVISED: Handle card available event (when prev card released by current user)
    const handleCardAvailable = useCallback(({ cardId }) => {
        console.log("♻️ Card available:", cardId);
        emitLockRef.current = false;
        setOtherSelectedCards((prevCards) => {
            const updated = { ...prevCards };
            // Remove the card if it exists in the 'otherSelectedCards' state
            if (updated[cardId]) {
                delete updated[cardId];
            }
            return updated;
        });
    }, []);


    // This function encapsulates the initial sync logic.
    const performInitialGameSync = useCallback(() => {
        if (socket.connected && telegramId && gameId && !hasInitialSyncRun.current) {
            console.log(`Frontend: Emitting 'userJoinedGame' for gameId: ${gameId}`);
            socket.emit("userJoinedGame", { telegramId, gameId });
            console.log("sending emit [userJoinedGame]");
            // We set hasInitialSyncRun.current = true; INSIDE handleInitialCardStates
            // because that's when we know the sync data has been received and processed.
        } else if (!socket.connected) {
            console.log("Socket not connected, deferring initial sync.");
        } else if (hasInitialSyncRun.current) {
            console.log("Initial sync already performed for this session.");
        }
    }, [socket, telegramId, gameId]);


    // 🟢 Initial Effect to Fetch & Setup Socket
    useEffect(() => {
        console.log("🟢 initial Effect mount/update");
        if (!telegramId || !gameId) {
            console.error("Missing telegramId or gameId for game page, navigating home.");
            navigate('/');
            return;
        }

        // --- Socket Listeners Setup ---
        socket.on("userconnected", (res) => { setResponse(res.telegramId); });
        socket.on("balanceUpdated", (newBalance) => { setUserBalance(newBalance); });
        socket.on("gameStatusUpdate", (status) => { setGameStatus(status); });
        
        // ⭐ REPLACED/ADDED: Listen for initial card states AND real-time updates
        socket.on("initialCardStates", handleInitialCardStates); // NEW specific listener for initial sync
        socket.on("otherCardSelected", ({ telegramId: otherId, cardId }) => { // Real-time update for others
            console.log(`💡 Other card selected: Card ${cardId} by ${otherId}`);
            setOtherSelectedCards((prev) => ({
                ...prev,
                [cardId]: otherId, // Store as { cardId: telegramId }
            }));
        });

        socket.on("cardConfirmed", (data) => {
            console.log("DEBUG: Frontend received cardConfirmed data:", data);
            const confirmedCardId = Number(data.cardId);
            setCartelaIdInParent(confirmedCardId); // Use the prop setter
            setCartela(data.card);
            sessionStorage.setItem("mySelectedCardId", confirmedCardId); // Store as Number for consistency
            setGameStatus("Ready to Start");
            emitLockRef.current = false; // Release lock after confirmation
        });

        socket.on("cardUnavailable", ({ cardId }) => {
            setAlertMessage(`🚫 Card ${cardId} is already taken by another player.`);
            // If the user tried to select this card, clear their local state for it
            if (cartelaId === Number(cardId)) { // If it was *my* selected card
                setCartela([]);
                setCartelaIdInParent(null);
                sessionStorage.removeItem("mySelectedCardId");
            }
            emitLockRef.current = false; // Release lock if selection failed
        });

        socket.on("cardError", ({ message }) => {
            setAlertMessage(message || "Card selection failed.");
            setCartela([]);
            setCartelaIdInParent(null);
            sessionStorage.removeItem("mySelectedCardId");
            emitLockRef.current = false; // Release lock if error occurred
        });

        socket.on("cardReleased", handleCardReleased); // Existing handler, now consistent
        socket.on("cardAvailable", handleCardAvailable); // Existing handler, now consistent

        socket.on("gameid", (data) => {
            setPlayerCount(data.numberOfPlayers); // Use new state variable for clarity
            console.log("number of players received", data.numberOfPlayers);
        });

        socket.on("error", (err) => {
            console.error(err);
            setAlertMessage(err.message);
        });

        socket.on("cardsReset", ({ gameId: resetGameId }) => {
            if (resetGameId === gameId) {
                setOtherSelectedCards({}); // Clear all other selected cards
                setCartela([]); // Clear my card
                setCartelaIdInParent(null); // Clear my card ID
                sessionStorage.removeItem("mySelectedCardId");
                console.log("🔄 Cards have been reset for this game.");
                hasInitialSyncRun.current = false; // Allow re-sync on next mount if desired
            }
        });

        // --- Initial Sync Trigger ---
        performInitialGameSync(); // Attempt sync immediately
        socket.on("connect", performInitialGameSync); // Attempt sync on reconnect
        socket.on("disconnect", () => {
            console.log("🔴 Socket disconnected — resetting sync flag.");
            hasInitialSyncRun.current = false; // Allow re-sync on next connect
        });

        // Initial fetch of user data
        fetchUserData(telegramId);

        // --- Cleanup Function ---
        return () => {
            console.log("🟡 Cleanup function running for Bingo.jsx useEffect.");
            // Remove all specific listeners attached by this component
            socket.off("userconnected");
            socket.off("balanceUpdated");
            socket.off("gameStatusUpdate");
            socket.off("initialCardStates", handleInitialCardStates); // NEW cleanup
            socket.off("otherCardSelected"); // Cleanup for otherCardSelected
            socket.off("cardConfirmed");
            socket.off("cardUnavailable");
            socket.off("cardError");
            socket.off("cardReleased", handleCardReleased);
            socket.off("cardAvailable", handleCardAvailable); // Cleanup for cardAvailable
            socket.off("gameid");
            socket.off("error");
            socket.off("cardsReset");
            socket.off("connect", performInitialGameSync); // Cleanup for connect
            socket.off("disconnect"); // Cleanup for disconnect
            // Reset the sync flag when the component unmounts (navigating away)
            hasInitialSyncRun.current = false;
        };
    }, [telegramId, gameId, navigate, socket, performInitialGameSync, handleInitialCardStates, handleCardReleased, handleCardAvailable, setCartelaIdInParent, cartelaId]); // Added useCallback dependencies and prop dependencies


    // Removed the separate useEffect for cardAvailable as it's now integrated

    const handleLocalCartelaIdChange = useCallback((newCartelaId) => {
        console.log(`🔍 Bingo.jsx: handleLocalCartelaIdChange called with: ${newCartelaId}`);
        const selectedCard = bingoCards.find(card => card.id === newCartelaId);
        if (selectedCard) {
            setCartela(selectedCard.card);
            if (setCartelaIdInParent) {
                setCartelaIdInParent(newCartelaId);
            }
        } else {
            setCartela([]);
            if (setCartelaIdInParent) {
                setCartelaIdInParent(null);
            }
        }
    }, [setCartelaIdInParent]); // Added dependency

    const handleNumberClick = (number) => {
        console.log("Clicked button ID:", number);
        // Prevent double click on the same card while a selection is in progress
        if (emitLockRef.current && number === cartelaId) {
            console.log("Emit locked - same card clicked.");
            return;
        }
        // Allow changing the card if a different card is clicked while locked
        if (emitLockRef.current && number !== cartelaId) {
            console.log("Emit locked - different card clicked, releasing lock.");
            emitLockRef.current = false; // Allow the new selection to proceed
        }

        const selectedCard = bingoCards.find(card => card.id === number);

        // Set lock BEFORE emitting
        emitLockRef.current = true;

        if (selectedCard) {
            handleLocalCartelaIdChange(number); // Update local card state and parent
            // No need to call setCartela/setCartelaId directly here if handleLocalCartelaIdChange does it
            setGameStatus("Ready to Start");
            sessionStorage.setItem("mySelectedCardId", number); // Store my selected card ID

            socket.emit("cardSelected", {
                telegramId,
                gameId,
                cardId: number,
                card: selectedCard.card,
            });
            console.log("card emited to the backend");
        } else {
            handleLocalCartelaIdChange(null);
            console.error("Card not found for ID:", number);
            emitLockRef.current = false; // Release lock if card not found
        }
    };


    // ... (gameStart, gameFinished, resetGame, useEffect for gameEnded, polling for status - KEEP AS IS) ...
    useEffect(() => {
        socket.on("gameStart", () => {
            setGameStarted(true);
        });
        return () => {
            socket.off("gameStart");
        };
    }, [socket]);

    useEffect(() => {
        socket.on("gameFinished", () => {
            setGameStarted(false);
        });
        return () => {
            socket.off("gameFinished");
        };
    }, [socket]);

    const resetGame = () => {
        window.location.reload();
        console.log("page refreshed");
    };

    useEffect(() => {
        socket.on("gameEnded", () => {
            setGameStarted(false);
            setAlertMessage("");
            sessionStorage.removeItem("mySelectedCardId");
        });
        return () => socket.off("gameEnded");
    }, [socket]);


    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/games/${gameId}/status`);
                const data = await res.json();

                if (!data.isActive) {
                    setIsStarting(false);
                    setGameStarted(false);
                } else {
                    setIsStarting(true);
                    setGameStarted(true);
                }
            } catch (error) {
                console.error("Status polling failed:", error);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [gameId]);

    const startGame = async () => {
        if (isStarting) return;
        setIsStarting(true);

        try {
            const statusRes = await fetch(`https://bingobot-backend-bwdo.onrender.com/api/games/${gameId}/status`);
            const statusData = await statusRes.json();

            if (statusData.exists && statusData.isActive) {
                alert("🚫 A game is already running or being initialized. Please wait.");
                setIsStarting(false);
                return;
            }

            const response = await fetch("https://bingobot-backend-bwdo.onrender.com/api/games/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ gameId, telegramId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                socket.emit("joinGame", { gameId, telegramId }); // This seems to be for entering the actual game room
                // Consider if this `joinGame` is still necessary, or if `userJoinedGame` handles all initial joins
                // For now, keep it if it's used for transitioning *to* the /game route.

                // Listen for player count updates (this is distinct from the main card selection page player count)
                socket.off("playerCountUpdate").on("playerCountUpdate", ({ playerCount }) => {
                    setPlayerCount(playerCount); // This will update the local state for the game page
                });

                socket.off("gameId").on("gameId", (res) => { // This 'gameId' event is for navigating to /game
                    const { gameId: receivedGameId, telegramId: receivedTelegramId, numberOfPlayers: gamePagePlayerCount } = res; // Added numberOfPlayers
                    if (receivedGameId && receivedTelegramId) {
                        navigate("/game", {
                            state: {
                                gameId: receivedGameId,
                                telegramId: receivedTelegramId,
                                cartelaId,
                                cartela,
                                playerCount: gamePagePlayerCount, // Use the count received with this event
                            },
                        });
                    } else {
                        setAlertMessage("Invalid game or user data received!");
                    }
                });

            } else {
                setAlertMessage(data.error || "Error starting the game");
                console.error("Game start error:", data.error);
            }

        } catch (error) {
            setAlertMessage("Error connecting to the backend");
            console.error("Connection error:", error);
        } finally {
            setIsStarting(false); // Release lock
        }
    };


    // ... (return JSX structure - MOSTLY KEEP AS IS) ...
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
                        <span className="font-bold">{playerCount}</span> {/* Changed from 'count' to 'playerCount' for clarity */}
                    </div>
                    <div className={`${cardBg} ${cardText} px-10 py-1 rounded-3xl text-center text-sm font-bold`}>
                        Game Choice<br />
                        <span className="font-bold">{gameId} </span>
                    </div>
                </div>

                <div className="grid grid-cols-10 gap-1 py-1 px-2 max-w-lg w-full text-xs">
                    {numbers.map((num) => {
                        const isMyCard = cartelaId === num;
                        // ⭐ REVISED: Check otherSelectedCards using cardId as key
                        const isOtherCard = otherSelectedCards[num] && String(otherSelectedCards[num]) !== String(telegramId);

                        return (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num)}
                                disabled={isOtherCard} // Disable if someone else took it
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