# from rest_framework.views import APIView
# from rest_framework.parsers import MultiPartParser, JSONParser, FormParser
# from rest_framework import generics
# from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
# from rest_framework.response import Response
# from rest_framework.status import HTTP_207_MULTI_STATUS, HTTP_200_OK, HTTP_201_CREATED
# from rest_framework.pagination import PageNumberPagination
# from django.shortcuts import get_list_or_404, get_object_or_404

# from serializers import UserProfileSerializer, UserSerializer
# from models import User

# class StandardPagination(PageNumberPagination):
#     page_size=100
#     page_query_param='page_size'
#     max_page_size=150

# class RegisterView(generics.CreateAPIView):
#     permission_classes=[AllowAny]
#     serializer_class=UserSerializer

#     def create(self, request, *args, **kwargs):
#         from rest_framework.authtoken.models import Token
#         from rest_framework.authentication import authenticate
#         serializer=self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         user=serializer.save()
#         username=serializer.validated_data.get("username")
#         password=serializer.validated_data.get("password")

#         if username and password:
#             user=authenticate(username=username, password=password)
#             if user:
#                 token, create=Token.objects.get_or_create(user=user)
#                 return Response({
#                     "token":token.key,
#                     "user": UserSerializer(user).data
#                 }, status=HTTP_201_CREATED)
#         return Response(serializer.data, HTTP_200_OK)

from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser, FormParser
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED
from serializers import UserSerializer
from models import User

class StandardPage(PageNumberPagination):
    page_query_param="page_num"
    page_size=10
    max_page_size=15

class UserViewset(viewsets.ViewSet):
    permission_classes=[IsAdminUser]
    serializer_class=UserSerializer
    pagination_class=StandardPage

    def list(self, request):
        queryset=User.objects.all().order_by("-username")
        paginator=self.pagination_class
        page=paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer=UserSerializer(page, mant=True)
            return paginator.get_paginated_response(serializer.data)
        serializer=UserSerializer(queryset, many=True)
        return Response(serializer.data, status=HTTP_200_OK)
    
    def create(self, request):
        from django.contrib.auth import aauthenticate
        from rest_framework.authtoken.models import Token
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exceptions=True)
        user=serializer.save()
        return Response({
            "message": "User created successfully",
            "user": UserSerializer(user).data
            }, status=HTTP_201_CREATED)
class RegisterViewset(viewsets.ViewSet):
    permission_classes=[AllowAny]
    serializer_class=UserSerializer

    def create(self, request):
        from django.contrib.auth import aauthenticate
        from rest_framework.authtoken.models import Token
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exceptions=True)
        user=serializer.save()
        token, created=User.objects.get_or_create(user=user)

        username=serializer.validated_data.get("username")
        password=serializer.data.get("password")
        aauthenticated_user=aauthenticate(username=username, password=password)
        if aauthenticated_user:
            return Response({
                "token":token,
                "user": UserSerializer(user)
            }, status=HTTP_201_CREATED)
        else:
             return Response({
                "token": token.key,
                "user": UserSerializer(user).data,
                "warning": "User created but credentials verification failed"
            }, status=HTTP_201_CREATED)