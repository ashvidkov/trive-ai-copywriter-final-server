import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import UserManagement from "../components/UserManagement";
import SystemSettings from "../components/SystemSettings";
import { Navigate } from "react-router-dom";

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Показываем загрузку пока данные не загружены
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Загрузка...</div>
      </div>
    );
  }

  // Проверка роли администратора
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const username = user?.login || "admin";
  const role = user?.role || "admin";

  const tabs = [
    { id: "users", label: "Управление пользователями", icon: "👥" },
    { id: "settings", label: "Настройки системы", icon: "⚙️" },
    { id: "analytics", label: "Аналитика", icon: "📊" },
    { id: "logs", label: "Логи системы", icon: "📝" }
  ];

  return (
    <>
      <Header username={username} role={role} />
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-8 py-8">
          {/* Заголовок */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-primary mb-2">Административная панель</h1>
            <p className="text-gray-600">Управление пользователями, настройки системы и мониторинг</p>
          </div>

          {/* Табы */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Контент табов */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {activeTab === "users" && <UserManagement />}
            {activeTab === "settings" && <SystemSettings />}
            {activeTab === "analytics" && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Аналитика</h3>
                <p className="text-gray-600">Раздел в разработке. Здесь будет отображаться статистика использования системы.</p>
              </div>
            )}
            {activeTab === "logs" && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Логи системы</h3>
                <p className="text-gray-600">Раздел в разработке. Здесь будут отображаться системные логи и история действий.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPage; 