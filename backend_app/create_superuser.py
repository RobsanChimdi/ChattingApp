import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_app.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = 'Robsan'
email = 'robsan.chimdi-ug@aau.edu.et'
password = 'admin123'

if User.objects.filter(username=username).exists():
    user = User.objects.get(username=username)
    # Ensure superuser is verified and online
    user.is_verified = True
    user.is_online = True
    user.save(update_fields=['is_verified', 'is_online'])
    print(f'Superuser "{username}" already exists. Updated verification and online status.')
else:
    user = User.objects.create_superuser(username=username, email=email, password=password)
    user.is_verified = True
    user.is_online = True
    user.save(update_fields=['is_verified', 'is_online'])
    print(f'Superuser "{username}" created successfully.')
    print(f'Username: {username}')
    print(f'Email: {email}')
    print(f'Password: {password}')
