import React, { useState, useEffect } from "react";

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    openai_api_key: "",
    system_name: "TRIVE AI Assistant",
    max_users: 100,
    auto_approve_articles: false,
    enable_notifications: true,
    backup_frequency: "daily"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState([]);
  const [newTheme, setNewTheme] = useState("");

  // Загрузка настроек
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/settings", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки настроек:", error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка тем
  const fetchThemes = async () => {
    try {
      const response = await fetch("/api/themes");
      if (response.ok) {
        const data = await response.json();
        setThemes(data);
      }
    } catch (error) {
      console.error("Ошибка загрузки тем:", error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchThemes();
  }, []);

  // Сохранение настроек
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        alert("Настройки сохранены успешно!");
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка сохранения настроек");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  // Добавление новой темы
  const handleAddTheme = async (e) => {
    e.preventDefault();
    if (!newTheme.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin/themes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newTheme })
      });

      if (response.ok) {
        setNewTheme("");
        fetchThemes();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка добавления темы");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка сети");
    }
  };

  // Удаление темы
  const handleDeleteTheme = async (themeId) => {
    if (!confirm("Вы уверены, что хотите удалить эту тему?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/themes/${themeId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        fetchThemes();
      } else {
        const error = await response.json();
        alert(error.error || "Ошибка удаления темы");
      }
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Ошибка сети");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-gray-600">Загрузка настроек...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Общие настройки */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Настройки системы</h2>
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название системы
              </label>
              <input
                type="text"
                value={settings.system_name}
                onChange={(e) => setSettings({ ...settings, system_name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Максимальное количество пользователей
              </label>
              <input
                type="number"
                value={settings.max_users}
                onChange={(e) => setSettings({ ...settings, max_users: parseInt(e.target.value) })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={settings.openai_api_key}
                onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="sk-..."
              />
              <p className="text-xs text-gray-500 mt-1">
                API ключ для интеграции с OpenAI
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Частота резервного копирования
              </label>
              <select
                value={settings.backup_frequency}
                onChange={(e) => setSettings({ ...settings, backup_frequency: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="hourly">Каждый час</option>
                <option value="daily">Ежедневно</option>
                <option value="weekly">Еженедельно</option>
                <option value="monthly">Ежемесячно</option>
              </select>
            </div>
          </div>

          {/* Переключатели */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="auto_approve"
                type="checkbox"
                checked={settings.auto_approve_articles}
                onChange={(e) => setSettings({ ...settings, auto_approve_articles: e.target.checked })}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="auto_approve" className="ml-2 block text-sm text-gray-900">
                Автоматическое согласование статей от редакторов
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="notifications"
                type="checkbox"
                checked={settings.enable_notifications}
                onChange={(e) => setSettings({ ...settings, enable_notifications: e.target.checked })}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="notifications" className="ml-2 block text-sm text-gray-900">
                Включить уведомления
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Сохранение..." : "Сохранить настройки"}
          </button>
        </form>
      </div>

      {/* Управление темами */}
      <div className="border-t pt-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Управление тематиками</h3>
        
        {/* Добавление новой темы */}
        <form onSubmit={handleAddTheme} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTheme}
              onChange={(e) => setNewTheme(e.target.value)}
              placeholder="Название новой тематики"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Добавить
            </button>
          </div>
        </form>

        {/* Список тем */}
        <div className="space-y-3">
          {themes.map((theme) => (
            <div key={theme.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-800">{theme.name}</span>
                <span className="ml-3 text-sm text-gray-500">
                  ({theme.count || 0} статей)
                </span>
              </div>
              <button
                onClick={() => handleDeleteTheme(theme.id)}
                className="px-3 py-1 text-red-600 hover:text-red-800 transition-colors"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Информация о системе */}
      <div className="border-t pt-8">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Информация о системе</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Версия системы</h4>
            <p className="text-gray-600">TRIVE AI v1.0.0</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Статус AI-модуля</h4>
            <p className="text-green-600">✅ Активен</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Использование хранилища</h4>
            <p className="text-gray-600">245 MB / 10 GB</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">Последняя синхронизация</h4>
            <p className="text-gray-600">{new Date().toLocaleString("ru-RU")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings; 