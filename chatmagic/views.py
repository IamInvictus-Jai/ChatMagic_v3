from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.utils.timezone import now
# from django.views.decorators.csrf import csrf_exempt

# Create your views here.
def index(request):
    return HttpResponse("<h1>Hello, world!</h1>")