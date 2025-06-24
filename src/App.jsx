import React , { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Bingo from "./components/Bingo";
import BingoGame from "./components/nextpg";
import WinnerPage from "./components/WinnerPage";
import History from "./components/Bing-Pges/history";
import Profile from "./components/Bing-Pges/profile";
import Score from "./components/Bing-Pges/score";
import Wallet from "./components/Bing-Pges/wallet";
import Layout from "./components/Bing-Pges/Layout"; // Layout renders Nav + Outlet

const App = () => {
  const [cartela, setCartela] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);

  return (
    <Router>
      <Routes>
        {/* Routes WITHOUT Nav */}
        <Route
          path="/game"
          element={<BingoGame cartela={cartela} selectedNumber={selectedNumber} />}
        />
        <Route path="/winnerPage" element={<WinnerPage />} />

        {/* Routes WITH Nav */}
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={<Bingo setCartela={setCartela} setSelectedNumber={setSelectedNumber} />}
          />
          <Route path="score" element={<Score />} />
          <Route path="history" element={<History />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
