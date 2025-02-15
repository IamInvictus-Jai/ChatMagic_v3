import json
import asyncio
from django.core.files.base import ContentFile
import base64
from utils.dbHandler import DBHandler
from uuid import uuid4
from utils.chatbot import Aarna
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    activeChatRooms = dict()
    refresh_tracking = dict()  # Track disconnected users for refresh detection

    # Connect to the websocket chat connection
    async def connect(self):
        self.roomID = self.scope['url_route']['kwargs']['roomID']
        self.roomUser = self.scope['url_route']['kwargs']['userID']
        self.room_group_name = f'chat_{self.roomID}'
        self.aarna = Aarna()

        # Add to group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        if self.room_group_name not in ChatConsumer.activeChatRooms:
            ChatConsumer.activeChatRooms[self.room_group_name] = {}
        ChatConsumer.activeChatRooms[self.room_group_name][self.channel_name] = self.roomUser
        
        await self.accept()
    
    # Triggers on Disconnect
    async def disconnect(self, close_code):
        # Start tracking this disconnection for potential refresh
        refresh_key = f"{self.room_group_name}_{self.roomUser}"
        if not self.room_group_name in ChatConsumer.refresh_tracking:
            ChatConsumer.refresh_tracking[self.room_group_name] = {}
        ChatConsumer.refresh_tracking[self.room_group_name][refresh_key] = {
            'timestamp': asyncio.get_event_loop().time(),
            'channel_name': self.channel_name
        }
        # Schedule cleanup and notification after delay
        self.disconnect_task = asyncio.create_task(
            self.handle_delayed_disconnect(refresh_key)
        )
        
        del ChatConsumer.activeChatRooms[self.room_group_name][self.channel_name]
        await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    # Triggers when client sends a message
    async def receive(self, text_data):
        
        text_data_json = json.loads(text_data)
        is_new_connection = text_data_json.get("isNewConnection", False)

        # Handle New Connections
        if is_new_connection:
            await self.handle_firstConnections()            
            return
        
        # Handle Refresh Requests
        elif text_data_json.get("type", None) == "refresh":
            await self.handle_refreshConnections(text_data_json)
            return
        
        # Handle Chat Messages
        await self.handle_chatMessages(text_data_json)

        # Handle Aarna Messages
        if text_data_json.get("message", None).startswith("@:aarna:"):
            await self.aarna_reply(message= text_data_json)
    

    # Delayed Disconnect Task
    async def handle_delayed_disconnect(self, refresh_key):

        try:
            # Wait for a short period before disconnecting
            await asyncio.sleep(5)

            # Check for refresh_key in the dictionary
            if refresh_key not in ChatConsumer.refresh_tracking[self.room_group_name]: return            
            
            # Discard this channel from activeChatRooms
            del ChatConsumer.refresh_tracking[self.room_group_name][refresh_key]

            # Notify others about disconnection
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'update_members',
                    'memberID': self.roomUser,
                    'memberType': 'remove',
                }
            )

            # Check if the group is now empty
            if await self.is_groupEmpty():
                del ChatConsumer.activeChatRooms[self.room_group_name]
                await self.disconnect_all()

        except asyncio.CancelledError:
            pass
        
        except Exception as e:
            print(e)



    # Message Handler
    async def chat_message(self, event):
        # message = event['message']
        # sendersID = event['userID']

        # print(message)
        # print(sendersID)

        await self.send(text_data=json.dumps({
            'userID': event['userID'],
            'message': event['message'],
            "message_id": event["message_id"],
            "dt_time": event["dt_time"],
            'statusCode': 200
        }))
    # Member Update
    async def update_members(self, event):
        memberID = event['memberID']
        memberType = event['memberType']

        match memberType:
            case 'add':
                new_memberList = event['members']
                member_obj = {
                    'new_member': memberID,
                    'new_memberList': sorted(new_memberList),
                    'statusCode': 204
                }
            case 'remove':
                member_obj = {
                    'removed_member': memberID,
                    'statusCode': 206
                }
        
        await self.send(text_data=json.dumps(member_obj))

    async def image_message(self, event):
        message = event['message']
        sendersID = event['userID']

        # print(message)
        # print(sendersID)

        # if ',' in message:
        #     format, base64_str = message.split(',', 1)
        # else:
        #     base64_str = message

        #  # Convert base64 to binary
        # image_data = base64.b64decode(base64_str)
        
        # # Create a ContentFile that Django can handle
        # image_file = ContentFile(image_data, name='temp_image.jpg')


        await self.send(text_data=json.dumps({
            'userID': sendersID,
            'message_id': event["message_id"],
            'message': message,
            'statusCode': 200,
            'type': 'image',
            'dt_time': event["dt_time"]
        }))

    # Supporting functions
    async def handle_firstConnections(self):
        # Add to group and active rooms
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # notify others this is a new connection
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'update_members',
                'memberID': self.roomUser,
                'members': list(ChatConsumer.activeChatRooms[self.room_group_name].values()),
                'memberType': 'add',
            }
        )
    # Supporting functions
    async def handle_refreshConnections(self, text_data_json):
        refresh_key = f"{self.room_group_name}_{self.roomUser}"

        # Cancel the disconnect task
        if hasattr(self, 'disconnect_task'):
            self.disconnect_task.cancel()
        if self.room_group_name in ChatConsumer.refresh_tracking:
            if refresh_key in ChatConsumer.refresh_tracking[self.room_group_name]:
                del ChatConsumer.refresh_tracking[self.room_group_name][refresh_key]

        # Just update user information
        self.roomUser = text_data_json.get("userID", None)

        # Send confirmation
        new_memberList = list(ChatConsumer.activeChatRooms[self.room_group_name].values())
        member_obj = {
            'new_member': self.roomUser,
            'new_memberList': sorted(new_memberList),
            'statusCode': 208
        }
        await self.send(text_data=json.dumps(member_obj))
    # Supporting functions
    async def handle_chatMessages(self, text_data_json):

        db_manager = DBHandler("users")

        sendersID = text_data_json['userID']
        message = text_data_json['message']

        type = text_data_json.get("type", None)
        if type == "image": type = "image_message"
        else: type = "chat_message"


        # Update Database Messages
        try:
            message_data = {
                "message_id": text_data_json.get("message_id", str(uuid4())),
                "message_sender": sendersID,
                "message": message,
                "type": "text" if type == "chat_message" else "image",
                "date_created": text_data_json.get("dt_time", None)
            }

            db_manager.update(
                "messages",
                {"group_id": self.roomID},
                {"$push": {"group_messages": message_data} }
            )
            db_manager.close()
            # print(self.roomID)
            # print("Message Updated !")
        except Exception as e:
            print(f"Error Updating Messages -> {e}")
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': type,
                'userID': sendersID,
                'message': message,
                "message_id": text_data_json.get("message_id", str(uuid4())),
                "dt_time": text_data_json.get("dt_time", None)
            }
        )
    
    async def aarna_reply(self, message):
        aarna_response = await self.aarna.get_response(
            f"message sent by {message['userID']}: {message['message'].replace('@:aarna:', '')}"
        )

        # print(aarna_response)

        if aarna_response:
            sendersID = "aarna-bot"
            db_manager = DBHandler("users")

            # Update Database Messages
            try:
                uuid = str(uuid4())
                message_data = {
                    "message_id": uuid,
                    "message_sender": sendersID,
                    "message": str(aarna_response),
                    "type": "text",
                    "date_created": datetime.now().strftime("%H:%M")
                }

                db_manager.update(
                    "messages",
                    {"group_id": self.roomID},
                    {"$push": {"group_messages": message_data} }
                )
                db_manager.close()
                # print("Message Updated !")

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': "chat_message",
                        'userID': sendersID,
                        'message_id': uuid,
                        'message': aarna_response,
                        'dt_time': message["dt_time"]
                    }
                )

            except Exception as e:
                print(f"Error Updating Messages -> {e}")

            

    async def is_groupEmpty(self):
        try:
            return len(ChatConsumer.activeChatRooms[self.room_group_name]) == 0
        except KeyError:
            return True

    async def disconnect_all(self):
        if self.room_group_name in ChatConsumer.activeChatRooms:
            for channel in list(ChatConsumer.activeChatRooms[self.room_group_name]):
                await self.channel_layer.send(channel, {
                    'type': 'websocket.close'
                })