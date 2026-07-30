import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_app.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = 'robsan'

if User.objects.filter(username=username).exists():
    user = User.objects.get(username=username)
    # Ensure user is verified and online
    user.is_verified = True
    user.is_online = True
    user.save(update_fields=['is_verified', 'is_online'])
    print(f'User "{username}" updated successfully.')
    print(f'Username: {user.username}')
    print(f'Email: {user.email}')
    print(f'Is Verified: {user.is_verified}')
    print(f'Is Online: {user.is_online}')
else:
    print(f'User "{username}" not found.')
