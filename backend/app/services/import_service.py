from typing import Optional

import csv
import os
from datetime import date as DateType, datetime
from loguru import logger
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.crossing import Crossing
from app.models.slackline import Component, Point, Slackline
from app.config import settings

DATA_DIR = settings.DATA_DIR
FIELD_TYPE_MAP = {
    "firstAnchorPoint": "first_anchor_point",
    "secondAnchorPoint": "second_anchor_point",
    "parkingSpot": "parking_spot",
}
def parse_date(val: str) -> Optional[DateType]:
    if not val or val.strip() == "":
        return None
    try:
        return datetime.strptime(val.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None
def parse_datetime(val: str) -> Optional[datetime]:
    if not val or val.strip() == "":
        return None
    for fmt in ["%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"]:
        try:
            return datetime.strptime(val.strip(), fmt)
        except ValueError:
            continue
    return None
def parse_float(val: str) -> Optional[float]:
    if not val or val.strip() == "":
        return None
    try:
        return float(val.strip())
    except ValueError:
        return None
def parse_int(val: str) -> Optional[int]:
    if not val or val.strip() == "":
        return None
    try:
        return int(val.strip())
    except ValueError:
        return None
def parse_bool(val: str) -> Optional[bool]:
    if not val or val.strip() == "":
        return None
    return val.strip().lower() in ("true", "1", "yes")
def read_csv(filename: str) -> list[dict]:
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        logger.error(f"CSV file not found: {filepath}")
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)
async def import_all(db: AsyncSession) -> dict:
    errors = []
    results = {
        "points_imported": 0,
        "slacklines_imported": 0,
        "components_imported": 0,
        "crossings_imported": 0,
        "errors": errors,
    }
    # 1. Import points
    logger.info("Importing points...")
    rows = read_csv("components_point_anchor_points_202211171655.csv")
    for row in rows:
        try:
            point_id = int(row["id"])
            await db.execute(
                text("""
                    INSERT INTO points (id, description, latitude, longitude)
                    VALUES (:id, :description, :latitude, :longitude)
                    ON CONFLICT (id) DO UPDATE SET
                        description = EXCLUDED.description,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude
                """),
                {
                    "id": point_id,
                    "description": row.get("description") or None,
                    "latitude": float(row["latitude"]),
                    "longitude": float(row["longitude"]),
                },
            )
            results["points_imported"] += 1
        except Exception as e:
            errors.append(f"Point {row.get('id')}: {e}")
            logger.error(f"Error importing point {row.get('id')}: {e}")
    # 2. Import slacklines
    logger.info("Importing slacklines...")
    rows = read_csv("slacklines_202211171655.csv")
    for row in rows:
        try:
            sl_id = int(row["id"])
            await db.execute(
                text("""
                    INSERT INTO slacklines (id, name, description, state, region, sector,
                        length, height, author, name_history, date_tense, date_insertion,
                        time_approach, time_tensioning, rating, created_at, updated_at)
                    VALUES (:id, :name, :description, :state, :region, :sector,
                        :length, :height, :author, :name_history, :date_tense, :date_insertion,
                        :time_approach, :time_tensioning, :rating, :created_at, :updated_at)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        state = EXCLUDED.state,
                        region = EXCLUDED.region,
                        sector = EXCLUDED.sector,
                        length = EXCLUDED.length,
                        height = EXCLUDED.height,
                        author = EXCLUDED.author,
                        name_history = EXCLUDED.name_history,
                        date_tense = EXCLUDED.date_tense,
                        date_insertion = EXCLUDED.date_insertion,
                        time_approach = EXCLUDED.time_approach,
                        time_tensioning = EXCLUDED.time_tensioning,
                        rating = EXCLUDED.rating,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": sl_id,
                    "name": row["name"],
                    "description": row.get("description") or None,
                    "state": row.get("state") or None,
                    "region": row.get("region") or None,
                    "sector": row.get("sector") or None,
                    "length": parse_float(row.get("length", "")),
                    "height": parse_float(row.get("height", "")),
                    "author": row.get("author") or None,
                    "name_history": row.get("name_history") or None,
                    "date_tense": parse_date(row.get("date_tense", "")),
                    "date_insertion": parse_date(row.get("date_insertion", "")),
                    "time_approach": row.get("time_approach") or None,
                    "time_tensioning": row.get("time_tensioning") or None,
                    "rating": parse_int(row.get("rating", "")),
                    "created_at": parse_datetime(row.get("created_at", "")),
                    "updated_at": parse_datetime(row.get("updated_at", "")),
                },
            )
            results["slacklines_imported"] += 1
        except Exception as e:
            errors.append(f"Slackline {row.get('id')}: {e}")
            logger.error(f"Error importing slackline {row.get('id')}: {e}")
    # Update slacklines id sequence
    await db.execute(text("SELECT setval('slacklines_id_seq', (SELECT COALESCE(MAX(id), 1) FROM slacklines))"))
    # 3. Import components
    logger.info("Importing components...")
    rows = read_csv("slacklines_components_202211171655.csv")
    for row in rows:
        try:
            comp_id = int(row["id"])
            field_val = row.get("field", "")
            comp_type = FIELD_TYPE_MAP.get(field_val, field_val)
            await db.execute(
                text("""
                    INSERT INTO components (id, slackline_id, point_id, component_type, field, "order")
                    VALUES (:id, :slackline_id, :point_id, :component_type, :field, :order)
                    ON CONFLICT (id) DO UPDATE SET
                        slackline_id = EXCLUDED.slackline_id,
                        point_id = EXCLUDED.point_id,
                        component_type = EXCLUDED.component_type,
                        field = EXCLUDED.field,
                        "order" = EXCLUDED."order"
                """),
                {
                    "id": comp_id,
                    "slackline_id": int(row["entity_id"]),
                    "point_id": int(row["component_id"]),
                    "component_type": comp_type,
                    "field": field_val,
                    "order": parse_int(row.get("order", "0")),
                },
            )
            results["components_imported"] += 1
        except Exception as e:
            errors.append(f"Component {row.get('id')}: {e}")
            logger.error(f"Error importing component {row.get('id')}: {e}")
    # 4. Import crossings (slackline records)
    logger.info("Importing crossings...")
    # Build link maps first
    sl_links = {}
    for row in read_csv("slackline_records_slackline_links_202211171655.csv"):
        sl_links[int(row["slackline_record_id"])] = int(row["slackline_id"])
    rows = read_csv("slackline_records_202211171655.csv")
    for row in rows:
        try:
            c_id = int(row["id"])
            slackline_id = sl_links.get(c_id)
            if slackline_id is None:
                errors.append(f"Crossing {c_id}: no slackline link found")
                continue
            await db.execute(
                text("""
                    INSERT INTO crossings (id, slackline_id, date, style, accent_description,
                        rating, project, created_at, updated_at)
                    VALUES (:id, :slackline_id, :date, :style, :accent_description,
                        :rating, :project, :created_at, :updated_at)
                    ON CONFLICT (id) DO UPDATE SET
                        slackline_id = EXCLUDED.slackline_id,
                        date = EXCLUDED.date,
                        style = EXCLUDED.style,
                        accent_description = EXCLUDED.accent_description,
                        rating = EXCLUDED.rating,
                        project = EXCLUDED.project,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "id": c_id,
                    "slackline_id": slackline_id,
                    "date": parse_date(row.get("date", "")),
                    "style": row.get("style") or None,
                    "accent_description": row.get("accent_description") or None,
                    "rating": parse_int(row.get("rating", "")),
                    "project": parse_bool(row.get("project", "")),
                    "created_at": parse_datetime(row.get("created_at", "")),
                    "updated_at": parse_datetime(row.get("updated_at", "")),
                },
            )
            results["crossings_imported"] += 1
        except Exception as e:
            errors.append(f"Crossing {row.get('id')}: {e}")
            logger.error(f"Error importing crossing {row.get('id')}: {e}")
    # Update crossings id sequence
    await db.execute(text("SELECT setval('crossings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM crossings))"))
    await db.commit()
    logger.info(f"Import complete: {results}")
    return results
