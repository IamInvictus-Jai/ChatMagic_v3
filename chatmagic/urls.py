from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('landingPage', views.landingPage, name='landingPage'),
    path('user-validation', views.renderUserValidation, name='user-validation'),
    path('validate-user/', views.validateUser, name='validate-user'),
    path('dashboard', views.dashboard, name='dashboard'),
    path('dashboard-page', views.renderDashboard, name='dashboard-page'),

    path('api/get-user/groups', views.getUserGroups, name='get-user-groups'),
    path('api/update-group/', views.updateGroup, name= 'update-groups'),
    path('api/pin/group/', views.pinGroup, name='pin-group'),
    path('api/update-group-info/', views.updateGroupInfo, name='update-group-info'),
    path('api/invite-link', views.generate_invite_link, name='generate-invite-link'),
    path('chat-magic/invite/<str:unique_id>', views.renderInvitePage, name='render-invite-page'),
    path('api/delete-group/', views.delete_group, name='delete-group'),
    path('api/leave-group/', views.leave_group, name='leave-group'),
    path('api/update-user-info/', views.update_profile, name='update-user-info'),
    path('api/route/chats', views.route_2_chats, name='route-2-chats'),
    path('chats', views.chat, name='chats'),
    path('api/get-messages', views.request_group_info, name='get-message'),
    path('api/delete-messages/', views.delete_messages, name='delete-messages'),
]