from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from config import Config
from flask_cors import CORS # Importa Flask-CORS

app = Flask(__name__)
app.config.from_object(Config)
db = SQLAlchemy(app)
CORS(app) # Abilita CORS per tutte le route

# Importa i modelli e le route qui
from models import User, FoodItem, Meal, MealItem, Exercise, GeneratedWorkout
from routes import *

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Database tables created!")
        # Puoi anche inizializzare i dati di base qui se vuoi che siano sempre presenti
        # from routes import seed_food_items, seed_exercises, get_user_profile # Importa anche get_user_profile per assicurare il guest user
        # print("Ensuring Guest Warrior user exists...")
        # get_user_profile(user_id=1) # Assicura che l'utente GuestWarrior sia creato (ID 1)
        # print("Populating initial food items and exercises...")
        # seed_food_items()
        # seed_exercises()
        # print("Initial data population complete!")
    app.run(debug=True, port=5000)