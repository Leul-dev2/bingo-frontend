import { useState } from "react";
import axios from "axios";

function PaymentForm() {
  const [form, setForm] = useState({
    amount: "",
    currency: "ETB",
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    console.log("🔄 field changed:", e.target.name, e.target.value);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    console.log("🚀 handleSubmit fired with form:", form);
    localStorage.removeItem("tx_ref");
    const tx_ref = `${form.first_name}-${Date.now()}`;
    localStorage.setItem("tx_ref", tx_ref);

    try {
      const res = await axios.post(
        "https://bingobot-backend-bwdo.onrender.com/api/payment/accept-payment",        
        {
          ...form,
          tx_ref,
        }
      );

      window.location.href = res.data.data.checkout_url;
    } catch (err) {
      console.error("❌ Payment init failed:", err);
      setLoading(false);
    }
  };

  // Check if all required fields are filled
  const isFormValid =
    form.amount &&
    form.email &&
    form.first_name &&
    form.last_name &&
    form.phone_number;

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white bg-opacity-90 backdrop-blur-md p-8 rounded-3xl max-w-md w-full shadow-xl border border-green-300"
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-green-700 drop-shadow-md">
          Pay with Chapa
        </h2>

        {[
          { name: "first_name", label: "First Name", type: "text" },
          { name: "last_name", label: "Last Name", type: "text" },
          { name: "email", label: "Email Address", type: "email" },
          { name: "phone_number", label: "Phone Number", type: "tel" },
          { name: "amount", label: "Amount (ETB)", type: "number", min: 1 },
        ].map(({ name, label, type, min }) => (
          <label key={name} className="block mb-4">
            <span className="text-gray-700 font-semibold mb-1 block">{label}</span>
            <input
              name={name}
              type={type}
              min={min}
              placeholder={label}
              value={form[name]}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition"
            />
          </label>
        ))}

        <button
          type="submit"
          disabled={!isFormValid || loading}
          className={`w-full ${
            loading
              ? "bg-green-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          } text-white font-bold py-3 rounded-lg shadow-md transition duration-300`}
        >
          {loading ? "Processing..." : "Proceed to Pay"}
        </button>
      </form>
    </div>
  );
}

export default PaymentForm;
