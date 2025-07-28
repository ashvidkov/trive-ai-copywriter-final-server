import React from "react";

const user = { login: "admin1", role: "Администратор" };

const DashboardLayout = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-gray-50">
    {/* Header */}
    <header className="flex items-center justify-between px-8 h-20 bg-blue-50 border-b border-blue-100 shadow-sm select-none">
      {/* Логотип слева */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">Т</div>
        <span className="text-2xl font-extrabold tracking-tight text-primary">ТРАЙВ</span>
      </div>
      {/* Центрированная надпись */}
      <div className="flex-1 text-center">
        <span className="text-2xl font-extrabold text-primary tracking-wide drop-shadow-sm">SEO AI Ассистент</span>
      </div>
      {/* Пользователь справа */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="flex flex-col items-end mr-4">
          <span className="font-bold text-primary text-base">{user.login}</span>
          <span className="text-xs text-gray-500 font-semibold">{user.role}</span>
        </div>
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          title="Выйти из аккаунта"
        >
          <span role="img" aria-label="logout" className="text-2xl">🚪</span>
        </button>
      </div>
    </header>
    <main className="flex-1">{children}</main>
  </div>
);

export default DashboardLayout; 