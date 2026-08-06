# socketio_server.py - Standalone Socket.IO server
import os
import sys
import django
import socketio
import asyncio
from aiohttp import web

# Add the backend_app directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_app.settings')
django.setup()

from backend.models import Call, CallParticipant, User
from backend.serializers import CallSerializer, CallParticipantSerializer

# Create a Socket.IO server
sio = socketio.AsyncServer(
    async_mode='aiohttp',
    cors_allowed_origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
    logger=True,
    engineio_logger=True
)

# Store connected users
connected_users = {}

@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")
    # Join user room if user_id is in auth
    user_id = auth.get('user_id') if auth else None
    if user_id:
        connected_users[sid] = user_id
        await sio.enter_room(sid, f"user_{user_id}")
        print(f"User {user_id} joined room with sid {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    # Remove user from connected users
    if sid in connected_users:
        user_id = connected_users[sid]
        del connected_users[sid]
        # Leave user room
        await sio.leave_room(sid, f"user_{user_id}")

@sio.event
async def join_user_room(sid, data):
    """Join a user-specific room for private notifications"""
    user_id = data.get('user_id')
    if user_id:
        connected_users[sid] = user_id
        await sio.enter_room(sid, f"user_{user_id}")
        print(f"User {user_id} joined room with sid {sid}")

@sio.event
async def join_chat_room(sid, data):
    """Join a chat room for real-time messaging"""
    chat_id = data.get('chat_id')
    if chat_id:
        await sio.enter_room(sid, f"chat_{chat_id}")
        print(f"Client {sid} joined chat room {chat_id}")

@sio.event
async def leave_chat_room(sid, data):
    """Leave a chat room"""
    chat_id = data.get('chat_id')
    if chat_id:
        await sio.leave_room(sid, f"chat_{chat_id}")
        print(f"Client {sid} left chat room {chat_id}")

@sio.event
async def join_call_room(sid, data):
    """Join a call room for WebRTC signaling"""
    call_id = data.get('call_id')
    if call_id:
        await sio.enter_room(sid, f"call_{call_id}")
        print(f"Client {sid} joined call room {call_id}")

@sio.event
async def leave_call_room(sid, data):
    """Leave a call room"""
    call_id = data.get('call_id')
    if call_id:
        await sio.leave_room(sid, f"call_{call_id}")
        print(f"Client {sid} left call room {call_id}")

@sio.event
async def call_initiated(sid, data):
    """Broadcast call initiation to other participants"""
    call_id = data.get('call_id')
    chat_id = data.get('chat_id')
    initiated_by = data.get('initiated_by')
    
    if call_id and chat_id:
        # Get call details
        try:
            call = Call.objects.get(id=call_id)
            serializer = CallSerializer(call)
            
            # Get chat participants excluding the initiator
            participants = call.chat.participants.exclude(id=initiated_by)
            
            # Send to each participant's user room
            for participant in participants:
                await sio.emit('incoming_call', {'call': serializer.data}, room=f"user_{participant.id}")
                print(f"Sent incoming_call to user {participant.id}")
                
        except Call.DoesNotExist:
            print(f"Call {call_id} not found")

@sio.event
async def call_answered(sid, data):
    """Broadcast call answer to call room"""
    call_id = data.get('call_id')
    if call_id:
        await sio.emit('call_answered', data, room=f"call_{call_id}")
        print(f"Call {call_id} answered")

@sio.event
async def call_rejected(sid, data):
    """Broadcast call rejection to call room"""
    call_id = data.get('call_id')
    if call_id:
        await sio.emit('call_rejected', data, room=f"call_{call_id}")
        print(f"Call {call_id} rejected")

@sio.event
async def call_ended(sid, data):
    """Broadcast call end to call room"""
    call_id = data.get('call_id')
    reason = data.get('reason', 'call ended')
    if call_id:
        await sio.emit('call_ended', {'call_id': call_id, 'reason': reason}, room=f"call_{call_id}")
        print(f"Call {call_id} ended: {reason}")

@sio.event
async def webrtc_signal(sid, data):
    """Relay WebRTC signaling messages between peers"""
    call_id = data.get('call_id')
    target_user_id = data.get('target_user_id')
    signal = data.get('signal')
    
    if call_id and target_user_id:
        # Send to specific user in the call room
        await sio.emit('webrtc_signal', {
            'call_id': call_id,
            'from_user_id': connected_users.get(sid),
            'signal': signal
        }, room=f"user_{target_user_id}")
        print(f"WebRTC signal sent to user {target_user_id}")

@sio.event
async def typing_start(sid, data):
    """Broadcast typing indicator to chat room"""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    if chat_id and user_id:
        await sio.emit('typing_start', {'user_id': user_id, 'chat_id': chat_id}, room=f"chat_{chat_id}", skip_sid=sid)

@sio.event
async def typing_end(sid, data):
    """Broadcast typing end to chat room"""
    chat_id = data.get('chat_id')
    user_id = data.get('user_id')
    if chat_id and user_id:
        await sio.emit('typing_end', {'user_id': user_id, 'chat_id': chat_id}, room=f"chat_{chat_id}", skip_sid=sid)

@sio.event
async def message_sent(sid, data):
    """Broadcast new message to chat room"""
    chat_id = data.get('chat_id')
    message = data.get('message')
    if chat_id and message:
        await sio.emit('new_message', message, room=f"chat_{chat_id}")

@sio.event
async def ping(sid):
    """Ping-pong for connection health check"""
    await sio.emit('pong', to=sid)

# Create aiohttp app
app = web.Application()
sio.attach(app)

# HTTP endpoint for Django backend to emit events
async def handle_call_initiated(request):
    """Handle call initiation from Django backend"""
    try:
        data = await request.json()
        call_id = data.get('call_id')
        chat_id = data.get('chat_id')
        initiated_by = data.get('initiated_by')
        
        if call_id and chat_id:
            # Get call details using sync_to_async
            from asgiref.sync import sync_to_async
            
            async def get_call_data():
                try:
                    call = await sync_to_async(Call.objects.get)(id=call_id)
                    serializer = CallSerializer(call)
                    
                    # Get chat participants excluding the initiator
                    participants = await sync_to_async(call.chat.participants.exclude)(id=initiated_by)
                    
                    # Send to each participant's user room
                    for participant in participants:
                        await sio.emit('incoming_call', {'call': serializer.data}, room=f"user_{participant.id}")
                        print(f"Sent incoming_call to user {participant.id}")
                        
                except Call.DoesNotExist:
                    print(f"Call {call_id} not found")
            
            await get_call_data()
        
        return web.json_response({'status': 'ok'})
    except Exception as e:
        print(f"Error handling call_initiated: {e}")
        import traceback
        traceback.print_exc()
        return web.json_response({'status': 'error'}, status=500)

app.router.add_post('/call_initiated', handle_call_initiated)

if __name__ == '__main__':
    print("Starting Socket.IO server on port 8001...")
    web.run_app(app, port=8001)
