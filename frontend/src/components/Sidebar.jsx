import React from "react";

const statusLabels = {
  draft: "Черновики",
  review: "На согласовании",
  approved: "Согласованные",
  "": "Все"
};

const Sidebar = ({
  themes = [],
  articles = [],
  selectedTheme,
  selectedStatus,
  onThemeClick,
  onStatusClick,
  onArticleClick,
  activeArticleId
}) => (
  <aside className="w-72 min-w-[240px] bg-white border-r border-gray-200 shadow-lg flex-shrink-0 flex flex-col h-full">
    <div className="px-8 pt-8 pb-4">
      <div className="font-bold text-gray-800 text-lg mb-4">Статьи по тематикам</div>
      <ul className="space-y-2 max-h-[calc(100vh-180px)] overflow-y-auto pr-2 mb-6">
        {themes.map((theme) => (
          <li key={theme.id}>
            <button
              className={`flex justify-between items-center w-full px-4 py-2 rounded-lg text-base font-medium border border-gray-100 hover:bg-primary/10 transition-all text-left ${selectedTheme === theme.id ? "bg-primary/10 border-primary" : ""}`}
              onClick={() => onThemeClick && onThemeClick(theme.id)}
            >
              <span className="pl-2 flex-1 text-left">{theme.name}</span>
              <span className="ml-2 text-xs bg-primary text-white rounded-full px-2 py-0.5 font-bold">{theme.count || 0}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="font-bold text-gray-800 text-base mb-3">Статус</div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 shadow-sm ${selectedStatus === key ? "bg-primary text-white border-primary shadow-md" : "bg-white border-gray-200 text-primary hover:bg-blue-50 hover:border-primary"}`}
            onClick={() => onStatusClick && onStatusClick(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="font-bold text-gray-800 text-base mb-3">Тексты</div>
      <ul className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
        {articles.map((a) => (
          <li key={a.id}>
            <button
              className={`w-full text-left px-4 py-3 rounded-xl border ${activeArticleId === a.id ? "border-primary bg-primary/10" : "border-gray-100 bg-white"} hover:bg-primary/10 transition-all`}
              onClick={() => onArticleClick && onArticleClick(a.id)}
            >
              <div className="font-bold text-primary text-base mb-1 truncate">{a.title}</div>
              <div className="text-xs text-gray-500 line-clamp-2 mb-1">{a.preview || a.content?.slice(0, 80) || ""}</div>
              <span className="text-xs font-semibold text-gray-400">[{statusLabels[a.status] || a.status}]</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  </aside>
);

export default Sidebar; 