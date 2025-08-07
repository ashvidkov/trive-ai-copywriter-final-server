import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import EditorPanel from "../components/EditorPanel";
import SeoFields from "../components/SeoFields";
import TextHistory from "../components/TextHistory";
import SidebarEditor from "../components/SidebarEditor";
import Header from "../components/Header";

// Toast-компонент
const Toast = ({ message, type = "success", onClose }) => (
  <div className={`fixed bottom-8 right-8 z-50 px-8 py-5 rounded-2xl shadow-2xl text-lg font-bold transition-all duration-300
    ${type === "save" ? "bg-yellow-400 text-white" : type === "approve" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
    style={{ minWidth: 220 }}
  >
    {message}
    <button className="ml-6 text-white/80 hover:text-white text-2xl font-bold" onClick={onClose}>&times;</button>
  </div>
);

// Функция перевода статусов
const statusRu = {
  draft: "Черновик",
  review: "На согласовании",
  approved: "Согласовано",
  deleted: "Удалено"
};

// Функция форматирования даты
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const EditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seo, setSeo] = useState({ title: "", h1: "", meta: "", keywords: "" });
  const [originalText, setOriginalText] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [themes, setThemes] = useState([]);
  const [themeIds, setThemeIds] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState(null); // Для AI уникализации
  const [toast, setToast] = useState(null); // {message, type}
  const [isDirty, setIsDirty] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [uniqueLoading, setUniqueLoading] = useState(false);

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

  // Загрузка всех тематик
  useEffect(() => {
    fetch("/api/themes")
      .then(res => res.json())
      .then(data => setThemes(data))
      .catch(() => setThemes([]));
  }, []);

  // Загрузка статей для сайдбара
  const loadArticles = () => {
    let url = "/api/texts";
    const params = [];
    if (selectedStatus) params.push(`status=${selectedStatus}`);
    if (params.length) url += `?${params.join("&")}`;
    fetch(url)
      .then(res => res.json())
      .then(data => setArticles(data))
      .catch(() => setArticles([]));
  };
  useEffect(loadArticles, [selectedStatus]);

  // Загрузка самой статьи
  const loadArticle = () => {
    setLoading(true);
    fetch(`/api/texts/${id}`)
      .then(res => res.json())
      .then(data => {
        setArticle(data);
        setSeo({
          title: data.title || "",
          h1: data.h1 || "",
          meta: data.meta_description || "",
          keywords: data.keywords || ""
        });
        setOriginalText(data.content || "");
        setGeneratedText(data.result || "");
        setHistory(data.history || []);
        setStatus(data.status || "");
        setThemeIds(Array.isArray(data.themes) ? data.themes.map(t => t.id) : []);
        setIsDirty(false); // сброс изменений
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка загрузки статьи");
        setLoading(false);
      });
  };
  useEffect(loadArticle, [id]);

  // Восстановление текста из localStorage при загрузке страницы
  useEffect(() => {
    const savedText = localStorage.getItem(`editorPage_generatedText_${id}`);
    if (savedText) {
      setGeneratedText(savedText);
      setToast({ message: 'Текст восстановлен из локального сохранения', type: 'info' });
    }
  }, [id]);

  // Автоматическое сохранение в localStorage при изменении текста
  useEffect(() => {
    if (generatedText) {
      localStorage.setItem(`editorPage_generatedText_${id}`, generatedText);
    }
  }, [generatedText, id]);

  // Обработчики изменений
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

  const handleSave = async (newStatus) => {
    if (!generatedText?.trim()) {
      setToast({ message: 'Нет текста для сохранения', type: 'error' });
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/texts/${id}`, {
        method: "PUT",
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
          status: newStatus || status,
          themeIds
        })
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      setToast({ message: "Сохранено", type: "save" });
      setTimeout(() => setToast(null), 5000);
      setIsDirty(false); // после сохранения
      loadArticle(); // повторно загрузить статью
    } catch (e) {
      setError(e.message);
      setToast({ message: e.message, type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!window.confirm("Удалить статью?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/texts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      setToast({ message: "Текст удалён", type: "success" });
      setTimeout(() => setToast(null), 2000);
      // Обновить список статей в сайдбаре
      loadArticles();
      setTimeout(() => navigate("/"), 800); // через 0.8 сек на главную
    } catch (e) {
      setError(e.message);
      setToast({ message: e.message, type: "error" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  };
  const handleUnique = async () => {
    if (!generatedText?.trim()) {
      setToast({ message: 'Нет текста для уникализации', type: 'error' });
      return;
    }

    setUniqueLoading(true);
    setToast(null);
    try {
      // Подготавливаем данные для AI с учетом выбранной тематики
      const requestData = { 
        raw_text: originalText,
        ...(selectedThemeId && { theme_id: selectedThemeId })
      };
      
      const res = await fetch("http://127.0.0.1:8001/ai/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error("Ошибка AI-генерации: " + errorText);
      }
      
      const data = await res.json();
      setGeneratedText(data.result || "");
      setSeo({
        title: data.title || "",
        h1: data.h1 || "",
        meta: data.meta_description || "",
        keywords: data.keywords || ""
      });
      
      const selectedTheme = themes.find(t => t.id === selectedThemeId);
      const themeInfo = selectedTheme ? ` для тематики "${selectedTheme.name}"` : "";
      setToast({ message: `Текст успешно уникализирован${themeInfo}!`, type: "approve" });
      setIsDirty(true);
    } catch (e) {
      setToast({ message: e.message || "Ошибка AI-генерации", type: "error" });
    } finally {
      setUniqueLoading(false);
      setTimeout(() => setToast(null), 5000);
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

  const handleApprove = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/texts/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ action: "Согласовать" })
      });
      if (!res.ok) throw new Error("Ошибка согласования");
      setToast({ message: "Статья отправлена на согласование", type: "approve" });
      setTimeout(() => setToast(null), 5000);
      loadArticle();
    } catch (e) {
      setError(e.message);
      setToast({ message: e.message, type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Фильтрация статей по статусу для сайдбара
  const filteredArticles = statusFilter === 'all' ? articles : articles.filter(a => a.status === statusFilter);

  // Обработчики для сайдбара
  const handleStatusClick = (status) => setStatusFilter(status === statusFilter ? 'all' : status);
  const handleArticleClick = (articleId) => navigate(`/editor/${articleId}`);

  if (loading) return <div className="p-12 text-center text-gray-400 text-lg">Загрузка...</div>;
  if (error) return <div className="p-12 text-center text-red-500 text-lg">{error}</div>;
  if (!article) return null;

  return (
    <>
      <Header username={username} role={role} />
      <div className="flex min-h-screen bg-gray-50">
        <SidebarEditor
          articles={filteredArticles}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          selectedId={Number(id)}
          onSelect={handleArticleClick}
        />
        <main className="flex-1 flex flex-col items-center py-8 h-screen overflow-y-auto">
          <div className="w-full max-w-4xl">
            <Link to="/" className="text-primary text-base font-bold hover:underline mb-4 inline-block">← Вернуться на главную</Link>
            <div className="text-3xl font-extrabold text-primary mb-6 mt-2">Запись №{article.id} — {article.title}</div>
            {/* Статус и сохранено + даты */}
            <div className="flex items-center gap-6 mb-6">
              <span className="px-4 py-2 rounded-lg bg-gray-100 text-primary font-bold text-lg">Статус: {statusRu[status] || status}</span>
              {isDirty ? (
                <span className="px-4 py-2 rounded-lg bg-pink-100 text-pink-600 font-bold text-lg animate-pulse">Не сохранено</span>
              ) : (
                <span className="px-4 py-2 rounded-lg bg-green-100 text-green-600 font-bold text-lg">Сохранено</span>
              )}
              <div className="ml-auto text-right text-gray-400 text-sm min-w-[170px]">
                <div>Создан: {formatDate(article.created_at)}</div>
                <div>Изменён: {formatDate(article.updated_at)}</div>
              </div>
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
                setSelectedThemeId={setSelectedThemeId}
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
            
            {/* Действия */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">Действия</div>
              <div className="flex gap-6">
                <button
                  className="px-8 py-3 rounded-xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-all duration-200 shadow-md"
                  onClick={handleApprove}
                  disabled={saving || status === "approved"}
                >
                  Согласовать
                </button>
                <button
                  className="px-8 py-3 rounded-xl bg-yellow-400 text-white font-bold text-lg hover:bg-yellow-500 transition-all duration-200 shadow-md"
                  onClick={() => handleSave()}
                  disabled={saving}
                >Сохранить</button>
                <button
                  className="px-8 py-3 rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition-all duration-200 shadow-md"
                  onClick={handleDelete}
                  disabled={saving}
                >Удалить</button>
                <button
                  onClick={handleCheckSeoQuality}
                  disabled={isCheckingSeo || !generatedText?.trim()}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
                >
                  {isCheckingSeo ? '⏳ Проверяем...' : '🔍 Проверить SEO-параметры текста'}
                </button>
              </div>
            </div>
            {/* История */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">История</div>
              <TextHistory history={history} />
            </div>
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

export default EditorPage; 