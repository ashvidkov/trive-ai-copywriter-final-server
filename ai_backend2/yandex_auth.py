"""
Сервис для аутентификации с Yandex Cloud API
"""

import json
import time
import jwt
import requests
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from typing import Optional


class YandexAuthService:
    def __init__(self, key_file_path: str = "authorized_key_yandex.json"):
        self.key_file_path = key_file_path
        self._iam_token = None
        self._token_expires_at = 0
        
    def _load_key_data(self):
        """Загрузить данные ключа из JSON файла"""
        with open(self.key_file_path, 'r') as f:
            return json.load(f)
    
    def _generate_jwt(self) -> str:
        """Генерировать JWT токен для получения IAM токена"""
        key_data = self._load_key_data()
        
        service_account_id = key_data["service_account_id"]
        key_id = key_data["id"]
        private_key = key_data["private_key"]
        
        # Формирование JWT
        now = int(time.time())
        payload = {
            "aud": "https://iam.api.cloud.yandex.net/iam/v1/tokens",
            "iss": service_account_id,
            "iat": now,
            "exp": now + 360  # JWT живёт 6 минут
        }
        
        encoded_jwt = jwt.encode(
            payload,
            private_key,
            algorithm="PS256",
            headers={"kid": key_id}
        )
        
        return encoded_jwt
    
    def _fetch_iam_token(self) -> str:
        """Получить IAM токен от Yandex Cloud"""
        jwt_token = self._generate_jwt()
        
        headers = {
            "Content-Type": "application/json"
        }
        data = {
            "jwt": jwt_token
        }
        
        response = requests.post(
            "https://iam.api.cloud.yandex.net/iam/v1/tokens", 
            headers=headers, 
            json=data
        )
        
        if response.status_code == 200:
            return response.json()["iamToken"]
        else:
            raise Exception(f"Ошибка получения IAM-токена: {response.status_code} - {response.text}")
    
    def get_iam_token(self) -> str:
        """Получить действующий IAM токен (с кешированием)"""
        now = time.time()
        
        # Если токен истёк или вот-вот истечёт, обновляем
        if not self._iam_token or now >= self._token_expires_at - 60:
            self._iam_token = self._fetch_iam_token()
            # IAM токен живёт 12 часов, ставим на 11 часов для безопасности
            self._token_expires_at = now + (11 * 60 * 60)
            
        return self._iam_token