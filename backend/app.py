from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from routes import generation_route, streaming_route
app = FastAPI()

app.include_router(generation_route)
app.include_router(streaming_route)