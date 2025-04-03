import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import bingoCards from "../assets/bingoCards.json"; // Import the JSON file

const Bingo = () => {
  const [searchParams] = useSearchParams();
  const telegramId = searchParams.get("user"); // Extract user from URL
  const gameChoice = searchParams.get("game"); // Extract game choice
  const navigate = useNavigate();
  
  const [cartelaId, setCartelaId] = useState(null);
  const [cartela, setCartela] = useState([]);
  const [gameStatus, setGameStatus] = useState("");
  const [userBalance, setUserBalance] = useState(null);
  const numbers = Array.from({ length: 130 }, (_, i) => i + 1);
  const [alertMessage, setAlertMessage] = useState("waiting"); // State for alert message

  // Fetch user data from backend
  useEffect(() => {
    if (telegramId) {
      fetchUserData(telegramId);
    }
  }, [telegramId]);

  const fetchUserData = async (id) => {
    try {
      const response = await fetch(`https://bingobot-backend.onrender.com/api/users/getUser?telegramId=${id}`);
      if (!response.ok) {
        throw new Error("User not found");
      }
      const data = await response.json();
      setUserBalance(data.balance); // Store user balance
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
      const interval = setInterval(() => {
          fetch(`https://bingobot-backend.onrender.com/api/games/countdown/${gameId}`)
              .then(res => res.json())
              .then(data => {
                  if (data.countdown !== undefined) {
                      setCountdown(data.countdown);
                  } else {
                      setCountdown(null);
                      clearInterval(interval);
                  }
              })
              .catch(() => setCountdown(null));
      }, 1000);

      return () => clearInterval(interval);
  }, [gameId]);


  const handleNumberClick = (number) => {
    console.log("clicked");
    const selectedCard = bingoCards.find(card => card.id === number);
    if (selectedCard) {
      setCartela(selectedCard.card);
      setCartelaId(number);
      setGameStatus("Ready to Start");
    } else {
      console.error("Card not found for ID:", number);
    }
  };

  const resetGame = () => {
    setCartelaId(null);
    setCartela([]);
    setGameStatus("");
  };

  const startGame = async () => {
    if (userBalance >= gameChoice) {
      try {
        // Send the request to join the game and deduct the balance
        const response = await fetch("https://bingobot-backend.onrender.com/api/games/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegramId,
            gameId: gameChoice,  // You can replace this with the actual game ID
            betAmount: gameChoice,  // The bet amount is the same as the game choice
          }),
        });
  
        const data = await response.json();
        
        if (response.ok) {
          // Handle successful join
          setUserBalance(data.newBalance); // Update the user's balance
          setGameStatus(data.gameStatus);
          navigate("/game", { state: { cartela, cartelaId } }); // Proceed to the game page
        } else {
          // Handle errors
          setAlertMessage(data.error || "An error occurred while joining the game");
          setTimeout(() => setAlertMessage(""), 3000); // Remove the alert after 3 seconds
        }
      } catch (error) {
        console.error("Error joining game:", error);
        setAlertMessage("An error occurred while processing your request.");
        setTimeout(() => setAlertMessage(""), 3000); // Remove the alert after 3 seconds
      }
    } else {
      setAlertMessage("Your balance is insufficient!");
      setTimeout(() => setAlertMessage(""), 3000); // Remove the alert after 3 seconds
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
          Game Started<br />
          <span className="font-bold">{gameStatus}</span>
        </div>
        <div className="bg-white text-purple-400 px-10 py-1 rounded-3xl text-center text-sm font-bold">
          Game Choice<br />
          <span className="font-bold">{gameChoice} </span>
        </div>
        <div className="bg-white text-purple-400 px-10 py-1 rounded-3xl text-center text-sm font-bold">
          Game satrts in<br />
          <span className="font-bold">{countdown} </span>
        </div>
      </div>

      <div className="grid grid-cols-10 gap-1 p-2 max-w-lg w-full text-xs">
        {numbers.map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className={`w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 font-bold cursor-pointer transition-all duration-200 text-xs ${
              cartelaId === num ? "bg-green-500 text-white" : "bg-purple-100 text-black"
            }`}
          >
            {num}
          </button>
        ))}
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
        <button onClick={startGame} className="bg-orange-500 text-white px-3 py-1 rounded-lg shadow-md text-sm" disabled={!cartelaId}>
          Start Game
        </button>
      </div>
    </div>
  );
};

export default Bingo;
