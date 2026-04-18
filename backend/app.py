from fastapi import FastAPI
from routes import generation_route
from dotenv import load_dotenv
load_dotenv()
app = FastAPI()

app.include_router(generation_route)
