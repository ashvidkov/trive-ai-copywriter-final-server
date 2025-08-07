"""
Сервис для поиска через Yandex Search API
"""

import requests
import base64
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from typing import List, Dict, Optional, Tuple
from yandex_auth import YandexAuthService


class SearchResult:
    def __init__(self, title: str, url: str, snippet: str):
        self.title = title
        self.url = url
        self.snippet = snippet
        
    def to_dict(self) -> Dict:
        return {
            "title": self.title,
            "url": self.url,
            "snippet": self.snippet
        }


class YandexSearchService:
    def __init__(self):
        self.auth_service = YandexAuthService()
    
    def _extract_title_description(self, url: str) -> Tuple[str, str]:
        """Извлечь title и description напрямую с сайта"""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, "html.parser")
            
            title_tag = soup.find("title")
            title = title_tag.text.strip() if title_tag else "Заголовок не получен, смотрите на странице"
            
            description_tag = soup.find("meta", attrs={"name": "description"})
            description = description_tag["content"].strip() if description_tag and description_tag.get("content") else "Описание не получено, смотрите на странице"
            
            return title, description
            
        except Exception as e:
            return "Заголовок не получен, смотрите на странице", "Описание не получено, смотрите на странице"
    
    def search(self, query: str, page_size: int = 10, region: int = 225) -> List[SearchResult]:
        """Выполнить поиск через Yandex Search API с поддержкой пагинации"""
        print(f"🔍 Поиск: '{query}' | Регион: {region} | Лимит: {page_size}")
        iam_token = self.auth_service.get_iam_token()
        
        all_results = []
        max_per_page = 10  # Yandex API ограничивает до 10 результатов на страницу
        
        # Вычисляем количество запросов для получения всех результатов
        total_requests = (page_size + max_per_page - 1) // max_per_page  # Округление вверх
        
        for page_num in range(total_requests):
            # Вычисляем сколько результатов запросить на этой странице
            remaining_results = page_size - len(all_results)
            current_page_size = min(max_per_page, remaining_results)
            
            if current_page_size <= 0:
                break
                
            print(f"📄 Запрос страницы {page_num + 1}, размер: {current_page_size}")
            
            search_query = {
                "query": {
                    "searchType": 1,
                    "queryText": query,
                    "lr": region  # Параметр региона для поиска
                },
                "pageSize": current_page_size,
                "responseFormat": 0  # XML
            }
            
            # Добавляем параметр page если это не первая страница
            if page_num > 0:
                search_query["page"] = page_num
        
            headers = {
                "Authorization": f"Bearer {iam_token}",
                "Content-Type": "application/json"
            }
            
            # Отправляем поисковый запрос
            response = requests.post(
                "https://searchapi.api.cloud.yandex.net/v2/web/searchAsync",
                headers=headers,
                json=search_query
            )
            
            if response.status_code != 200:
                print(f"❌ Ошибка запроса страницы {page_num + 1}: {response.status_code}")
                break
            
            operation_id = response.json()["id"]
            
            # Ждём результат операции
            import time
            time.sleep(2)
            
            result = requests.get(
                f"https://operation.api.cloud.yandex.net/operations/{operation_id}",
                headers={"Authorization": f"Bearer {iam_token}"}
            )
            
            if result.status_code != 200:
                print(f"❌ Ошибка получения результата страницы {page_num + 1}: {result.status_code}")
                break
            
            try:
                raw_base64 = result.json()["response"]["rawData"]
                decoded_xml = base64.b64decode(raw_base64).decode("utf-8")
                root = ET.fromstring(decoded_xml)
                
                page_results = []
                
                for doc in root.findall('.//group/doc'):
                    title = doc.findtext('title') or doc.findtext('headline') or ""
                    url = doc.findtext('url') or "Без URL"
                    snippet = doc.findtext('passages/passage') or doc.findtext('headline') or ""
                    
                    # Если title или snippet плохие — парсим вручную с сайта
                    if len(title.strip()) < 10 or len(snippet.strip()) < 40:
                        fetched_title, fetched_desc = self._extract_title_description(url)
                        if len(title.strip()) < 10:
                            title = fetched_title
                        if len(snippet.strip()) < 40:
                            snippet = fetched_desc
                    
                    # Итоговая защита
                    title = title.strip() or "Заголовок не найден, смотрите на странице"
                    snippet = snippet.strip() or "Описание не найдено, смотрите на странице"
                    
                    page_results.append(SearchResult(title, url, snippet))
                
                all_results.extend(page_results)
                print(f"✅ Страница {page_num + 1}: получено {len(page_results)} результатов")
                
                # Если получили меньше результатов чем ожидали, значит это последняя страница
                if len(page_results) < current_page_size:
                    print(f"📄 Достигнут конец результатов на странице {page_num + 1}")
                    break
                    
            except Exception as e:
                print(f"❌ Ошибка разбора XML страницы {page_num + 1}: {str(e)}")
                break
        
        print(f"📊 Итого получено: {len(all_results)} результатов")
        return all_results[:page_size]  # Ограничиваем точно до запрошенного количества