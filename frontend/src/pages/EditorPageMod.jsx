import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import EditorPanel from "../components/EditorPanel";
import SeoFields from "../components/SeoFields";
import TextHistory from "../components/TextHistory";
import SidebarEditor from "../components/SidebarEditor";
import Header from "../components/Header";

const Toast = ({ message, type = "success", onClose }) => (
  <div className={`fixed bottom-8 right-8 z-50 px-8 py-5 rounded-2xl shadow-2xl text-lg font-bold transition-all duration-300
    ${type === "save" ? "bg-yellow-400 text-white" : type === "approve" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
    style={{ minWidth: 220 }}
  >
    {message}
    <button className="ml-6 text-white/80 hover:text-white text-2xl font-bold" onClick={onClose}>&times;</button>
  </div>
);

const statusRu = {
  draft: "Черновик",
  review: "На согласовании",
  approved: "Согласовано",
  deleted: "Удалено"
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

const EditorPageMod = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {}
  const username = user?.login || "user";
  const role = user?.role || "user";
  useEffect(() => {
    if (role !== "admin" && role !== "moderator") {
      navigate("/", { replace: true });
    }
  }, [role, navigate]);

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
  const [toast, setToast] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [uniqueLoading, setUniqueLoading] = useState(false);

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
        setIsDirty(false);
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка загрузки статьи");
        setLoading(false);
      });
  };
  useEffect(loadArticle, [id]);

  // Обработчики изменений
  const handleSeoChange = (fields) => { setSeo(fields); setIsDirty(true); };
  const handleChangeOriginal = (e) => { setOriginalText(e.target.value); setIsDirty(true); };
  const handleChangeGenerated = (e) => { setGeneratedText(e.target.value); setIsDirty(true); };
  const handleThemeIds = (ids) => { setThemeIds(ids); setIsDirty(true); };

  const handleSave = async (newStatus) => {
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
      setIsDirty(false);
      loadArticle();
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
      loadArticles();
      setTimeout(() => navigate("/"), 800);
    } catch (e) {
      setError(e.message);
      setToast({ message: e.message, type: "error" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  };
  const handleUnique = async () => {
    setUniqueLoading(true);
    setToast(null);
    try {
      const res = await fetch("https://tkmetizi.ru/ai/generate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: originalText })
      });
      if (!res.ok) throw new Error("Ошибка AI-генерации: " + (await res.text()));
      const data = await res.json();
      setGeneratedText(data.result || "");
      setSeo({
        title: data.title || "",
        h1: data.h1 || "",
        meta: data.meta_description || "",
        keywords: data.keywords || ""
      });
      setToast({ message: "Текст успешно уникализирован!", type: "approve" });
      setIsDirty(true);
    } catch (e) {
      setToast({ message: e.message || "Ошибка AI-генерации", type: "error" });
    } finally {
      setUniqueLoading(false);
      setTimeout(() => setToast(null), 5000);
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

  // Новая кнопка: На доработку
  const handleRework = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/texts/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ action: "На доработку" })
      });
      if (!res.ok) throw new Error("Ошибка отправки на доработку");
      setToast({ message: "Статья отправлена на доработку", type: "save" });
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

  // Кнопка Согласовано (только для модератора/админа)
  const handleApproveMod = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/texts/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ action: "Согласовано модератором" })
      });
      if (!res.ok) throw new Error("Ошибка согласования");
      // Укороченное название статьи
      const shortTitle = (article?.title || "").length > 40 ? article.title.slice(0, 40) + "..." : article?.title || "";
      setToast({ message: `Вами согласована статья: ${shortTitle}`, type: "approve" });
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

  // Кнопка На доработку (только для модератора/админа)
  const handleReworkMod = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/texts/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ action: "На доработку модератором" })
      });
      if (!res.ok) throw new Error("Ошибка возврата на доработку");
      setToast({ message: "Вы вернули статью на доработку", type: "save" });
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
  const handleArticleClick = (articleId) => navigate(`/editor-mod/${articleId}`);

  if (loading) return <div className="p-12 text-center text-gray-400 text-lg">Загрузка...</div>;
  if (error) return <div className="p-12 text-center text-red-500 text-lg">{error}</div>;
  if (!article) return null;

  return (
    <>
      <Header username={username} role={role} />
      <div className="flex min-h-screen bg-gray-50">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
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
                themeIds={themeIds}
                setThemeIds={handleThemeIds}
              />
            </div>
            {/* SEO */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">SEO</div>
              <SeoFields seo={seo} onChange={handleSeoChange} />
            </div>
            {/* Действия */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">Действия</div>
              <div className="flex gap-6">
                <button
                  className="px-8 py-3 rounded-xl bg-green-500 text-white font-bold text-lg hover:bg-green-600 transition-all duration-200 shadow-md"
                  onClick={handleApproveMod}
                  disabled={saving || status === "approved"}
                >
                  Согласовано
                </button>
                <button
                  className="px-8 py-3 rounded-xl bg-sky-400 text-white font-bold text-lg hover:bg-sky-500 transition-all duration-200 shadow-md"
                  onClick={handleReworkMod}
                  disabled={saving}
                >
                  На доработку
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
    </>
  );
};

export default EditorPageMod; 