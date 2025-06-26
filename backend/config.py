import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'DEVI_METTERE_UNA_STRINGA_CASUALE_E_COMPLESSA_QUI!'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///calorie_punisher.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    OPEN_FOOD_FACTS_API_URL = "https://world.openfoodfacts.org/api/v0/product/"

import os

# URL del database: qui usiamo SQLite in locale, tutto open-source e gratuito
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./exercise_app.db")
