# config/gunicorn.conf.py
import multiprocessing
import os

# Worker configuration
# 2 workers x 4 threads = 8 concurrent requests, spread across 2 processes so
# one stuck/slow request can't take the whole service down (the other worker
# keeps serving). Fixes the "upstream concurrency limit reached" 503s caused by
# a single worker saturating under the dashboard's background polling + traffic.
workers = 2
threads = 4
worker_class = "gthread"

# Timeout settings - bounded enough for image uploads, but recycles hung workers fast
timeout = 45
graceful_timeout = 45
keep_alive = 5

# Memory optimization
max_requests = 500  #  1000  500
max_requests_jitter = 50
preload_app = True

# File upload limits
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8190

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

def when_ready(server):
    print("Gunicorn is ready!")