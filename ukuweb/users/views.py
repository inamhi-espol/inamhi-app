# -*- coding: utf-8 -*-
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.http import (
    HttpResponse,
    JsonResponse,
    HttpResponseRedirect,
    HttpResponseNotFound,
)
from django.template import loader
from rest_framework.response import Response
from form_manager.models import Template, UserTemplate, UserProfile, UserType
from api.models import FormData
from django.contrib.auth.models import User
import xlsxwriter
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.core import urlresolvers


@login_required(login_url="login")
def create_view(request):
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        context = {"account": {"username": userProfile.name, "user_type": user_type}}
        template = loader.get_template("create.html")
        return HttpResponse(template.render(context, request))
    else:
        return HttpResponse("Usuario no autorizado", status=401)


@login_required(login_url="login")
def view(request, uid):
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        interviewer = UserProfile.objects.filter(uid=uid)
        if interviewer.exists():
            interviewer = interviewer.get()
            template = loader.get_template("view.html")
            context = {
                "uid": interviewer.uid,
                "username": interviewer.user.username,
                "name": interviewer.name,
                "last_name": interviewer.last_name,
                "type": interviewer.user_type.name,
                "account": {"username": userProfile.name, "user_type": user_type},
            }
        return HttpResponse(template.render(context, request))
    else:
        return HttpResponse("Usuario no autorizado", status=401)


@login_required(login_url="login")
def edit(request, uid):
    context = {}
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        interviewer = UserProfile.objects.filter(uid=uid)
        if interviewer.exists():
            try:
                data = request.POST
                interviewer.update(name=data["name"], last_name=data["last_name"])
                interviewer = interviewer.get()
                user = User.objects.get(pk=interviewer.user.id)
                user.username = data["username"]
                user.save()
                messages.success(request, "Usuario editado correctamente")
                return redirect(urlresolvers.reverse("users"))
            except Exception as e:
                print(e)
                messages.error(request, "El usuario ya existe")
                return redirect(urlresolvers.reverse("create-user-view"))
    else:
        return HttpResponse("Usuario no autorizado", status=401)


@login_required(login_url="login")
def create(request):
    context = {}
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        data = request.POST
        try:
            user = User.objects.create_user(
                username=data["username"],
                email=data["email"],
                first_name=data["name"],
                last_name=data["last_name"],
                password=data["password"],
            )
            user_type = UserType.objects.get(code=data["type"])
            interviewer = UserProfile(
                name=data["name"],
                last_name=data["last_name"],
                user=user,
                user_type=user_type,
                manager=userProfile,
            )
            interviewer.save()
            messages.success(request, "Usuario Creado correctamente")
            return redirect(urlresolvers.reverse("users"))
        except Exception as e:
            print(e)
            messages.error(request, "El usuario ya existe")
            return redirect(urlresolvers.reverse("create-user-view"))
    else:
        return HttpResponse("Usuario no autorizado", status=401)


@login_required(login_url="login")
def delete(request, uid):
    context = {}
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        data = request.POST
        interviewer = UserProfile.objects.filter(uid=uid)
        if interviewer.exists():
            user = User.objects.get(id=interviewer.get().user.id)
            user.delete()
        messages.success(request, "Usuario elimnado correctamente")
        return redirect(urlresolvers.reverse("users"))
    else:
        return HttpResponse("Usuario no autorizado", status=401)


@login_required(login_url="login")
def user_admin(request):
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        template = loader.get_template("users.html")
        interviewers = userProfile.created_by.all()
        context = {
            "account": {"username": userProfile.name, "user_type": user_type},
            "interviewers": interviewers,
        }
        return HttpResponse(template.render(context, request))
    else:
        return HttpResponse("Usuario no autorizado", status=401)
