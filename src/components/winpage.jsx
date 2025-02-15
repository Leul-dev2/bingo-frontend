import React from "react";

const WinPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { winnerName, prizeAmount, board, boardNumber } = location.state || {};

  return (
    <div className="bg-purple-400 min-h-screen flex flex-col items-center p-4 w-full">
      <div className="bg-orange-500 text-white text-center p-4 rounded-lg w-full max-w-md shadow-lg">
        <h1 className="text-2xl font-bold">BINGO!</h1>
        <p className="text-lg mt-2">
          <span className="bg-green-600 text-white px-2 py-1 rounded">{winnerName}</span> has won the Game
        </p>
        <p className="text-lg font-semibold mt-2">{prizeAmount} Birr</p>
        <p className="text-sm">0 Birr Bonus Won</p>
      </div>

      <div className="bg-white p-4 mt-4 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center gap-2 mb-2">
          {["B", "I", "N", "G", "O"].map((letter, i) => (
            <div key={i} className="text-white font-bold p-2 rounded-full text-center w-8 h-8" 
                 style={{ backgroundColor: ["yellow", "green", "blue", "red", "purple"][i] }}>
              {letter}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-2 text-center">
          {board?.map((num, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg font-bold ${num.selected ? "bg-green-500 text-white" : "bg-gray-300"}`}
            >
              {num.value}
            </div>
          ))}
        </div>
        <p className="text-center text-sm mt-2">Board number {boardNumber}</p>
      </div>

      <button
        onClick={() => navigate("/")}
        className="bg-orange-500 text-white px-6 py-2 rounded-lg text-lg mt-4"
      >
        Play Again
      </button>
    </div>
  );
};

export default WinPage;
