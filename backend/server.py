from fastapi import FastAPI, APIRouter, HTTPException, Query
import httpx
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Probe endpoint for the deployer and pod health checks: root-level (not /api), no DB call.
@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

EVENTS_API_URL_TEMPLATE = os.environ['EVENTS_API_URL_TEMPLATE']


@api_router.get("/calendar-events")
async def calendar_events(year: int = Query(..., ge=1900, le=2100), month: int = Query(..., ge=1, le=12)):
    url = EVENTS_API_URL_TEMPLATE.format(year=year, month=month)
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as http:
            res = await http.get(url)
        res.raise_for_status()
        data = res.json()
    except Exception as exc:
        logger.warning("Events API failed for %s: %s", url, exc)
        raise HTTPException(status_code=424, detail="Could not load events from the events service")
    days = data.get("days") if isinstance(data, dict) else None
    if not isinstance(days, dict):
        raise HTTPException(status_code=424, detail="Events service returned an unexpected response")
    return {
        "year": data.get("year", year),
        "month": data.get("month", month),
        "totalEvents": data.get("totalEvents", sum(len(v) for v in days.values() if isinstance(v, list))),
        "days": {k: v for k, v in days.items() if isinstance(v, list)},
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
