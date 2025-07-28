import React from "react";

const statusLabels = {
  "": "Все",
  draft: "Черновики",
  review: "На согласовании",
  approved: "Согласованные"
};

// Цвета для статусов
const statusColor = {
  draft: 'bg-gray-200 text-gray-700',
  review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  deleted: 'bg-red-100 text-red-700',
};
const statusDot = {
  draft: 'bg-gray-400',
  review: 'bg-yellow-400',
  approved: 'bg-green-500',
  deleted: 'bg-red-400',
};
const statusRu = {
  draft: 'Черновик',
  review: 'На согласовании',
  approved: 'Согласовано',
  deleted: 'Удалено',
};

const SidebarEditor = ({
  articles = [],
  statusFilter,
  setStatusFilter,
  selectedId,
  onSelect
}) => (
  <aside className="w-80 min-w-[260px] max-w-xs bg-white border-r border-gray-100 h-screen flex flex-col p-4">
    {/* Фильтры статусов */}
    <div className="grid grid-cols-2 gap-2 mb-4">
      <button
        className={`py-2 rounded-lg font-bold text-sm border ${statusFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-200'} transition-all`}
        onClick={() => setStatusFilter('all')}
      >Все</button>
      <button
        className={`py-2 rounded-lg font-bold text-sm border ${statusFilter === 'draft' ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-200'} transition-all`}
        onClick={() => setStatusFilter('draft')}
      >Черновики</button>
      <button
        className={`py-2 rounded-lg font-bold text-sm border ${statusFilter === 'review' ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-200'} transition-all`}
        onClick={() => setStatusFilter('review')}
      >На согласовании</button>
      <button
        className={`py-2 rounded-lg font-bold text-sm border ${statusFilter === 'approved' ? 'bg-primary text-white border-primary' : 'bg-gray-100 text-gray-700 border-gray-200'} transition-all`}
        onClick={() => setStatusFilter('approved')}
      >Согласованные</button>
    </div>
    {/* Список статей */}
    <div className="flex-1 overflow-y-auto pr-1">
      {articles.length === 0 && (
        <div className="text-gray-400 text-center mt-8">Нет статей</div>
      )}
      {articles.map(a => (
        <div
          key={a.id}
          className={`mb-2 p-3 rounded-xl cursor-pointer border flex gap-3 items-start transition-all group
            ${selectedId === a.id ? 'border-primary bg-primary/10' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
          onClick={() => onSelect(a.id)}
          tabIndex={0}
          role="button"
          onKeyDown={e => { if (e.key === 'Enter') onSelect(a.id); }}
        >
          <span className={`w-3 h-3 mt-1 rounded-full shrink-0 ${statusDot[a.status]}`}></span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-gray-900 truncate leading-tight mb-1">{a.title}</div>
            <div className={`text-xs font-semibold ${statusColor[a.status]} px-2 py-0.5 rounded-lg w-fit`}>{statusRu[a.status] || a.status}</div>
          </div>
        </div>
      ))}
    </div>
  </aside>
);

export default SidebarEditor; 