import React, { useState, useEffect } from "react";
import Header from "../components/Header";

// Toast-компонент для уведомлений
const Toast = ({ message, type = "success", onClose }) => (
  <div className={`fixed bottom-8 right-8 z-50 px-8 py-5 rounded-2xl shadow-2xl text-lg font-bold transition-all duration-300
    ${type === "save" ? "bg-yellow-400 text-white" : type === "approve" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
    style={{ minWidth: 220 }}
  >
    {message}
    <button className="ml-6 text-white/80 hover:text-white text-2xl font-bold" onClick={onClose}>&times;</button>
  </div>
);

const SeoSearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchRegion, setSearchRegion] = useState(225); // По умолчанию - по всей России
  const [searchResultsCount, setSearchResultsCount] = useState(10); // По умолчанию топ-10
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedResults, setSelectedResults] = useState(new Set());
  const [planGenerationLog, setPlanGenerationLog] = useState("");
  const [articleGenerationLog, setArticleGenerationLog] = useState("");

  // Состояния для полного процесса обработки
  const [currentStep, setCurrentStep] = useState(1);
  const [parsedData, setParsedData] = useState([]);
  const [parsingStats, setParsingStats] = useState(null);
  const [cleanedData, setCleanedData] = useState([]);
  const [chunks, setChunks] = useState([]);
  const [finalArticle, setFinalArticle] = useState(null);
  
  // Состояния для разворачивания/сворачивания текста
  const [expandedArticles, setExpandedArticles] = useState(new Set());
  
  // Состояния для управления чанками
  const [chunkPriorities, setChunkPriorities] = useState({}); // 'low', 'medium', 'high'
  const [excludedChunks, setExcludedChunks] = useState(new Set());
  const [articlePlan, setArticlePlan] = useState(null);
  const [editablePlan, setEditablePlan] = useState(""); // Редактируемый план статьи
  
  // Настройки процесса
  const [settings, setSettings] = useState({
    enableCleaning: true,
    chunkSize: 500,
    targetLength: 'medium',
    targetLengthChars: 7000 // Длина статьи в символах
  });

  // Настройки модели для генерации
  const [modelSettings, setModelSettings] = useState({
    system_prompt: "Ты — опытный технический SEO-специалист и копирайтер. Напиши максимально SEO-оптимизированную статью на основе плана. Используй больше технических фактов и цифр. Создай статью с глубокой технической оптимизацией: правильная структура заголовков (H1-H6), оптимальная плотность ключевых слов, семантическая разметка, внутренняя перелинковка. Фокус на техническом SEO без потери читабельности.",
    user_prompt: "Перепиши следующий текст, сделав его уникальным, но сохранив всю важную информацию и смысл:",
    temperature: 0.7,
    max_tokens: 2000,
    model: "gpt-4o",
    // Параметры для генерации плана статьи
    plan_temperature: 0.2,
    plan_max_tokens: 3000,
    plan_system_prompt: "Ты — эксперт по анализу технических текстов. Твоя задача — ПРОЧИТАТЬ и ПРОАНАЛИЗИРОВАТЬ предоставленные фрагменты, а затем создать план статьи.\n\nКРИТИЧЕСКИ ВАЖНО:\n1. СНАЧАЛА прочитай каждый фрагмент внимательно\n2. ВЫДЕЛИ конкретные темы и подтемы в каждом фрагменте\n3. СОЗДАЙ заголовки на основе РЕАЛЬНОГО содержимого\n4. НЕ используй шаблонные заголовки\n\nЗАПРЕЩЕНО:\n❌ \"Введение\", \"Основная часть\", \"Заключение\"\n❌ \"Теоретические основы\", \"Практическое применение\"\n❌ Любые общие заголовки без связи с контентом\n\nОБЯЗАТЕЛЬНО:\n✅ Анализируй конкретные термины и процессы из текста\n✅ Создавай заголовки на основе реальных тем\n✅ Указывай номера фрагментов для каждого раздела\n\nФОРМАТ ОТВЕТА:\n1. [Название раздела на основе контента]\n   - Описание: что включает этот раздел\n   - Фрагменты: номера используемых чанков\n   \n2. [Следующий раздел]\n   - Описание: ...\n   - Фрагменты: ...",
    plan_user_prompt: "АНАЛИЗИРУЙ следующие технические фрагменты и создай план статьи.\n\nСНАЧАЛА прочитай каждый фрагмент и выдели конкретные темы.\n\nСОЗДАЙ план с заголовками на основе РЕАЛЬНОГО содержимого фрагментов.\nКаждый заголовок должен отражать конкретную тему из текста.\n\nПРИМЕРЫ правильных заголовков:\n✅ \"Технология холодной высадки метизов\"\n✅ \"Оборудование и этапы процесса\"\n✅ \"Материалы и их свойства\"\n✅ \"Технологические параметры\"\n✅ \"Контроль качества продукции\"\n\nНЕ используй общие заголовки типа \"Введение\" или \"Основная часть\"."
  });

  // Новые SEO-настройки
  const [seoSettings, setSeoSettings] = useState({
    additionalKeywords: '',
    lsiKeywords: '',
    targetPhrases: '',
    keywordDensity: 2.5,
    seoPrompt: '🔹 УНИВЕРСАЛЬНАЯ SEO-ОПТИМИЗАЦИЯ ДЛЯ ТЕХНИЧЕСКОГО КОНТЕНТА:\n- Создавай экспертный контент с техническими деталями и спецификациями\n- Включай числовые данные, параметры, сравнительные характеристики\n- Используй профессиональную терминологию и отраслевые стандарты\n- Добавляй практические кейсы, примеры применения, результаты тестирования\n- Включай современные технологии, инновации и тренды развития\n- Создавай структурированный контент с логической последовательностью\n- Оптимизируй для поисковых систем с естественным вхождением ключевых слов\n- Включай LSI-ключевые слова и семантически связанные термины\n- Добавляй внутренние ссылки и ссылки на авторитетные источники\n- Создавай контент, отвечающий на поисковые намерения пользователей',
    writingStyle: 'technical',
    contentType: 'educational',
    targetAudience: 'specialists',
    headingType: 'h2',
    paragraphLength: 'medium',
    useLists: true,
    internalLinks: false
  });
  
  // Настройки очистки
  const [cleaningSettings, setCleaningSettings] = useState({
    mode: 'manual', // 'automatic' или 'manual' - по умолчанию ручной режим
    removeTechnicalBlocks: true,
    removeDuplicates: true,
    filterRelevance: true,
    minParagraphLength: 50,
    maxParagraphLength: 2000,
    relevanceThreshold: 0.7
  });

  // Состояние для редактируемого текста в ручном режиме
  const [editableContent, setEditableContent] = useState({});
  // Состояние для сохраненного исходного текста
  const [originalContent, setOriginalContent] = useState({});
  
  // Состояния для отслеживания изменений на этапах
  const [hasChanges, setHasChanges] = useState({
    search: false,
    parse: false,
    clean: false,
    chunk: false,
    generate: false
  });
  
  // Состояния для сохранения промежуточных данных
  const [savedSearchResults, setSavedSearchResults] = useState([]);
  const [savedParsedData, setSavedParsedData] = useState([]);
  const [savedCleanedData, setSavedCleanedData] = useState([]);
  const [savedChunks, setSavedChunks] = useState([]);
  const [savedExcludedArticles, setSavedExcludedArticles] = useState(new Set());
  
  // Состояния для ручного добавления контента
  const [manualContentMode, setManualContentMode] = useState({}); // {url: true/false}
  const [manualContent, setManualContent] = useState({}); // {url: content}
  const [manualContentTitle, setManualContentTitle] = useState({}); // {url: title}
  
  // Состояние для исключенных статей (храним URL вместо индексов)
  const [excludedArticles, setExcludedArticles] = useState(new Set());

  // Состояния для тематик и сохранения в БД
  const [themes, setThemes] = useState([]);
  const [themeIds, setThemeIds] = useState([]);
  const [savingToDb, setSavingToDb] = useState(false);
  const [toast, setToast] = useState(null);

  // Состояния для SEO-проверки text.ru
  const [seoQualityData, setSeoQualityData] = useState(null);
  const [isCheckingSeo, setIsCheckingSeo] = useState(false);
  const [seoCheckError, setSeoCheckError] = useState(null);
  const [showSeoBlock, setShowSeoBlock] = useState(false);

  const steps = [
    { id: 1, title: 'Поиск источников', icon: '🔍' },
    { id: 2, title: 'Парсинг контента', icon: '📄' },
    { id: 3, title: 'Очистка текста', icon: '🧹' },
    { id: 4, title: 'Разделение на чанки', icon: '🔪' },
    { id: 5, title: 'Настройки генерации', icon: '⚙️' },
    { id: 6, title: 'Результат', icon: '📝' }
  ];

  // Получаем данные пользователя из localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {}
  const username = user?.login || "user";
  const role = user?.role || "user";

  // Функции для работы с localStorage
  const saveToLocalStorage = (key, data) => {
    try {
      // Ограничиваем размер данных для localStorage
      const dataString = JSON.stringify(data);
      if (dataString.length > 5000000) { // 5MB лимит
        console.warn(`Данные для ${key} слишком большие (${dataString.length} байт), не сохраняем`);
        return;
      }
      localStorage.setItem(`seo_project_${key}`, dataString);
    } catch (error) {
      console.error('Ошибка сохранения в localStorage:', error);
      // Очищаем localStorage если он переполнен
      if (error.name === 'QuotaExceededError') {
        try {
          localStorage.clear();
          console.log('localStorage очищен из-за переполнения');
        } catch (clearError) {
          console.error('Не удалось очистить localStorage:', clearError);
        }
      }
    }
  };

  const loadFromLocalStorage = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(`seo_project_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.error('Ошибка загрузки из localStorage:', error);
      return defaultValue;
    }
  };

  const clearLocalStorage = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('seo_project_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Ошибка очистки localStorage:', error);
    }
  };

  // Загрузка данных при инициализации компонента
  useEffect(() => {
    const savedSearchQuery = loadFromLocalStorage('searchQuery', '');
    const savedSearchRegion = loadFromLocalStorage('searchRegion', 225);
    const savedSearchResultsCount = loadFromLocalStorage('searchResultsCount', 10);
    const savedCurrentStep = loadFromLocalStorage('currentStep', 1);
    const savedSearchResults = loadFromLocalStorage('searchResults', []);
    const savedSelectedResults = loadFromLocalStorage('selectedResults', new Set());
    const savedParsedData = loadFromLocalStorage('parsedData', []);
    const savedCleanedData = loadFromLocalStorage('cleanedData', []);
    const savedChunks = loadFromLocalStorage('chunks', []);
    const savedFinalArticle = loadFromLocalStorage('finalArticle', null);
    const savedArticlePlan = loadFromLocalStorage('articlePlan', null);
    const savedEditablePlan = loadFromLocalStorage('editablePlan', '');
    const savedSettings = loadFromLocalStorage('settings', {
      enableCleaning: true,
      chunkSize: 500,
      targetLength: 'medium',
      targetLengthChars: 7000
    });
    const savedModelSettings = loadFromLocalStorage('modelSettings', {
      system_prompt: "Ты — опытный технический SEO-специалист и копирайтер. Напиши максимально SEO-оптимизированную статью на основе плана. Используй больше технических фактов и цифр. Создай статью с глубокой технической оптимизацией: правильная структура заголовков (H1-H6), оптимальная плотность ключевых слов, семантическая разметка, внутренняя перелинковка. Фокус на техническом SEO без потери читабельности.",
      user_prompt: "Перепиши следующий текст, сделав его уникальным, но сохранив всю важную информацию и смысл:",
      temperature: 0.7,
      max_tokens: 2000,
      model: "gpt-4o",
      plan_temperature: 0.2,
      plan_max_tokens: 3000,
      plan_system_prompt: "Ты — эксперт по анализу технических текстов. Твоя задача — ПРОЧИТАТЬ и ПРОАНАЛИЗИРОВАТЬ предоставленные фрагменты, а затем создать план статьи.\n\nКРИТИЧЕСКИ ВАЖНО:\n1. СНАЧАЛА прочитай каждый фрагмент внимательно\n2. ВЫДЕЛИ конкретные темы и подтемы в каждом фрагменте\n3. СОЗДАЙ заголовки на основе РЕАЛЬНОГО содержимого\n4. НЕ используй шаблонные заголовки\n\nЗАПРЕЩЕНО:\n❌ \"Введение\", \"Основная часть\", \"Заключение\"\n❌ \"Теоретические основы\", \"Практическое применение\"\n❌ Любые общие заголовки без связи с контентом\n\nОБЯЗАТЕЛЬНО:\n✅ Анализируй конкретные термины и процессы из текста\n✅ Создавай заголовки на основе реальных тем\n✅ Указывай номера фрагментов для каждого раздела\n\nФОРМАТ ОТВЕТА:\n1. [Название раздела на основе контента]\n   - Описание: что включает этот раздел\n   - Фрагменты: номера используемых чанков\n   \n2. [Следующий раздел]\n   - Описание: ...\n   - Фрагменты: ...",
      plan_user_prompt: "АНАЛИЗИРУЙ следующие технические фрагменты и создай план статьи.\n\nСНАЧАЛА прочитай каждый фрагмент и выдели конкретные темы.\n\nСОЗДАЙ план с заголовками на основе РЕАЛЬНОГО содержимого фрагментов.\nКаждый заголовок должен отражать конкретную тему из текста.\n\nПРИМЕРЫ правильных заголовков:\n✅ \"Технология холодной высадки метизов\"\n✅ \"Оборудование и этапы процесса\"\n✅ \"Материалы и их свойства\"\n✅ \"Технологические параметры\"\n✅ \"Контроль качества продукции\"\n\nНЕ используй общие заголовки типа \"Введение\" или \"Основная часть\"."
    });
    const savedSeoSettings = loadFromLocalStorage('seoSettings', {
      additionalKeywords: '',
      lsiKeywords: '',
      targetPhrases: '',
      keywordDensity: 2.5,
      seoPrompt: '🔹 УНИВЕРСАЛЬНАЯ SEO-ОПТИМИЗАЦИЯ ДЛЯ ТЕХНИЧЕСКОГО КОНТЕНТА:\n- Создавай экспертный контент с техническими деталями и спецификациями\n- Включай числовые данные, параметры, сравнительные характеристики\n- Используй профессиональную терминологию и отраслевые стандарты\n- Добавляй практические кейсы, примеры применения, результаты тестирования\n- Включай современные технологии, инновации и тренды развития\n- Создавай структурированный контент с логической последовательностью\n- Оптимизируй для поисковых систем с естественным вхождением ключевых слов\n- Включай LSI-ключевые слова и семантически связанные термины\n- Добавляй внутренние ссылки и ссылки на авторитетные источники\n- Создавай контент, отвечающий на поисковые намерения пользователей',
      writingStyle: 'technical',
      contentType: 'educational',
      targetAudience: 'specialists',
      headingType: 'h2',
      paragraphLength: 'medium',
      useLists: true,
      internalLinks: false
    });
    const savedCleaningSettings = loadFromLocalStorage('cleaningSettings', {
      mode: 'manual',
      removeTechnicalBlocks: true,
      removeDuplicates: true,
      filterRelevance: true,
      minParagraphLength: 50,
      maxParagraphLength: 2000,
      relevanceThreshold: 0.7
    });

    // Загрузка SEO-данных
    const savedSeoQualityData = loadFromLocalStorage('seoQualityData', null);
    const savedShowSeoBlock = loadFromLocalStorage('showSeoBlock', false);

    // Восстанавливаем состояние только если есть сохраненные данные
    if (savedSearchQuery) setSearchQuery(savedSearchQuery);
    if (savedSearchRegion) setSearchRegion(savedSearchRegion);
    if (savedSearchResultsCount) setSearchResultsCount(savedSearchResultsCount);
    if (savedCurrentStep) setCurrentStep(savedCurrentStep);
    if (savedSearchResults.length > 0) setSearchResults(savedSearchResults);
    if (savedSelectedResults.size > 0) setSelectedResults(new Set(savedSelectedResults));
    if (savedParsedData.length > 0) setParsedData(savedParsedData);
    if (savedCleanedData.length > 0) setCleanedData(savedCleanedData);
    if (savedChunks.length > 0) setChunks(savedChunks);
    if (savedFinalArticle) setFinalArticle(savedFinalArticle);
    if (savedArticlePlan) setArticlePlan(savedArticlePlan);
    if (savedEditablePlan) setEditablePlan(savedEditablePlan);
    if (savedSettings) setSettings(savedSettings);
    if (savedModelSettings) setModelSettings(savedModelSettings);
    if (savedSeoSettings) setSeoSettings(savedSeoSettings);
    if (savedCleaningSettings) setCleaningSettings(savedCleaningSettings);
    if (savedSeoQualityData) setSeoQualityData(savedSeoQualityData);
    if (savedShowSeoBlock) setShowSeoBlock(savedShowSeoBlock);

    // Загружаем тематики из основного бекенда
    fetch("/api/themes")
      .then(res => res.json())
      .then(data => setThemes(data))
      .catch(() => setThemes([]));
  }, []);

  // Автоматическое сохранение при изменениях
  useEffect(() => {
    saveToLocalStorage('searchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    saveToLocalStorage('searchRegion', searchRegion);
  }, [searchRegion]);

  useEffect(() => {
    saveToLocalStorage('searchResultsCount', searchResultsCount);
  }, [searchResultsCount]);

  useEffect(() => {
    saveToLocalStorage('currentStep', currentStep);
  }, [currentStep]);

  useEffect(() => {
    saveToLocalStorage('searchResults', searchResults);
  }, [searchResults]);

  useEffect(() => {
    saveToLocalStorage('selectedResults', Array.from(selectedResults));
  }, [selectedResults]);

  useEffect(() => {
    saveToLocalStorage('parsedData', parsedData);
  }, [parsedData]);

  useEffect(() => {
    saveToLocalStorage('cleanedData', cleanedData);
  }, [cleanedData]);

  useEffect(() => {
    saveToLocalStorage('chunks', chunks);
  }, [chunks]);

  useEffect(() => {
    saveToLocalStorage('finalArticle', finalArticle);
  }, [finalArticle]);

  useEffect(() => {
    saveToLocalStorage('articlePlan', articlePlan);
  }, [articlePlan]);

  useEffect(() => {
    saveToLocalStorage('editablePlan', editablePlan);
  }, [editablePlan]);

  useEffect(() => {
    saveToLocalStorage('settings', settings);
  }, [settings]);

  useEffect(() => {
    saveToLocalStorage('modelSettings', modelSettings);
  }, [modelSettings]);

  useEffect(() => {
    saveToLocalStorage('seoSettings', seoSettings);
  }, [seoSettings]);

  useEffect(() => {
    saveToLocalStorage('cleaningSettings', cleaningSettings);
  }, [cleaningSettings]);

  useEffect(() => {
    saveToLocalStorage('seoQualityData', seoQualityData);
  }, [seoQualityData]);

  useEffect(() => {
    saveToLocalStorage('showSeoBlock', showSeoBlock);
  }, [showSeoBlock]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Введите поисковый запрос");
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);
    setSelectedResults(new Set());
    setExcludedArticles(new Set()); // Сбрасываем исключенные статьи
    setCleanedData([]); // Очищаем данные очистки
    setParsedData([]); // Очищаем данные парсинга
    setChunks([]); // Очищаем чанки
    setFinalArticle(null); // Очищаем финальную статью
    setArticlePlan(null); // Очищаем план статьи
    setEditablePlan(''); // Очищаем редактируемый план
    setSeoQualityData(null); // Очищаем SEO-данные
    setShowSeoBlock(false); // Скрываем SEO-блок
    setSeoCheckError(null); // Очищаем ошибки SEO
    setCurrentStep(1); // Возвращаемся к первому этапу
    
    // Сбрасываем все изменения при новом поиске
    setHasChanges({
      search: false,
      parse: false,
      clean: false,
      chunk: false,
      generate: false
    });

    // Очищаем localStorage при новом поиске
    clearLocalStorage();

    try {
      const response = await fetch("https://tkmetizi.ru/ai-api/seo/seo/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          page_size: searchResultsCount,
          region: searchRegion
        })
      });

      if (!response.ok) {
        throw new Error(`Ошибка запроса: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      
    } catch (err) {
      setError(`Ошибка поиска: ${err.message}`);
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultSelect = (index) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedResults(newSelected);
    // Отмечаем изменения в поиске
    setHasChanges(prev => ({ ...prev, search: true }));
  };

  const handleSelectAll = () => {
    if (selectedResults.size === searchResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(searchResults.map((_, index) => index)));
    }
    // Отмечаем изменения в поиске
    setHasChanges(prev => ({ ...prev, search: true }));
  };

  // Функция для переключения разворачивания/сворачивания статьи
  const handleToggleArticle = (articleIndex) => {
    const newExpanded = new Set(expandedArticles);
    if (newExpanded.has(articleIndex)) {
      newExpanded.delete(articleIndex);
    } else {
      newExpanded.add(articleIndex);
    }
    setExpandedArticles(newExpanded);
  };

  // Функции для управления чанками
  const handleChunkPriority = (chunkIndex, priority) => {
    setChunkPriorities(prev => ({
      ...prev,
      [chunkIndex]: priority
    }));
    // Отмечаем изменения в чанках
    setHasChanges(prev => ({ ...prev, chunk: true }));
  };

  const handleToggleChunkExclusion = (chunkIndex) => {
    const newExcluded = new Set(excludedChunks);
    if (newExcluded.has(chunkIndex)) {
      newExcluded.delete(chunkIndex);
    } else {
      newExcluded.add(chunkIndex);
    }
    setExcludedChunks(newExcluded);
    // Отмечаем изменения в чанках
    setHasChanges(prev => ({ ...prev, chunk: true }));
  };

  const getChunkPriority = (chunkIndex) => {
    return chunkPriorities[chunkIndex] || 'medium';
  };

  const isChunkExcluded = (chunkIndex) => {
    return excludedChunks.has(chunkIndex);
  };

  // Этап 2: Парсинг выбранных URL
  const handleParse = async () => {
    const selectedUrls = Array.from(selectedResults).map(index => searchResults[index].url);
    
    if (selectedUrls.length === 0) {
      setError('Выберите хотя бы один URL для парсинга');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('https://tkmetizi.ru/ai-api/seo/seo/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: selectedUrls,
          delay: 1.0,
          enable_cleaning: false, // Пока без очистки
          enable_chunking: false
        })
      });
      
      const data = await response.json();
      setParsedData(data.parsed_articles || []);
      setCleanedData([]); // Очищаем данные очистки при новом парсинге
      setParsingStats({
        total_requested: data.total_requested,
        total_parsed: data.total_parsed,
        total_failed: data.total_failed,
        success_rate: data.success_rate,
        failed_urls: data.failed_urls || []
      });
      handleStepChange(2);
    } catch (error) {
      setError('Ошибка парсинга: ' + error.message);
    }
    setLoading(false);
  };

  // Этап 3: Очистка контента
  const handleClean = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Получаем только активные (неисключенные) статьи
      const filteredArticles = getFilteredArticles();
      

      
      if (cleaningSettings.mode === 'manual') {
        // В ручном режиме используем сохраненный контент или отредактированный
        const cleanedArticles = filteredArticles.map((article) => {
          // Находим индекс статьи в исходном массиве parsedData
          const originalIndex = parsedData.findIndex(a => a.url === article.url);
          return {
            ...article,
            content: originalContent[originalIndex] || editableContent[originalIndex] || article.content,
            cleaned_content: originalContent[originalIndex] || editableContent[originalIndex] || article.content,
            cleaned_word_count: (originalContent[originalIndex] || editableContent[originalIndex]) ? 
              (originalContent[originalIndex] || editableContent[originalIndex]).split(/\s+/).filter(word => word.length > 0).length : 
              article.word_count
          };
        });
        setCleanedData(cleanedArticles);
        handleStepChange(3);
      } else {
        // В автоматическом режиме используем уже спарсенные данные и применяем очистку
        const cleanedArticles = filteredArticles.map((article) => {
          // Здесь можно добавить логику автоматической очистки на фронтенде
          // или просто использовать исходный контент, если очистка уже была применена при парсинге
          return {
            ...article,
            cleaned_content: article.content,
            cleaned_word_count: article.word_count
          };
        });
        setCleanedData(cleanedArticles);
        handleStepChange(3);
      }
    } catch (error) {
      setError('Ошибка очистки: ' + error.message);
    }
    setLoading(false);
  };

  // Этап 4: Создание чанков
  const handleChunk = async () => {
    setLoading(true);
    setError('');
    try {
      // Используем только активные (неисключенные) статьи для создания чанков
      const allChunks = [];
      let chunkIndex = 0;
      
      cleanedData.forEach((article, articleIndex) => {
        // Пропускаем исключенные статьи
        if (excludedArticles.has(article.url)) {
          return;
        }
        
        const content = article.cleaned_content || article.content;
        const words = content.split(/\s+/).filter(word => word.length > 0);
        const chunkSize = settings.chunkSize || 500;
        
        // Разбиваем на чанки по словам
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunkWords = words.slice(i, i + chunkSize);
          const chunkText = chunkWords.join(' ');
          
          allChunks.push({
            text: chunkText,
            word_count: chunkWords.length,
            article_index: articleIndex,
            article_title: article.title,
            keywords: [] // Можно добавить извлечение ключевых слов
          });
          chunkIndex++;
        }
      });
      
      setChunks(allChunks);
      
      // Инициализируем приоритеты для всех чанков как 'medium'
      const initialPriorities = {};
      allChunks.forEach((_, index) => {
        initialPriorities[index] = 'medium';
      });
      setChunkPriorities(initialPriorities);
      
              handleStepChange(4);
    } catch (error) {
      setError('Ошибка чанкинга: ' + error.message);
    }
    setLoading(false);
  };

  // Этап 5: GPT генерация
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setArticleGenerationLog("🚀 Генерация статьи на основе плана");
    
    try {
      // Используем новый потоковый эндпоинт
      const response = await fetch('https://tkmetizi.ru/ai-api/seo/seo/generate-from-plan-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_text: editablePlan,
          keywords: searchQuery.split(' ').slice(0, 5), // Берем первые 5 слов из запроса как ключевые
          target_length_chars: settings.targetLengthChars,
          system_prompt: modelSettings.system_prompt,
          temperature: modelSettings.temperature,
          // Новые SEO-параметры
          additional_keywords: seoSettings.additionalKeywords,
          lsi_keywords: seoSettings.lsiKeywords,
          target_phrases: seoSettings.targetPhrases,
          keyword_density: seoSettings.keywordDensity,
          seo_prompt: seoSettings.seoPrompt,
          writing_style: seoSettings.writingStyle,
          content_type: seoSettings.contentType,
          target_audience: seoSettings.targetAudience,
          heading_type: seoSettings.headingType,
          paragraph_length: seoSettings.paragraphLength,
          use_lists: seoSettings.useLists,
          internal_links: seoSettings.internalLinks
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Обрабатываем потоковые данные
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.log) {
                // Обновляем лог в реальном времени
                setArticleGenerationLog(data.log);
              } else if (data.result) {
                // Получили финальный результат
                setFinalArticle(data.result);
                handleStepChange(6); // Переходим к результату
                return; // Завершаем обработку
              } else if (data.error) {
                // Получили ошибку
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn("Ошибка парсинга SSE данных:", parseError);
            }
          }
        }
      }
    } catch (error) {
      setError('Ошибка генерации: ' + error.message);
    } finally {
      setLoading(false);
      setArticleGenerationLog("");
    }
  };

  // Функция для обрезки полей до 255 символов
  const truncateField = (field, maxLength = 255) => {
    if (!field) return field;
    return field.length > maxLength ? field.substring(0, maxLength) : field;
  };

  // Сохранение статьи в базу данных
  const handleSaveToDatabase = async () => {
    // Валидация: title, result, тематики
    if (!finalArticle.title?.trim() || !finalArticle.content?.trim() || themeIds.length === 0) {
      setToast({ message: "Заполните все поля и выберите хотя бы одну тематику для сохранения", type: "error" });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    
    setSavingToDb(true);
    try {
      const status = "draft";
      
      // Обрезаем поля до 255 символов для совместимости с БД
      const truncatedData = {
        title: truncateField(finalArticle.title),
        h1: truncateField(finalArticle.h1),
        meta_description: truncateField(finalArticle.meta_description),
        keywords: truncateField(finalArticle.keywords),
        content: "Этот текст был сгенерирован с помощью AI SEO-копирайтера",
        result: finalArticle.content, // result может быть длинным
        status,
        themeIds: themeIds,
        source: "seo_copywriter"
      };
      
      const res = await fetch("/api/texts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(truncatedData)
      });
      
      if (!res.ok) throw new Error("Ошибка создания записи: " + (await res.text()));
      
      const data = await res.json();
      setToast({ message: "Новая статья создана AI SEO-копирайтером и сохранена в базе", type: "approve" });
      setTimeout(() => setToast(null), 4000);
      
      // Остаемся на текущей странице
      console.log("Статья сохранена с ID:", data.id);
    } catch (e) {
      setToast({ message: e.message || "Ошибка создания записи", type: "error" });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSavingToDb(false);
    }
  };

  // Главная функция генерации статьи (запускает весь процесс)
  const handleGenerateArticle = () => {
    // На этапе 1 "Обработать результаты" означает запустить парсинг
    if (currentStep === 1) {
      handleParse();
    } else {
      // На других этапах - генерация статьи
      handleGenerate();
    }
  };

  // Функции для работы с навигацией и редактированием
  const saveCurrentData = () => {
    // Сохраняем текущие данные в зависимости от этапа
    switch (currentStep) {
      case 1:
        setSavedSearchResults([...searchResults]);
        setHasChanges(prev => ({ ...prev, search: false }));
        break;
      case 2:
        setSavedParsedData([...parsedData]);
        setSavedExcludedArticles(new Set(excludedArticles));
        setHasChanges(prev => ({ ...prev, parse: false }));
        break;
      case 3:
        setSavedCleanedData([...cleanedData]);
        setHasChanges(prev => ({ ...prev, clean: false }));
        break;
      case 4:
        setSavedChunks([...chunks]);
        setHasChanges(prev => ({ ...prev, chunk: false }));
        break;
    }
  };

  const restoreData = () => {
    // Восстанавливаем сохраненные данные в зависимости от этапа
    switch (currentStep) {
      case 1:
        setSearchResults([...savedSearchResults]);
        setSelectedResults(new Set());
        setHasChanges(prev => ({ ...prev, search: false }));
        break;
      case 2:
        setParsedData([...savedParsedData]);
        setExcludedArticles(new Set(savedExcludedArticles));
        setHasChanges(prev => ({ ...prev, parse: false }));
        break;
      case 3:
        setCleanedData([...savedCleanedData]);
        setHasChanges(prev => ({ ...prev, clean: false }));
        break;
      case 4:
        setChunks([...savedChunks]);
        setHasChanges(prev => ({ ...prev, chunk: false }));
        break;
    }
  };

  const handleStepChange = (newStep) => {
    // Сохраняем данные перед переходом
    if (hasChanges.search || hasChanges.parse || hasChanges.clean || hasChanges.chunk) {
      saveCurrentData();
    }
    
    // При переходе на более поздний этап сохраняем все текущие данные
    if (newStep > currentStep) {
      saveToLocalStorage('searchResults', searchResults);
      saveToLocalStorage('selectedResults', Array.from(selectedResults));
      saveToLocalStorage('parsedData', parsedData);
      saveToLocalStorage('cleanedData', cleanedData);
      saveToLocalStorage('chunks', chunks);
      saveToLocalStorage('finalArticle', finalArticle);
      saveToLocalStorage('articlePlan', articlePlan);
      saveToLocalStorage('editablePlan', editablePlan);
    }
    
    // Очищаем логи генерации плана при смене этапа
    setPlanGenerationLog("");
    setArticleGenerationLog("");
    
    setCurrentStep(newStep);
  };

  // Функция для обновления настроек очистки с отслеживанием изменений
  const updateCleaningSettings = (updates) => {
    setCleaningSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(prev => ({ ...prev, clean: true }));
  };

  // Функция для обновления SEO-настроек
  const updateSeoSettings = (updates) => {
    setSeoSettings(prev => ({ ...prev, ...updates }));
  };

  // Функции для работы с ручным контентом
  const toggleManualContent = (url) => {
    setManualContentMode(prev => ({
      ...prev,
      [url]: !prev[url]
    }));
  };

  const saveManualContent = (url) => {
    const content = manualContent[url] || '';
    const title = manualContentTitle[url] || 'Ручной контент';
    
    if (content.trim()) {
      // Создаем новый объект статьи
      const newArticle = {
        url: url,
        title: title,
        content: content,
        cleaned_content: content,
        meta_description: '',
        word_count: content.split(/\s+/).filter(word => word.length > 0).length,
        cleaned_word_count: content.split(/\s+/).filter(word => word.length > 0).length,
        content_stats: {
          paragraphs: content.split('\n\n').length,
          sentences: content.split(/[.!?]+/).length - 1
        },
        chunks: []
      };

      // Добавляем к существующим данным
      setParsedData(prev => [...prev, newArticle]);
      
      // Удаляем из списка ошибок парсинга
      setParsingStats(prev => ({
        ...prev,
        failed_urls: prev.failed_urls.filter(failed => failed.url !== url)
      }));
      
      // Закрываем режим редактирования
      setManualContentMode(prev => ({
        ...prev,
        [url]: false
      }));
      
      // Очищаем данные ручного ввода для этого URL
      setManualContent(prev => {
        const newState = { ...prev };
        delete newState[url];
        return newState;
      });
      setManualContentTitle(prev => {
        const newState = { ...prev };
        delete newState[url];
        return newState;
      });
      
      // Отмечаем изменения
      setHasChanges(prev => ({ ...prev, parse: true }));
    }
  };

  const cancelManualContent = (url) => {
    setManualContentMode(prev => ({
      ...prev,
      [url]: false
    }));
    setManualContent(prev => {
      const newState = { ...prev };
      delete newState[url];
      return newState;
    });
    setManualContentTitle(prev => {
      const newState = { ...prev };
      delete newState[url];
      return newState;
    });
  };

  // Функции для работы с исключенными статьями
  const handleExcludeArticle = (index) => {
    const articleUrl = parsedData[index]?.url;
    if (articleUrl) {
      setExcludedArticles(prev => new Set([...prev, articleUrl]));
      setHasChanges(prev => ({ ...prev, parse: true }));
      // Очищаем cleanedData при изменении исключений
      setCleanedData([]);
    }
  };

  const handleRestoreArticle = (index) => {
    const articleUrl = parsedData[index]?.url;
    if (articleUrl) {
      setExcludedArticles(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleUrl);
        return newSet;
      });
      setHasChanges(prev => ({ ...prev, parse: true }));
      // Очищаем cleanedData при изменении исключений
      setCleanedData([]);
    }
  };

  const getFilteredArticles = () => {
    return parsedData.filter(article => !excludedArticles.has(article.url));
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    setPlanGenerationLog("🚀 Запуск генерации плана статьи с новой логикой");
    try {
      // Подготавливаем чанки с приоритетами для отправки
      const chunksWithPriorities = chunks.map((chunk, index) => ({
        text: chunk.text,
        word_count: chunk.word_count,
        article_index: 0, // Упрощенная структура
        article_title: "Статья", // Упрощенная структура
        keywords: chunk.keywords || [],
        priority: getChunkPriority(index),
        excluded: isChunkExcluded(index)
      })).filter(chunk => !chunk.excluded);

      // Используем новый потоковый эндпоинт
      const response = await fetch("https://tkmetizi.ru/ai-api/seo/seo/generate-plan-stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chunks_with_priorities: chunksWithPriorities,
          model_settings: {
            temperature: modelSettings.plan_temperature,
            max_tokens: modelSettings.plan_max_tokens,
            system_prompt: modelSettings.plan_system_prompt,
            user_prompt: modelSettings.plan_user_prompt
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Обрабатываем потоковые данные
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.log) {
                // Обновляем лог в реальном времени
                setPlanGenerationLog(data.log);
              } else if (data.result) {
                // Получили финальный результат
                setArticlePlan(data.result);
                setEditablePlan(data.result.plan_text);
                handleStepChange(5); // Переходим к настройкам генерации
                return; // Завершаем обработку
              } else if (data.error) {
                // Получили ошибку
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn("Ошибка парсинга SSE данных:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Ошибка при генерации плана:", error);
      setError("Ошибка при генерации плана статьи");
    } finally {
      setLoading(false);
      setPlanGenerationLog("");
    }
  };

  // Функция для проверки SEO-качества через text.ru API
  const handleCheckSeoQuality = async () => {
    if (!finalArticle?.content) {
      setError("Нет текста для проверки SEO");
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
          text: finalArticle.content,
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header username={username} role={role} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8">
        {/* Заголовок модуля */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-primary mb-2">SEO Copywriter</h1>
          <p className="text-xl text-gray-600">Поиск данных для создания SEO-оптимизированного контента</p>
        </div>

        {/* Форма поиска */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Поиск исходных данных</h2>
          
          <div className="space-y-4">
            {/* Выбор региона поиска и количества результатов */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Регион поиска
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchRegion(225)}
                    className={`
                      relative px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 text-center
                      ${searchRegion === 225 
                        ? 'bg-primary text-white border-primary shadow-md transform scale-105' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-gray-50'
                      }
                      cursor-pointer
                    `}
                  >
                    <div className="truncate leading-tight">По всей России</div>
                    {searchRegion === 225 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSearchRegion(213)}
                    className={`
                      relative px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 text-center
                      ${searchRegion === 213 
                        ? 'bg-primary text-white border-primary shadow-md transform scale-105' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-gray-50'
                      }
                      cursor-pointer
                    `}
                  >
                    <div className="truncate leading-tight">По Москве</div>
                    {searchRegion === 213 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setSearchRegion(2)}
                    className={`
                      relative px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 text-center
                      ${searchRegion === 2 
                        ? 'bg-primary text-white border-primary shadow-md transform scale-105' 
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary hover:bg-gray-50'
                      }
                      cursor-pointer
                    `}
                  >
                    <div className="truncate leading-tight">По Санкт-Петербургу</div>
                    {searchRegion === 2 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Количество результатов
                </label>
                <select
                  value={searchResultsCount}
                  onChange={(e) => setSearchResultsCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={6}>Топ-6</option>
                  <option value={10}>Топ-10</option>
                  <option value={20}>Топ-20</option>
                </select>
              </div>
            </div>

            {/* Строка поиска */}
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Введите поисковый запрос (например: холодная высадка)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-primary text-white font-bold text-base rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Поиск..." : "Найти"}
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Очистить все данные проекта? Это действие нельзя отменить.')) {
                    clearLocalStorage();
                    setSearchQuery('');
                    setSearchResults([]);
                    setSelectedResults(new Set());
                    setParsedData([]);
                    setCleanedData([]);
                    setChunks([]);
                    setFinalArticle(null);
                    setArticlePlan(null);
                    setEditablePlan('');
                    setCurrentStep(1);
                    setHasChanges({
                      search: false,
                      parse: false,
                      clean: false,
                      chunk: false,
                      generate: false
                    });
                  }
                }}
                className="px-4 py-3 bg-red-500 text-white font-bold text-base rounded-lg hover:bg-red-600 transition-colors"
                title="Очистить все данные проекта"
              >
                🗑️ Очистить
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Прогресс-бар этапов с навигацией */}
        {currentStep > 1 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Прогресс обработки</h3>
            <div className="flex justify-between items-center mb-4">
              {steps.map((step) => {
                // Определяем, доступен ли этап для навигации
                const isAvailable = step.id <= currentStep;
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex flex-col items-center ${
                      isAvailable 
                        ? 'text-blue-600 cursor-pointer hover:text-blue-700' 
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (isAvailable) {
                        handleStepChange(step.id);
                      }
                    }}
                    title={isAvailable ? `Перейти к этапу: ${step.title}` : 'Этап недоступен'}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2 transition-all duration-200 ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-lg scale-110' 
                        : isCompleted
                        ? 'bg-green-100 border-2 border-green-600 text-green-600'
                        : isAvailable
                        ? 'bg-blue-100 border-2 border-blue-600 hover:bg-blue-200 hover:scale-105' 
                        : 'bg-gray-200 border-2 border-gray-300'
                    }`}>
                      {isCompleted ? '✅' : step.icon}
                    </div>
                    <span className="text-xs text-center font-medium">{step.title}</span>
                    {isCurrent && (
                      <div className="mt-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Текущий
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              ></div>
            </div>
            
            {/* Кнопки навигации */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={() => handleStepChange(Math.max(1, currentStep - 1))}
                  disabled={currentStep <= 1}
                  className="px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => handleStepChange(Math.min(steps.length, currentStep + 1))}
                  disabled={currentStep >= steps.length}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Вперед →
                </button>
              </div>
              
              <div className="text-sm text-gray-600">
                Этап {currentStep} из {steps.length}
              </div>
            </div>
          </div>
        )}

                {/* Панель управления изменениями */}
        {currentStep > 1 && (hasChanges.search || hasChanges.parse || hasChanges.clean || hasChanges.chunk) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-yellow-800 text-sm">⚠️</span>
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-800">Обнаружены несохраненные изменения</h4>
                  <p className="text-yellow-700 text-sm">Сохраните изменения перед переходом к следующему этапу</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveCurrentData}
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  💾 Сохранить
                </button>
                <button
                  onClick={restoreData}
                  className="px-4 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  🔄 Отменить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Основной контент - переключается между этапами */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            {/* Этап 1: Результаты поиска */}
            {currentStep === 1 && (
              <>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                Результаты поиска ({searchResults.length})
                {hasChanges.search && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    ⚠️ Изменения
                  </span>
                )}
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  {selectedResults.size === searchResults.length ? "Снять выделение" : "Выбрать все"}
                </button>
                <button
                  onClick={handleGenerateArticle}
                  disabled={selectedResults.size === 0}
                  className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Обработать результаты ({selectedResults.size})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 transition-all duration-200 h-[180px] cursor-pointer content-card ${
                    selectedResults.has(index)
                      ? "border-primary bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                  onClick={() => handleResultSelect(index)}
                >
                  <div className="flex items-start gap-3 h-full">
                    {/* Номер позиции */}
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white text-sm font-bold rounded-full flex items-center justify-center">
                      {index + 1}
                    </div>
                    
                    {/* Контент */}
                    <div className="flex-1 min-w-0 h-full flex flex-col">
                      {/* Заголовок - ровно 2 строки */}
                      <h4 className="text-base font-bold text-gray-800 mb-2 h-10 leading-5 overflow-hidden">
                        <div className="line-clamp-2">
                          {result.title}
                        </div>
                      </h4>
                      
                      {/* URL - ровно 1 строка */}
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs mb-2 block url-text h-4 leading-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        title={result.url}
                      >
                        {result.url}
                      </a>
                      
                      {/* Описание - ровно 2 строки */}
                      <p className="text-gray-600 text-sm leading-5 h-10 overflow-hidden flex-1">
                        <span className="line-clamp-2">
                          {result.snippet}
                        </span>
                      </p>
                      
                      {/* Toggle переключатель */}
                      <div className="mt-auto pt-2">
                        <div className="flex items-center">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={selectedResults.has(index)}
                              readOnly
                              className="sr-only"
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${
                              selectedResults.has(index) ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>
                            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                              selectedResults.has(index) ? 'transform translate-x-4' : ''
                            }`}></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-600 font-medium">
                            {selectedResults.has(index) ? 'Выбрано' : 'Выбрать'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedResults.size > 0 && (
              <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800 text-base">
                      Выбрано результатов: {selectedResults.size}
                    </h4>
                    <p className="text-gray-600 text-sm">
                      На основе выбранных результатов будет сгенерирована SEO-статья
                    </p>
                  </div>
                  <div className="flex gap-3">
                                            <button
                        onClick={handleGenerateArticle}
                        disabled={loading}
                        className="px-6 py-3 bg-primary text-white font-bold text-base rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Обработка...' : 'Обработать результаты'}
                      </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Этап 2: Результаты парсинга */}
            {currentStep === 2 && parsedData.length > 0 && (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    📄 Результаты парсинга
                    {hasChanges.parse && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        ⚠️ Изменения
                      </span>
                    )}
                  </h3>
                      <button
                     onClick={() => handleStepChange(2.5)}
                        disabled={loading}
                        className="px-6 py-3 bg-green-600 text-white font-bold text-base rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                     {loading ? 'Обработка...' : 'Настроить очистку'}
                      </button>
                </div>

                {/* Статистика парсинга */}
                {parsingStats && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{parsingStats.total_requested}</div>
                        <div className="text-sm text-gray-600">Запрошено URL</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{parsingStats.total_parsed}</div>
                        <div className="text-sm text-gray-600">Успешно обработано</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{parsingStats.total_failed}</div>
                        <div className="text-sm text-gray-600">Ошибок</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{parsingStats.success_rate.toFixed(1)}%</div>
                        <div className="text-sm text-gray-600">Процент успеха</div>
                      </div>
                    </div>
                    
                    {/* Прогресс-бар успешности */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${parsingStats.success_rate}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                                 {/* Список успешно обработанных статей */}
                 <div className="mb-6">
                   <h4 className="text-lg font-semibold text-gray-800 mb-3">
                     ✅ Успешно спарсенные статьи ({getFilteredArticles().length}/{parsedData.length})
                   </h4>
                   <div className="space-y-4">
                     {parsedData.map((article, index) => {
                       const isExcluded = excludedArticles.has(article.url);
                       return (
                         <div 
                           key={index} 
                           className={`border rounded-lg p-4 transition-all duration-200 content-card ${
                             isExcluded 
                               ? 'border-gray-300 bg-gray-100 opacity-60' 
                               : 'border-green-200 bg-green-50'
                           }`}
                         >
                           <div className="flex justify-between items-start mb-3">
                             <div className="flex-1">
                               <h5 className={`font-bold mb-2 break-words ${
                                 isExcluded ? 'text-gray-500' : 'text-gray-800'
                               }`}>
                                 {article.title}
                               </h5>
                               <p className={`text-sm mb-1 url-text ${
                                 isExcluded ? 'text-gray-400' : 'text-gray-600'
                               }`}>URL: {article.url}</p>
                               <p className={`text-sm ${
                                 isExcluded ? 'text-gray-400' : 'text-gray-600'
                               }`}>Слов: {article.word_count}</p>
                             </div>
                             <div className="flex gap-2">
                               <button
                                 onClick={() => handleToggleArticle(index)}
                                 className={`px-3 py-1 text-xs rounded transition-colors ${
                                   isExcluded
                                     ? 'bg-gray-500 text-white hover:bg-gray-600'
                                     : 'bg-green-600 text-white hover:bg-green-700'
                                 }`}
                               >
                                 {expandedArticles.has(index) ? 'Свернуть' : 'Развернуть'}
                               </button>
                               <button
                                 onClick={() => isExcluded ? handleRestoreArticle(index) : handleExcludeArticle(index)}
                                 className={`px-3 py-1 text-xs rounded transition-colors ${
                                   isExcluded
                                     ? 'bg-blue-600 text-white hover:bg-blue-700'
                                     : 'bg-red-600 text-white hover:bg-red-700'
                                 }`}
                               >
                                 {isExcluded ? 'Восстановить' : 'Исключить'}
                               </button>
                             </div>
                           </div>
                           
                           <div className={`text-sm bg-white p-3 rounded ${
                             isExcluded ? 'text-gray-400' : 'text-gray-600'
                           }`}>
                             {expandedArticles.has(index) ? (
                               <div className="whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                                 {article.content}
                               </div>
                             ) : (
                               <div className="max-h-20 overflow-y-auto break-words">
                                 {article.content.substring(0, 200)}...
                               </div>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>

                {/* Список неудачных URL */}
                {parsingStats && parsingStats.failed_urls.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                      ❌ Не удалось обработать ({parsingStats.failed_urls.length})
                    </h4>
                    <div className="space-y-3">
                      {parsingStats.failed_urls.map((failed, index) => (
                        <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-3 content-card">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 mb-1 url-text break-words">{failed.url}</p>
                              <p className="text-sm text-red-600 break-words">{failed.error}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                {failed.error_type === 'request_error' ? 'HTTP ошибка' :
                                 failed.error_type === 'parsing_error' ? 'Ошибка парсинга' :
                                 failed.error_type === 'content_too_short' ? 'Мало контента' : 'Ошибка'}
                              </span>
                              <button
                                onClick={() => toggleManualContent(failed.url)}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                {manualContentMode[failed.url] ? 'Отменить' : 'Добавить вручную'}
                              </button>
                            </div>
                          </div>
                          
                          {/* Поле для ручного ввода контента */}
                          {manualContentMode[failed.url] && (
                            <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Заголовок статьи
                                </label>
                                <input
                                  type="text"
                                  value={manualContentTitle[failed.url] || ''}
                                  onChange={(e) => setManualContentTitle(prev => ({
                                    ...prev,
                                    [failed.url]: e.target.value
                                  }))}
                                  placeholder="Введите заголовок статьи"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 break-words"
                                />
                              </div>
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Содержание статьи
                                </label>
                                <textarea
                                  value={manualContent[failed.url] || ''}
                                  onChange={(e) => setManualContent(prev => ({
                                    ...prev,
                                    [failed.url]: e.target.value
                                  }))}
                                  placeholder="Вставьте или введите содержание статьи с этой страницы..."
                                  rows={8}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none break-words"
                                />
                                <div className="mt-1 text-xs text-gray-500">
                                  Слов: {(manualContent[failed.url] || '').split(/\s+/).filter(word => word.length > 0).length}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveManualContent(failed.url)}
                                  disabled={!manualContent[failed.url]?.trim()}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                  💾 Сохранить
                                </button>
                                <button
                                  onClick={() => cancelManualContent(failed.url)}
                                  className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                                >
                                  ❌ Отменить
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

                         {/* Этап 2.5: Настройки очистки */}
             {currentStep === 2.5 && parsedData.length > 0 && (
               <>
                 <div className="flex justify-between items-center mb-5">
                   <h3 className="text-xl font-bold text-gray-800">⚙️ Настройки очистки контента</h3>
                      <button
                     onClick={handleClean}
                        disabled={loading}
                     className="px-6 py-3 bg-yellow-600 text-white font-bold text-base rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                     {loading ? 'Очистка...' : 'Применить очистку'}
                      </button>
                  </div>
                 
                                   {/* Режим очистки */}
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-bold text-gray-800 mb-3">Режим очистки</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="manual"
                          name="cleaningMode"
                          value="manual"
                          checked={cleaningSettings.mode === 'manual'}
                          onChange={(e) => setCleaningSettings({
                            ...cleaningSettings,
                            mode: e.target.value
                          })}
                          className="mr-2"
                        />
                        <label htmlFor="manual" className="font-medium text-gray-700">
                          Ручное редактирование
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="automatic"
                          name="cleaningMode"
                          value="automatic"
                          checked={cleaningSettings.mode === 'automatic'}
                          onChange={(e) => setCleaningSettings({
                            ...cleaningSettings,
                            mode: e.target.value
                          })}
                          className="mr-2"
                        />
                        <label htmlFor="automatic" className="font-medium text-gray-700">
                          Автоматическая очистка
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Детальные настройки (только для автоматического режима) */}
                  {cleaningSettings.mode === 'automatic' && (
                   <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                     <h4 className="font-bold text-gray-800 mb-3">Детальные настройки</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="flex items-center">
                         <input
                           type="checkbox"
                           id="removeTechnical"
                           checked={cleaningSettings.removeTechnicalBlocks}
                           onChange={(e) => updateCleaningSettings({
                             removeTechnicalBlocks: e.target.checked
                           })}
                           className="mr-2"
                         />
                         <label htmlFor="removeTechnical" className="text-gray-700">
                           Удалять технические блоки
                         </label>
                       </div>
                       <div className="flex items-center">
                         <input
                           type="checkbox"
                           id="removeDuplicates"
                           checked={cleaningSettings.removeDuplicates}
                           onChange={(e) => updateCleaningSettings({
                             removeDuplicates: e.target.checked
                           })}
                           className="mr-2"
                         />
                         <label htmlFor="removeDuplicates" className="text-gray-700">
                           Удалять дубликаты
                         </label>
                       </div>
                       <div className="flex items-center">
                         <input
                           type="checkbox"
                           id="filterRelevance"
                           checked={cleaningSettings.filterRelevance}
                           onChange={(e) => updateCleaningSettings({
                             filterRelevance: e.target.checked
                           })}
                           className="mr-2"
                         />
                         <label htmlFor="filterRelevance" className="text-gray-700">
                           Фильтровать по релевантности
                         </label>
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Мин. длина параграфа
                         </label>
                         <input
                           type="number"
                           value={cleaningSettings.minParagraphLength}
                           onChange={(e) => updateCleaningSettings({
                             minParagraphLength: parseInt(e.target.value)
                           })}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Макс. длина параграфа
                         </label>
                         <input
                           type="number"
                           value={cleaningSettings.maxParagraphLength}
                           onChange={(e) => updateCleaningSettings({
                             maxParagraphLength: parseInt(e.target.value)
                           })}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Порог релевантности
                         </label>
                         <input
                           type="number"
                           step="0.1"
                           min="0"
                           max="1"
                           value={cleaningSettings.relevanceThreshold}
                           onChange={(e) => updateCleaningSettings({
                             relevanceThreshold: parseFloat(e.target.value)
                           })}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                         />
                       </div>
                     </div>
          </div>
        )}

                                   {/* Предварительный просмотр */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                      📋 Предварительный просмотр ({getFilteredArticles().length}/{parsedData.length} статей)
                    </h4>
                    

                    
                    {getFilteredArticles().length > 0 && (
            <div className="space-y-4">
              {getFilteredArticles().map((article) => {
                // Находим индекс статьи в исходном массиве parsedData
                const originalIndex = parsedData.findIndex(a => a.url === article.url);
                return (
                <div key={originalIndex} className="border border-gray-200 rounded-lg p-4 content-card">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h5 className="font-bold text-gray-800 mb-2 break-words">{article.title}</h5>
                                <p className="text-sm text-gray-600 mb-1 url-text">URL: {article.url}</p>
                                <p className="text-sm text-gray-600">Слов: {originalContent[originalIndex] ? 
                                  originalContent[originalIndex].split(/\s+/).filter(word => word.length > 0).length : 
                                  article.word_count}</p>
                  </div>
                              <button
                                onClick={() => handleToggleArticle(originalIndex)}
                                className="ml-4 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                {expandedArticles.has(originalIndex) ? 'Свернуть' : 'Развернуть'}
                              </button>
                            </div>
                            
                                                         {cleaningSettings.mode === 'manual' && expandedArticles.has(originalIndex) ? (
                               // Редактируемое поле для ручного режима
                               <div className="text-sm text-gray-600 bg-white p-3 rounded">
                                 <textarea
                                   value={editableContent[originalIndex] || article.content}
                                   onChange={(e) => setEditableContent({
                                     ...editableContent,
                                     [originalIndex]: e.target.value
                                   })}
                                   className="w-full h-96 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="Редактируйте текст здесь..."
                                 />
                                 <div className="mt-2 flex justify-between items-center">
                                   <span className="text-xs text-gray-500">
                                     Слов: {editableContent[originalIndex] ? editableContent[originalIndex].split(/\s+/).filter(word => word.length > 0).length : article.word_count}
                                   </span>
                                   <div className="flex gap-2">
                                     <button
                                       onClick={() => {
                                         setOriginalContent({
                                           ...originalContent,
                                           [originalIndex]: editableContent[originalIndex] || article.content
                                         });
                                       }}
                                       className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                     >
                                       Сохранить
                                     </button>
                                     <button
                                       onClick={() => setEditableContent({
                                         ...editableContent,
                                         [originalIndex]: originalContent[originalIndex] || article.content
                                       })}
                                       className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                     >
                                       Сбросить
                                     </button>
                                   </div>
                                 </div>
                               </div>
                            ) : (
                              // Обычный просмотр для автоматического режима или свернутого состояния
                              <div className="text-sm text-gray-600 bg-white p-3 rounded">
                                {expandedArticles.has(originalIndex) ? (
                                  <div className="whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                                    {editableContent[originalIndex] || article.content}
                                  </div>
                                ) : (
                                  <div className="max-h-20 overflow-y-auto break-words">
                                    {(editableContent[originalIndex] || article.content).substring(0, 200)}...
                                  </div>
                                )}
                              </div>
                            )}
                </div>
              );
              })}
            </div>
                    )}
          </div>
               </>
             )}

             {/* Этап 3: Результаты очистки */}
             {currentStep === 3 && cleanedData.length > 0 && (
               <>
                 <div className="flex justify-between items-center mb-5">
                   <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                     🧹 Результаты очистки ({cleanedData.filter(article => !excludedArticles.has(article.url)).length}/{cleanedData.length})
                     {hasChanges.clean && (
                       <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                         ⚠️ Изменения
                       </span>
                     )}
                   </h3>
                   <button
                     onClick={handleChunk}
                     disabled={loading}
                     className="px-6 py-3 bg-yellow-600 text-white font-bold text-base rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                   >
                     {loading ? 'Разделение...' : 'Создать чанки'}
                   </button>
                 </div>
                 

                 
            <div className="space-y-4">
              {cleanedData.filter(article => !excludedArticles.has(article.url)).map((article, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 content-card">
                       <div className="flex justify-between items-start mb-3">
                         <div className="flex-1">
                  <h4 className="font-bold text-gray-800 mb-2 break-words">{article.title}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Исходный текст:</p>
                      <p className="text-sm text-gray-600">Слов: {article.word_count}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Очищенный текст:</p>
                      <p className="text-sm text-gray-600">Слов: {article.cleaned_word_count}</p>
                      <p className="text-sm text-green-600">
                        Сокращение: {Math.round((1 - article.cleaned_word_count / article.word_count) * 100)}%
                      </p>
                    </div>
                  </div>
                         </div>
                         <button
                           onClick={() => handleToggleArticle(index)}
                           className="ml-4 px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                         >
                           {expandedArticles.has(index) ? 'Свернуть' : 'Развернуть'}
                         </button>
                       </div>
                       <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                         {expandedArticles.has(index) ? (
                           <div className="whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                             {article.cleaned_content}
                           </div>
                         ) : (
                           <div className="max-h-20 overflow-y-auto break-words">
                    {article.cleaned_content.substring(0, 200)}...
                           </div>
                         )}
                  </div>
                </div>
              ))}
            </div>
               </>
             )}

                         {/* Этап 4: Результаты чанкинга */}
             {currentStep === 4 && chunks.length > 0 && (
               <>
                 <div className="flex justify-between items-center mb-5">
                   <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                     🔪 Результаты разделения на чанки
                     {hasChanges.chunk && (
                       <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                         ⚠️ Изменения
                       </span>
                     )}
                   </h3>
                   <button
                     onClick={handleGeneratePlan}
                     disabled={loading}
                     className="px-6 py-3 bg-purple-600 text-white font-bold text-base rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                   >
                     {loading ? 'Генерация плана...' : 'Сгенерировать план статьи'}
                   </button>
                 </div>
                 
                 {/* Строка для отображения логов генерации плана */}
                 {loading && planGenerationLog && (
                   <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                     <div className="text-sm text-blue-800 truncate" title={planGenerationLog}>
                       {planGenerationLog}
                     </div>
                   </div>
                 )}
                 
                 <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                   <p className="text-sm text-gray-600 mb-2">Общее количество чанков: {chunks.length}</p>
                   <div className="flex gap-4 text-xs">
                     <span className="text-red-600">Высокий приоритет: {Object.values(chunkPriorities).filter(p => p === 'high').length}</span>
                     <span className="text-blue-600">Средний приоритет: {Object.values(chunkPriorities).filter(p => p === 'medium').length}</span>
                     <span className="text-yellow-600">Низкий приоритет: {Object.values(chunkPriorities).filter(p => p === 'low').length}</span>
                     <span className="text-gray-600">Исключено: {excludedChunks.size}</span>
                   </div>
                 </div>
                 <div className="space-y-2 mb-6">
              {chunks.map((chunk, index) => (
                     <div key={index} className={`border rounded p-3 content-card ${isChunkExcluded(index) ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Чанк {index + 1}</span>
                    <span className="text-xs text-gray-500">Слов: {chunk.word_count}</span>
                           {getChunkPriority(index) === 'high' && (
                             <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Высокий приоритет</span>
                           )}
                           {getChunkPriority(index) === 'low' && (
                             <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Низкий приоритет</span>
                           )}
                  </div>
                         <div className="flex items-center gap-2">
                           {/* Кнопки приоритета */}
                           <div className="flex gap-1">
                             <button
                               onClick={() => handleChunkPriority(index, 'low')}
                               className={`px-2 py-1 text-xs rounded transition-colors ${
                                 getChunkPriority(index) === 'low' 
                                   ? 'bg-yellow-600 text-white' 
                                   : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'
                               }`}
                               title="Низкий приоритет"
                             >
                               Низкий
                             </button>
                             <button
                               onClick={() => handleChunkPriority(index, 'medium')}
                               className={`px-2 py-1 text-xs rounded transition-colors ${
                                 getChunkPriority(index) === 'medium' 
                                   ? 'bg-blue-600 text-white' 
                                   : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                               }`}
                               title="Средний приоритет"
                             >
                               Средний
                             </button>
                             <button
                               onClick={() => handleChunkPriority(index, 'high')}
                               className={`px-2 py-1 text-xs rounded transition-colors ${
                                 getChunkPriority(index) === 'high' 
                                   ? 'bg-red-600 text-white' 
                                   : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                               }`}
                               title="Высокий приоритет"
                             >
                               Высокий
                             </button>
                           </div>
                           
                           {/* Кнопка исключения */}
                           <button
                             onClick={() => handleToggleChunkExclusion(index)}
                             className={`px-2 py-1 text-xs rounded transition-colors ${
                               isChunkExcluded(index)
                                 ? 'bg-green-600 text-white hover:bg-green-700'
                                 : 'bg-red-600 text-white hover:bg-red-700'
                             }`}
                             title={isChunkExcluded(index) ? 'Включить чанк' : 'Исключить чанк'}
                           >
                             {isChunkExcluded(index) ? 'Включить' : 'Исключить'}
                           </button>
                           
                           {/* Кнопка развернуть/свернуть */}
                           <button
                             onClick={() => handleToggleArticle(index)}
                             className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                           >
                             {expandedArticles.has(index) ? 'Свернуть' : 'Развернуть'}
                           </button>
                         </div>
                       </div>
                       <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                         {expandedArticles.has(index) ? (
                           <div className="whitespace-pre-wrap break-words">
                             {chunk.text}
                           </div>
                         ) : (
                           <div className="max-h-16 overflow-hidden break-words">
                    {chunk.text.substring(0, 150)}...
                           </div>
                         )}
                  </div>
                  {chunk.keywords && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {chunk.keywords.slice(0, 5).map((keywordObj, kidx) => (
                        <span key={kidx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {typeof keywordObj === 'string' ? keywordObj : keywordObj.keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
                 

               </>
             )}

                             {/* Этап 5: Настройки генерации статьи */}
                           {currentStep === 5 && chunks.length > 0 && (
               <>
                 <div className="flex justify-between items-center mb-5">
                   <h3 className="text-xl font-bold text-gray-800">⚙️ Настройки генерации статьи</h3>
                   <button
                     onClick={handleGenerate}
                     disabled={loading}
                     className="px-6 py-3 bg-purple-600 text-white font-bold text-base rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                   >
                     {loading ? 'Генерация статьи...' : 'Генерировать статью'}
                   </button>
                 </div>
                 
                 {/* Строка для отображения логов генерации статьи */}
                 {loading && articleGenerationLog && (
                   <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                     <div className="text-sm text-purple-800 truncate" title={articleGenerationLog}>
                       {articleGenerationLog}
                     </div>
                   </div>
                 )}
                 
                 {/* Редактируемый план статьи */}
                 {editablePlan && (
                   <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                     <h4 className="text-lg font-semibold text-green-800 mb-3">📋 План статьи (редактируемый)</h4>
                     <div className="bg-white p-4 rounded border border-green-200">
                       <textarea
                         value={editablePlan}
                         onChange={(e) => setEditablePlan(e.target.value)}
                         className="w-full h-64 p-3 border border-gray-300 rounded-md text-sm leading-relaxed resize-none"
                         placeholder="Редактируйте план статьи здесь..."
                       />
                     </div>
                   </div>
                 )}
                 
                 {/* Настройки генерации статьи */}
                 <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                   <h4 className="text-lg font-semibold text-blue-800 mb-3">⚙️ Настройки генерации статьи</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-blue-700 mb-1">Температура</label>
                       <input
                         type="number"
                         min="0"
                         max="2"
                         step="0.1"
                         value={modelSettings.temperature}
                         onChange={(e) => setModelSettings({...modelSettings, temperature: parseFloat(e.target.value)})}
                         className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm bg-white"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-blue-700 mb-1">Длина статьи (знаков)</label>
                       <input
                         type="number"
                         min="1000"
                         max="20000"
                         step="500"
                         value={settings.targetLengthChars}
                         onChange={(e) => setSettings({...settings, targetLengthChars: parseInt(e.target.value)})}
                         className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm bg-white"
                       />
                     </div>
                   </div>
                   
                   {/* Системный промпт */}
                   <div className="mt-4">
                     <label className="block text-sm font-medium text-blue-700 mb-1">Системный промпт</label>
                     <textarea
                       value={modelSettings.system_prompt}
                       onChange={(e) => setModelSettings({...modelSettings, system_prompt: e.target.value})}
                       rows="3"
                       className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm bg-white resize-none"
                       placeholder="Системный промпт для модели..."
                     />
                   </div>
                 </div>

                 {/* SEO-оптимизация */}
                 <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                   <h4 className="text-lg font-semibold text-green-800 mb-3">🎯 SEO-оптимизация</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-green-700 mb-1">Дополнительные ключевые слова</label>
                       <input
                         type="text"
                         value={seoSettings.additionalKeywords}
                         onChange={(e) => updateSeoSettings({additionalKeywords: e.target.value})}
                         className="w-full px-3 py-2 border border-green-300 rounded-md text-sm bg-white"
                         placeholder="Введите через запятую"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-green-700 mb-1">LSI-ключевые слова</label>
                       <input
                         type="text"
                         value={seoSettings.lsiKeywords}
                         onChange={(e) => updateSeoSettings({lsiKeywords: e.target.value})}
                         className="w-full px-3 py-2 border border-green-300 rounded-md text-sm bg-white"
                         placeholder="Семантически связанные слова"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-green-700 mb-1">Целевые фразы</label>
                       <input
                         type="text"
                         value={seoSettings.targetPhrases}
                         onChange={(e) => updateSeoSettings({targetPhrases: e.target.value})}
                         className="w-full px-3 py-2 border border-green-300 rounded-md text-sm bg-white"
                         placeholder="Длинные ключевые фразы (3-5 слов)"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-green-700 mb-1">
                         Плотность ключевых слов: {seoSettings.keywordDensity}%
                       </label>
                       <input
                         type="range"
                         min="1"
                         max="5"
                         step="0.5"
                         value={seoSettings.keywordDensity}
                         onChange={(e) => updateSeoSettings({keywordDensity: parseFloat(e.target.value)})}
                         className="w-full"
                       />
                     </div>
                   </div>
                 </div>

                 {/* Продвинутые настройки */}
                 <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                   <h4 className="text-lg font-semibold text-purple-800 mb-3">⚙️ Продвинутые настройки</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-purple-700 mb-1">Стиль написания</label>
                       <select
                         value={seoSettings.writingStyle}
                         onChange={(e) => updateSeoSettings({writingStyle: e.target.value})}
                         className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm bg-white"
                       >
                         <option value="technical">Технический</option>
                         <option value="simple">Простой</option>
                         <option value="marketing">Маркетинговый</option>
                         <option value="academic">Академический</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-purple-700 mb-1">Тип контента</label>
                       <select
                         value={seoSettings.contentType}
                         onChange={(e) => updateSeoSettings({contentType: e.target.value})}
                         className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm bg-white"
                       >
                         <option value="educational">Обучающий</option>
                         <option value="review">Обзорный</option>
                         <option value="analytical">Аналитический</option>
                         <option value="practical">Практический</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-purple-700 mb-1">Целевая аудитория</label>
                       <select
                         value={seoSettings.targetAudience}
                         onChange={(e) => updateSeoSettings({targetAudience: e.target.value})}
                         className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm bg-white"
                       >
                         <option value="specialists">Специалисты</option>
                         <option value="beginners">Новички</option>
                         <option value="managers">Менеджеры</option>
                         <option value="general">Все</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-purple-700 mb-1">Тип заголовков</label>
                       <select
                         value={seoSettings.headingType}
                         onChange={(e) => updateSeoSettings({headingType: e.target.value})}
                         className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm bg-white"
                       >
                         <option value="h2">H2</option>
                         <option value="h3">H3</option>
                         <option value="numbered">Нумерованные</option>
                         <option value="bulleted">Маркированные</option>
                       </select>
                     </div>
                   </div>
                   
                   {/* SEO-промпт */}
                   <div className="mt-4">
                     <label className="block text-sm font-medium text-purple-700 mb-1">SEO-промпт</label>
                     <textarea
                       value={seoSettings.seoPrompt}
                       onChange={(e) => updateSeoSettings({seoPrompt: e.target.value})}
                       rows="2"
                       className="w-full px-3 py-2 border border-purple-300 rounded-md text-sm bg-white resize-none"
                       placeholder="Дополнительные инструкции для SEO-оптимизации..."
                     />
                   </div>
                 </div>

                 {/* Структурные настройки */}
                 <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                   <h4 className="text-lg font-semibold text-orange-800 mb-3">📝 Структурные настройки</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-orange-700 mb-1">Длина абзацев</label>
                       <select
                         value={seoSettings.paragraphLength}
                         onChange={(e) => updateSeoSettings({paragraphLength: e.target.value})}
                         className="w-full px-3 py-2 border border-orange-300 rounded-md text-sm bg-white"
                       >
                         <option value="short">Короткие</option>
                         <option value="medium">Средние</option>
                         <option value="long">Длинные</option>
                       </select>
                     </div>
                     <div className="flex items-center space-x-4">
                       <label className="flex items-center">
                         <input
                           type="checkbox"
                           checked={seoSettings.useLists}
                           onChange={(e) => updateSeoSettings({useLists: e.target.checked})}
                           className="mr-2"
                         />
                         <span className="text-sm font-medium text-orange-700">Использовать списки</span>
                       </label>
                       <label className="flex items-center">
                         <input
                           type="checkbox"
                           checked={seoSettings.internalLinks}
                           onChange={(e) => updateSeoSettings({internalLinks: e.target.checked})}
                           className="mr-2"
                         />
                         <span className="text-sm font-medium text-orange-700">Внутренние ссылки</span>
                       </label>
                     </div>
                   </div>
                 </div>
               </>
             )}

             
          </div>
        )}

        {/* Финальная статья */}
        {currentStep === 6 && finalArticle && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🤖 Сгенерированная статья</h3>
            
            {/* План статьи */}
            {finalArticle.article_plan && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-800 mb-3">📋 План статьи</h4>
                <div className="space-y-3">
                  {finalArticle.article_plan.sections.map((section, index) => (
                    <div key={index} className="border border-blue-200 rounded p-3 bg-white">
                      <h5 className="font-semibold text-blue-700 mb-1">{section.title}</h5>
                      <p className="text-sm text-gray-600 mb-2">{section.description}</p>
                      {section.chunks && section.chunks.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Использованные чанки: {section.chunks.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  Всего разделов: {finalArticle.article_plan.total_sections}
                </div>
              </div>
            )}
            
            {/* SEO метаданные с возможностью редактирования */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2">H1 заголовок</h4>
                <textarea
                  value={finalArticle.h1 || ''}
                  onChange={(e) => setFinalArticle(prev => ({ ...prev, h1: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-700 text-sm"
                  rows="2"
                  placeholder="Введите H1 заголовок"
                />
                <div className={`text-xs mt-1 ${(finalArticle.h1?.length || 0) > 255 ? 'text-red-500' : 'text-gray-500'}`}>
                  {finalArticle.h1?.length || 0}/255 символов
                  {(finalArticle.h1?.length || 0) > 255 && ' ⚠️ Превышено ограничение'}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2">Title</h4>
                <textarea
                  value={finalArticle.title || ''}
                  onChange={(e) => setFinalArticle(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-700 text-sm"
                  rows="2"
                  placeholder="Введите Title"
                />
                <div className={`text-xs mt-1 ${(finalArticle.title?.length || 0) > 255 ? 'text-red-500' : 'text-gray-500'}`}>
                  {finalArticle.title?.length || 0}/255 символов
                  {(finalArticle.title?.length || 0) > 255 && ' ⚠️ Превышено ограничение'}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2">Meta Description</h4>
                <textarea
                  value={finalArticle.meta_description || ''}
                  onChange={(e) => setFinalArticle(prev => ({ ...prev, meta_description: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-700 text-sm"
                  rows="3"
                  placeholder="Введите Meta Description"
                />
                <div className={`text-xs mt-1 ${(finalArticle.meta_description?.length || 0) > 255 ? 'text-red-500' : 'text-gray-500'}`}>
                  {finalArticle.meta_description?.length || 0}/255 символов
                  {(finalArticle.meta_description?.length || 0) > 255 && ' ⚠️ Превышено ограничение'}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-800 mb-2">Keywords</h4>
                <textarea
                  value={finalArticle.keywords || ''}
                  onChange={(e) => setFinalArticle(prev => ({ ...prev, keywords: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded text-gray-700 text-sm"
                  rows="3"
                  placeholder="Введите Keywords"
                />
                <div className={`text-xs mt-1 ${(finalArticle.keywords?.length || 0) > 255 ? 'text-red-500' : 'text-gray-500'}`}>
                  {finalArticle.keywords?.length || 0}/255 символов
                  {(finalArticle.keywords?.length || 0) > 255 && ' ⚠️ Превышено ограничение'}
                </div>
              </div>
            </div>

            {/* Основной контент с возможностью редактирования */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-gray-800 mb-2">Основной текст статьи</h4>
              <textarea
                value={finalArticle.content || ''}
                onChange={(e) => setFinalArticle(prev => ({ ...prev, content: e.target.value }))}
                className="w-full p-4 border border-gray-300 rounded text-gray-700 text-sm bg-gray-50"
                rows="15"
                placeholder="Введите основной текст статьи"
              />
              <div className="text-xs text-gray-500 mt-1">
                {finalArticle.content?.length || 0} символов
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(finalArticle.content)}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                📋 Копировать текст
              </button>
              <button
                onClick={handleCheckSeoQuality}
                disabled={isCheckingSeo}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCheckingSeo ? '⏳ Проверяем...' : '🔍 Проверить SEO-параметры текста'}
              </button>
              <button
                onClick={() => {
                  handleStepChange(1);
                  setSearchQuery("");
                  setSearchResults([]);
                  setSelectedResults(new Set());
                  setParsedData([]);
                   setParsingStats(null);
                  setCleanedData([]);
                  setChunks([]);
                  setFinalArticle(null);
                   setExpandedArticles(new Set());
                   setChunkPriorities({});
                   setExcludedChunks(new Set());
                   setArticlePlan(null);
                   setSeoQualityData(null);
                   setShowSeoBlock(false);
                   setSeoCheckError(null);
                   setCleaningSettings({
                      mode: 'automatic',
                      removeTechnicalBlocks: true,
                      removeDuplicates: true,
                      filterRelevance: true,
                      minParagraphLength: 50,
                      maxParagraphLength: 2000,
                      relevanceThreshold: 0.7
                    });
                    setEditableContent({});
                                       setOriginalContent({});
                   setModelSettings({
                     system_prompt: "Ты — профессиональный копирайтер-рерайтер. Твоя задача — переписать предоставленный текст, сохранив его смысл и основную информацию, но изменив формулировки, структуру предложений и стиль изложения.\n\nТребования:\n- Сохрани все ключевые факты и данные\n- Измени структуру предложений и абзацев\n- Используй синонимы и альтернативные формулировки\n- Сделай текст уникальным, но читаемым\n- Сохрани профессиональный тон\n- Не добавляй новую информацию, которой нет в оригинале",
                     user_prompt: "Перепиши следующий текст, сделав его уникальным, но сохранив всю важную информацию и смысл:",
                     temperature: 0.7,
                     max_tokens: 2000,
                     model: "gpt-4o",
                     // Параметры для генерации плана статьи
                     plan_temperature: 0.3,
                     plan_max_tokens: 1000,
                     plan_system_prompt: "Ты — эксперт по структурированию контента. Твоя задача — создать подробный план статьи на основе предоставленных текстовых фрагментов.\n\nТребования к плану:\n- Логичная структура с заголовками разделов\n- Краткое описание содержания каждого раздела\n- Указание используемых чанков для каждого раздела\n- Учет приоритетности чанков (high/medium/low)\n- Соответствие теме и стилю статьи",
                     plan_user_prompt: "На основе следующих текстовых фрагментов (чанков) создай подробный план статьи. Учитывай, что некоторые чанки более приоритетны (они помечены как 'high').\n\nПлан должен включать:\n— Заголовки разделов и подразделов.\n— Краткое описание содержания каждого раздела (1-2 предложения).\n— Указание, какие чанки относятся к каждому разделу (их номера).\n\nДанные:\n{chunks_with_priority}\nТема статьи: {theme}.\nСтиль: {style}.\n\nОтветь в формате JSON:\n{\n  \"sections\": [\n    {\n      \"title\": \"Заголовок раздела\",\n      \"description\": \"Описание раздела\",\n      \"chunks\": [1, 3, 5]\n    }\n  ],\n  \"total_sections\": 3\n}"
                   });
                   setChunkPriorities({});
                   setExcludedChunks(new Set());
                   setArticlePlan(null);
                  setError("");
                }}
                className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                🔄 Новый поиск
              </button>
            </div>

            {/* Блок SEO-проверки */}
            {showSeoBlock && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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

            {/* Тематики для сохранения в базе данных */}
            <div className="mt-6">
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
              
              {/* Кнопка сохранения в базу данных */}
              <div className="mt-4">
                <button
                  className="px-8 py-3 rounded-xl bg-yellow-400 text-white font-bold text-lg hover:bg-yellow-500 transition-all duration-200 shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleSaveToDatabase}
                  disabled={savingToDb}
                >
                  {savingToDb ? '💾 Сохранение...' : '💾 Сохранить в базу'}
                </button>
                {((finalArticle.title?.length || 0) > 255 || 
                  (finalArticle.h1?.length || 0) > 255 || 
                  (finalArticle.meta_description?.length || 0) > 255 || 
                  (finalArticle.keywords?.length || 0) > 255) && (
                  <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    ⚠️ Некоторые поля превышают 255 символов и будут обрезаны при сохранении
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Пустое состояние */}
        {!loading && searchResults.length === 0 && !error && searchQuery && (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-2">Результаты не найдены</h3>
            <p className="text-gray-400 text-sm">Попробуйте изменить поисковый запрос</p>
          </div>
        )}
        </div>
      </div>
      
      {/* Toast-уведомления */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default SeoSearchPage;