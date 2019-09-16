# -*- coding: utf-8 -*-
import sys

reload(sys)
sys.setdefaultencoding("utf8")
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
from .models import Template, UserTemplate, UserProfile, UserType, TemplateType
from api.models import FormData, FormDataVersion
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from django.core import urlresolvers
import ast
from api import utils as api
from ukuweb.settings import FORMS_ROOT


@login_required(login_url="login")
@require_http_methods(["GET"])
def create_template_view(request):
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        template = loader.get_template("form/create.html")
        context = {"account": {"username": userProfile.name, "user_type": user_type}}
        context["template_types"] = []
        context["template_types"].append(
            TemplateType.objects.get(code=TemplateType.SIMPLE)
        )
        context["template_types"].append(
            TemplateType.objects.get(code=TemplateType.COMPOUND)
        )
        context["template_types"].append(
            TemplateType.objects.get(code=TemplateType.MULTIFORM)
        )
    else:
        return HttpResponse("Usuario no autorizado", status=401)
    return HttpResponse(template.render(context, request))


@login_required(login_url="login")
@require_http_methods(["GET"])
def view(request, uid):
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        template = Template.objects.filter(uid=uid)
        if template.exists():
            template = template.get()
            context = {
                "account": {"username": userProfile.name, "user_type": user_type}
            }
            context["uid"] = uid
            context["template_types"] = []
            context["template_types"].append(
                TemplateType.objects.get(code=TemplateType.SIMPLE)
            )
            context["template_types"].append(
                TemplateType.objects.get(code=TemplateType.COMPOUND)
            )
            context["template_types"].append(
                TemplateType.objects.get(code=TemplateType.MULTIFORM)
            )
            context["type_selected"] = template.type.code
            context["form_name"] = template.name
            context["quantity"] = template.quantity
            context["input_interval"] = template.input_interval.strftime("%H:%M")
            context["require_gps"] = template.gps

            template_view = loader.get_template("form/view.html")
            return HttpResponse(template_view.render(context, request))
        else:
            return HttpResponseNotFound("Formulario no existe")
    else:
        return HttpResponse("Usuario no autorizado", status=401)


@login_required(login_url="login")
def create(request):
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        data = request.POST
        set_name = data["setname"]
        set_id = api.get_set_id(set_name)
        if set_id:
            template_type = TemplateType.objects.get(code=data["type"])
            file = request.FILES.get("file")
            structure = file.read()
            require_gps = True if data.get("gps", None) else False
            template = Template(
                name=data["formname"],
                set_name=data["setname"],
                set_id=set_id,
                type=template_type,
                structure=structure,
                gps=require_gps,
                input_interval=data["input_interval"],
                quantity=data["quantity"],
            )

            filename = "{0}.json".format("-".join(template.name.split(" ")))
            template.save()
            user_template = UserTemplate(user=userProfile, template=template)
            user_template.save()

            # update in ckan
            with open("{0}/{1}".format(FORMS_ROOT, filename), "w") as f:
                f.write(structure)
            f = open("{0}/{1}".format(FORMS_ROOT, filename), "r")
            response = api.send_file_to_ckan(f, filename, template.set_id)
            f.close()
            if response.get("error"):
                messages.error(request, "Hubo un error al enviar el formulario")
            else:
                template.uid = response.get("result")["id"]
                template.save()
            messages.success(request, "Plantilla creada correctamente")
            return redirect(urlresolvers.reverse("templates"))
        else:
            messages.error(request, "El conjunto de datos no existe")
            return redirect(urlresolvers.reverse("create-template-view"))
    else:
        return HttpResponse("Usuario no autorizado", status=401)


@login_required(login_url="login")
def edit(request, uid):
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        data = request.POST
        template = Template.objects.filter(uid=uid)
        if template.exists():
            template_type = TemplateType.objects.get(code=data["type"])
            file = request.FILES.get("file")
            structure = file.read()
            require_gps = True if data.get("gps", None) else False
            template.update(
                name=data["form_name"],
                type=template_type,
                structure=structure,
                quantity=data["quantity"],
                gps=require_gps,
                input_interval=data["input_interval"],
            )
            template = template.get()
            resource_id = template.uid
            filename = "{0}.json".format("-".join(template.name.split(" ")))
            # send to ckan
            with open("{0}/{1}".format(FORMS_ROOT, filename), "w") as f:
                f.write(structure)
            f = open("{0}/{1}".format(FORMS_ROOT, filename), "r")
            response = api.update_file_in_ckan(f, resource_id)
            print(response)
            f.close()
            if response.get("error"):
                messages.error(request, "Hubo un error al enviar el formulario")
            messages.success(request, "Plantilla Editada correctamente")
            return redirect(urlresolvers.reverse("templates"))
        else:
            return HttpResponse("La plantilla no existe", status=404)
    else:
        return HttpResponse("Usuario no autorizado", status=401)


@login_required(login_url="login")
def delete(request, uid):
    context = {}
    account = request.session.get("account")
    user_type = account.get("type")
    if user_type == UserType.USER_ADMIN:
        data = request.POST
        template = Template.objects.filter(uid=uid)
        if template.exists():
            template.delete()
        messages.success(request, "Plantilla eliminada correctamente")
        return redirect(urlresolvers.reverse("templates"))
    else:
        return HttpResponse("Usuario no autorizado", status=401)
    return HttpResponse(template.render(context, request))


@login_required(login_url="login")
@require_http_methods(["GET"])
def templates_list(request):
    account = request.session.get("account")
    user_id = account.get("uid")
    user_type = account.get("type")
    userProfile = UserProfile.objects.get(uid=user_id)
    if user_type == UserType.USER_ADMIN:
        context = {"account": {"username": userProfile.name, "user_type": user_type}}
        template = loader.get_template("form/list.html")
        user_templates = UserTemplate.objects.filter(user=userProfile)
        templates = []
        if user_templates:
            for user_template in user_templates:
                templates.append(user_template.template)
        context["templates"] = templates
        return HttpResponse(template.render(context, request))
    else:
        return HttpResponse("Usuario no autorizado", status=401)


def logout_user(request):
    logout(request)
    return redirect("login")


def separate_form_by_type(forms):
    forms_dict = {}
    for form in forms:
        forms_dict[form.type.name] = forms_dict.get(form.type.name, []) + [
            form.to_dict_with_versions()
        ]
    return forms_dict


@login_required(login_url="login")
@require_http_methods(["GET"])
def home(request):
    account = request.session.get("account")
    if account:
        user_id = account.get("uid")
        user_type = account.get("type")
        userProfile = UserProfile.objects.get(uid=user_id)
        formsData = {}
        if user_type == UserType.USER_ADMIN:
            interviewers = userProfile.created_by.all()
            forms = FormData.objects.filter(user__in=interviewers)
            if forms.exists():
                formsData = separate_form_by_type(forms)
        else:
            forms = FormData.objects.filter(user=userProfile)
            if forms.exists():
                formsData = separate_form_by_type(forms)
        template = loader.get_template("index.html")
        context = {
            "account": {"username": userProfile.name, "user_type": user_type},
            "forms": formsData,
        }
        return HttpResponse(template.render(context, request))
    else:
        return redirect(urlresolvers.reverse("login"))


@require_http_methods(["GET", "POST"])
def login_user(request):
    template = loader.get_template("index.html")
    if request.POST:
        username = request.POST.get("username")
        password = request.POST.get("password")
        user = authenticate(username=username, password=password)
        if user is not None:
            userProfile = UserProfile.objects.filter(user=user)
            if userProfile.exists():
                is_admin = userProfile.get().user_type.code == UserType.ADMIN
                if is_admin:
                    request.session["account"] = {
                        "uid": userProfile.get().uid,
                        "type": "administrador",
                    }

                else:
                    request.session["account"] = {
                        "uid": userProfile.get().uid,
                        "type": "entrevistador",
                    }
                login(request, user)
                return HttpResponseRedirect("/")

            else:
                messages.error(request, "No existe el usuario")
                return redirect(urlresolvers.reverse("login"))
        else:
            messages.error(request, "Usuario o contraseña incorrecto")
            return redirect(urlresolvers.reverse("login"))
    else:
        context = {}
        template = loader.get_template("login.html")
        return HttpResponse(template.render(context, request))


def export_form(request, id):
    form_data_version = FormDataVersion.objects.filter(id=id)
    if form_data_version.exists():
        form_data_version = form_data_version.get()
        filename = "{0}-{1}.xlsx".format(
            form_data_version.form_data.name.encode("utf-8").decode("string_escape"),
            form_data_version.saved_date,
        )
        output = api.convert_form_to_excel(form_data_version, filename)
        response = HttpResponse(
            output,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = "attachment; filename=%s" % filename
        return response
    else:
        messages.error(request, "El archivo no existe")
        return redirect(urlresolvers.reverse("home"))


@login_required(login_url="login")
@require_http_methods(["GET"])
def view_form(request, uid):
    account = request.session.get("account")
    if account:
        user_id = account.get("uid")
        user_type = account.get("type")
        userProfile = UserProfile.objects.get(uid=user_id)
        form = FormData.objects.filter(uid=uid)
        data = {}
        if form.exists():
            form = form[len(form) - 1]
            template = loader.get_template("form_data/table.html")
            context = {
                "account": {"username": userProfile.name, "user_type": user_type},
                "form": form,
            }
            return HttpResponse(template.render(context, request))
        else:
            messages.error(request, "El formulario no existe")
            return redirect(urlresolvers.reverse("home"))
    else:
        return redirect(urlresolvers.reverse("login"))
