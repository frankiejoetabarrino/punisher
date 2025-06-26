from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

# Importazioni assolute
from backend.schemas import MealIn, WorkoutPlan
from backend.services.utility import generate_workout_logic
from backend.database import get_db

router = APIRouter(prefix="/meals", tags=["meals"])

@router.post("/", response_model=WorkoutPlan)
def add_meal(meal: MealIn, db: Session = Depends(get_db)):
    try:
        plan = generate_workout_logic(meal.dict())
        return plan
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
