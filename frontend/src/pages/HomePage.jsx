import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { useNavigate, Link } from "react-router-dom";

const themesStub = [
  { id: 1, name: "Роботы и робототехника", count: 6 },
  { id: 2, name: "Обучение роботов", count: 3 },
  { id: 3, name: "Комплектующие для роботов", count: 2 },
  { id: 4, name: "Новости робототехники", count: 3 },
  { id: 5, name: "Метизы", count: 1 },
  { id: 6, name: "Фрезерные работы", count: 2 },
  { id: 7, name: "Слесарная обработка", count: 3 },
  { id: 8, name: "Токарные работы", count: 3 },
  { id: 9, name: "Цинк-ламельное покрытие", count: 2 },
  { id: 10, name: "Термическая обработка", count: 1 },
];

const articlesStub = [
  { id: 1, title: "Холодная высадка: ...", status: "approved", preview: "<p><strong>Холодная высадка</strong> — это высокоскоростной метод..." },
  { id: 2, title: "Обучение роботов в р...", status: "review", preview: "<p><strong>Современные роботы</strong> учасят не только по коду..." },
  { id: 3, title: "Главные тренды в роб...", status: "approved", preview: "<p><strong>Современный робототехник</strong> — это не просто железо..." },
  { id: 4, title: "Комплектующие для ...", status: "approved", preview: "<p><strong>Робот</strong> — это не только программное поведение..." },
  { id: 5, title: "Чему учат роботов: от...", status: "approved", preview: "<p><strong>Современный промышленный робот</strong> — это не просто железо..." },
  { id: 6, title: "Промышленные покр...", status: "review", preview: "<p><strong>Нанесение покрытий</strong> — это не только антикоррозионная..." },
  { id: 7, title: "Цинк-ламельное покр...", status: "approved", preview: "<p><strong>Цинк-ламельное покрытие</strong> — это высокоэффективный способ..." },
  { id: 8, title: "Изделия по чертежам...", status: "review", preview: "<p>Промышленное производство всё чаще требует индивидуального подхода..." },
  { id: 9, title: "Токарные работы: иде...", status: "approved", preview: "<p>Токарные работы — это..." },
  { id: 10, title: "Зачем нужна термооб...", status: "approved", preview: "<p>Термообработка — это..." },
];

const statusLabels = {
  draft: "Черновик",
  review: "На согласовании",
  approved: "Согласовано",
  deleted: "Удалено"
};
const statusColors = {
  draft: "bg-pink-100 text-pink-700",
  review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-700",
  deleted: "bg-gray-200 text-gray-500"
};

const HomePage = () => {
  const [themes, setThemes] = useState(themesStub);
  const [articles, setArticles] = useState(articlesStub);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Загрузка тем
  useEffect(() => {
    fetch("/api/themes")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setThemes(data);
        else setThemes(themesStub);
      })
      .catch(() => setThemes(themesStub));
  }, []);

  // Загрузка статей
  const fetchArticles = (themeId, status) => {
    setLoading(true);
    let url = "/api/texts";
    const params = [];
    if (themeId) params.push(`theme_id=${themeId}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += `?${params.join("&")}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setArticles(data);
        else setArticles(articlesStub);
      })
      .catch(() => setArticles(articlesStub))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchArticles(selectedTheme, selectedStatus);
  }, [selectedTheme, selectedStatus]);

  // Обработка выбора темы
  const handleThemeClick = (themeId) => {
    setSelectedTheme(themeId === selectedTheme ? null : themeId);
  };

  // Обработка выбора статуса
  const handleStatusClick = (status) => {
    setSelectedStatus(status === selectedStatus ? "" : status);
  };

  // Обработчик для кнопки SEO-рерайтер
  const handleCreateClick = () => navigate('/create');

  // Получаем пользователя из localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {}
  const username = user?.login || "user";
  const role = user?.role || "user";

  // Обработчик перехода к редактору
  const handleArticleClick = (id) => {
    if (role === "admin" || role === "moderator") {
      navigate(`/editor-mod/${id}`);
    } else if (role === "reader" || role === "viewer") {
      navigate(`/editor-read/${id}`);
    } else {
      navigate(`/editor/${id}`);
    }
  };

  return (
    <>
      <Header username={username} role={role} />
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-72 min-w-[240px] bg-white border-r border-gray-200 shadow-lg flex-shrink-0 flex flex-col">
          <div className="px-8 pt-8 pb-4">
            <div className="font-bold text-gray-800 text-lg mb-4">Статьи по тематикам</div>
            <ul className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
              {themes.map((theme) => (
                <li key={theme.id}>
                  <button
                    className={`flex justify-between items-center w-full px-4 py-2 rounded-lg text-base font-medium border border-gray-100 hover:bg-primary/10 transition-all text-left ${selectedTheme === theme.id ? "bg-primary/10 border-primary" : ""}`}
                    onClick={() => handleThemeClick(theme.id)}
                  >
                    <span className="pl-2 flex-1 text-left">{theme.name}</span>
                    <span className="ml-2 text-xs bg-primary text-white rounded-full px-2 py-0.5 font-bold">{theme.count || 0}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        {/* Main content */}
        <main className="flex-1 p-12 pl-16 bg-gray-50 min-h-screen">
          {/* Верхние кнопки */}
          {role !== "viewer" && role !== "reader" && (
            <div className="flex gap-4 mb-8">
              <button className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary/90 transition-all duration-200 shadow-lg" onClick={handleCreateClick}>SEO-рерайтер</button>
              <Link 
                to="/seo-copywriter"
                className="px-6 py-3 rounded-xl bg-green-600 text-white font-bold text-base hover:bg-green-700 transition-all duration-200 shadow-lg"
              >
                🤖 SEO-копирайтер с AI генерацией
              </Link>
            </div>
          )}
          {/* Заголовок */}
          <div className="text-2xl font-extrabold text-primary mb-8">Все статьи</div>
          {/* Фильтры статуса */}
          <div className="flex gap-4 mb-8">
            <button className={`px-5 py-2 rounded-lg text-base font-semibold border transition-all duration-200 shadow-sm ${selectedStatus === "" ? "bg-primary text-white border-primary shadow-md" : "bg-white border-gray-200 text-primary hover:bg-blue-50 hover:border-primary"}`} onClick={() => handleStatusClick("")}>Все</button>
            <button className={`px-5 py-2 rounded-lg text-base font-semibold border transition-all duration-200 shadow-sm ${selectedStatus === "draft" ? "bg-primary text-white border-primary shadow-md" : "bg-white border-gray-200 text-primary hover:bg-blue-50 hover:border-primary"}`} onClick={() => handleStatusClick("draft")}>Черновики</button>
            <button className={`px-5 py-2 rounded-lg text-base font-semibold border transition-all duration-200 shadow-sm ${selectedStatus === "review" ? "bg-primary text-white border-primary shadow-md" : "bg-white border-gray-200 text-primary hover:bg-blue-50 hover:border-primary"}`} onClick={() => handleStatusClick("review")}>На согласовании</button>
            <button className={`px-5 py-2 rounded-lg text-base font-semibold border transition-all duration-200 shadow-sm ${selectedStatus === "approved" ? "bg-primary text-white border-primary shadow-md" : "bg-white border-gray-200 text-primary hover:bg-blue-50 hover:border-primary"}`} onClick={() => handleStatusClick("approved")}>Согласованные</button>
          </div>
          {/* Сетка статей */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 overflow-y-auto max-h-[calc(100vh-260px)] pr-2">
            {loading ? (
              <div className="col-span-full text-center text-gray-400 text-lg">Загрузка...</div>
            ) : articles.length === 0 ? (
              <div className="col-span-full text-center text-gray-400 text-lg">Нет статей</div>
            ) : articles.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col gap-3 cursor-pointer hover:shadow-xl transition-all"
                onClick={() => handleArticleClick(a.id)}
                tabIndex={0}
                role="button"
                onKeyDown={e => { if (e.key === 'Enter') handleArticleClick(a.id); }}
              >
                <div className="font-bold text-lg text-primary mb-1 truncate">{a.title}</div>
                <div className="text-sm text-gray-600 line-clamp-3" dangerouslySetInnerHTML={{ __html: a.preview || a.content?.slice(0, 200) || "" }} />
                <div className="mt-auto flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[a.status] || "bg-gray-100 text-gray-600"}`}>
                    {statusLabels[a.status] || a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
};

export default HomePage; 