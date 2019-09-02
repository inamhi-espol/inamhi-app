# -*- coding: utf-8 -*-
import sys

reload(sys)
sys.setdefaultencoding("utf8")
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from .models import FormData
from form_manager.models import UserProfile, TemplateType, UserTemplate, UserType
from ukuweb import settings
import utils as api
import ast


@api_view(["GET"])
@permission_classes((AllowAny,))
def get_templates(request, uid):
    context = {}
    if request.method == "GET":
        userProfile = UserProfile.objects.filter(uid=uid)
        if userProfile.exists():
            context["templates"] = get_templates_by_user(userProfile[0])
            status = 200
        else:
            context["msg"] = "No tiene permisos"
            context["data"] = {"error": "Unauthorized user"}
            status = 401
    return JsonResponse(context, status=status)


@api_view(["POST"])
@permission_classes((AllowAny,))
def validate_user(request):
    context = {}
    if request.method == "POST":
        username = request.data["username"]
        password = request.data["password"]
        try:
            user = authenticate(username=username, password=password)
        except User.DoesNotExist:
            user = None
        if user is not None and not user.is_superuser:
            user = User.objects.get(username=username)
            userProfile = UserProfile.objects.filter(user_id=user.id)
            if userProfile and not userProfile[0].user_type.code == UserType.ADMIN:
                context["uid"] = userProfile[0].uid
                context["username"] = user.username
                context["api_key"] = settings.API_KEY
                context["templates"] = get_templates_by_user(userProfile[0])
                context["msg"] = "Ingreso exitoso"
                status = 200
            else:
                context["msg"] = "No tiene permisos"
                context["data"] = {"error": "Unauthorized user"}
                status = 400
        else:
            context["msg"] = "Usuario o contraseña incorrectos"
            context["data"] = {"error": "Bad request"}
            status = 400
    else:
        context["msg"] = "No tiene permisos"
        context["data"] = {"error": "Unauthorized user"}
        status = 401
    return JsonResponse(context, status=status)


@api_view(["POST"])
@permission_classes((AllowAny,))
def save_form_data(request):
    """
    form = {
        "template": {
            "uuid": "f245dec6-1997-1242-2de3-c12f8d58d1ec",
            "setId": "0cfc0e05-8e4c-435a-893b-5d12ede68f0f"
        }
        "formData": {
            "code": "00001"
            "createdDate": Sat Jul 20 2019 12:51:34 GMT-0500 (hora de Ecuador)
            "data": {}
            "name": "Nutrición - Puyo"
            "type": "SIMPLE"
            "uuid": "e471fda6-1590-4341-9cf4-a29e9d59b0ae",
            "gps": false,
            "coordinates": null
        },
        "user": {
            "username": "user example",
            "uid": "e779204e-acd5-4c31-8e0b-4527f2f5dcc2"
            }
    }
    """
    context = {}
    if request.method == "POST":
        uid = request.data["user"].get("uid")
        userProfile = UserProfile.objects.filter(uid=uid)
        if userProfile.exists() and userProfile[0]:
            set_id = request.data["template"].get("setId", None)
            form = FormData.objects.create(request.data)
            form.save()
            filename = "{0}-{1}".format(form.name, form.created_date)
            if set_id:
                data = form.data
                api.convert_to_csv_and_send_to_ckan(data, filename, set_id)
            context["msg"] = "Guardado correctamente"
            context["data"] = form.to_dict()
            status = 200
        else:
            context["data"] = {"error": "Unauthorized user"}
            status = 401
    else:
        context["data"] = {"error": "Method GET not allowed"}
        status = 405
    return JsonResponse(context, status=status)


def getInfoTemplateData(template):
    data = {"name": template.name, "uuid": template.uid, "type": template.type.name}
    infoTemp = InfoTemplate.objects.filter(template__id=template.id)
    if template.type == TemplateType.FOLLOWUP:
        quantity = []
        if infoTemp.exists():
            for inf in infoTemp:
                if inf.remain_quantity > 0:
                    quantity.append(
                        {
                            "done_quantity": inf.done_quantity,
                            "remain_quantity": inf.remain_quantity,
                            "type": inf.type.name,
                        }
                    )
        else:
            quantity = [
                {
                    "done_quantity": 0,
                    "remain_quantity": template.quantity,
                    "type": TemplateType.INITIAL,
                },
                {
                    "done_quantity": 0,
                    "remain_quantity": template.quantity,
                    "type": TemplateType.FOLLOWUP,
                },
            ]

        data["quantity"] = quantity
    else:
        if infoTemp.exists():
            # If form was completed
            if infoTemp[0].remain_quantity > 0:
                data["done_quantity"] = infoTemp[0].done_quantity
                data["remain_quantity"] = infoTemp[0].remain_quantity
            else:
                return None
        else:
            data["done_quantity"] = 0
            data["remain_quantity"] = template.quantity
    return data


def get_templates_by_user(userProfile):
    userAdmin = userProfile.manager
    userTemplates = UserTemplate.objects.filter(user=userAdmin)
    templates = []
    for userTemplate in userTemplates:
        template = userTemplate.template
        if template:
            templates.append(template.to_dict())
    return templates
