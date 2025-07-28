// TextHistory: лог действий
import React from "react";

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const actionLabels = {
  created: "создано",
  edited: "изменено",
  approved: "согласовано",
  rework: "доработано",
  deleted: "удалено"
};

const TextHistory = ({ history }) => {
  const hasValidRows = Array.isArray(history) && history.length > 0 && history.some(h => h && h.action);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2 px-4 font-bold">Время</th>
            <th className="py-2 px-4 font-bold">Действие</th>
            <th className="py-2 px-4 font-bold">Пользователь</th>
          </tr>
        </thead>
        <tbody>
          {hasValidRows ? history.map((h, i) => {
            if (!h || !h.action) return null;
            return (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4 whitespace-nowrap">{formatDate(h.time)}</td>
                <td className="py-2 px-4 whitespace-nowrap">{actionLabels[h.action] || h.action}</td>
                <td className="py-2 px-4 whitespace-nowrap">{h.user}</td>
              </tr>
            );
          }) : (
            <tr><td colSpan={3} className="text-gray-400 text-sm py-4 text-center">Нет истории изменений</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TextHistory; 