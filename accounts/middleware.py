from django.contrib.auth import logout, get_user_model
from django.shortcuts import redirect
from django.urls import reverse


class CheckUserActiveMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Case 1: user is authenticated but is_active=False (shouldn't happen with
        # modern Django backends, but keep as safety net)
        if hasattr(request, 'user') and request.user.is_authenticated and not request.user.is_active:
            logout(request)
            return redirect(reverse('login') + '?suspended=1')

        # Case 2: Django's ModelBackend already returned None for inactive users,
        # so request.user is AnonymousUser but the session still holds a user_id.
        # Detect this and redirect with the suspended alert.
        if not request.user.is_authenticated:
            user_id = request.session.get('_auth_user_id')
            if user_id:
                User = get_user_model()
                try:
                    user = User.objects.get(pk=user_id)
                    if not user.is_active:
                        request.session.flush()
                        return redirect(reverse('login') + '?suspended=1')
                except User.DoesNotExist:
                    pass

        return self.get_response(request)
