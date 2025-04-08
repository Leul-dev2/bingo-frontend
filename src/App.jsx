import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Bingo from "./components/Bingo";
import BingoGame from "./components/nextpg";
import WinnerPage from "./components/WinnerPage";


const App = () => {
  const [cartela, setCartela] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState(null);

  return (
    <Router>
      <Routes>

      {/* <Route
          path="/"
          element={<JoinGame />}
        /> */}
        {/* Home Page (Bingo Number Selection) */}
        <Route
          path="/"
          element={<Bingo setCartela={setCartela} setSelectedNumber={setSelectedNumber} />}
        />
        {/* Game Page (Actual Bingo Game) */}
        <Route
          path="/game"
          element={<BingoGame cartela={cartela} selectedNumber={selectedNumber} />}
        />
        <Route
          path="/winnerPage"
          element={<WinnerPage/>}
        />

      </Routes>
    </Router>
  );
};

export default App;
