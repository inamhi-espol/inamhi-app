from django.conf.urls import url
from . import views

urlpatterns = [
    url(r"^all/", views.user_admin, name="users"),
    url(r"^create-view/", views.create_view, name="create-user-view"),
    url(r"^create/$", views.create, name="create-user"),
    url(r"^delete/(?P<uid>[a-zA-Z0-9_\-]{1,36})$", views.delete, name="delete-user"),
    url(r"^view/(?P<uid>[a-zA-Z0-9_\-]{1,36})$", views.view, name="view-user"),
    url(r"^edit/(?P<uid>[a-zA-Z0-9_\-]{1,36})$", views.edit, name="edit-user"),
]
