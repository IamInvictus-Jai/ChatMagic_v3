# **Chat-Magic-V-3**
Unleash the power of seamless communication with Chat Magic, the web group chat app that enchants your conversations. Designed with a touch of wizardry and a sprinkle of charm, Chat Magic brings your group interactions to life, making every message feel like a magical incantation.

Now it's more than just a simple chat application.

This is Version 3 of its very first prototype.

## Key Highlights
> + Completely New Architechture and Interface
> + Database Opteraions to store user profiles, messages and session ID
> + Create session ID's for a limited time to improve safety and user validation
> + New chatbot "Aarna" in chat pages just like meta in whatsapp

## **Whats New !**
> + A whole new interface and many advance features
> + UI Improvements and new user experience
> + Bug Fixes
> + New Added Features
> > + User Authentication (Signup and Login)
> > + User Dashboard
> > + User Profile Customizations
> > + Create as many chat groups as you want
> > + Group customizations with group profile pic
> > + Pin/Unpin Feature
> > + Theme Options (Light, Dark, System)
> > + Group Info in Chat page
> > + You can now send images in chat
> > + New member list option to view all the group members and active online members in the group.
> > + New theme preference options in chat page with 5 different themes
> > + Message Deletion
> > + Messages are now saved and persists untill you delete them
> > + New chat bot -> Aarna in chats; use @:aarna: your message to send message to aarna. All the messages are visible to all the other members

## **Features:**
> + Realtime Communication: Utilizes WebSocket technology through django channels and daphne to enable instant messaging between users.
> + Interactive UI: eye catchy ui design to enhance user experiences.
> + Database Implementation: All messages and user profiles are now stored in the database.
> + Multiple chat groups: Allows users to create and join different chat groups, facilitating discussions on various topics.
> + Customize Profile and Groups: note only admins can customize the groups.
> + User Presence Indicators: Displays indicators to show when users are online or left the chat in real-time.
> + Custom Finetuned Chatbot 'Aarna': available in all the chat pages just like meta in whatsapp
> + Send Images in chats: removed voice transcript feature and added image upload feature in chat pages.

## **Technologies Used**
> + Built using HTML, CSS and JS.
> + Django on the backend.
> + Django Channels for websocket connection to enable realtime communication
> + Mongodb Database to store messages, profiles and session ids

## **Installation**
To run this app locally, follow these steps:
> 1. Clone the repository to your local machine
>   ```
>   git clone https://github.com/IamInvictus-Jai/ChatMagic_v3.git
>   ```
> 2. Navigate to the root directory of the project, open the directory in terminal and run
>   ```
>   pip install requirements.txt
>   ```
> 3. Create .env file in the root dir
> 4. Generate your django secret key using the following script
>    ```python
>    from django.core.management.utils import get_random_secret_key
>    secret_key = get_random_secret_key()
>    print(secret_key)
>    ```
> 5. Add these variables to .env file
>   ```
>   SECRET_KEY = your django secret key
>   ALLOWED_HOSTS= 127.0.0.1,localhost
>   MONGODB_USER= your mongodb username
>   MONGODB_PASSWORD= password for mongodb
>   MONGODB_CLUSTER= cluster name
>   AWS_ACCESS_KEY_ID= access key for aws acc
>   AWS_SECRET_ACCESS_KEY= secret access key for aws acc
>   AWS_REGION_NAME= region name for aws acc
>   GEMINI_API_KEY= google gemini api key
>   ```
> *Note: Mongodb and AWS keys are mandatory and you must setup and get the required keys to run this project on your local machine.

> **Note: before proceeding head to static/js/chat.js file and in line 33 change wss://... to ws://... otherwise the connection would fail in local machine.
>   ```js
>   let url = `ws://${window.location.host}/ws/chat/${extractID()}/${userID}/?&_=${timestamp}`;
>   ```
> 6. Once everything is set up, in terminal run
>   ```
>   python manage.py collectstatic
>   ```
> 7. Once done, run
>   ```
>   python manage.py migrate
>   ```
> 8. After the migrations have been applied, you are good to go. run this cmd to start the server
>   ```
>   python manage.py runserver
>   ```
> 9. Access through the link ( http://127.0.0.1:8000/ )  provided using your browser.

## **Future Upgrades**
> + Bug Fixes
> + UI Improvements
> + Performance Optimisation: focus on optimising the code for better performance
> + Emoji Feature: new emoji section in chats
> + New Chat Page Features: chat controls option to allow only admins to send messages, remove specific member, private direct messages, etc
> + AI Bot Image Chat feature: User would be able to chat with aarna using images.
Ex: user send his/her image and ask how he/she is looking and aarna will review and reply to the image.

## **Live Demo**
> Live Deployed Link: https://chatmagic-v3.onrender.com/

> **Note: since it's hosted on a free tier, it may take 40s - 1min to load and there may be chances that the free tier have ended by this time. But no worries you can always try this app on your local machine.

### ***Rate this project and do let me know if you learned something from this project***
### ***For querries you can cantact: prof.techinvictus@gmail.com***

I'll see you in next exciting project 🚀
Happy Coding 🌟