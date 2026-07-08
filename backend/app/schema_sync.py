from sqlalchemy import text


def ensure_schema_updates(engine):
    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE employees "
            "ADD COLUMN IF NOT EXISTS owner_admin_id INTEGER"
        ))
        conn.execute(text(
            "ALTER TABLE employees "
            "ADD COLUMN IF NOT EXISTS admin_permission VARCHAR(20) DEFAULT 'full'"
        ))
        conn.execute(text(
            "ALTER TABLE projects "
            "ADD COLUMN IF NOT EXISTS owner_admin_id INTEGER"
        ))

        conn.execute(text(
            "UPDATE employees SET admin_permission = 'full' "
            "WHERE role = 'admin' AND (admin_permission IS NULL OR admin_permission = '')"
        ))

        admin_id = conn.execute(text(
            "SELECT id FROM employees WHERE role = 'admin' ORDER BY id LIMIT 1"
        )).scalar()

        if admin_id:
            conn.execute(text(
                "UPDATE employees SET owner_admin_id = :admin_id "
                "WHERE role = 'employee' AND owner_admin_id IS NULL"
            ), {"admin_id": admin_id})
            conn.execute(text(
                "UPDATE projects SET owner_admin_id = :admin_id "
                "WHERE owner_admin_id IS NULL"
            ), {"admin_id": admin_id})
