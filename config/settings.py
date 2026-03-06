"""
Django settings for loan-site_clean2 project.
"""

from pathlib import Path
import os
import dj_database_url

# ======================
# BASE
# ======================
BASE_DIR = Path(__file__).resolve().parent.parent

# ======================
# ENV HELPERS
# ======================
def env_list(key: str, default: str = ""):
    val = os.getenv(key, default)
    return [x.strip() for x in val.split(",") if x.strip()]

# ======================
# ENV / MODE
# ======================
DEBUG = os.getenv("DEBUG", "False").lower() in ("1", "true", "yes", "on")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")

ALLOWED_HOSTS = env_list(
    "ALLOWED_HOSTS",
    "localhost,127.0.0.1,primelendph.loans,www.primelendph.loans,loving-tenderness-production-2c60.up.railway.app"
)

CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    "https://primelendph.loans ,https://www.primelendph.loans ,https://loving-tenderness-production-2c60.up.railway.app "
)

# ======================
# APPS
# ======================
INSTALLED_APPS = [
    "staffdash",
    "cloudinary",
    "jazzmin",
    "whitenoise.runserver_nostatic",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "accounts.apps.AccountsConfig",
    "django.contrib.humanize",
]

# ======================
# MIDDLEWARE - OPTIMIZED (មាន Cache Middleware)
# ======================
MIDDLEWARE = [
    "django.middleware.cache.UpdateCacheMiddleware",      # ✅ បន្ថែមនៅពីលើ (Cache)
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django.middleware.cache.FetchFromCacheMiddleware",   # ✅ បន្ថែមនៅចុង (Cache)
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ======================
# DATABASE - OPTIMIZED (ត្រឹមត្រូវសម្រាប់ SQLite និង PostgreSQL)
# ======================
DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,  # រក្សា Connection 10 នាទី
        ssl_require=False,
    )
}

# PostgreSQL-specific options only (មិនប៉ះពាល់ SQLite)
if not DEBUG:
    db_engine = DATABASES["default"].get("ENGINE", "")
    if "postgresql" in db_engine or "postgres" in db_engine:
        DATABASES["default"].setdefault("OPTIONS", {})
        DATABASES["default"]["OPTIONS"]["connect_timeout"] = 10

# ======================
# CACHES - OPTIMIZED
# ======================
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,  # 5 នាទី Default
        'OPTIONS': {
            'MAX_ENTRIES': 2000,      # អាច Cache 2000 item
            'CULL_FREQUENCY': 3,      # លុប 1/3 ពេញ
        }
    }
}

# Cache timeout for Middleware
CACHE_MIDDLEWARE_SECONDS = 300
CACHE_MIDDLEWARE_KEY_PREFIX = 'loan_site'

# ======================
# SESSION (Optimized)
# ======================
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
SESSION_CACHE_ALIAS = "default"
SESSION_COOKIE_AGE = 3600 * 24 * 7  # 7 ថ្ងៃ
SESSION_SAVE_EVERY_REQUEST = False

# ======================
# AUTH / I18N
# ======================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Manila"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"
LOGIN_URL = "/login/"

# ======================
# STATIC / MEDIA
# ======================
STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {"BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# ======================
# CSRF & UPLOAD SETTINGS
# ======================

# CSRF - សម្រាប់ multiple domains
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_USE_SESSIONS = False

# Upload settings
DATA_UPLOAD_MAX_MEMORY_SIZE = 20971520  # 20MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 20971520  # 20MB
FILE_UPLOAD_MAX_NUMBER_FILES = 10

FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.MemoryFileUploadHandler',
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]

WHITENOISE_MANIFEST_STRICT = False

# ======================
# CLOUDINARY
# ======================
import cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key=os.getenv("CLOUDINARY_API_KEY", ""),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", ""),
    secure=True,
)

CLOUDINARY_STORAGE = {
    "CLOUD_NAME": os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    "API_KEY": os.getenv("CLOUDINARY_API_KEY", ""),
    "API_SECRET": os.getenv("CLOUDINARY_API_SECRET", ""),
}

# Static files optimization
WHITENOISE_MAX_AGE = 31536000  # 1 year

# ======================
# SECURITY (PRODUCTION)
# ======================
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ======================
# JAZZMIN
# ======================
JAZZMIN_SETTINGS = {
    "site_title": "Loan Admin",
    "site_header": "Loan Admin",
    "site_brand": "Loan Admin",
    "welcome_sign": "Welcome",
    "copyright": "Loan",
    "show_sidebar": True,
    "navigation_expanded": True,
    "theme": "darkly",
    "custom_css": "css/admin_custom.css",
}

# ======================
# LOGGING - OPTIMIZED (Production)
# ======================
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "ERROR",  # ផ្លាស់ប្ដូរពី WARNING មក ERROR
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",  # ផ្លាស់ប្ដូរពី INFO
            "propagate": False,
        },
        "django.db.backends": {
            "level": "ERROR",  # ផ្លាស់ប្ដូរពី WARNING (កុំ Log SQL)
            "handlers": ["console"],
            "propagate": False,
        },
    },
}