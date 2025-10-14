import bingoCards from "../assets/bingoCards.json";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";

// ==================== CONSTANTS & CONFIGURATION ====================
const CONFIG = {
  API: {
    BASE_URL: "https://bingo-backend-8929.onrender.com/api",
    ENDPOINTS: {
      USER_DATA: "/users/getUser",
      GAME_STATUS: "/games/:gameId/status",
      START_GAME: "/games/start"
    },
    TIMEOUT: 10000,
    POLLING_INTERVAL: 3000
  },
  GAME: {
    TOTAL_CARDS: 100,
    CARD_GRID_SIZE: 5
  },
  STORAGE: {
    TELEGRAM_ID: "telegramId",
    GAME_CHOICE: "gameChoice",
    SELECTED_CARD: "mySelectedCardId"
  }
};

// ==================== UTILITY FUNCTIONS ====================
const logger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  },
  error: (message, error = null, data = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...data
    }));
  },
  warn: (message, data = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...data
    }));
  }
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const safeParseInt = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

// ==================== CUSTOM HOOKS ====================
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error('Error reading from localStorage', error, { key });
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Error writing to localStorage', error, { key });
    }
  }, [key]);

  return [storedValue, setValue];
};

const useApiPolling = (url, interval = CONFIG.API.POLLING_INTERVAL) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          logger.error('API polling error', err, { url });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData(); // Initial fetch

    const intervalId = setInterval(fetchData, interval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [url, interval]);

  return { data, error, isLoading };
};

// ==================== MAIN COMPONENT ====================
function Bingo({
  isBlackToggleOn,
  setCartelaIdInParent,
  cartelaId,
  socket,
  otherSelectedCards,
  setOtherSelectedCards,
  emitLockRef
}) {
  // ==================== STATE & REFS ====================
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const urlTelegramId = searchParams.get("user");
  const urlGameId = searchParams.get("game");
  
  const [telegramId, setTelegramId] = useLocalStorage(CONFIG.STORAGE.TELEGRAM_ID, "");
  const [gameId, setGameId] = useLocalStorage(CONFIG.STORAGE.GAME_CHOICE, "");
  
  const [cartela, setCartela] = useState([]);
  const [gameStatus, setGameStatus] = useState(false);
  const [userBalance, setUserBalance] = useState(null);
  const [bonusBalance, setUserBonusBalance] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  
  const hasInitialSyncRun = useRef(false);
  const lastRequestIdRef = useRef(0);
  const prevPathRef = useRef(null);
  const alertTimeoutRef = useRef(null);

  // ==================== MEMOIZED VALUES ====================
  const numbers = useMemo(() => 
    Array.from({ length: CONFIG.GAME.TOTAL_CARDS }, (_, i) => i + 1), 
    []
  );

  const theme = useMemo(() => ({
    bgGradient: isBlackToggleOn
      ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      : 'bg-gradient-to-br from-violet-300 via-purple-400 to-indigo-500',
    
    alert: {
      bg: isBlackToggleOn ? 'bg-red-900' : 'bg-red-100',
      text: isBlackToggleOn ? 'text-red-300' : 'text-red-700',
      border: isBlackToggleOn ? 'border-red-700' : 'border-red-500'
    },
    
    cards: {
      myCard: isBlackToggleOn ? 'bg-green-600 text-white' : 'bg-green-500 text-white',
      otherCard: isBlackToggleOn ? 'bg-yellow-600 text-black' : 'bg-yellow-400 text-black',
      defaultCard: isBlackToggleOn ? 'bg-gray-700 text-white' : 'bg-purple-100 text-black'
    },
    
    cell: {
      bg: isBlackToggleOn ? 'bg-gray-800 text-white' : 'bg-purple-100 text-black'
    },
    
    buttons: {
      refresh: isBlackToggleOn ? 'bg-blue-700' : 'bg-blue-500',
      startEnabled: isBlackToggleOn ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600',
      startDisabled: 'bg-gray-600 cursor-not-allowed'
    }
  }), [isBlackToggleOn]);

  // ==================== EFFECTS ====================

  // Sync URL parameters with localStorage
  useEffect(() => {
    const updateFromUrlParams = () => {
      if (urlTelegramId && urlTelegramId !== telegramId) {
        setTelegramId(urlTelegramId);
        logger.info('Telegram ID updated from URL', { telegramId: urlTelegramId });
      }

      if (urlGameId && urlGameId !== gameId) {
        setGameId(urlGameId);
        logger.info('Game ID updated from URL', { gameId: urlGameId });
      }
    };

    updateFromUrlParams();
  }, [urlTelegramId, urlGameId, telegramId, gameId, setTelegramId, setGameId]);

  // Validate required parameters
  useEffect(() => {
    if (!telegramId || !gameId) {
      logger.warn('Missing required parameters, redirecting to home', {
        telegramId: !!telegramId,
        gameId: !!gameId
      });
      navigate('/');
      return;
    }
  }, [telegramId, gameId, navigate]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!telegramId) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);

        const res = await fetch(
          `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.USER_DATA}?telegramId=${telegramId}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        setUserBalance(data.balance);
        setUserBonusBalance(data.bonus_balance);
        
        logger.info('User data fetched successfully', {
          telegramId,
          balance: data.balance,
          bonusBalance: data.bonus_balance
        });

      } catch (err) {
        if (err.name !== 'AbortError') {
          logger.error('Error fetching user data', err, { telegramId });
          setAlertMessage("Error fetching user data. Please try again.");
        }
      }
    };

    fetchUserData();
  }, [telegramId]);

  // Game status polling
  const gameStatusUrl = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.GAME_STATUS.replace(':gameId', gameId)}`;
  const { data: gameStatusData, error: statusError } = useApiPolling(
    gameId ? gameStatusUrl : null,
    CONFIG.API.POLLING_INTERVAL
  );

  useEffect(() => {
    if (gameStatusData) {
      const isActive = gameStatusData.isActive;
      setIsStarting(isActive);
      setGameStarted(isActive);
      
      if (statusError) {
        logger.warn('Game status polling error', { gameId, error: statusError });
      }
    }
  }, [gameStatusData, statusError, gameId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !telegramId || !gameId) return;

    const handleCardSelections = debounce((cards) => {
      if (lastRequestIdRef.current > 0) return;

      const reformatted = {};
      for (const [cardId, tId] of Object.entries(cards)) {
        if (tId !== telegramId) {
          reformatted[tId] = safeParseInt(cardId);
        }
      }

      setOtherSelectedCards(reformatted);
    }, 100);

    const handleCardReleased = ({ telegramId: releasedTelegramId, cardId }) => {
      setOtherSelectedCards(prev => {
        const newState = { ...prev };
        if (newState[releasedTelegramId] === cardId) {
          delete newState[releasedTelegramId];
        }
        return newState;
      });
    };

    const handleInitialCardStates = (data) => {
      const { takenCards } = data;

      if (lastRequestIdRef.current > 0) return;

      // Process other players' cards
      const newOtherSelectedCardsMap = {};
      for (const cardId in takenCards) {
        const takenByTelegramId = takenCards[cardId].takenBy;
        if (takenByTelegramId !== telegramId) {
          newOtherSelectedCardsMap[takenByTelegramId] = safeParseInt(cardId);
        }
      }
      setOtherSelectedCards(newOtherSelectedCardsMap);

      // Restore user's own card
      const mySavedCardId = sessionStorage.getItem(CONFIG.STORAGE.SELECTED_CARD);
      if (mySavedCardId) {
        const numMySavedCardId = safeParseInt(mySavedCardId);
        const selectedCardData = bingoCards.find(card => card.id === numMySavedCardId);
        
        if (selectedCardData) {
          setCartela(selectedCardData.card);
          setCartelaIdInParent(numMySavedCardId);
        } else {
          sessionStorage.removeItem(CONFIG.STORAGE.SELECTED_CARD);
          resetCardState();
        }
      } else {
        resetCardState();
      }

      hasInitialSyncRun.current = true;
    };

    const handleCardConfirmed = (data) => {
      if (data.requestId !== lastRequestIdRef.current) return;

      const confirmedCardId = safeParseInt(data.cardId);
      setCartelaIdInParent(confirmedCardId);
      setCartela(data.card);
      sessionStorage.setItem(CONFIG.STORAGE.SELECTED_CARD, data.cardId.toString());
      setGameStatus("Ready to Start");
      lastRequestIdRef.current = 0;
      emitLockRef.current = false;

      logger.info('Card selection confirmed', {
        telegramId,
        cardId: confirmedCardId
      });
    };

    const handleCardUnavailable = ({ cardId }) => {
      showAlert(`🚫 Card ${cardId} is already taken by another player.`);
      resetCardState();
    };

    const handleCardError = ({ message }) => {
      showAlert(message || "Card selection failed.");
      resetCardState();
      lastRequestIdRef.current = 0;
      emitLockRef.current = false;
    };

    const handleGameEvents = {
      userconnected: (res) => logger.info('User connected', { telegramId: res.telegramId }),
      balanceUpdated: (newBalance) => setUserBalance(newBalance),
      gameStatusUpdate: (status) => setGameStatus(status),
      gameid: (data) => setPlayerCount(data.numberOfPlayers),
      error: (err) => {
        logger.error('Socket error', null, { error: err });
        showAlert(err.message);
      },
      cardsReset: ({ gameId: resetGameId }) => {
        if (resetGameId === gameId) {
          resetAllCardStates();
        }
      },
      gameStart: () => setGameStarted(true),
      gameFinished: () => setGameStarted(false),
      gameEnded: () => {
        setGameStarted(false);
        setIsStarting(false);
        setAlertMessage("");
        sessionStorage.removeItem(CONFIG.STORAGE.SELECTED_CARD);
      }
    };

    const performInitialGameSync = () => {
      if (socket.connected && telegramId && gameId && !hasInitialSyncRun.current) {
        socket.emit("userJoinedGame", { telegramId, gameId });
        logger.info('Initial game sync performed', { telegramId, gameId });
      }
    };

    const handleConnectForSync = () => {
      performInitialGameSync();
    };

    // Register event listeners
    const socketEventHandlers = {
      "initialCardStates": handleInitialCardStates,
      "currentCardSelections": handleCardSelections,
      "cardConfirmed": handleCardConfirmed,
      "cardUnavailable": handleCardUnavailable,
      "cardError": handleCardError,
      "cardReleased": handleCardReleased,
      "connect": handleConnectForSync,
      "disconnect": () => {
        hasInitialSyncRun.current = false;
        logger.info('Socket disconnected');
      }
    };

    // Add all game event handlers
    Object.entries(handleGameEvents).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Add socket event handlers
    Object.entries(socketEventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Perform initial sync if needed
    if (socket.connected) {
      performInitialGameSync();
    }

    return () => {
      // Cleanup game event handlers
      Object.keys(handleGameEvents).forEach(event => {
        socket.off(event);
      });

      // Cleanup socket event handlers
      Object.keys(socketEventHandlers).forEach(event => {
        socket.off(event);
      });

      hasInitialSyncRun.current = false;
      
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [socket, telegramId, gameId, setOtherSelectedCards, setCartelaIdInParent, emitLockRef]);

  // ==================== EVENT HANDLERS ====================
  const showAlert = useCallback((message, duration = 5000) => {
    setAlertMessage(message);
    
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    
    alertTimeoutRef.current = setTimeout(() => {
      setAlertMessage("");
    }, duration);
  }, []);

  const resetCardState = useCallback(() => {
    setCartela([]);
    setCartelaIdInParent(null);
    sessionStorage.removeItem(CONFIG.STORAGE.SELECTED_CARD);
  }, [setCartelaIdInParent]);

  const resetAllCardStates = useCallback(() => {
    setOtherSelectedCards({});
    resetCardState();
    hasInitialSyncRun.current = false;
  }, [setOtherSelectedCards, resetCardState]);

  const handleLocalCartelaIdChange = useCallback((newCartelaId) => {
    const selectedCard = bingoCards.find(card => card.id === newCartelaId);
    if (selectedCard) {
      setCartela(selectedCard.card);
      if (setCartelaIdInParent) {
        setCartelaIdInParent(newCartelaId);
      }
    } else {
      resetCardState();
    }
  }, [setCartelaIdInParent, resetCardState]);

  const handleNumberClick = useCallback((number) => {
    if (emitLockRef.current && number === cartelaId) return;
    if (emitLockRef.current && number !== cartelaId) {
      emitLockRef.current = false;
    }

    const selectedCard = bingoCards.find(card => card.id === number);
    if (!selectedCard) {
      logger.error('Card not found', { cardId: number });
      handleLocalCartelaIdChange(null);
      return;
    }

    lastRequestIdRef.current += 1;
    const requestId = lastRequestIdRef.current;
    emitLockRef.current = true;

    // Optimistic UI update
    handleLocalCartelaIdChange(number);
    setGameStatus("Ready to Start");

    socket.emit("cardSelected", {
      telegramId,
      gameId,
      cardId: number,
      card: selectedCard.card,
      requestId
    });

    logger.info('Card selection initiated', {
      telegramId,
      gameId,
      cardId: number,
      requestId
    });
  }, [telegramId, gameId, cartelaId, emitLockRef, handleLocalCartelaIdChange, socket]);

  const resetGame = useCallback(() => {
    logger.info('Game reset initiated');
    window.location.reload();
  }, []);

  const startGame = useCallback(async () => {
    if (isStarting || !cartelaId) return;

    setIsStarting(true);
    setAlertMessage("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);

      const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.START_GAME}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameId, telegramId, cardId: cartelaId }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok && data.success) {
        const { GameSessionId: currentSessionId } = data;

        socket.emit("joinGame", {
          gameId,
          telegramId,
          GameSessionId: currentSessionId
        });

        logger.info('Game started successfully', {
          gameId,
          telegramId,
          GameSessionId: currentSessionId,
          cartelaId
        });

        navigate("/game", {
          state: {
            gameId,
            telegramId,
            GameSessionId: currentSessionId,
            cartelaId,
            cartela,
            playerCount: 1,
          },
          replace: true
        });
      } else if (data.message && data.message.includes("already running")) {
        showAlert("🚫 Game has already started! Please wait for the next game.");
      } else {
        showAlert(data.message || data.error || "Error starting the game");
        logger.error('Game start API error', null, {
          gameId,
          telegramId,
          error: data.error
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        showAlert("Request timeout. Please check your connection and try again.");
      } else {
        showAlert("Error connecting to the backend");
      }
      logger.error('Game start connection error', error, {
        gameId,
        telegramId
      });
    } finally {
      setIsStarting(false);
    }
  }, [isStarting, cartelaId, gameId, telegramId, cartela, socket, navigate, showAlert]);

  // ==================== RENDER FUNCTIONS ====================
  const renderAlert = () => {
    if (!alertMessage) return null;

    return (
      <div className="fixed top-0 left-0 w-full flex justify-center z-50 animate-fade-in">
        <div className={`flex items-center max-w-sm w-full p-3 m-2 ${theme.alert.bg} ${theme.alert.border} border-l-4 ${theme.alert.text} rounded-md shadow-lg`}>
          <svg className={`w-5 h-5 mr-2 ${theme.alert.text}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zM9 7a1 1 0 012 0v3a1 1 0 01-2 0V7zm1 6a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
          </svg>
          <span className="flex-1 text-sm">{alertMessage}</span>
          <button 
            className="text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => setAlertMessage("")}
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  const renderBalanceCards = () => (
    <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 w-full max-w-xl text-white text-center mb-2">
      {/* Balance Card */}
      <div className="flex flex-col justify-center bg-[#3D74B6] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
        <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
          Balance
        </p>
        <span className="text-md sm:text-md font-extrabold block">
          {userBalance !== null ? `${userBalance} ብር` : "Loading..."}
        </span>
      </div>

      {/* Bonus Balance Card */}
      <div className="flex flex-col justify-center bg-[#51B33B] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
        <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
          Bonus
        </p>
        <span className="text-md sm:text-md font-extrabold block">
          {bonusBalance !== null ? `${bonusBalance} ብር` : "Loading..."}
        </span>
      </div>

      {/* Game Status Card */}
      <div className="flex flex-col justify-center items-center bg-gradient-to-br from-blue-500 via-cyan-500 to-sky-400 max-h-[24vh] shadow-lg rounded-2xl transition-transform transform hover:scale-105">
        {gameStarted ? (
          <button className="flex flex-col justify-center items-center text-white font-extrabold text-lg sm:text-xl transition-transform transform hover:scale-105">
            <span className="animate-bounce">Wait 🛑</span>
          </button>
        ) : (
          <button className="flex flex-col justify-center items-center text-white font-extrabold text-lg sm:text-xl transition-transform transform hover:scale-105">
            <span>PLAY</span>
            <span className="animate-bounce">▶️</span>
          </button>
        )}
      </div>

      {/* Game Choice Card */}
      <div className="flex flex-col justify-center bg-[#FFD93D] max-h-[24vh] rounded-2xl shadow-lg transition-transform transform hover:scale-105">
        <p className="text-sm sm:text-base font-semibold tracking-wide opacity-90">
          ባለ
        </p>
        <span className="text-lg sm:text-xl font-extrabold block">
          {gameId}
        </span>
      </div>
    </div>
  );

  const renderCardGrid = () => (
    <div className="grid grid-cols-10 gap-1 py-1 px-2 max-w-lg w-full text-xs">
      {numbers.map((num) => {
        const isMyCard = cartelaId === num;
        const isOtherCard = Object.values(otherSelectedCards).includes(num);

        return (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            disabled={isOtherCard || gameStarted}
            className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold transition-all duration-200 text-xs
                       ${isMyCard ? theme.cards.myCard : 
                         isOtherCard ? theme.cards.otherCard : 
                         theme.cards.defaultCard}
                       ${isOtherCard || gameStarted ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`Select card ${num}${isMyCard ? ' (selected)' : ''}${isOtherCard ? ' (taken)' : ''}`}
          >
            {num}
          </button>
        );
      })}
    </div>
  );

  const renderSelectedCard = () => {
    if (cartela.length === 0) return null;

    return (
      <div className="grid grid-cols-5 gap-1 p-1 bg-transparent text-white">
        {cartela.flat().map((num, index) => (
          <div 
            key={index} 
            className={`w-6 h-6 flex items-center justify-center border border-white rounded-lg text-xs font-bold ${theme.cell.bg}`}
          >
            {num}
          </div>
        ))}
      </div>
    );
  };

  const renderActionButtons = () => (
    <div className="flex gap-2 mt-2">
      <button 
        onClick={resetGame} 
        className={`${theme.buttons.refresh} text-white px-3 py-1 rounded-lg shadow-md text-sm transition-all hover:scale-105 active:scale-95`}
        aria-label="Refresh game"
      >
        Refresh
      </button>
      <button
        onClick={startGame}
        disabled={!cartelaId || isStarting || gameStarted}
        className={`${
          !cartelaId || isStarting || gameStarted ? theme.buttons.startDisabled : theme.buttons.startEnabled
        } text-white px-3 py-1 rounded-lg shadow-md text-sm transition-all hover:scale-105 active:scale-95`}
        aria-label={!cartelaId ? "Select a card to start game" : "Start game"}
      >
        {isStarting ? "Starting..." : "Start Game"}
      </button>
    </div>
  );

  // ==================== MAIN RENDER ====================
  if (!telegramId || !gameId) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${theme.bgGradient}`}>
        <div className="text-white text-center">
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center p-3 pb-20 min-h-screen ${theme.bgGradient} text-white w-full overflow-hidden`}>
      {renderAlert()}
      {renderBalanceCards()}
      {renderCardGrid()}
      
      <div className="flex gap-3 items-center mt-2">
        {renderSelectedCard()}
        {renderActionButtons()}
      </div>
    </div>
  );
}

export default Bingo;