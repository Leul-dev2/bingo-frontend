import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

function SaveAndRedirect() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    amount: "",
    currency: "ETB",
    first_name: "",
    last_name: "",
    phone_number: "",
    telegramId: "",
    username: "",
  });

  const [txRef, setTxRef] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const telegramId = searchParams.get("telegramId");
    const amount = searchParams.get("amount");

    console.log("🔍 Query params:", { telegramId, amount });

    if (!telegramId || !amount) {
      console.error("❌ Missing required query parameters.");
      return;
    }

    // ✅ Generate tx_ref
    const generatedTxRef = `telegram_${telegramId}_${Date.now()}`;
    setTxRef(generatedTxRef);
    localStorage.setItem("tx_ref", generatedTxRef);
    console.log("✅ Generated tx_ref:", generatedTxRef);

    const fetchUser = async () => {
      try {
        const res = await axios.get(
          `https://bingobot-backend-bwdo.onrender.com/api/payment/userinfo?telegramId=${telegramId}`
        );
        const user = res.data;
        console.log("✅ User info fetched:", user);

        setForm((prevForm) => {
          const newForm = {
            ...prevForm,
            amount,
            telegramId,
            username: user.username || "TelegramUser",
            email: `${user.username || "user"}@telegram.com`,
            first_name: user.username || "TelegramUser",
            last_name: "Telegram",
            phone_number: user.phoneNumber || "",
          };
          console.log("🧾 Final form after user fetch:", newForm);
          return newForm;
        });
      } catch (err) {
        console.error("❌ Error fetching user info:", err);
      }
    };

    fetchUser();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`✏️ Updating form field: ${name} = ${value}`);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log("📤 Submitting payment with form data:", { ...form, tx_ref: txRef });

    // ✅ Frontend form validation
    if (!form.amount || !form.first_name || !form.last_name || !form.phone_number) {
      console.error("❌ Missing required fields in form");
      alert("❌ Please fill all required fields before submitting.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        "https://bingobot-backend-bwdo.onrender.com/api/payment/accept-payment",
        {
          ...form,
          tx_ref: txRef,
        }
      );
      console.log("✅ Payment API response:", response.data);
    } catch (err) {
      console.error("❌ Failed to send payment:", err.response?.data || err.message);
      alert("❌ Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl p-8 rounded-xl w-full max-w-md border border-gray-300"
      >
        <h2 className="text-2xl font-bold text-center text-green-700 mb-6">
          Confirm Payment
        </h2>

        <div className="mb-6 text-center text-lg font-semibold text-gray-800">
          User: <span className="text-blue-600">@{form.username}</span>
        </div>

        <label className="block mb-6">
          <span className="text-gray-700 font-semibold block mb-1">
            Amount (ETB)
          </span>
          <input
            name="amount"
            type="number"
            min={1}
            value={form.amount}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 font-semibold text-white rounded-md transition ${
            loading
              ? "bg-green-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Processing..." : "Pay Now"}
        </button>
      </form>
    </div>
  );
}

export default SaveAndRedirect;
