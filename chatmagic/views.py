from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt

from json import loads
from icecream import ic
from datetime import datetime, timedelta
from uuid import uuid5, NAMESPACE_URL, uuid4
from functools import wraps
from asyncio import run
from io import BytesIO
from PIL.Image import open as openImg
from PIL import Image
import base64

from utils.dbHandler import DBHandler
from utils.s3Handler import S3Handler


# Token Middleware
def token_required(f):
    @wraps(f)
    def decorated_function(request, *args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return JsonResponse({"success": False, "message": "Token is missing!"}, status=403)
        
        db = DBHandler("users")
        user = db.find_one("sessionID", {"session_id": token})
        
        if not user:
            db.close()
            return JsonResponse({"success": False, "message": "Invalid token!"}, status=403)
        
        expires_on = user.get("expires_on")
        if expires_on is None:
            request.user = user
            db.close()
            return f(request, *args, **kwargs)
        
        expires_on = datetime.strptime(expires_on, "%Y-%m-%d %H:%M:%S")
        has_key_expired = (expires_on < datetime.now())
        if (has_key_expired):
            db.delete(
                "sessionID",
                {"session_id": user.get("session_id")}
            )
            db.close()
            return JsonResponse({"success": False, "message": "Token has expired !"}, status=403)      

        db.close()
        request.user = user
        return f(request, *args, **kwargs)
    
    return decorated_function


# Resize Image
def resizeImage(image):
    width, height = image.size

    if width < 240:
        return image

    w_factor = 240 / width
    return image.resize((240, int(height * w_factor)), Image.Resampling.LANCZOS)


# Base Route
def index(request):
    return redirect('landingPage')


# Landing Page
def landingPage(request):
    return render(request,
                'landingPage.html',
                context= {
                    'timestamp': int(now().timestamp()),
                })


# Handle User Validation
def renderUserValidation(request):
    return render(request,
                'userValidation.html',
                context= {
                    'timestamp': int(now().timestamp()),
                })


def validateUser(request):
    # redirect('dashboard')
    if request.method == 'POST':
        data = loads(request.body)
        db = DBHandler("users")
        user = db.find_one("profiles", {"email": data['email']})

        if data["registrationType"] == "signup": response = signUpUser(request, data, db, user)        
        else: response = loginUser(user, data['password'], db)

        # print(data)

        if data.get("invited", False):

            if data["registrationType"] == "signup": username = data['username']
            else: username = user['username']
            
            user_group_data = {
                "group_id": data['group_id'],
                "group_name": data['group_name'],
                "group_dp": data['group_dp'],
                "is_admin": False,
                "pinned": False,
                "date_joined": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            db.update("profiles", {"email": data['email']}, {"$push": {"chat_groups": user_group_data}})
            db.update("messages", {"group_id": data['group_id']}, {"$push": {"group_members": {"username": username, "date_joined": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}}})

        db.close()
        return response        
        
    return JsonResponse({"success": False, "message": "Invalid request!"}, status=400)

def generateSessionToken(data):

    db_manager = DBHandler("users")

    existingSessionKey = db_manager.find_one(
        "sessionID",
        {"username": data['username']}
    )

    if existingSessionKey:
        expires_on = existingSessionKey.get("expires_on")
        if expires_on is None: return existingSessionKey.get("session_id")
        expires_on = datetime.strptime(expires_on, "%Y-%m-%d %H:%M:%S")

        print(expires_on)

        has_key_expired = (expires_on < datetime.now())
        if (has_key_expired):
            print("key expired")
            db_manager.delete(
                "sessionID",
                {"session_id": existingSessionKey.get("session_id")}
            )
        else:
            return existingSessionKey.get("session_id")

    key = uuid5(NAMESPACE_URL, f"{data['username']}-{datetime.now().isoformat()}").hex
    key = f"magic-{key}"

    cur_dt_time = str(datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    cur_dt_timeObj = datetime.strptime(cur_dt_time, "%Y-%m-%d %H:%M:%S")
    expire_dt_time = str(cur_dt_timeObj + timedelta(hours=3))

    key_data = {
        "session_id": key,
        "username": data['username'],
        "created_on": cur_dt_time,
        "expires_on": expire_dt_time
    }

    db_manager.insert(
        "sessionID",
        key_data
    )
    db_manager.close()
    
    return key

def signUpUser(request, data, db, user):
    if user: return JsonResponse({"success": False, "message": "Mail already exists!"}, status=400)
    try:
        user_data = {
            "username": data['username'],
            "email": data['email'],
            "password": data['password'],
            "date_joined": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "last_login": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "chat_groups": []
        }
    except Exception as e:
        return JsonResponse({"success": False, "message": "Invalid request!"}, status=400)
    
    else:
        db.insert("profiles", user_data)
        # db.close()
        sessionID = generateSessionToken(data)
        url = f"/dashboard?sessionID={sessionID}&username={data['username']}"
        return JsonResponse({"success": True, "message": "User registered successfully!", "url": url}, status=200)


def loginUser(user, password, db):
    if not user: return JsonResponse({"success": False, "message": "User does not exist!"}, status=400)
    elif user['password'] != password: return JsonResponse({"success": False, "message": "Invalid password!"}, status=400)

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    db.update("profiles", {"email": user['email']}, {"$set": {"last_login": current_time}})
    # db.close()
    sessionID = generateSessionToken(user)
    url = f"/dashboard?sessionID={sessionID}&username={user['username']}"
    return JsonResponse({"success": True, "message": "Login successful!", "url": url}, status=200)



# Handle Dashboard
def dashboard(request):
    username = request.GET.get('username')
    sessionID = request.GET.get('sessionID')

    # print(sessionID)

    if not sessionID: return redirect('landingPage')

    request.session['username'] = username 
    request.session['sessionID'] = sessionID
    return redirect('dashboard-page')


def renderDashboard(request):
    if not request.session['sessionID']: return redirect('landingPage')

    db = DBHandler("users")
    user = db.find_one("profiles", {"username": request.session['username']})
    db.close()

    return render(request,
                'dashboard.html',
                context= {
                    'timestamp': int(now().timestamp()),
                    'username': request.session['username'],
                    "profile_url": user.get("profile_pic", "/static/images/user.png"),
                    'sessionID': request.session['sessionID']
                })


@token_required
def getUserGroups(request):

    if request.method == 'GET':
        username = request.GET.get('username')
        groups = run(fetch_group(username))   
        return JsonResponse({"success": True, "groups": groups}, status=200)
    
    return JsonResponse({"success": False, "message": "Invalid request!"}, status=400)

async def fetch_group(username):
    db = DBHandler("users")
    user = db.find_one("profiles", {"username": username})
    db.close()
    groups = user['chat_groups']
    if len(groups) == 0: return []
    groups = [
        {
            "id": group['group_id'],
            "group_name": group['group_name'],
            "is_admin": group['is_admin'],
            "avatar": group["group_dp"],
            "pinned": True if group["pinned"] == "true" or group["pinned"] == True else False
        }
        for group in groups
    ]
    return groups



def generateID(name):
    return uuid5(NAMESPACE_URL, f"{name}-{datetime.now().isoformat()}").hex

@csrf_exempt
@token_required
def updateGroup(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        group_name = request.POST.get('group_name')
        avatar = request.FILES.get('group_avatar')
        admin = request.POST.get('admin')
        pinned = False
        group_id = generateID(group_name)

        # print(avatar)

        if avatar: avatar_url = process_upload(avatar, group_id)
        else: avatar_url = ""

        user_group_data = {
            "group_id": group_id,
            "group_name": group_name,
            "group_dp": avatar_url,
            "is_admin": admin,
            "pinned": pinned,
            "date_joined": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
 
        chat_groups_data = {
            "group_id": group_id,
            "group_name": group_name,
            "group_admin": admin,
            "group_members": [{
                "username": username,
                "date_joined": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }],
            "group_messages": [],
            "group_dp": avatar_url,
            "date_created": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Save the group data to the database
        db = DBHandler("users")
        db.update("profiles", {"username": username}, {"$push": {"chat_groups": user_group_data}})
        db.insert("messages", chat_groups_data)
        db.close()
        return JsonResponse({"success": True, "message": "Group updated successfully.", "dp_url": avatar_url, "group_id": group_id}, status=200)

    return JsonResponse({"success": False, "message": "Invalid request!"}, status=400)


def process_upload(file_obj, obj_name, path = "group-avatars"):
    s3_manager = S3Handler()

    # print(file_obj.content_type)

    file_obj = openImg(file_obj)
    file_obj = resizeImage(file_obj)
    buffer = BytesIO()
    file_obj.save(buffer, format="PNG")
    buffer.seek(0)

    url = s3_manager.upload(file_obj= buffer, obj_name= obj_name+".png", path= path)
    buffer.close()
    return url


@csrf_exempt
@token_required
def pinGroup(request):
    if request.method == 'POST':

        body = loads(request.body)
        username = body.get('username')
        group_id = body.get('group_id')
        pinned = body.get('pinned')

        # Validate required parameters
        # if not all([username, group_id, pinned]):
        #     return JsonResponse({
        #         "success": False, 
        #         "message": "Missing required parameters"
        #     }, status=400)

        # Convert pinned to boolean
        # pinned = pinned.lower() == 'true'

        try:
            db = DBHandler("users")
            result = db.update(
                "profiles",
                {"username": username, "chat_groups.group_id": group_id},
                {"$set": {"chat_groups.$[elem].pinned": pinned}},
                filters=[{"elem.group_id": group_id}]
            )
            db.close()

            return JsonResponse({
                "success": True,
                "message": "Group pinned successfully"
            }, status=200)

        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": f"Database error: {str(e)}"
            }, status=500)

    return JsonResponse({
        "success": False,
        "message": "Invalid request method"
    }, status=400)


@csrf_exempt
@token_required
def updateGroupInfo(request):

    if request.method == "POST":
        username = request.POST.get('username', None)
        group_id = request.POST.get('group_id', None)
        group_name = request.POST.get('group_name', None)
        avatar = request.FILES.get('group_avatar', None)
        url = None

        s3manager = S3Handler()
        dbhandler = DBHandler("users")

        if avatar is not None:
            s3manager.delete(group_id+".png")
            url = process_upload(avatar, group_id)

        group = dbhandler.find_one_chat_group(username, group_id)
        # print(group)


        if not group: return JsonResponse({"success": False, "message": "Group not found"}, status=404)
        elif not group["is_admin"] == username: return JsonResponse({"success": False, "message": "You are not an admin of this group"}, status=403)

        if url:
            dbhandler.update("profiles",
                            {"username": username, "chat_groups.group_id": group_id},
                            {"$set": {"chat_groups.$[elem].group_dp": url}},
                            filters=[{"elem.group_id": group_id}])
            dbhandler.update("messages",
                            {"group_id": group_id},
                            {"$set": {"group_dp": url}})
            

        if group_name:
            dbhandler.update("profiles",
                            {"username": username, "chat_groups.group_id": group_id},
                            {"$set": {"chat_groups.$[elem].group_name": group_name}},
                            filters=[{"elem.group_id": group_id}])
            dbhandler.update("messages",
                            {"group_id": group_id},
                            {"$set": {"group_name": group_name}})
            

        dbhandler.close()
        server_response = {
            "success": True,
            "dp_url": url,
            "group_name": group_name,
            "message": "Group info updated successfully"
        }
        return JsonResponse(server_response, status=200)

    
    return JsonResponse({"success": False, "message": "Invalid Request !"}, status=400)


@token_required
def generate_invite_link(request):
    if request.method == 'GET':
        group_id = request.GET.get('group_id')
        group_name = request.GET.get('group_name')

        unique_id = generateID(group_name)
        return JsonResponse({"success": True, "invite_link": f"/chat-magic/invite/{unique_id}?group_id={group_id}"}, status=200)
    
def renderInvitePage(request, unique_id):

    group_id = request.GET.get('group_id')
    if not group_id: return JsonResponse({"success": False, "message": "Missing required parameters"}, status=400)

    dbmanager = DBHandler("users")
    group = dbmanager.find_one("messages", {"group_id": group_id})
    dbmanager.close()

    # print(group)

    return render(request, "userValidation.html", context= {
        "timestamp": int(now().timestamp()),
        "group_id": group_id,
        "group_name": group.get("group_name", None),
        "group_dp": group.get("group_dp", None),
        "login_type": "invite",
    })


@csrf_exempt
@token_required
def delete_group(request):
    
    if request.method == "POST":
        data = loads(request.body)
        username = data.get('username', None)
        group_id = data.get('group_id', None)

        if not all([username, group_id]): return JsonResponse({"success": False, "message": "Missing required parameters"}, status=400)

        db = DBHandler("users")
        db.update(
            "profiles",
            {"username": username},
            {"$pull": {"chat_groups": {"group_id": group_id}}},
        )
        db.delete("messages", {"group_id": group_id})
        db.close()

        return JsonResponse({"success": True, "message": "Group deleted successfully"}, status=200)

    return JsonResponse({"success": False, "message": "Invalid Request !"}, status=400)

@csrf_exempt
@token_required
def leave_group(request):

    if request.method == "POST":

        data = loads(request.body)
        username = data.get('username', None)
        group_id = data.get('group_id', None)

        if not all([username, group_id]): return JsonResponse({"success": False, "message": "Missing required parameters"}, status=400)

        db = DBHandler("users")
        db.update(
            "profiles",
            {"username": username},
            {"$pull": {"chat_groups": {"group_id": group_id}}},
        )
        db.update(
            "messages",
            {"group_id": group_id},
            {"$pull": {"group_members": {"username": username}}},
        )
        db.close()

    return JsonResponse({"success": False, "message": "Invalid Request !"}, status=400)


@csrf_exempt
@token_required
def update_profile(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Invalid Request Method!"}, status=400)

    old_username = request.POST.get('old_username')
    new_username = request.POST.get('new_username')
    new_profile_pic = request.FILES.get('profile_pic')

    if not old_username:
        return JsonResponse({"success": False, "message": "Missing Parameters!"}, status=400)

    try:
        url = None
        if new_profile_pic:
            s3manager = S3Handler()
            s3manager.delete(old_username + ".png")
            url = process_upload(new_profile_pic, (new_username if new_username else old_username), "profile-pic")

        dbmanager = DBHandler("users")
        
        # Prepare the update document
        update_data = {}
        if new_username:
            update_data["username"] = new_username
        if url:
            update_data["profile_pic"] = url
            dbmanager.update_profile(
                "profiles",
                {"username": old_username},
                {"$set": {"profile_pic": url}}
            )

        # Update profile if there are changes
        if update_data:
            dbmanager.update(
                "profiles", 
                {"username": old_username}, 
                {"$set": update_data}
            )
            request.session['username'] = new_username

        # Update group members if username changed
        if new_username:
            dbmanager.update_profile(
                "messages",
                {"group_members.username": old_username},
                {"$set": {"group_members.$[elem].username": new_username}},
                filters=[{"elem.username": old_username}]
            )

        dbmanager.close()
        return JsonResponse({
            "success": True,
            'username': new_username,
            "dp_url": url,
            "message": "Profile updated successfully!"
        })

    except Exception as e:
        return JsonResponse({
            "success": False, 
            "message": f"Error updating profile: {str(e)}"
        }, status=500)
    


@csrf_exempt
def route_2_chats(request):
    if request.method == "GET":
        username = request.GET.get('user_id', None)
        group_id = request.GET.get('group_id', None)
        group_name = request.GET.get('group_name', None)
        session_id = request.GET.get('sessionID', None)

        if not all([username, group_id, group_name, session_id]): return JsonResponse({"success": False, "message": "Missing required parameters"}, status=400)

        request.session['group_id'] = group_id
        request.session['username'] = username
        request.session['group_name'] = group_name
        return redirect("chats")

    return JsonResponse({"success": False, "message": "Invalid Request !"}, status=400)


def chat(request):
    username = request.session.get('username', None)
    group_id = request.session.get('group_id', None)
    group_name = request.session.get("group_name", None)

    if not all([username, group_id, group_name]): return JsonResponse({"success": False, "message": "User not authorized !"}, status=400)

    return render(request, "chat.html", context= {
        "timestamp": int(now().timestamp()),
        "group_id": group_id,
        "group_name": group_name,
        "username": username
    })



def request_group_info(request):

    if request.method == "GET":
        group_id = request.GET.get('group_id', None)
        group = retrieve_group_info_db(group_id)

        if group:
            group_dp = group.get("group_dp", None)
            group_members = group.get("group_members", None)
            group_messages = group.get("group_messages", None)

            return JsonResponse({
                "success": True,
                "group_dp": group_dp,
                "group_members": group_members,
                "group_messages": group_messages
            })

        return JsonResponse({"success": False, "message": "Group not found"}, status=404)    
    return JsonResponse({"success": False, "message": "Invalid Request !"}, status=400)

def retrieve_group_info_db(group_id):
    dbmanager = DBHandler("users")
    group = dbmanager.find_one("messages", {"group_id": group_id})
    dbmanager.close()
    return group


@csrf_exempt
@token_required
def delete_messages(request):
    if request.method == "POST":
        data = loads(request.body)

        group_id = data.get('group_id', None)
        message_ids = data.get('message_id_bucket', None)

        if not all([group_id, message_ids]): return JsonResponse({"success": False, "message": "Missing required parameters"}, status=400)

        dbmanager = DBHandler("users")
        dbmanager.update(
            "messages",
            {"group_id": group_id},
            {
                "$pull": {
                    "group_messages": {
                        "message_id": {"$in": message_ids}
                    }
                }
            }
        )
        dbmanager.close()
        # print("Message deleted successfully")

        return JsonResponse({"success": True, "message": "Message deleted successfully"}, status=200)
    return JsonResponse({"success": False, "message": "Invalid Request !"}, status=400)



