from flask import request, jsonify, make_response
from app import app, db
from models import User, FoodItem, Meal, MealItem, Exercise, GeneratedWorkout
from utils import calculate_bmr, generate_workout_logic, get_daily_time_range
from datetime import datetime, date, timedelta
import requests
import json
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from io import BytesIO
from functools import wraps
import jwt # Per i JSON Web Tokens
from time import time # Per il timestamp del JWT

# --- JWT CONFIGURATION ---
JWT_SECRET_KEY = app.config['SECRET_KEY']
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_SECONDS = 3600 # 1 ora di validità per il token

# --- GUEST USER CONFIGURATION ---
# Useremo un ID fisso per il guest user nel database.
GUEST_USER_ID = 1

def generate_jwt_token(user_id):
    """Genera un JWT per l'autenticazione."""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXPIRATION_SECONDS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token):
    """Decodifica un JWT."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None # Token scaduto
    except jwt.InvalidTokenError:
        return None # Token non valido

# --- DECORATORE DI AUTENTICAZIONE (per utenti registrati) ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'message': 'Authorization token is missing or malformed!'}), 401
        
        token = auth_header.split(' ')[1]
        user_id = decode_jwt_token(token)
        
        if not user_id:
            return jsonify({'message': 'Invalid or expired token. Please log in again.'}), 401
        
        kwargs['user_id'] = user_id # Passa l'ID utente alla funzione
        return f(*args, **kwargs)
    return decorated_function

# --- UTENTI ---
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    required_fields = ['username', 'email', 'password', 'gender', 'age', 'weight_kg', 'height_cm']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing data. All fields are required to register!'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already taken. Choose another!'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered. Did you forget your password?'}), 409

    new_user = User(
        username=data['username'], 
        email=data['email'], 
        gender=data['gender'], 
        age=data['age'],
        weight_kg=data['weight_kg'], 
        height_cm=data['height_cm']
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    
    # Genera un token JWT subito dopo la registrazione
    token = generate_jwt_token(new_user.id)
    return jsonify({'message': 'Registration successful! Welcome, warrior!', 'token': token, 'user': new_user.to_dict()}), 201

@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and user.check_password(password):
        token = generate_jwt_token(user.id)
        return jsonify({'message': 'Login successful!', 'token': token, 'user': user.to_dict()}), 200
    return jsonify({'message': 'Invalid credentials. Try harder!'}), 401

# Endpoint per ottenere i dati del profilo (sia per registrati che per guest)
@app.route('/api/profile', methods=['GET'])
def get_user_profile():
    # Per gli utenti registrati, usiamo il token JWT
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        user_id = decode_jwt_token(token)
        if user_id:
            user = User.query.get(user_id)
            if user:
                bmr = calculate_bmr(user.gender, user.age, user.weight_kg, user.height_cm)
                user_data = user.to_dict()
                user_data['bmr'] = round(bmr, 2)
                user_data['is_guest'] = False
                return jsonify(user_data)
    
    # Se non c'è token valido o non è presente, trattiamo come guest
    # Assicurati che l'utente guest esista nel DB, altrimenti lo crea
    guest_user = User.query.get(GUEST_USER_ID)
    if not guest_user:
        guest_user = User(
            id=GUEST_USER_ID, # Forziamo l'ID
            username='GuestWarrior',
            email=f'guest{GUEST_USER_ID}@caloriepunisher.com', # Email unica per test
            gender='M', age=30, weight_kg=75.0, height_cm=175.0
        )
        guest_user.set_password('guestpassword') # Password fittizia
        db.session.add(guest_user)
        db.session.commit()
        print(f"Creato utente GuestWarrior con ID {GUEST_USER_ID}")
    
    bmr = calculate_bmr(guest_user.gender, guest_user.age, guest_user.weight_kg, guest_user.height_cm)
    guest_data = guest_user.to_dict()
    guest_data['bmr'] = round(bmr, 2)
    guest_data['is_guest'] = True # Flag per il frontend
    return jsonify(guest_data)

# Endpoint per aggiornare il profilo utente (solo per utenti registrati)
@app.route('/api/profile', methods=['PUT'])
@login_required
def update_user_profile(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    user.gender = data.get('gender', user.gender)
    user.age = data.get('age', user.age)
    user.weight_kg = data.get('weight_kg', user.weight_kg)
    user.height_cm = data.get('height_cm', user.height_cm)
    user.profile_picture_url = data.get('profile_picture_url', user.profile_picture_url)
    
    # Non permettiamo di cambiare username/email/password da qui per semplicità
    # 'username': data.get('username', user.username),
    # 'email': data.get('email', user.email),
    # Se vuoi aggiornare la password, dovresti avere un endpoint specifico
    # if 'password' in data and data['password']:
    #     user.set_password(data['password'])

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully!', 'user': user.to_dict()}), 200

# --- ALIMENTI (Non richiedono login) ---
@app.route('/api/fooditems', methods=['GET'])
def get_food_items():
    food_items = FoodItem.query.all()
    return jsonify([item.to_dict() for item in food_items])

@app.route('/api/fooditems/search', methods=['GET'])
def search_food_items():
    query = request.args.get('q', '').lower()
    food_items = FoodItem.query.filter(FoodItem.name.ilike(f'%{query}%')).limit(20).all()
    return jsonify([item.to_dict() for item in food_items])

@app.route('/api/fooditems/barcode/<string:barcode>', methods=['GET'])
def get_food_item_by_barcode(barcode):
    from config import Config
    food_item = FoodItem.query.filter_by(barcode_upc=barcode).first()
    if food_item:
        return jsonify(food_item.to_dict())

    api_url = f"{Config.OPEN_FOOD_FACTS_API_URL}{barcode}.json"
    try:
        response = requests.get(api_url, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get('status') == 1 and 'product' in data:
            product = data['product']
            name = product.get('product_name', product.get('product_name_it', 'Nome Sconosciuto'))
            nutriments = product.get('nutriments', {})

            kcal = nutriments.get('energy-kcal_100g', 0)
            carbs = nutriments.get('carbohydrates_100g', 0)
            proteins = nutriments.get('proteins_100g', 0)
            fats = nutriments.get('fat_100g', 0)
            sugars = nutriments.get('sugars_100g', 0)
            fiber = nutriments.get('fiber_100g', 0)
            sodium = nutriments.get('sodium_100g', 0)
            if sodium > 0: sodium *= 1000 

            image_url = product.get('image_url', product.get('image_front_url'))
            category = product.get('categories', 'Non Specificato').split(',')[0].strip()

            new_food_item = FoodItem(
                name=name, category=category, kcal_per_100g=kcal,
                carbs_per_100g=carbs, proteins_per_100g=proteins, fats_per_100g=fats,
                sugars_per_100g=sugars, fiber_per_100g=fiber, sodium_mg_per_100g=sodium,
                image_url=image_url, barcode_upc=barcode
            )
            db.session.add(new_food_item)
            db.session.commit()
            return jsonify(new_food_item.to_dict()), 200
        
        return jsonify({'message': 'Product not found via barcode or external API issue. Did you scan correctly?'}), 404
    except requests.exceptions.RequestException as e:
        return jsonify({'message': f'Error contacting external API: {str(e)}. Check your internet, rookie!'}), 500

# --- PASTI (richiede ID utente) ---
@app.route('/api/meals', methods=['POST'])
@login_required
def add_meal_route(user_id): # user_id viene dal decorator
    data = request.get_json()
    description = data.get('description', 'Pasto non specificato')
    items_data = data.get('items', [])

    if not items_data:
        return jsonify({'message': 'No food items provided for the meal. Are you fasting or just forgetting?'}), 400

    new_meal = Meal(user_id=user_id, description=description)
    db.session.add(new_meal)
    db.session.flush()

    total_meal_kcal = 0
    for item_data in items_data:
        food_item_id = item_data.get('food_item_id')
        grams_consumed = item_data.get('grams_consumed')

        if not food_item_id or not grams_consumed or grams_consumed <= 0:
            db.session.rollback()
            return jsonify({'message': 'Invalid food item details in meal. Check your inputs!'}), 400

        food_item = FoodItem.query.get(food_item_id)
        if not food_item:
            db.session.rollback()
            return jsonify({'message': f'Food item with ID {food_item_id} not found. Is it from another dimension?'}), 404

        kcal = (food_item.kcal_per_100g / 100) * grams_consumed
        carbs = (food_item.carbs_per_100g / 100) * grams_consumed
        proteins = (food_item.proteins_per_100g / 100) * grams_consumed
        fats = (food_item.fats_per_100g / 100) * grams_consumed
        
        total_meal_kcal += kcal

        new_meal_item = MealItem(
            meal_id=new_meal.id,
            food_item_id=food_item_id,
            grams_consumed=grams_consumed,
            kcal_total_item=kcal,
            carbs_item=carbs,
            proteins_item=proteins,
            fats_item=fats
        )
        db.session.add(new_meal_item)
    
    db.session.commit()
    return jsonify({
        'message': 'Meal added successfully! Your caloric debt is piling up!', 
        'meal': new_meal.to_dict(include_items=True),
        'total_meal_kcal': round(total_meal_kcal, 2)
    }), 201

@app.route('/api/meals/daily', methods=['GET'])
@login_required
def get_daily_meals_route(user_id): # user_id viene dal decorator
    start_of_day, end_of_day = get_daily_time_range()
    
    meals = Meal.query.filter(
        Meal.user_id == user_id,
        Meal.meal_time >= start_of_day,
        Meal.meal_time <= end_of_day
    ).order_by(Meal.meal_time.asc()).all()

    total_daily_kcal = 0
    meals_data = []
    for meal in meals:
        meal_items_data = []
        for item in meal.meal_items:
            meal_items_data.append({
                'food_item_name': item.food_item.name,
                'grams_consumed': item.grams_consumed,
                'kcal_total': round(item.kcal_total_item, 2),
                'image_url': item.food_item.image_url
            })
            total_daily_kcal += item.kcal_total_item
        
        meals_data.append({
            'meal_id': meal.id,
            'description': meal.description,
            'meal_time': meal.meal_time.isoformat(),
            'items': meal_items_data,
            'total_kcal_in_meal': round(sum(item['kcal_total'] for item in meal_items_data), 2)
        })
    
    return jsonify({
        'meals': meals_data,
        'total_daily_kcal_ingested': round(total_daily_kcal, 2)
    })

# --- GENERAZIONE WORKOUT ---
@app.route('/api/generate_workout', methods=['POST'])
@login_required
def generate_workout_route(user_id): # user_id viene dal decorator
    data = request.get_json()
    kcal_to_burn = data.get('kcal_to_burn')

    if not kcal_to_burn or kcal_to_burn <= 0:
        return jsonify({'message': 'Invalid kcal_to_burn value. Did you eat nothing, or are you a ghost?'}), 400
    
    user = User.query.get_or_404(user_id)
    exercises = Exercise.query.all()

    if not exercises:
        return jsonify({'message': 'No exercises defined. How do you expect to suffer?'}), 500

    workout_plan, estimated_time = generate_workout_logic(kcal_to_burn, user.weight_kg, exercises)

    if not workout_plan:
        return jsonify({'message': 'Could not generate a suitable workout plan. Maybe try eating less or add more brutal exercises!'}), 500

    new_workout = GeneratedWorkout(
        user_id=user_id,
        kcal_to_burn=kcal_to_burn,
        estimated_total_time_min=estimated_time,
        workout_details_json=json.dumps(workout_plan)
    )
    db.session.add(new_workout)
    db.session.commit()

    return jsonify({
        'message': 'Workout generated successfully! Your pain is just beginning!',
        'workout': new_workout.to_dict()
    }), 201

@app.route('/api/workouts/history', methods=['GET'])
@login_required
def get_workout_history_route(user_id): # user_id viene dal decorator
    workouts = GeneratedWorkout.query.filter_by(user_id=user_id).order_by(GeneratedWorkout.generation_date.desc()).all()
    return jsonify([w.to_dict() for w in workouts])

# --- REPORT PDF ---
@app.route('/api/workout_report/<int:workout_id>/pdf', methods=['GET'])
@login_required
def get_workout_pdf_report_route(user_id, workout_id): # user_id viene dal decorator
    workout = GeneratedWorkout.query.filter_by(id=workout_id, user_id=user_id).first_or_404()
    user = User.query.get_or_404(user_id)

    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    p.setFillColor('black')
    p.rect(0, 0, width, height, fill=1)
    p.setFillColor('white')

    p.setFont("Helvetica-Bold", 24)
    p.drawCentredString(width / 2, height - inch, "🔥 IL TUO REPORT DI BATTAGLIA 🔥")
    
    p.setStrokeColorRGB(1, 0, 0)
    p.line(inch, height - inch - 0.2 * inch, width - inch, height - inch - 0.2 * inch)

    p.setFont("Helvetica-Bold", 16)
    p.drawString(inch, height - inch - 0.7 * inch, f"Guerriero: {user.username}")
    p.drawString(inch, height - inch - 1.0 * inch, f"Data del Giudizio: {workout.generation_date.strftime('%d/%m/%Y %H:%M')}")
    
    p.setFont("Helvetica", 14)
    p.drawString(inch, height - inch - 1.5 * inch, f"Kcal da Bruciare (Il Tuo Debito):")
    p.setFont("Helvetica-Bold", 20)
    p.setFillColor('red')
    p.drawString(inch + 0.5 * inch, height - inch - 1.9 * inch, f"{workout.kcal_to_burn:.2f} Kcal")
    p.setFillColor('white')

    p.setFont("Helvetica", 14)
    p.drawString(inch, height - inch - 2.5 * inch, f"Tempo Stimato di Agonia:")
    p.setFont("Helvetica-Bold", 20)
    p.setFillColor('red')
    p.drawString(inch + 0.5 * inch, height - inch - 2.9 * inch, f"{workout.estimated_total_time_min:.1f} minuti")
    p.setFillColor('white')

    p.setFont("Helvetica-Bold", 18)
    p.drawString(inch, height - inch - 3.5 * inch, "💀 IL TUO PIANO DI TORTURA 💀")
    
    y_position = height - inch - 4.0 * inch
    p.setFont("Helvetica", 12)
    workout_details = json.loads(workout.workout_details_json)
    
    for item in workout_details:
        if y_position < inch:
            p.showPage()
            p.setFillColor('black')
            p.rect(0, 0, width, height, fill=1)
            p.setFillColor('white')
            y_position = height - inch
            p.setFont("Helvetica-Bold", 18)
            p.drawString(inch, y_position, "💀 CONTINUA IL PIANO 💀")
            y_position -= 0.5 * inch
            p.setFont("Helvetica", 12)
        
        p.drawString(inch + 0.2 * inch, y_position, f"• {item['exercise_name']} ({item['exercise_acronym']}): {item['duration_min']:.1f} minuti (Brucerai: {item['kcal_burned_segment']:.2f} kcal)")
        y_position -= 0.25 * inch

    p.showPage()
    p.save()

    buffer.seek(0)
    response = make_response(buffer.getvalue())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=workout_report_{workout.id}.pdf'
    return response

# --- POPOLAMENTO INIZIALE DEL DATABASE (Endpoint per test) ---
@app.route('/api/seed_food_items', methods=['POST'])
def seed_food_items():
    try:
        if FoodItem.query.first():
            return jsonify({'message': 'Food items already seeded. Go eat something real!'}), 200

        food_items_data = [
            {'name': 'Pizza Margherita (Fetta)', 'category': 'Pizza', 'kcal_per_100g': 280.0, 'carbs_per_100g': 32.0, 'proteins_per_100g': 11.0, 'fats_per_100g': 12.0, 'image_url': 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Eq_sushi_pizzaria-sushi.jpg'},
            {'name': 'Tiramisu (Porzione)', 'category': 'Dolce', 'kcal_per_100g': 380.0, 'carbs_per_100g': 40.0, 'proteins_per_100g': 7.0, 'fats_per_100g': 22.0, 'image_url': 'https://upload.wikimedia.org/wikipedia/commons/2/22/Tiramisu_-_delizie_del_palato.jpg'},
            {'name': 'Petto di Pollo Grigliato', 'category': 'Carne', 'kcal_per_100g': 165.0, 'carbs_per_100g': 0.0, 'proteins_per_100g': 31.0, 'fats_per_100g': 3.6, 'image_url': 'https://www.comedonchisciotte.org/wp-content/uploads/2021/08/petto-di-pollo.jpg'},
            {'name': 'Cornetto alla Crema', 'category': 'Dolce', 'kcal_per_100g': 350.0, 'carbs_per_100g': 45.0, 'proteins_per_100g': 6.0, 'fats_per_100g': 18.0, 'image_url': 'https://www.ricettadelgiorno.it/wp-content/uploads/2021/01/cornetti-alla-crema.jpg'},
            {'name': 'Pasta alla Carbonara (Piatto)', 'category': 'Pasta', 'kcal_per_100g': 300.0, 'carbs_per_100g': 35.0, 'proteins_per_100g': 15.0, 'fats_per_100g': 12.0, 'image_url': 'https://www.giallozafferano.it/images/229-22927/Spaghetti-alla-Carbonara_650x433_wm.jpg'},
            {'name': 'Hamburger con Formaggio', 'category': 'Fast Food', 'kcal_per_100g': 285.0, 'carbs_per_100g': 25.0, 'proteins_per_100g': 15.0, 'fats_per_100g': 14.0, 'image_url': 'https://www.cucchiaio.it/images/ricette/2016/06/ricetta-hamburger-con-formaggio/ricetta-hamburger-con-formaggio.jpg'},
            {'name': 'Mela Rossa', 'category': 'Frutta', 'kcal_per_100g': 52.0, 'carbs_per_100g': 14.0, 'proteins_per_100g': 0.3, 'fats_per_100g': 0.2, 'fiber_per_100g': 2.4, 'image_url': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Red_Apple.jpg/1200px-Red_Apple.jpg'},
            {'name': 'Salmone al Forno', 'category': 'Pesce', 'kcal_per_100g': 208.0, 'carbs_per_100g': 0.0, 'proteins_per_100g': 20.0, 'fats_per_100g': 13.0, 'image_url': 'https://www.cucchiaio.it/images/ricette/2019/02/ricetta-salmone-al-forno/ricetta-salmone-al-forno.jpg'},
            {'name': 'Insalata Mista (senza condimento)', 'category': 'Verdura', 'kcal_per_100g': 15.0, 'carbs_per_100g': 3.0, 'proteins_per_100g': 1.0, 'fats_per_100g': 0.2, 'fiber_per_100g': 1.5, 'image_url': 'https://static.my-personaltrainer.it/2.0/alimentazione/ricette/insalata-mista/insalata-mista.jpeg'}
        ]
        
        for data in food_items_data:
            food_item = FoodItem(**data)
            db.session.add(food_item)
        db.session.commit()
        return jsonify({'message': 'Sample food items seeded successfully!'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error seeding food items: {str(e)}. Fix your code, you pathetic excuse for a developer!'}), 500

@app.route('/api/seed_exercises', methods=['POST'])
def seed_exercises():
    try:
        if Exercise.query.first():
            return jsonify({'message': 'Exercises already seeded. Go train instead of seeding!'}), 200

        exercises_data = [
            {'name': 'Burpees', 'acronym': 'BUR', 'kcal_per_kg_per_min': 0.15, 'description': 'Un inferno completo per tutto il corpo.'}, 
            {'name': 'Thrusters', 'acronym': 'THR', 'kcal_per_kg_per_min': 0.18, 'description': 'Combinazione di squat e spinta sopra la testa. Brucia i polmoni.'}, 
            {'name': 'Rowing (Intenso)', 'acronym': 'ROW', 'kcal_per_kg_per_min': 0.13, 'description': 'Voga con tutta la forza per un cardio estremo.'}, 
            {'name': 'Pull-ups', 'acronym': 'PU', 'kcal_per_kg_per_min': 0.10, 'description': 'Trazioni alla sbarra. Forza della parte superiore del corpo.'}, 
            {'name': 'Box Jumps', 'acronym': 'BJ', 'kcal_per_kg_per_min': 0.12, 'description': 'Salti su una scatola. Esplosività delle gambe.'},
            {'name': 'Kettlebell Swings', 'acronym': 'KBS', 'kcal_per_kg_per_min': 0.14, 'description': 'Movimento balistico per tutto il corpo, specialmente glutei e core.'},
            {'name': 'Wall Balls', 'acronym': 'WB', 'kcal_per_kg_per_min': 0.16, 'description': 'Squat con lancio di palla medica a muro. Un killer per gambe e spalle.'},
            {'name': 'Deadlifts', 'acronym': 'DL', 'kcal_per_kg_per_min': 0.17, 'description': 'Sollevamento da terra. Costruisce forza bruta, ma attenzione alla tecnica!'}
        ]

        for data in exercises_data:
            exercise = Exercise(**data)
            db.session.add(exercise)
        db.session.commit()
        return jsonify({'message': 'Sample exercises seeded successfully!'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error seeding exercises: {str(e)}. Your database is weak!'}), 500
    ```

**Installa PyJWT:** `pip install PyJWT`

---

### Frontend: Guida Step-by-Step e Codice

#### 1. Configurazione Iniziale (vedi istruzioni di Step 1 sopra per `tailwind.config.js` e `index.css`)

#### 2. `frontend/src/api/backendApi.ts` (Aggiornato con le nuove API di autenticazione)

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const backendApi = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor per aggiungere il token JWT alle richieste autenticate
backendApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Endpoint per Autenticazione e Profilo Utente
export const auth = {
    register: (userData: any) => backendApi.post('/register', userData),
    login: (credentials: any) => backendApi.post('/login', credentials),
    getProfile: () => backendApi.get('/profile'), // Ottiene il profilo dell'utente (registrato o guest)
    updateProfile: (profileData: any) => backendApi.put('/profile', profileData), // Aggiorna solo per registrati
};

// Endpoint per Alimenti (accessibili a tutti)
export const food = {
    getAll: () => backendApi.get('/fooditems'),
    search: (query: string) => backendApi.get(`/fooditems/search?q=${query}`),
    getByBarcode: (barcode: string) => backendApi.get(`/fooditems/barcode/${barcode}`),
    seed: () => backendApi.post('/seed_food_items'),
};

// Endpoint per Pasti (richiedono ID utente gestito dal backend tramite JWT o fisso)
export const meals = {
    add: (mealData: any) => backendApi.post(`/meals`, mealData),
    getDaily: () => backendApi.get(`/meals/daily`),
};

// Endpoint per Workout (richiedono ID utente gestito dal backend)
export const workout = {
    generate: (kcalToBurn: number) => backendApi.post(`/generate_workout`, { kcal_to_burn: kcalToBurn }),
    getHistory: () => backendApi.get(`/workouts/history`),
    getReportPdf: (workoutId: number) => backendApi.get(`/workout_report/${workoutId}/pdf`, { responseType: 'blob' }),
    seedExercises: () => backendApi.post('/seed_exercises'),
};