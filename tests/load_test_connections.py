#!/usr/bin/env python3
"""
Connection Pooling Load Test
=============================

Script per verificare la risoluzione del problema "too many clients" su PostgreSQL.
Simula 100 richieste concorrenti all'endpoint di autenticazione per testare il pooling
con pgBouncer.

Usage:
    export TEST_CODE="test-load-user"
    export TEST_TOKEN="valid-token-from-backend"
    python tests/load_test_connections.py

Requirements:
    pip install requests
"""

import requests
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Tuple

# Configurazione Test
BASE_URL = "http://localhost/api/public/auth/"
NUM_REQUESTS = 100
MAX_WORKERS = 50

# Credenziali test (da ENV o defaults)
TEST_PAYLOAD = {
    "code": os.environ.get("TEST_CODE", "lore-di-lillo"),
    "token": os.environ.get("TEST_TOKEN", "1e9f61bbdde3d759")
}

def make_auth_request(request_id: int) -> Tuple[int, int, float]:
    """
    Esegue una singola richiesta POST all'endpoint di autenticazione.
    
    Args:
        request_id: Identificatore univoco della richiesta
        
    Returns:
        Tupla (request_id, status_code, response_time)
    """
    start_time = time.time()
    try:
        response = requests.post(
            BASE_URL,
            json=TEST_PAYLOAD,
            timeout=30  # Timeout esteso per handle connection pooling delays
        )
        elapsed = time.time() - start_time
        return (request_id, response.status_code, elapsed)
    except requests.RequestException as e:
        elapsed = time.time() - start_time
        print(f"❌ Request {request_id} failed: {e}")
        return (request_id, 0, elapsed)  # 0 = errore di rete


def run_load_test():
    """
    Esegue il test di carico parallelo con ThreadPoolExecutor.
    """
    print("═" * 60)
    print("🔥 pgBouncer Connection Pooling - Load Test")
    print("═" * 60)
    print(f"Target: {BASE_URL}")
    print(f"Concurrent Requests: {NUM_REQUESTS}")
    print(f"Worker Threads: {MAX_WORKERS}")
    print(f"Test User Code: {TEST_PAYLOAD['code']}")
    print("═" * 60)
    print("\n⏳ Starting load test...\n")
    
    results = []
    start_total = time.time()
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit tutte le richieste
        futures = {executor.submit(make_auth_request, i): i for i in range(NUM_REQUESTS)}
        
        # Raccolta risultati con progress bar
        for idx, future in enumerate(as_completed(futures), 1):
            request_id, status_code, elapsed = future.result()
            results.append((request_id, status_code, elapsed))
            
            # Progress indicator
            if idx % 10 == 0:
                print(f"✓ Completed {idx}/{NUM_REQUESTS} requests...")
    
    total_time = time.time() - start_total
    
    # Analisi Risultati
    print("\n" + "═" * 60)
    print("📊 Test Results")
    print("═" * 60)
    
    success_200 = sum(1 for _, status, _ in results if status == 200)
    success_4xx = sum(1 for _, status, _ in results if 400 <= status < 500)
    errors_5xx = sum(1 for _, status, _ in results if status >= 500)
    errors_network = sum(1 for _, status, _ in results if status == 0)
    
    avg_response_time = sum(elapsed for _, _, elapsed in results) / len(results)
    max_response_time = max(elapsed for _, _, elapsed in results)
    min_response_time = min(elapsed for _, _, elapsed in results)
    
    print(f"\n✅ HTTP 200 (Success):       {success_200}/{NUM_REQUESTS}")
    print(f"⚠️  HTTP 4xx (Client Error):  {success_4xx}/{NUM_REQUESTS}")
    print(f"❌ HTTP 5xx (Server Error):  {errors_5xx}/{NUM_REQUESTS}")
    print(f"🔌 Network Errors:           {errors_network}/{NUM_REQUESTS}")
    
    print(f"\n⏱️  Total Test Duration:      {total_time:.2f}s")
    print(f"📈 Avg Response Time:        {avg_response_time:.3f}s")
    print(f"🔝 Max Response Time:        {max_response_time:.3f}s")
    print(f"🔻 Min Response Time:        {min_response_time:.3f}s")
    print(f"🚀 Requests/Second:          {NUM_REQUESTS/total_time:.2f} req/s")
    
    # Verdict Finale
    print("\n" + "═" * 60)
    if errors_5xx == 0 and errors_network == 0:
        if success_4xx > 0:
             print("ℹ️  TEST PASSED (with 4xx): No server errors.")
             print("   Note: 4xx errors are expected if test user doesn't exist.")
        else:
             print("✅ TEST PASSED: All requests successful (200 OK)!")
        print("   pgBouncer connection pooling is working correctly.")
    elif errors_5xx > 0:
        print(f"❌ TEST FAILED: {errors_5xx} server errors detected!")
        print("   Check backend logs and pgBouncer pool configuration.")
        if any("too many clients" in str(res) for res in results):
            print("   🔴 CRITICAL: 'too many clients' error still occurring!")
    else:
        print(f"⚠️  TEST PARTIAL: {errors_network} network errors.")
        print("   Check Docker network connectivity and timeouts.")
    print("═" * 60)
    
    return errors_5xx == 0 and errors_network == 0


if __name__ == "__main__":
    try:
        success = run_load_test()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user.")
        exit(130)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        exit(1)
