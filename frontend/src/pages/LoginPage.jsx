import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo250x.png";

const LoginPage = () => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка входа");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError("Ошибка сети");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      {/* Логотип и подпись */}
      <div className="flex flex-col items-center mb-8 select-none">
        <img 
          src={logo} 
          alt="TRIVE AI" 
          className="h-16 w-auto object-contain mb-3"
          style={{ maxWidth: '240px' }}
        />
        <span className="text-base text-gray-500 font-semibold">AI SEO копирайтер</span>
      </div>
      <form
        className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md border border-gray-100"
        onSubmit={handleSubmit}
      >
        <h1 className="text-3xl font-extrabold text-primary mb-8 text-center">Вход в личный кабинет</h1>
        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">Логин</label>
          <input
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
            type="text"
            value={login}
            onChange={e => setLogin(e.target.value)}
            required
            autoFocus
            placeholder="Введите логин"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 font-bold mb-2">Пароль</label>
          <input
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="Введите пароль"
          />
        </div>
        {error && <div className="text-red-500 text-sm mb-4 text-center font-semibold">{error}</div>}
        <button
          type="submit"
          className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all duration-200 shadow-lg disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage; 