// SeoFields: поля H1, meta, keywords с placeholder и подсказками
import React, { useRef } from "react";

const SeoFields = ({ seo, onChange, readOnly }) => {
  const titleRef = useRef(null);
  const h1Ref = useRef(null);
  const metaRef = useRef(null);
  const keywordsRef = useRef(null);

  const handleCopy = (ref) => {
    if (ref.current) {
      ref.current.select();
      document.execCommand("copy");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Title */}
      <div>
        <label className="block text-base font-bold text-gray-800 mb-2">Заголовок (Title)</label>
        <div className="relative">
          <input
            ref={titleRef}
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 pr-20"
            value={seo.title || ''}
            onChange={readOnly ? undefined : e => onChange({ ...seo, title: e.target.value })}
            placeholder="Введите Title страницы (до 150 символов)"
            maxLength={150}
            readOnly={readOnly}
          />
          <button
            type="button"
            className="absolute top-4 right-4 px-4 py-2 text-sm bg-white rounded-lg hover:bg-primary hover:text-white text-gray-600 border-2 border-gray-200 transition-all duration-200 shadow-sm"
            onClick={() => handleCopy(titleRef)}
            tabIndex={-1}
          >
            Копировать
          </button>
        </div>
      </div>
      {/* H1 */}
      <div>
        <label className="block text-base font-bold text-gray-800 mb-3">H1 <span className="text-red-500">*</span></label>
        <div className="relative">
          <input
            ref={h1Ref}
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 pr-20"
            value={seo.h1}
            onChange={readOnly ? undefined : e => onChange({ ...seo, h1: e.target.value })}
            placeholder="Например: Уникальные решения для автоматизации бизнеса"
            required
            readOnly={readOnly}
          />
          <button
            type="button"
            className="absolute top-4 right-4 px-4 py-2 text-sm bg-white rounded-lg hover:bg-primary hover:text-white text-gray-600 border-2 border-gray-200 transition-all duration-200 shadow-sm"
            onClick={() => handleCopy(h1Ref)}
            tabIndex={-1}
          >
            Копировать
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-3 font-medium">Главный заголовок страницы (1 фраза, до 70 символов)</div>
      </div>
      {/* Meta */}
      <div>
        <label className="block text-base font-bold text-gray-800 mb-2">Метаописание (description)</label>
        <div className="relative">
          <input
            ref={metaRef}
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 pr-20"
            value={seo.meta}
            onChange={readOnly ? undefined : e => onChange({ ...seo, meta: e.target.value })}
            placeholder="Например: Описание преимуществ и особенностей продукта..."
            readOnly={readOnly}
          />
          <button
            type="button"
            className="absolute top-4 right-4 px-4 py-2 text-sm bg-white rounded-lg hover:bg-primary hover:text-white text-gray-600 border-2 border-gray-200 transition-all duration-200 shadow-sm"
            onClick={() => handleCopy(metaRef)}
            tabIndex={-1}
          >
            Копировать
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-3 font-medium">Краткое описание для поисковиков (до 160 символов)</div>
      </div>
      {/* Keywords */}
      <div>
        <label className="block text-base font-bold text-gray-800 mb-2">Ключевые слова (keywords)</label>
        <div className="relative">
          <input
            ref={keywordsRef}
            className="w-full border-2 border-gray-200 rounded-xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 pr-20"
            value={seo.keywords}
            onChange={readOnly ? undefined : e => onChange({ ...seo, keywords: e.target.value })}
            placeholder="Например: автоматизация, бизнес, решения, роботы"
            readOnly={readOnly}
          />
          <button
            type="button"
            className="absolute top-4 right-4 px-4 py-2 text-sm bg-white rounded-lg hover:bg-primary hover:text-white text-gray-600 border-2 border-gray-200 transition-all duration-200 shadow-sm"
            onClick={() => handleCopy(keywordsRef)}
            tabIndex={-1}
          >
            Копировать
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-3 font-medium">Список ключевых слов через запятую</div>
      </div>
    </div>
  );
};

export default SeoFields; 