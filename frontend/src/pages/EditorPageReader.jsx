import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import EditorPanel from "../components/EditorPanel";
import SeoFields from "../components/SeoFields";
import TextHistory from "../components/TextHistory";
import SidebarEditor from "../components/SidebarEditor";
import Header from "../components/Header";

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

const EditorPageReader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {}
  const username = user?.login || "user";
  const role = user?.role || "user";
  useEffect(() => {
    if (role !== "viewer" && role !== "reader") {
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
  const [articles, setArticles] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [themes, setThemes] = useState([]);
  const [themeIds, setThemeIds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

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
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка загрузки статьи");
        setLoading(false);
      });
  };
  useEffect(loadArticle, [id]);

  // Фильтрация статей по статусу для сайдбара
  const filteredArticles = statusFilter === 'all' ? articles : articles.filter(a => a.status === statusFilter);

  // Обработчики для сайдбара
  const handleStatusClick = (status) => setStatusFilter(status === statusFilter ? 'all' : status);
  const handleArticleClick = (articleId) => navigate(`/editor-read/${articleId}`);

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
            {/* Статус + даты */}
            <div className="flex items-center gap-6 mb-6">
              <span className="px-4 py-2 rounded-lg bg-gray-100 text-primary font-bold text-lg">Статус: {statusRu[status] || status}</span>
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
                onChangeOriginal={() => {}}
                onChangeGenerated={() => {}}
                onUnique={null}
                uniqueLoading={false}
                themes={themes}
                themeIds={themeIds}
                setThemeIds={() => {}}
                readOnly={true}
              />
            </div>
            {/* SEO */}
            <div className="mb-10">
              <div className="text-xl font-bold text-gray-800 mb-4">SEO</div>
              <SeoFields seo={seo} onChange={() => {}} readOnly={true} />
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

export default EditorPageReader; 