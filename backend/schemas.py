from pydantic import BaseModel
from typing import List

class MealIn(BaseModel):
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float

class WorkoutExercise(BaseModel):
    name: str
    duration: int

class WorkoutPlan(BaseModel):
    total_calories: float
    exercises: List[WorkoutExercise]
