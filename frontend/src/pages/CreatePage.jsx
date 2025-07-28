import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import EditorPanel from "../components/EditorPanel";
import SeoFields from "../components/SeoFields";
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
  const [themeIds, setThemeIds] = useState([]);
  const [uniqueLoading, setUniqueLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {}
  const username = user?.login || "user";
  const role = user?.role || "user";

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
  const handleThemeIds = (ids) => {
    setThemeIds(ids);
    setIsDirty(true);
  };

  const handleUnique = async () => {
    setUniqueLoading(true);
    setToast(null);
    try {
      const res = await fetch("/ai/generate/", {
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

  // Сохранить новую запись (черновик)
  const handleCreate = async () => {
    // Валидация: title, content, хотя бы одна тематика
    if (!seo.title.trim() || !originalText.trim() || themeIds.length === 0) {
      setToast({ message: "Поля пустые, нет значений, запись не создана", type: "error" });
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
          themeIds
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

  return (
    <>
      <Header username={username} role={role} />
      <div className="flex min-h-screen bg-gray-50">
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
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
                  className="px-8 py-3 rounded-xl bg-yellow-400 text-white font-bold text-lg hover:bg-yellow-500 transition-all duration-200 shadow-md"
                  onClick={handleCreate}
                  disabled={saving}
                >
                  Сохранить и занести в базу
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default CreatePage; 