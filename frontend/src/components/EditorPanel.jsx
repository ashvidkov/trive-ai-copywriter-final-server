// EditorPanel: оригинальный текст и результат
import React, { useRef } from "react";

const EditorPanel = ({ originalText, generatedText, onChangeOriginal, onChangeGenerated, onUnique, uniqueLoading, themes = [], themeIds = [], setThemeIds, readOnly }) => {
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

  const handleThemeCheckbox = (id) => {
    if (!setThemeIds) return;
    if (themeIds.includes(id)) {
      setThemeIds(themeIds.filter(tid => tid !== id));
    } else {
      setThemeIds([...themeIds, id]);
    }
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
        {/* Тематики */}
        {themes.length > 0 && setThemeIds && (
          <div className="mt-4 mb-2">
            <div className="font-bold text-sm text-gray-800 mb-1">Выберите тематику текста:</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-start">
              {themes.map(theme => (
                <label key={theme.id} className="flex items-center gap-1 cursor-pointer text-sm min-h-[36px] md:min-h-[40px]">
                  <input
                    type="checkbox"
                    checked={themeIds.includes(theme.id)}
                    onChange={readOnly ? undefined : () => handleThemeCheckbox(theme.id)}
                    className="accent-primary w-4 h-4 rounded"
                    disabled={readOnly}
                  />
                  <span className="leading-snug whitespace-normal break-words">{theme.name}</span>
                </label>
              ))}
            </div>
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