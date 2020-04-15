package com.github.shk0da.bioritmic.api.controller.v1.rest

/**

1. Регистрация пользователя c подтверждением по мейл в течении кастомного вло-ва часов часов / авторизация Bearer + Oauth2
- фейсбук
- google
- восстановление пароля, с подчисткой всех других авторизаций
- множественная авторизация с разных устройств
2. Личный кабинет с данными и настройками
- фото(автоматический кроп), дата рождения, возможно краткая информация о себе
- радиус поиска
- днд время
- набор ритмов (опции отвязанные по смыслу) по которым искать с описаниями
- доп. настройки по полу, возрасту, ?типу поиска?
- выбор типа уведомлений: пуш, звук, вибрация
- один аккаунт на многих устройствах с разными настройками / + синхронизировать настройка на все клиенты
- привязать фейсбук / показывать соцсеть или нет
3. Сохранение геопозиции (хранение трека за кастомный промежуток времени)
4. Поиск в радиусе других пользователей и сравнение ритмов (компонент на с++)
- возможно gRPC
5. Хранение данных в кассандре
- консул (етс) для хранения настроек
6. Кластеризация и масштабирование
7. Логгирование в логстеш + сбор метрик в локальную графану
8. Чарты для мини-кубика

9. Фронтальная часть на реакт, с возможностями как на мобильной версии
- локальные настройки частоты отправки координат (точн0сть поиска)
- пуши веб, айос, андроид
10. Роутинг до бекенда с балансировкой (мб ха-прокси или зуул и тд)

11. Отправить привет, подмигивание, открытку, эмоджи и тд (у каждого пользака есть свой почтоый ящик)
12. Запомнить человека, написать сообщение
13. Раздел контактов/перчесечений с датой фото, просмотром почтового ящика.

14. Отображение статистики по пользователям на главном экране

 * */
class ExampleController

/*
   POST /register/ {name, email}  -> send email with approve
   POST /recovery/ {email} -> send email with code
   POST /authorization/ {email, password} <- Oauth (JWT, refresh token)

   DELETE /user/me

   GET /user/me <- UserInfo
   POST/PUT/PATH /user/me -> UserInfo

   GET /user/me/photo <- UserInfo
   POST /user/me/photo -> UserInfo
   DELETE /user/me/photo

   GET /user/settings <- UserSettings
   POST/PUT/PATH /user/settings -> UserSettings

   GET /user/me/gis <- GIS
   POST /user/me/gis -> UpdateGIS

   GET /user/me/mailbox <- Mails
   POST /user/me/mailbox -> Mail
   DELETE /user/me/mailbox -> Mail/Mails

   GET /search/ <- List of Users
   POST /search/ <- List of Users

   GET /bookmarks/
   POST /bookmarks/
   DELETE /bookmarks/

   GET /meetings/
   POST /meetings/
   DELETE /meetings/
* */