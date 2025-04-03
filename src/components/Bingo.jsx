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
  const [alertMessage, setAlertMessage] = useState(""); // State for alert message

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

  const startGame = () => {
    if (userBalance >= gameChoice) {
      navigate("/game", { state: { cartela, cartelaId } });
    } else {
      setAlertMessage("Your balance is insufficient!");
      setTimeout(() => setAlertMessage(""), 3000); // Remove the alert after 3 seconds
    }
  };

  return (
    <div className="flex flex-col items-center p-5 min-h-screen bg-purple-400 text-white w-full overflow-hidden">
    {alertMessage && (
        <div className="bg-red-500 text-white p-2 rounded-md mb-4">
          {alertMessage}
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
          <span className="font-bold">{gameChoice} Birr</span>
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
