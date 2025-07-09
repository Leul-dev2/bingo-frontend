import { useState, useEffect } from "react";

export default function WithdrawForm() {
  const [telegramId, setTelegramId] = useState("");
  const [bankId, setBankId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTelegramId(params.get("user") || "");
    setBankId(params.get("bank") || "");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation here...

    const body = {
      telegramId,
      bank_code: bankId,
      account_name: accountName,
      account_number: accountNumber,
      amount,
    };

    // POST withdrawal request to your backend endpoint
    const res = await fetch("https://your-backend.com/api/request-withdrawal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Withdrawal request sent successfully!");
    } else {
      alert("Error: " + data.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Withdrawal Form</h1>
      <p>Bank Code: {bankId}</p>

      <label>
        Account Holder Name:
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          required
        />
      </label>

      <label>
        Account Number:
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          required
        />
      </label>

      <label>
        Amount:
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="1"
        />
      </label>

      <button type="submit">Request Withdrawal</button>
    </form>
  );
}
