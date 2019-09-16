# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from form_manager.models import UserProfile, TemplateType, Template
import dateutil.parser
import datetime
import uuid
import ast


class FormDataManager(models.Manager):
    """
    "template": {
        "uuid": "27cc418c-b7a3-46a0-bd30-8e7230a2ffb1",
        "setId": "0cfc0e05-8e4c-435a-893b-5d12ede68f0f"
    }
    "formData": {
        "code": "00001",
        "createdDate": "2019-07-20T15:32:51.585Z",
        "name": "Nutrición - Puyo",
        "type": "initial",
        "uuid": "e471fda6-1590-4341-9cf4-a29e9d59b0ae",
        "gps": false,
        "versions": [
            {
                "data": {},
                "version": 1,
                "coordinates": null,
                "reason": "",
                "saveDate": "2019-07-20T15:32:52.185Z",
            }
        ]
    },
    "user": {
        "username": "user example",
        "uid": "e779204e-acd5-4c31-8e0b-4527f2f5dcc2"
        }
    """

    def create(self, formData):
        form = formData["formData"]
        temp_type = form.get("type").upper()
        if temp_type == "INITIAL":
            temp_type = "INICIAL"
        elif temp_type == "FOLLOW_UP":
            temp_type = "SEGUIMIENTO"

        type = TemplateType.objects.filter(name=temp_type) if form.get("type") else None
        if type and type.exists():
            type = type.get()
        else:
            type = TemplateType.objects.get(name="SIMPLE")

        created_date = dateutil.parser.parse(form.get("createdDate"))
        coordinates = form.get("coordinates", None)
        form_data = self.model(
            uid=form.get("uuid"),
            type=type,
            name=form.get("name"),
            created_date=created_date,
            send_date=datetime.datetime.now(),
            include_gps=True if form.get("gps") == "required" else False,
            code=form.get("code", None),
        )
        form_data.reason = form.get("reason", None)
        templateUuid = formData["template"].get("uuid")
        template = Template.objects.filter(uid=templateUuid)
        if template.exists():
            form_data.template = template.get()
        user = formData.get("user", None)
        if user:
            user = UserProfile.objects.get(uid=user.get("uid"))
            form_data.user = user
        form_data.save()

        for version in form.get("versions", []):
            form_data_version = FormDataVersion(
                form_data=form_data,
                version=version.get("version", 1),
                data=version.get("data", ""),
                coordinates=version.get("coordinates"),
                saved_date=version.get("saveDate"),
                reason=version.get("reason"),
            )
            form_data_version.save()

        return form_data


class FormData(models.Model):
    uid = models.CharField(default=uuid.uuid4, editable=False, max_length=36)
    name = models.CharField(max_length=500, blank=True)
    type = models.ForeignKey(TemplateType, null=True)
    created_date = models.DateTimeField(null=True, blank=True)
    send_date = models.DateTimeField(null=True, blank=True)
    objects = FormDataManager()
    user = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True)
    template = models.ForeignKey(Template, on_delete=models.SET_NULL, null=True)
    code = models.CharField(max_length=15, null=True, blank=True)
    include_gps = models.BooleanField(default=False)

    def to_dict(self):
        return {
            "uid": self.uid,
            "name": self.name if self.name else "",
            "type": self.type.name if self.type else "",
            "created_date": self.created_date,
            "send_date": self.send_date,
            "code": self.code if self.code else "",
            "user": self.user.user.username if self.user else None,
            "include_gps": self.include_gps,
        }

    def get_fields(self):
        fields = self.fields.all()
        fields_list = []
        for field in fields:
            fields_list.append(field.to_dict())
        return fields_list

    def to_dict_with_last_version(self):
        versions = self.versions.all()
        last_version = None
        if versions:
            last_version = versions.latest("saved_date")
            return {
                "uid": self.uid,
                "name": self.name if self.name else "",
                "type": self.type.name if self.type else "",
                "created_date": self.created_date,
                "send_date": self.send_date,
                "code": self.code if self.code else "",
                "user": self.user.user.username if self.user else None,
                "include_gps": self.include_gps,
                "input_interval": self.template.input_interval,
                "last_version": last_version.to_dict(),
            }
        return None


class FormDataVersion(models.Model):
    form_data = models.ForeignKey(FormData, related_name="versions")
    version = models.IntegerField(default=1)
    data = models.TextField()
    coordinates = models.CharField(max_length=100, null=True)
    saved_date = models.DateTimeField(null=True, blank=True)
    reason = models.CharField(max_length=500, null=True, blank=True)

    def coordinates_name(self):
        coordinates = self.coordinates
        if coordinates:
            if not type(coordinates) is dict:
                coordinates = ast.literal_eval(coordinates)
            return "{0}, {1}".format(
                coordinates.get("latitude"), coordinates.get("longitude")
            )
        else:
            return "No se pudo determinar"

    def to_dict(self):
        return {
            "id": self.id,
            "data": self.data,
            "saved_date": self.saved_date,
            "coordinates": self.coordinates_name(),
            "reason": self.reason if self.reason else None,
        }


class FormDataField(models.Model):

    form_data = models.ForeignKey(FormData, related_name="fields")
    name = models.CharField(max_length=500)
    input_time = models.TimeField(null=True, blank=True)
    save_date = models.DateTimeField(null=True, blank=True)
    editions = models.IntegerField(default=1)
    initial_value = models.DecimalField(max_digits=11, decimal_places=2, null=True)
    final_value = models.DecimalField(max_digits=11, decimal_places=2, null=True)
    defined_coordinate = models.CharField(max_length=100, null=True, blank=True)
    saved_coordinate = models.CharField(max_length=100, null=True, blank=True)
    status = models.BooleanField(default=False)

    class Meta:
        ordering = ["name", "save_date"]

    def get_defined_coordinate(self):
        coordinates = self.defined_coordinate
        if coordinates:
            if not type(coordinates) is dict:
                coordinates = ast.literal_eval(coordinates)
            return "{0}, {1}".format(
                coordinates.get("latitude"), coordinates.get("longitude")
            )
        else:
            return "No se pudo determinar"

    def get_saved_coordinate(self):
        coordinates = self.saved_coordinate
        if coordinates:
            if not type(coordinates) is dict:
                coordinates = ast.literal_eval(coordinates)
            return "{0}, {1}".format(
                coordinates.get("latitude"), coordinates.get("longitude")
            )
        else:
            return "No se pudo determinar"

    def to_dict(self):
        return {
            "name": self.name,
            "save_date": self.save_date,
            "input_time": self.input_time,
            "editions": self.editions,
            "initial_value": self.initial_value,
            "final_value": self.final_value,
            "defined_coordinate": self.get_defined_coordinate(),
            "saved_coordinate": self.get_saved_coordinate(),
            "status": self.status,
        }
