from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    gender = db.Column(db.String(10), nullable=False) # 'M' or 'F'
    age = db.Column(db.Integer, nullable=False)
    weight_kg = db.Column(db.Float, nullable=False)
    height_cm = db.Column(db.Float, nullable=False)
    registration_date = db.Column(db.DateTime, default=datetime.utcnow)
    # Nuovo campo per la foto profilo
    profile_picture_url = db.Column(db.String(256), nullable=True, default='https://via.placeholder.com/150/0000FF/FFFFFF?text=User')

    meals = db.relationship('Meal', backref='user', lazy=True)
    generated_workouts = db.relationship('GeneratedWorkout', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'gender': self.gender,
            'age': self.age,
            'weight_kg': self.weight_kg,
            'height_cm': self.height_cm,
            'registration_date': self.registration_date.isoformat(),
            'profile_picture_url': self.profile_picture_url
        }

    def __repr__(self):
        return f'<User {self.username}>'

# Resto dei modelli (FoodItem, Meal, MealItem, Exercise, GeneratedWorkout) sono uguali

class FoodItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    category = db.Column(db.String(64))
    kcal_per_100g = db.Column(db.Float, nullable=False)
    carbs_per_100g = db.Column(db.Float, nullable=False)
    proteins_per_100g = db.Column(db.Float, nullable=False)
    fats_per_100g = db.Column(db.Float, nullable=False)
    sugars_per_100g = db.Column(db.Float, default=0.0)
    fiber_per_100g = db.Column(db.Float, default=0.0)
    sodium_mg_per_100g = db.Column(db.Float, default=0.0)
    image_url = db.Column(db.String(256))
    barcode_upc = db.Column(db.String(64), unique=True, nullable=True, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'kcal_per_100g': self.kcal_per_100g,
            'carbs_per_100g': self.carbs_per_100g,
            'proteins_per_100g': self.proteins_per_100g,
            'fats_per_100g': self.fats_per_100g,
            'sugars_per_100g': self.sugars_per_100g,
            'fiber_per_100g': self.fiber_per_100g,
            'sodium_mg_per_100g': self.sodium_mg_per_100g,
            'image_url': self.image_url,
            'barcode_upc': self.barcode_upc
        }

    def __repr__(self):
        return f'<FoodItem {self.name}>'

class Meal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    meal_time = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.String(128))

    meal_items = db.relationship('MealItem', backref='meal', lazy=True)

    def to_dict(self, include_items=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'meal_time': self.meal_time.isoformat(),
            'description': self.description
        }
        if include_items:
            data['items'] = [item.to_dict(include_food_item=True) for item in self.meal_items]
        return data

    def __repr__(self):
        return f'<Meal {self.id} for User {self.user_id}>'

class MealItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    meal_id = db.Column(db.Integer, db.ForeignKey('meal.id'), nullable=False)
    food_item_id = db.Column(db.Integer, db.ForeignKey('food_item.id'), nullable=False)
    grams_consumed = db.Column(db.Float, nullable=False)
    
    kcal_total_item = db.Column(db.Float, nullable=False)
    carbs_item = db.Column(db.Float, nullable=False)
    proteins_item = db.Column(db.Float, nullable=False)
    fats_item = db.Column(db.Float, nullable=False)

    food_item = db.relationship('FoodItem', backref='meal_items', lazy=True)

    def to_dict(self, include_food_item=False):
        data = {
            'id': self.id,
            'meal_id': self.meal_id,
            'food_item_id': self.food_item_id,
            'grams_consumed': self.grams_consumed,
            'kcal_total_item': self.kcal_total_item,
            'carbs_item': self.carbs_item,
            'proteins_item': self.proteins_item,
            'fats_item': self.fats_item
        }
        if include_food_item and self.food_item:
            data['food_item_details'] = self.food_item.to_dict()
        return data

    def __repr__(self):
        return f'<MealItem {self.id} - {self.grams_consumed}g of {self.food_item.name if self.food_item else "Unknown"}>'

class Exercise(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    acronym = db.Column(db.String(10), unique=True, nullable=False)
    kcal_per_kg_per_min = db.Column(db.Float, nullable=False) 
    description = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'acronym': self.acronym,
            'kcal_per_kg_per_min': self.kcal_per_kg_per_min,
            'description': self.description
        }

    def __repr__(self):
        return f'<Exercise {self.acronym}>'

class GeneratedWorkout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    generation_date = db.Column(db.DateTime, default=datetime.utcnow)
    kcal_to_burn = db.Column(db.Float, nullable=False)
    estimated_total_time_min = db.Column(db.Float, nullable=False)
    workout_details_json = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'generation_date': self.generation_date.isoformat(),
            'kcal_to_burn': self.kcal_to_burn,
            'estimated_total_time_min': self.estimated_total_time_min,
            'workout_details': json.loads(self.workout_details_json)
        }

    def __repr__(self):
        return f'<GeneratedWorkout {self.id} for User {self.user_id}>'