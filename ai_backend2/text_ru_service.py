import requests
import json
import time
from typing import Dict, Optional, Any
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TextRuService:
    """
    Сервис для работы с API text.ru
    Проверка уникальности, SEO-анализа и правописания текстов
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.text.ru/post"
        self.account_url = "https://api.text.ru/account"
    
    def add_text_for_check(self, text: str) -> Optional[str]:
        """
        Добавляет текст на проверку уникальности
        
        Args:
            text: Текст для проверки (100-150000 символов)
            
        Returns:
            str: UID текста для последующего получения результатов
            None: В случае ошибки
        """
        try:
            payload = {
                'userkey': self.api_key,
                'text': text,
                'jsonvisible': 'detail'  # Получаем детальную информацию
            }
            
            logger.info(f"Отправляем текст на проверку: {len(text)} символов")
            
            response = requests.post(
                self.base_url,
                data=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Текст добавлен на проверку. UID: {result['text_uid']}")
                if 'text_uid' in result:
                    logger.info(f"Текст добавлен на проверку. UID: {result['text_uid']}")
                    return result['text_uid']
                elif 'error_code' in result:
                    logger.error(f"Ошибка API text.ru: {result['error_code']} - {result.get('error_desc', '')}")
                    return None
            else:
                logger.error(f"HTTP ошибка: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Ошибка при добавлении текста: {str(e)}")
            return None

    def add_text_for_seo_check(self, text: str) -> Dict[str, Any]:
        """
        Добавляет текст на проверку уникальности (включая SEO-анализ)
        
        Args:
            text: Текст для проверки
            
        Returns:
            Dict: Результат добавления с UID или ошибкой
        """
        try:
            payload = {
                'userkey': self.api_key,
                'text': text,
                'jsonvisible': 'detail'  # Получаем детальную информацию включая SEO
            }
            
            logger.info(f"Отправляем текст на проверку: {len(text)} символов")
            
            response = requests.post(
                self.base_url,
                data=payload,
                timeout=30
            )
            
            logger.info(f"Текст успешно добавлен на проверку")
            
            if response.status_code == 200:
                result = response.json()

                
                if 'text_uid' in result:
                    logger.info(f"Текст успешно добавлен на проверку с UID: {result['text_uid']}")
                    return {
                        'status': 'success',
                        'uid': result['text_uid']
                    }
                elif 'error_code' in result:
                    logger.error(f"Ошибка API text.ru: {result['error_code']} - {result.get('error_desc', '')}")
                    return {
                        'status': 'error',
                        'error_code': result['error_code'],
                        'error_desc': result.get('error_desc', 'Неизвестная ошибка')
                    }
                else:
                    logger.error(f"Неожиданный формат ответа: {result}")
                    return {
                        'status': 'error',
                        'error_code': 'unknown_format',
                        'error_desc': 'Неожиданный формат ответа'
                    }
            else:
                logger.error(f"HTTP ошибка: {response.status_code} - {response.text}")
                return {
                    'status': 'error',
                    'error_code': 'http_error',
                    'error_desc': f'HTTP ошибка: {response.status_code}'
                }
                
        except Exception as e:
            logger.error(f"Ошибка при добавлении текста на проверку: {str(e)}")
            return {
                'status': 'error',
                'error_code': 'exception',
                'error_desc': f'Ошибка сервера: {str(e)}'
            }
    
    def get_check_results(self, uid: str) -> Dict[str, Any]:
        """
        Получает результаты проверки текста по UID
        
        Args:
            uid: Уникальный идентификатор текста
            
        Returns:
            Dict: Результаты проверки или информация об ошибке
        """
        try:
            payload = {
                'userkey': self.api_key,
                'uid': uid
            }
            
            response = requests.post(
                self.base_url,
                data=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Получен ответ API text.ru для UID {uid}")
                
                # Проверяем наличие ошибок
                if 'error_code' in result:
                    logger.warning(f"Ошибка получения результатов: {result['error_code']} - {result.get('error_desc', '')}")
                    return {
                        'status': 'error',
                        'error_code': result['error_code'],
                        'error_desc': result.get('error_desc', ''),
                        'ready': False
                    }
                
                # Проверяем готовность результатов по наличию поля 'unique'
                if 'unique' in result:
                    logger.info(f"Результаты готовы для UID {uid}")
                    return {
                        'status': 'success',
                        'ready': True,
                        'unique': result['unique'],
                        'date_check': result.get('date_check', ''),
                        'clear_text': result.get('clear_text', ''),
                        'mixed_words': result.get('mixed_words', ''),
                        'urls': result.get('urls', [])
                    }
                else:
                    logger.info(f"Результаты еще не готовы для UID {uid}")
                    return {
                        'status': 'pending',
                        'ready': False,
                        'uid': uid
                    }
            else:
                logger.error(f"HTTP ошибка при получении результатов: {response.status_code}")
                return {
                    'status': 'error',
                    'error_code': 'http_error',
                    'error_desc': f'HTTP {response.status_code}',
                    'ready': False
                }
                
        except Exception as e:
            logger.error(f"Ошибка при получении результатов: {str(e)}")
            return {
                'status': 'error',
                'error_code': 'exception',
                'error_desc': str(e),
                'ready': False
            }

    def get_seo_check_results(self, uid: str) -> Dict[str, Any]:
        """
        Получает результаты проверки текста по UID (включая SEO-анализ)
        
        Args:
            uid: Уникальный идентификатор текста
            
        Returns:
            Dict: Результаты проверки или информация об ошибке
        """
        try:
            payload = {
                'userkey': self.api_key,
                'uid': uid,
                'jsonvisible': 'detail'  # Получаем детальную информацию включая SEO
            }
            
            response = requests.post(
                self.base_url,
                data=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Получен ответ API text.ru для UID {uid}")
                
                # Проверяем наличие ошибок
                if 'error_code' in result:
                    error_code = result['error_code']
                    error_desc = result.get('error_desc', '')
                    logger.warning(f"Ошибка получения результатов: {error_code} - {error_desc}")
                    
                    # Ошибка 181 означает, что текст еще не проверен - это нормально
                    if error_code == 181 or error_code == '181':
                        logger.info(f"Текст еще не проверен для UID {uid}, продолжаем ждать")
                        return {
                            'status': 'pending',
                            'ready': False,
                            'uid': uid
                        }
                    else:
                        # Другие ошибки - возвращаем как ошибку
                        return {
                            'status': 'error',
                            'error_code': error_code,
                            'error_desc': error_desc,
                            'ready': False
                        }
                
                # Проверяем готовность результатов по наличию поля 'text_unique'
                if 'text_unique' in result:
                    logger.info(f"Результаты готовы для UID {uid}")
                    
                    # Парсим result_json для получения дополнительной информации
                    result_json = {}
                    if 'result_json' in result and result['result_json']:
                        try:
                            result_json = json.loads(result['result_json'])
                        except json.JSONDecodeError:
                            logger.warning(f"Не удалось распарсить result_json для UID {uid}")
                    
                    # Парсим seo_check если есть
                    seo_data = {}
                    if 'seo_check' in result and result['seo_check']:
                        try:
                            seo_data = json.loads(result['seo_check'])
                        except json.JSONDecodeError:
                            logger.warning(f"Не удалось распарсить seo_check для UID {uid}")
                    
                    return {
                        'status': 'success',
                        'ready': True,
                        'text_unique': float(result['text_unique']),
                        'result_json': result_json,
                        'seo_check': seo_data,
                        'spell_check': result.get('spell_check', ''),
                        'date_check': result_json.get('date_check', ''),
                        'unique': result_json.get('unique', 0),
                        'clear_text': result_json.get('clear_text', ''),
                        'mixed_words': result_json.get('mixed_words', ''),
                        'urls': result_json.get('urls', [])
                    }
                else:
                    logger.info(f"Результаты еще не готовы для UID {uid}")
                    return {
                        'status': 'pending',
                        'ready': False,
                        'uid': uid
                    }
            else:
                logger.error(f"HTTP ошибка получения результатов: {response.status_code}")
                return {
                    'status': 'error',
                    'error_code': 'http_error',
                    'error_desc': f'HTTP ошибка: {response.status_code}',
                    'ready': False
                }
                
        except Exception as e:
            logger.error(f"Ошибка получения результатов: {str(e)}")
            return {
                'status': 'error',
                'error_code': 'exception',
                'error_desc': f'Ошибка сервера: {str(e)}',
                'ready': False
            }
    
    def wait_for_results(self, uid: str, max_wait: int = 120, check_interval: int = 5) -> Dict[str, Any]:
        """
        Ожидает готовности результатов проверки с таймаутом
        
        Args:
            uid: Уникальный идентификатор текста
            max_wait: Максимальное время ожидания в секундах
            check_interval: Интервал проверки в секундах
            
        Returns:
            Dict: Результаты проверки или информация об ошибке
        """
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            result = self.get_check_results(uid)
            
            if result['ready']:
                return result
            elif result['status'] == 'error':
                return result
            
            logger.info(f"Ожидание результатов... ({int(time.time() - start_time)}с)")
            time.sleep(check_interval)
        
        logger.warning(f"Превышено время ожидания результатов для UID {uid}")
        return {
            'status': 'timeout',
            'error_code': 'timeout',
            'error_desc': f'Превышено время ожидания ({max_wait}с)',
            'ready': False,
            'uid': uid
        }
    
    def get_balance(self) -> int:
        """
        Получает остаток символов на балансе
        
        Returns:
            int: Количество оставшихся символов
        """
        try:
            payload = {
                'userkey': self.api_key,
                'method': 'get_packages_info'
            }
            
            response = requests.post(
                self.account_url,
                data=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'size' in result:
                    logger.info(f"Остаток символов: {result['size']}")
                    return result['size']
                else:
                    logger.error("Неожиданный формат ответа при получении баланса")
                    return 0
            else:
                logger.error(f"HTTP ошибка при получении баланса: {response.status_code}")
                return 0
                
        except Exception as e:
            logger.error(f"Ошибка при получении баланса: {str(e)}")
            return 0
    
    def check_text_quality(self, text: str, max_wait_time: int = 120) -> Dict[str, Any]:
        """
        Полная проверка SEO-качества текста (водность, заспамленность, ключевые слова)
        
        Args:
            text: Текст для проверки
            max_wait_time: Максимальное время ожидания в секундах
            
        Returns:
            Dict: Полные результаты проверки
        """
        try:
            # Добавляем текст на SEO-проверку
            add_result = self.add_text_for_seo_check(text)
            
            if add_result['status'] != 'success':
                return add_result
            
            uid = add_result['uid']
            logger.info(f"Текст добавлен для SEO-проверки с UID: {uid}")
            
            # Ждем результатов
            start_time = time.time()
            while time.time() - start_time < max_wait_time:
                results = self.get_seo_check_results(uid)
                
                if results['status'] == 'success' and results['ready']:
                    logger.info(f"SEO-результаты готовы для UID {uid}")
                    return results
                elif results['status'] == 'error':
                    logger.error(f"Ошибка получения SEO-результатов для UID {uid}: {results.get('error_desc', '')}")
                    return results
                elif results['status'] == 'pending':
                    logger.info(f"SEO-результаты еще не готовы для UID {uid}, продолжаем ждать...")
                    # Ждем 5 секунд перед следующей проверкой
                    time.sleep(5)
                    continue
                else:
                    logger.warning(f"Неожиданный статус результатов для UID {uid}: {results['status']}")
                    time.sleep(5)
                    continue
            
            # Превышено время ожидания
            logger.warning(f"Превышено время ожидания для UID {uid}")
            return {
                'status': 'timeout',
                'ready': False,
                'error_desc': f'Превышено время ожидания ({max_wait_time}с)'
            }
            
        except Exception as e:
            logger.error(f"Ошибка проверки SEO-качества текста: {str(e)}")
            return {
                'status': 'error',
                'ready': False,
                'error_code': 'exception',
                'error_desc': f'Ошибка сервера: {str(e)}'
            }
    
    def format_seo_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Форматирует результаты проверки уникальности для удобного отображения
        
        Args:
            results: Сырые результаты от API
            
        Returns:
            Dict: Отформатированные результаты
        """
        if not results.get('ready', False):
            return results
        
        # Извлекаем данные из проверки уникальности
        text_unique = results.get('text_unique', 0)
        result_json = results.get('result_json', {})
        seo_check = results.get('seo_check', {})
        
        # Базовые метрики из result_json
        unique = result_json.get('unique', 0)
        clear_text = result_json.get('clear_text', '')
        mixed_words = result_json.get('mixed_words', '')
        urls = result_json.get('urls', [])
        
        # Подсчитываем количество слов и символов
        word_count = len(clear_text.split()) if clear_text else 0
        char_count = len(clear_text) if clear_text else 0
        
        # Извлекаем SEO-данные если есть
        water_percent = seo_check.get('water_percent', 0)
        spam_percent = seo_check.get('spam_percent', 0)
        list_keys = seo_check.get('list_keys', [])
        
        # Обрабатываем ключевые слова
        keywords = []
        for key_info in list_keys:
            keywords.append({
                'keyword': key_info.get('key_title', ''),
                'count': key_info.get('count', 0)
            })
        
        # Сортируем ключевые слова по частоте (первые 5-7 самых релевантных)
        keywords.sort(key=lambda x: x['count'], reverse=True)
        keywords = keywords[:7]  # Берем первые 7
        
        # Если нет SEO-данных, используем уникальность как основную метрику
        if water_percent == 0 and spam_percent == 0:
            water_percent = 100.0 - text_unique
            spam_percent = 0  # По умолчанию
        
        formatted = {
            'status': 'success',
            'ready': True,
            'summary': {
                'uniqueness': float(text_unique),  # Уникальность из API
                'water_percent': float(water_percent),
                'spam_percent': float(spam_percent),
                'char_count': char_count,
                'word_count': word_count,
                'mixed_words_count': len(mixed_words.split()) if mixed_words else 0
            },
            'details': {
                'keywords': keywords,
                'mixed_words': mixed_words.split() if mixed_words else [],
                'urls': urls,
                'clear_text': clear_text
            }
        }
        
        return formatted 