import React, { useState } from 'react'; // Import useState from React
import { useNavigate } from 'react-router-dom'; // Import useNavigate
const JoinGame = () => {
  const navigate = useNavigate(); // Use useNavigate instead of useHistory
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');

  const handleJoinGame = async () => {
    if (!username || !userId) {
      setMessage("Please enter both username and userId.");
      return;
    }

    try {
      // Send request to check if the user exists
      const response = await fetch(`http://localhost:5000/api/users/check-user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        // If user exists, navigate to the game page
        navigate(`/cartela`); // This replaces history.push() with navigate()
      } else {
        // If user does not exist, show error message
        setMessage("Invalid Username or User ID.");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Error checking the username. Please try again.");
    }
  };

  return (
    <div>
      <h2>Join Game</h2>
      <input
        type="text"
        placeholder="Enter Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <button onClick={handleJoinGame}>Join Game</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default JoinGame;
