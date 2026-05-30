import os
import re

# Add __init__.py to all subdirectories in src
for root, dirs, files in os.walk('backend/src'):
    if '__init__.py' not in files:
        open(os.path.join(root, '__init__.py'), 'a').close()

replacements = [
    (r'from database\.models', r'from core.entities.models'),
    (r'import database\.models', r'import core.entities.models'),
    (r'from database\.user_models', r'from core.entities.user_models'),
    (r'import database\.user_models', r'import core.entities.user_models'),
    (r'from database\.connection', r'from infrastructure.connection'),
    (r'import database\.connection', r'import infrastructure.connection'),
    (r'from database\.repositories', r'from core.repositories.repositories'),
    (r'import database\.repositories', r'import core.repositories.repositories'),
    (r'from database\.user_repositories', r'from core.repositories.user_repositories'),
    (r'from database\.lgpd_repositories', r'from core.repositories.lgpd_repositories'),
    (r'from config import', r'from core.config import'),
    (r'import config', r'import core.config'),
    (r'from api\.', r'from infrastructure.api.'),
]

for root, dirs, files in os.walk('backend'):
    for file in files:
        if file.endswith('.py') and file != 'scratch_refactor.py':
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

print("Done refactoring imports.")
