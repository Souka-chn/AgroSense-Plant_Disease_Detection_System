import os
from datetime import timedelta

class Config:
    """Configuration de base pour l'application AgroSense"""
    
    # Sécurité
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-change-in-production'
    
    # Upload des fichiers
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'uploads'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'avi', 'mov', 'wmv'}
    
    # Modèle AI
    MODEL_PATH = os.path.join('best_model', 'model')
    MODEL_CONFIDENCE_THRESHOLD = 0.5
    
    # Email
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'smtp.gmail.com'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
    # Dataset et préprocessing
    IMAGE_SIZE = (224, 224)
    NORMALIZE_MEAN = [0.485, 0.456, 0.406]
    NORMALIZE_STD = [0.229, 0.224, 0.225]
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    # Performance
    CACHE_TYPE = 'simple'
    CACHE_DEFAULT_TIMEOUT = 300
    
    # Langues supportées
    LANGUAGES = {
        'fr': 'Français',
        'en': 'English'
    }
    
    @staticmethod
    def init_app(app):
        """Initialiser la configuration de l'application"""
        # Créer le dossier d'upload s'il n'existe pas
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

class DevelopmentConfig(Config):
    """Configuration pour le développement"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Configuration pour la production"""
    DEBUG = False
    TESTING = False
    
    # Sécurité renforcée en production
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'

class TestingConfig(Config):
    """Configuration pour les tests"""
    TESTING = True
    WTF_CSRF_ENABLED = False

# Configuration par défaut
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}