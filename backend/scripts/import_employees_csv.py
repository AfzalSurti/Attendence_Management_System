"""Import employees/projects from a CSV file into the database."""
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")

from app.database import SessionLocal  # noqa: E402
from app.services.bulk_import import import_employee_rows, parse_upload_file  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_employees_csv.py <path-to-csv>")
        sys.exit(1)

    csv_path = Path(sys.argv[1])
    if not csv_path.is_file():
        print(f"File not found: {csv_path}")
        sys.exit(1)

    content = csv_path.read_bytes()
    rows = parse_upload_file(csv_path.name, content)
    db = SessionLocal()
    try:
        result = import_employee_rows(db, rows)
        print("Import complete:")
        for key, value in result.items():
            print(f"  {key}: {value}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
