// EditorPanel: оригинальный текст и результат
import React, { useRef } from "react";

const EditorPanel = ({ originalText, generatedText, onChangeOriginal, onChangeGenerated, onUnique, uniqueLoading, themes = [], selectedThemeId = null, setSelectedThemeId, readOnly }) => {
  const originalRef = useRef(null);
  const resultRef = useRef(null);

  // Автофокус на исходный текст
  React.useEffect(() => {
    if (originalRef.current) originalRef.current.focus();
  }, []);

  // Копирование результата
  const handleCopy = () => {
    if (resultRef.current) {
      resultRef.current.select();
      document.execCommand("copy");
    }
  };

  const handleThemeRadio = (id) => {
    if (!setSelectedThemeId) return;
    setSelectedThemeId(id);
  };

  return (
    <div className="flex flex-col gap-10">
      <div>
        <label className="block text-lg font-bold text-gray-800 mb-3">Исходный текст</label>
        <textarea
          ref={originalRef}
          className="w-full min-h-[200px] border-2 border-gray-200 rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
          value={originalText}
          onChange={readOnly ? undefined : onChangeOriginal}
          placeholder="Введите или вставьте исходный текст для уникализации..."
          readOnly={readOnly}
        />
        {/* Тематики для промпта уникализации */}
        {themes.length > 0 && setSelectedThemeId && (
          <div className="mt-4 mb-2">
            <div className="font-bold text-sm text-gray-800 mb-3">Выберите тематику для промпта уникализации:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={readOnly ? undefined : () => handleThemeRadio(theme.id)}
                  disabled={readOnly}
                  className={`
                    relative px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 text-left
                    ${selectedThemeId === theme.id 
                      ? 'bg-primary text-white border-primary shadow-md transform scale-105' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-gray-50'
                    }
                    ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                  `}
                >
                  <div className="truncate leading-tight">{theme.name}</div>
                  {selectedThemeId === theme.id && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  )}
                </button>
              ))}
            </div>
            {selectedThemeId && (
              <div className="mt-3 text-xs text-green-600 font-medium bg-green-50 p-2 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Выбрана тематика: <strong>{themes.find(t => t.id === selectedThemeId)?.name}</strong></span>
                </div>
                {themes.find(t => t.id === selectedThemeId)?.temperature && (
                  <div className="mt-1 text-gray-600 space-y-1">
                    <div>
                      Параметры: температура {themes.find(t => t.id === selectedThemeId)?.temperature}, 
                      токены {themes.find(t => t.id === selectedThemeId)?.max_tokens}
                    </div>
                    <div>
                      Системный промпт: {(() => {
                        const prompt = themes.find(t => t.id === selectedThemeId)?.system_prompt;
                        return prompt ? (prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt) : 'Не задан';
                      })()}
                    </div>
                    <div>
                      Пользовательский промпт: {(() => {
                        const prompt = themes.find(t => t.id === selectedThemeId)?.user_prompt;
                        return prompt ? (prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt) : 'Не задан';
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {!readOnly && (
          <button
            className="mt-6 px-8 py-3 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all duration-200 self-start disabled:opacity-60 shadow-lg hover:shadow-xl"
            onClick={onUnique}
            disabled={uniqueLoading}
          >
            {uniqueLoading ? "Уникализируется..." : "Уникализировать"}
          </button>
        )}
      </div>
      <div>
        <label className="block text-lg font-bold text-gray-800 mb-3">Результат (уникализированный текст)</label>
        <div className="relative">
          <textarea
            ref={resultRef}
            className="w-full min-h-[120px] border-2 border-gray-200 rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 bg-gray-50 pr-16"
            value={generatedText}
            onChange={readOnly ? undefined : onChangeGenerated}
            placeholder="Здесь появится уникализированный текст..."
            readOnly={readOnly}
          />
          <button
            type="button"
            className="absolute top-4 right-4 px-4 py-2 text-sm bg-white rounded-lg hover:bg-primary hover:text-white text-gray-600 border-2 border-gray-200 transition-all duration-200 shadow-sm"
            onClick={handleCopy}
            tabIndex={-1}
          >
            Копировать
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorPanel; 