import React, { useState, useEffect } from "react";

const GptSettings = () => {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Параметры GPT для текущей темы
  const [gptSettings, setGptSettings] = useState({
    system_prompt: "",
    user_prompt: "",
    temperature: 0.3,
    max_tokens: 1000
  });

  // Загрузка тем
  const fetchThemes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/themes");
      if (response.ok) {
        const data = await response.json();
        setThemes(data);
        if (data.length > 0) {
          setSelectedTheme(data[0]);
          loadGptSettingsForTheme(data[0].id);
        }
      }
    } catch (error) {
      console.error("Ошибка загрузки тем:", error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка настроек GPT для конкретной темы
  const loadGptSettingsForTheme = async (themeId) => {
    try {
      const response = await fetch(`/api/themes/${themeId}/gpt`);
      
      if (response.ok) {
        const data = await response.json();
        setGptSettings({
          system_prompt: data.system_prompt,
          user_prompt: data.user_prompt,
          temperature: data.temperature,
          max_tokens: data.max_tokens
        });
      } else {
        console.error("Ошибка загрузки GPT настроек:", response.status);
        // Если ошибка, устанавливаем дефолтные значения
        setGptSettings({
          system_prompt: `Ты — профессиональный копирайтер-рерайтер. Твоя задача — переписать предоставленный текст, сохранив его смысл и основную информацию, но изменив формулировки, структуру предложений и стиль изложения.

Требования:
- Сохрани все ключевые факты и данные
- Измени структуру предложений и абзацев
- Используй синонимы и альтернативные формулировки
- Сделай текст уникальным, но читаемым
- Сохрани профессиональный тон
- Не добавляй новую информацию, которой нет в оригинале`,
          user_prompt: "Перепиши следующий текст, сделав его уникальным, но сохранив всю важную информацию и смысл:",
          temperature: 0.3,
          max_tokens: 1000
        });
      }
    } catch (error) {
      console.error("Ошибка загрузки настроек GPT:", error);
    }
  };

  // Сохранение настроек GPT
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedTheme) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/themes/${selectedTheme.id}/gpt`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(gptSettings)
      });

      if (response.ok) {
        const result = await response.json();
        alert("Настройки GPT сохранены успешно!");
      } else {
        const error = await response.json();
        console.error("Ошибка сохранения:", error);
        alert(error.error || "Ошибка сохранения настроек");
      }
    } catch (error) {
      console.error("Ошибка сохранения настроек:", error);
      alert("Ошибка сети при сохранении настроек");
    } finally {
      setSaving(false);
    }
  };

  // Смена темы
  const handleThemeChange = (theme) => {
    setSelectedTheme(theme);
    loadGptSettingsForTheme(theme.id);
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg text-gray-600">Загрузка настроек GPT...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Настройка GPT модели</h2>
        <p className="text-gray-600">Управление параметрами ИИ для обработки текстов по тематикам</p>
      </div>

      {/* Переключатель тематик */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Выберите тематику</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme)}
              className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm ${
                selectedTheme?.id === theme.id
                  ? "border-primary bg-primary text-white shadow-md"
                  : "border-gray-300 bg-white text-gray-700 hover:border-primary hover:bg-gray-50"
              }`}
            >
              <div className="font-medium truncate">{theme.name}</div>
              <div className="text-xs opacity-75">{theme.count || 0}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Настройки параметров */}
      {selectedTheme && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="text-blue-500 mr-3 text-xl">🤖</div>
              <div>
                <h4 className="font-semibold text-blue-800">Настройки для тематики: {selectedTheme.name}</h4>
                <p className="text-blue-600 text-sm">Параметры применяются только к текстам данной тематики</p>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Системный промпт (System Prompt)
            </label>
            <textarea
              value={gptSettings.system_prompt}
              onChange={(e) => setGptSettings({ ...gptSettings, system_prompt: e.target.value })}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
              placeholder="Введите системные инструкции для ИИ..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Базовые инструкции, определяющие роль и поведение ИИ
            </p>
          </div>

          {/* User Prompt */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Пользовательский промпт (User Prompt)
            </label>
            <textarea
              value={gptSettings.user_prompt}
              onChange={(e) => setGptSettings({ ...gptSettings, user_prompt: e.target.value })}
              className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
              placeholder="Введите начальную инструкцию для обработки текста..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Конкретная инструкция, которая добавляется перед каждым текстом
            </p>
          </div>

          {/* Параметры модели */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Temperature */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Температура (Temperature)
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-normal">
                  {gptSettings.temperature}
                </span>
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={gptSettings.temperature}
                  onChange={(e) => setGptSettings({ ...gptSettings, temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.0</span>
                  <span>0.5</span>
                  <span>1.0</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Контролирует креативность и случайность ответов
              </p>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Макс. токенов (Max Tokens)
                <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-normal">
                  {gptSettings.max_tokens}
                </span>
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="300"
                  max="1500"
                  step="50"
                  value={gptSettings.max_tokens}
                  onChange={(e) => setGptSettings({ ...gptSettings, max_tokens: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>300</span>
                  <span>900</span>
                  <span>1500</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Максимальная длина чанка для разбивки текста
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center text-sm"
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <span className="mr-2">💾</span>
                  Сохранить настройки
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => loadGptSettingsForTheme(selectedTheme.id)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              🔄 Сбросить
            </button>
          </div>
        </form>
      )}

      {/* Информационный блок */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-start">
          <div className="text-yellow-500 mr-3 text-xl">💡</div>
          <div>
            <h4 className="font-semibold text-yellow-800 mb-2">Рекомендации по настройке</h4>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• <strong>Temperature 0.1-0.3:</strong> для технических и точных текстов</li>
              <li>• <strong>Temperature 0.5-0.8:</strong> для творческого и маркетингового контента</li>
              <li>• <strong>Max Tokens:</strong> размер чанка для разбивки (примерно 1 токен = 0.75 слова)</li>
              <li>• <strong>System Prompt:</strong> описывает роль ИИ (копирайтер, редактор, SEO-специалист)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GptSettings;