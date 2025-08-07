import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import EditorPanel from "../components/EditorPanel";
import SeoFields from "../components/SeoFields";
import SidebarEditor from "../components/SidebarEditor";
import Header from "../components/Header";

const Toast = ({ message, type = "success", onClose }) => (
  <div className={`fixed bottom-8 right-8 z-50 px-8 py-5 rounded-2xl shadow-2xl text-lg font-bold transition-all duration-300
    ${type === "save" ? "bg-yellow-400 text-white" : type === "approve" || type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
    style={{ minWidth: 220 }}
  >
    {message}
    <button className="ml-6 text-white/80 hover:text-white text-2xl font-bold" onClick={onClose}>&times;</button>
  </div>
);

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const CreatePage = () => {
  const navigate = useNavigate();
  const [seo, setSeo] = useState({ title: "", h1: "", meta: "", keywords: "" });
  const [originalText, setOriginalText] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState(null); // Для AI уникализации
  const [themeIds, setThemeIds] = useState([]); // Для сохранения в БД
  const [uniqueLoading, setUniqueLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Состояния для SEO-проверки text.ru
  const [seoQualityData, setSeoQualityData] = useState(null);
  const [isCheckingSeo, setIsCheckingSeo] = useState(false);
  const [seoCheckError, setSeoCheckError] = useState(null);
  const [showSeoBlock, setShowSeoBlock] = useState(false);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {}
  const username = user?.login || "user";
  const role = user?.role || "user";

  // Восстановление текста из localStorage при загрузке страницы
  useEffect(() => {
    const savedText = localStorage.getItem('createPage_generatedText');
    if (savedText) {
      setGeneratedText(savedText);
      setToast({ message: 'Текст восстановлен из локального сохранения', type: 'info' });
    }
  }, []);

  // Автоматическое сохранение в localStorage при изменении текста
  useEffect(() => {
    if (generatedText) {
      localStorage.setItem('createPage_generatedText', generatedText);
    }
  }, [generatedText]);

  useEffect(() => {
    fetch("/api/themes")
      .then(res => res.json())
      .then(data => setThemes(data))
      .catch(() => setThemes([]));
  }, []);

  const handleSeoChange = (fields) => {
    setSeo(fields);
    setIsDirty(true);
  };
  const handleChangeOriginal = (e) => {
    setOriginalText(e.target.value);
    setIsDirty(true);
  };
  const handleChangeGenerated = (e) => {
    setGeneratedText(e.target.value);
    setIsDirty(true);
  };
  const handleSelectedThemeId = (id) => {
    setSelectedThemeId(id);
    setIsDirty(true);
  };

  const handleUnique = async () => {
    if (!originalText?.trim()) {
      setToast({ message: 'Нет текста для уникализации', type: 'error' });
      return;
    }

    setUniqueLoading(true);
    try {
      const response = await fetch('https://tkmetizi.ru/ai/generate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: originalText
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при уникализации');
      }

      const data = await response.json();
      setGeneratedText(data.result);
      
      // Заполняем SEO поля из ответа AI
      if (data.title) setSeo(prev => ({ ...prev, title: data.title }));
      if (data.h1) setSeo(prev => ({ ...prev, h1: data.h1 }));
      if (data.meta_description) setSeo(prev => ({ ...prev, meta: data.meta_description }));
      if (data.keywords) setSeo(prev => ({ ...prev, keywords: data.keywords }));
      
      setIsDirty(true);
      setToast({ message: 'Текст успешно уникализирован!', type: 'success' });
    } catch (error) {
      console.error('Ошибка уникализации:', error);
      setToast({ message: 'Ошибка при уникализации текста', type: 'error' });
    } finally {
      setUniqueLoading(false);
    }
  };

  // Функция для проверки SEO-качества через text.ru API
  const handleCheckSeoQuality = async () => {
    if (!generatedText?.trim()) {
      setToast({ message: "Нет текста для проверки SEO", type: "error" });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    setIsCheckingSeo(true);
    setSeoCheckError(null);
    setShowSeoBlock(true);

    try {
      const response = await fetch('https://tkmetizi.ru/ai-api/seo/seo/check-seo-quality', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: generatedText,
          max_wait_time: 120
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSeoQualityData(data);
        setToast({ message: "✅ SEO-проверка завершена", type: "success" });
      } else {
        setSeoCheckError(data.error_desc || "Ошибка при проверке SEO");
        setToast({ message: `❌ ${data.error_desc || "Ошибка при проверке SEO"}`, type: "error" });
      }
    } catch (error) {
      setSeoCheckError("Ошибка соединения с сервером");
      setToast({ message: "❌ Ошибка соединения с сервером", type: "error" });
    } finally {
      setIsCheckingSeo(false);
    }
  };

  // Сохранить новую запись (черновик)
  const handleCreate = async () => {
    // Валидация: title, content, тематики
    if (!seo.title.trim() || !originalText.trim() || themeIds.length === 0) {
      setToast({ message: "Заполните все поля и выберите хотя бы одну тематику для сохранения", type: "error" });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      const status = "draft";
      const res = await fetch("/api/texts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          title: seo.title,
          h1: seo.h1,
          meta_description: seo.meta,
          keywords: seo.keywords,
          content: originalText,
          result: generatedText,
          status,
          themeIds: themeIds // Массив тематик для сохранения в БД
        })
      });
      if (!res.ok) throw new Error("Ошибка создания записи: " + (await res.text()));
      const data = await res.json();
      setToast({ message: "Новая статья создана в базе", type: "approve" });
      setIsDirty(false);
      setTimeout(() => setToast(null), 4000);
      // Переход к редактору созданной записи
      navigate(`/editor/${data.id}`);
    } catch (e) {
      setToast({ message: e.message || "Ошибка создания записи", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!generatedText?.trim()) {
      setToast({ message: 'Нет текста для сохранения', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/texts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Новая статья',
          content: generatedText,
          status: 'draft'
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при сохранении');
      }

      const savedText = await response.json();
      
      // Очищаем локальное сохранение после успешного сохранения в базу
      localStorage.removeItem('createPage_generatedText');
      setIsDirty(false);
      
      setToast({ message: 'Текст успешно сохранен!', type: 'success' });
      
      // Перенаправляем на страницу редактирования
      window.location.href = `/editor/${savedText.id}`;
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      setToast({ message: 'Ошибка при сохранении текста', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header username={username} role={role} />
      <div className="flex min-h-screen bg-gray-50">
        {/* Можно добавить SidebarEditor, если нужен */}
        <main className="flex-1 flex flex-col items-center py-8 h-screen overflow-y-auto">
          <div className="w-full max-w-4xl">
            <Link to="/" className="text-primary text-base font-bold hover:underline mb-4 inline-block">← Вернуться на главную</Link>
            <div className="text-3xl font-extrabold text-primary mb-6 mt-2">Создание новой записи.</div>
            <div className="flex items-center gap-6 mb-6">
              <span className="px-4 py-2 rounded-lg bg-gray-100 text-primary font-bold text-lg">Статус: Черновик</span>
              {isDirty ? (
                <span className="px-4 py-2 rounded-lg bg-pink-100 text-pink-600 font-bold text-lg animate-pulse">Не сохранено</span>
              ) : (
                <span className="px-4 py-2 rounded-lg bg-green-100 text-green-600 font-bold text-lg">Сохранено</span>
              )}
            </div>
            {/* Контент */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">Контент</div>
              <EditorPanel
                originalText={originalText}
                generatedText={generatedText}
                onChangeOriginal={handleChangeOriginal}
                onChangeGenerated={handleChangeGenerated}
                onUnique={handleUnique}
                uniqueLoading={uniqueLoading}
                themes={themes}
                selectedThemeId={selectedThemeId}
                setSelectedThemeId={handleSelectedThemeId}
              />
            </div>
            {/* SEO */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">SEO</div>
              <SeoFields seo={seo} onChange={handleSeoChange} />
            </div>
            
            {/* Тематики для сохранения в базе данных */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">Тематики для сохранения записи в базе данных</div>
              {themes.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                  {themes.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        if (themeIds.includes(theme.id)) {
                          setThemeIds(themeIds.filter(id => id !== theme.id));
                        } else {
                          setThemeIds([...themeIds, theme.id]);
                        }
                        setIsDirty(true);
                      }}
                      className={`
                        relative px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 text-left cursor-pointer
                        ${themeIds.includes(theme.id)
                          ? 'bg-green-500 text-white border-green-500 shadow-md transform scale-105' 
                          : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:bg-green-50'
                        }
                      `}
                    >
                      <div className="truncate leading-tight">{theme.name}</div>
                      {themeIds.includes(theme.id) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {themeIds.length > 0 && (
                <div className="mt-3 text-xs text-green-600 font-medium bg-green-50 p-2 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Выбрано тематик для сохранения: <strong>{themeIds.length}</strong></span>
                  </div>
                  <div className="mt-1 text-gray-600">
                    {themes.filter(t => themeIds.includes(t.id)).map(t => t.name).join(', ')}
                  </div>
                </div>
              )}
            </div>
            
            {/* Действия */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">Действия</div>
              <div className="flex gap-6">
                <button
                  className="px-8 py-3 rounded-xl bg-yellow-400 text-white font-bold text-lg hover:bg-yellow-500 transition-all duration-200 shadow-md"
                  onClick={handleCreate}
                  disabled={saving}
                >
                  Сохранить и занести в базу
                </button>
                <button
                  onClick={handleCheckSeoQuality}
                  disabled={isCheckingSeo || !generatedText?.trim()}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                >
                  {isCheckingSeo ? '⏳ Проверяем...' : '🔍 Проверить SEO-параметры текста'}
                </button>
              </div>
            </div>
            
            {/* Блок SEO-проверки */}
            {showSeoBlock && (
              <div className="mb-10 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-800 mb-4">📊 Результаты SEO-проверки</h4>
                
                {isCheckingSeo && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-blue-600 font-medium">Проверяем SEO-параметры...</span>
                  </div>
                )}

                {seoCheckError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-red-600 text-lg mr-2">❌</span>
                      <span className="text-red-700 font-medium">{seoCheckError}</span>
                    </div>
                  </div>
                )}

                {seoQualityData && !isCheckingSeo && !seoCheckError && (
                  <div className="space-y-4">
                    {/* Метрики в карточках */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {seoQualityData.metrics?.uniqueness || 0}%
                        </div>
                        <div className="text-xs text-gray-600">Уникальность</div>
                        <div className="text-xs mt-1">
                          {seoQualityData.metrics?.uniqueness >= 80 ? '🟢' : 
                           seoQualityData.metrics?.uniqueness >= 60 ? '🟡' : '🔴'}
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          {seoQualityData.metrics?.water_percent || 0}%
                        </div>
                        <div className="text-xs text-gray-600">Водность</div>
                        <div className="text-xs mt-1">
                          {seoQualityData.metrics?.water_percent <= 15 ? '🟢' : 
                           seoQualityData.metrics?.water_percent <= 30 ? '🟡' : '🔴'}
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          {seoQualityData.metrics?.spam_percent || 0}%
                        </div>
                        <div className="text-xs text-gray-600">Спам</div>
                        <div className="text-xs mt-1">
                          {seoQualityData.metrics?.spam_percent <= 5 ? '🟢' : 
                           seoQualityData.metrics?.spam_percent <= 15 ? '🟡' : '🔴'}
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-orange-600 mb-1">
                          {seoQualityData.metrics?.spell_errors?.length || 0}
                        </div>
                        <div className="text-xs text-gray-600">Ошибки</div>
                        <div className="text-xs mt-1">
                          {(seoQualityData.metrics?.spell_errors?.length || 0) === 0 ? '🟢' : '🔴'}
                        </div>
                      </div>
                    </div>

                    {/* Ключевые слова */}
                    {seoQualityData.keywords && seoQualityData.keywords.length > 0 && (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-800 mb-2">📝 Ключевые слова:</h5>
                        <div className="flex flex-wrap gap-2">
                          {seoQualityData.keywords.slice(0, 7).map((keywordObj, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {keywordObj.keyword} ({keywordObj.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Toast уведомления */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default CreatePage; 