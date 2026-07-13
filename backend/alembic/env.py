"""
Alembic environment configuration.

Uses the same database connection logic as the main application.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Ensure the src directory is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from core.config import settings
from infrastructure.connection import _parse_database_url, _load_db_config

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override sqlalchemy.url with actual database config
try:
    db_config = _load_db_config()
    url = f"postgresql://{db_config['db_user']}:{db_config['db_password']}@{db_config['db_host']}:{db_config['db_port']}/{db_config['db_name']}"
    sslmode = db_config.get("db_sslmode")
    if sslmode:
        url += f"?sslmode={sslmode}"
    config.set_main_option("sqlalchemy.url", url)
except Exception:
    pass


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=None, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(config.get_section(config.config_ini_section, {}), prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=None)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
