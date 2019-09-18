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

from .models import FormData, FormDataField
from form_manager.models import UserProfile, TemplateType, UserTemplate, UserType
from ukuweb import settings
import utils as api
import ast
import numpy as np
from datetime import datetime, timedelta


def date_time_to_seconds(date):
    return (date.hour * 60 + date.minute) * 60 + date.second


def status_form_data_fields(
    input_time, saved_date, time_interval, editions_number, initial_value, final_value
):
    """
    input_time (datetime): Time in which the interviewer should fill out the field
    saved_date (datetime): Time in which the interviewer filled the field
    time_interval (time): Time interval in which the interviewer must fill in the field
    editions_number (int): Field editions number
    initial_value (string): First value that interviewer entered the field
    final_value (string): Last value that interviewer entered the field
    """
    input_seconds = date_time_to_seconds(input_time)
    saved_seconds = date_time_to_seconds(saved_date)
    diff = abs(saved_seconds - input_seconds)
    interval_seconds = date_time_to_seconds(time_interval)
    if diff > interval_seconds:
        return False
    elif editions_number > 1:
        return False
    elif initial_value and final_value and initial_value != final_value:
        return False
    return True


def convert_string_as_coordinate(coordinates):
    if coordinates:
        coordinates_list = coordinates.split(",")
        latitude = coordinates_list[0]
        longitude = coordinates_list[1]
        return "{u'latitude':%s,u'longitude':%s}" % (latitude, longitude)
    return None


def save_form_data_fields(form, data, input_time, versions):
    values_m = np.array(data["values"])
    cols_number = len(values_m[0, :])
    rows_number = len(values_m)
    time_interval = form.template.input_interval
    for j in range(cols_number):
        editions = 1
        final_value = values_m[0, j]
        last_date = versions[0].saved_date
        for i in range(rows_number):
            value = values_m[i, j]
            if final_value != value:
                editions += 1
                final_value = value
                last_date = versions[i].saved_date
        changed_values = list(set(filter(None, values_m[:, i])))
        initial_value = changed_values[0] if changed_values else None
        status = status_form_data_fields(
            datetime.strptime(input_time, "%H:%M"),
            data["saved_date"],
            time_interval,
            len(changed_values),
            initial_value,
            final_value,
        )
        form_data_field = FormDataField(
            defined_coordinate=convert_string_as_coordinate(
                data["defined_coordinates"]
            ),
            saved_coordinate=data["saved_coordinates"],
            form_data=form,
            name=data["fields"][i],
            save_date=last_date,
            editions=editions,
            initial_value=initial_value,
            final_value=final_value,
            input_time=datetime.strptime(input_time, "%H:%M"),
            status=status,
        )
        form_data_field.save()


def save_form_data_fields_from_form(form):
    versions = form.versions.all()
    sections = []
    data = {}
    if len(versions) >= 1:
        version = ast.literal_eval(versions[0].data)
        sections = api.get_sections_from_form(version)
        defined_coordinate = api.get_defined_location_from_form(version)
        for time_section in sections:
            obj = api.get_obj_from_section(
                ast.literal_eval(versions[0].data), time_section
            )
            fields = api.get_labels_from_form(obj)
            data[time_section] = {"fields": fields, "values": []}
            for v in versions:
                obj_version = ast.literal_eval(v.data)
                if len(defined_coordinate) > 0:
                    data[time_section]["defined_coordinates"] = defined_coordinate[0]
                data[time_section]["saved_date"] = v.saved_date
                data[time_section]["saved_coordinates"] = v.coordinates
                obj = api.get_obj_from_section(obj_version, time_section)
                data[time_section]["values"].append(api.get_values_from_form(obj))
            save_form_data_fields(form, data[time_section], time_section, versions)


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
            save_form_data_fields_from_form(form)
            if set_id:
                versions = form.versions.all()
                for v in versions:
                    filename = "{0}v.{1}-{2}".format(
                        form.name, v.version, v.saved_date.strftime("%Y-%m-%d %H:%M")
                    )
                    data = ast.literal_eval(v.data)
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
