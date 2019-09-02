from django.conf.urls import url, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from form_manager import views

urlpatterns = [
    url(r"^admin/", admin.site.urls),
    url(r"^api/", include("api.urls")),
    url(r"^form/", include("form_manager.urls")),
    url(r"^user/", include("users.urls")),
    url(r"^$", views.home, name="home"),
    url(r"^login$", views.login_user, name="login"),
    url(r"^logout$", views.logout_user, name="logout"),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
