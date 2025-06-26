from fastapi import FastAPI
from .routes.meals import router as meals_router

app = FastAPI(title="Exercise-Suggestion API", version="1.0.0")
app.include_router(meals_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
