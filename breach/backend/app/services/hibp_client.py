import os
import time
from datetime import datetime
from typing import Dict, List, Optional

import requests
from redis import Redis

HIBP_API_KEY = os.getenv("HIBP_API_KEY", "")
HIBP_BASE_URL = "https://haveibeenpwned.com/api/v3"
RATE_LIMIT_SECONDS = 1.6


class RedisCache:
    def __init__(self, redis_client: Optional[Redis]):
        self.redis = redis_client

    def get(self, key: str) -> Optional[Dict]:
        if not self.redis:
            return None
        raw = self.redis.get(key)
        if not raw:
            return None
        return eval(raw)

    def set(self, key: str, value: Dict, ttl: int = 3600) -> None:
        if not self.redis:
            return
        self.redis.set(key, repr(value), ex=ttl)


class HIBPClient:
    def __init__(self, redis_client: Optional[Redis]):
        self.cache = RedisCache(redis_client)

    def _http_headers(self) -> Dict[str, str]:
        headers = {
            "User-Agent": "BreachAlertService/1.0",
            "Accept": "application/json",
        }
        if HIBP_API_KEY:
            headers["hibp-api-key"] = HIBP_API_KEY
        return headers

    def fetch_breaches(self, email: str) -> List[Dict]:
        cache_key = f"hibp:{email.lower()}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        if not HIBP_API_KEY:
            breaches = self._simulate_breach_response(email)
        else:
            endpoint = f"{HIBP_BASE_URL}/breachedaccount/{email}"
            response = requests.get(endpoint, headers=self._http_headers(), params={"truncateResponse": False})
            if response.status_code == 404:
                breaches = []
            elif response.status_code == 200:
                breaches = response.json()
            else:
                response.raise_for_status()

        self.cache.set(cache_key, breaches, ttl=12 * 60 * 60)
        time.sleep(RATE_LIMIT_SECONDS)
        return breaches

    def _simulate_breach_response(self, email: str) -> List[Dict]:
        lower = email.lower()
        if "test" in lower or "example" in lower:
            return [
                {
                    "Name": "ExampleCorp",
                    "BreachDate": "2025-10-14",
                    "DataClasses": ["Email addresses", "Passwords", "Phone numbers"],
                    "Description": "ExampleCorp breach containing user emails and hashed passwords.",
                }
            ]
        if lower.endswith("@work.com"):
            return [
                {
                    "Name": "CorporateLeak",
                    "BreachDate": "2025-11-07",
                    "DataClasses": ["Email addresses", "Phone numbers"],
                    "Description": "Work account exposure from a simulated corporate breach.",
                }
            ]
        return []
