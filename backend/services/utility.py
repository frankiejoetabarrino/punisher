import math
import random
from datetime import datetime, timedelta

def calculate_bmr(gender, age, weight_kg, height_cm):
    """Calcola il Metabolismo Basale (BMR) usando la formula Mifflin-St Jeor."""
    if gender.upper() == 'M':
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    elif gender.upper() == 'F':
        return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
    else:
        # Valori di fallback se i dati non sono validi o presenti (per utente guest o incompleto)
        return (10 * 70) + (6.25 * 170) - (5 * 30) + 5 # BMR medio per un uomo di 30 anni, 70kg, 170cm

def generate_workout_logic(kcal_to_burn, user_weight_kg, available_exercises, max_exercise_duration_min=15):
    """
    Genera un piano di workout per bruciare un certo numero di calorie.
    Tenta di distribuire il carico su più esercizi, evitando durate eccessive per uno solo.
    """
    if not available_exercises or kcal_to_burn <= 0:
        return [], 0 

    workout_plan = []
    remaining_kcal_to_burn = kcal_to_burn
    estimated_total_time_min = 0

    sorted_exercises = sorted(available_exercises, key=lambda x: x.kcal_per_kg_per_min, reverse=True)
    
    exercise_pool = list(sorted_exercises)
    random.shuffle(exercise_pool)

    while remaining_kcal_to_burn > 0 and (len(exercise_pool) > 0 or len(sorted_exercises) > 0):
        if not exercise_pool:
            exercise_pool = list(sorted_exercises)
            random.shuffle(exercise_pool)
            if not exercise_pool: 
                break

        current_exercise = exercise_pool.pop(0)

        kcal_per_minute_for_user = current_exercise.kcal_per_kg_per_min * user_weight_kg
        
        if kcal_per_minute_for_user <= 0:
            continue

        max_duration_for_current_exercise = max_exercise_duration_min

        required_duration_for_remaining_kcal = remaining_kcal_to_burn / kcal_per_minute_for_user

        duration_min = max(5.0, min(max_duration_for_current_exercise, required_duration_for_remaining_kcal))
        
        kcal_burned_this_segment = kcal_per_minute_for_user * duration_min
        
        workout_plan.append({
            'exercise_id': current_exercise.id,
            'exercise_acronym': current_exercise.acronym,
            'exercise_name': current_exercise.name,
            'duration_min': round(duration_min, 1),
            'kcal_burned_segment': round(kcal_burned_this_segment, 2)
        })
        
        remaining_kcal_to_burn -= kcal_burned_this_segment
        estimated_total_time_min += duration_min
    
    return workout_plan, round(estimated_total_time_min, 1)

def get_daily_time_range():
    """Restituisce il range temporale per la giornata corrente in UTC."""
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())
    return start_of_day, end_of_day