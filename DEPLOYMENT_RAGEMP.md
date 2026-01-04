# 🚀 RAGE MP Deployment Guide

## Правильная установка для RAGE MP

### Шаг 1: Структура папок

Создайте следующую структуру в вашем RAGE MP сервере:

```
RageMP_Server/
├── ragemp-server.exe
├── conf.json                    # Главная конфигурация
├── packages/                    # СЕРВЕРНЫЕ ПАКЕТЫ
│   └── tactical-warfare/        # Наш игровой режим
│       ├── index.js            # Главный файл
│       └── package.json        # Информация о пакете
├── client_packages/             # Клиентские скрипты (пока пусто)
└── resources/                   # Ресурсы (создайте пустую папку)
```

### Шаг 2: Копирование файлов

**Windows (PowerShell/CMD):**
```batch
cd C:\\path\\to\\BATTLE_ARENA_SERVER

:: Копируем конфиг
copy conf.json C:\\RageMP\\Server\\

:: Создаём папки
mkdir C:\\RageMP\\Server\\packages\\tactical-warfare
mkdir C:\\RageMP\\Server\\resources
mkdir C:\\RageMP\\Server\\client_packages

:: Копируем пакет
copy packages\\tactical-warfare\\*.* C:\\RageMP\\Server\\packages\\tactical-warfare\\
```

**Linux/Mac:**
```bash
cd /path/to/BATTLE_ARENA_SERVER

# Копируем конфиг
cp conf.json /path/to/ragemp/server/

# Создаём папки
mkdir -p /path/to/ragemp/server/packages/tactical-warfare
mkdir -p /path/to/ragemp/server/resources
mkdir -p /path/to/ragemp/server/client_packages

# Копируем пакет
cp -r packages/tactical-warfare/* /path/to/ragemp/server/packages/tactical-warfare/
```

### Шаг 3: Запуск

**Windows:**
```batch
cd C:\\RageMP\\Server
ragemp-server.exe
```

**Linux:**
```bash
cd /path/to/ragemp/server
./ragemp-server
```

### Ожидаемый вывод:

```
[INFO] Loading NodeJS packages...
[INFO] Starting packages...
========================================
   BATTLE ARENA SERVER LOADING
========================================
[CONFIG] Loaded: ⚔️ BATTLE ARENA | Tactical Squad Warfare
[GAME STATE] Initialized
[GAME MODE] Tactical Squad Warfare loaded
[FEATURES] Teams, Squads, Objectives, FOB system
[COMMANDS] Type /help in-game for commands
========================================
   BATTLE ARENA SERVER READY
========================================
[DONE] Server packages have been started.
```

## ✅ Проверка установки

### 1. Проверьте логи сервера

Должны увидеть:
- `✅ [CONFIG] Loaded: ...`
- `✅ [GAME STATE] Initialized`
- `✅ [GAME MODE] Tactical Squad Warfare loaded`
- `✅ BATTLE ARENA SERVER READY`

### 2. Подключитесь к серверу

1. Откройте GTA V
2. Запустите RAGE MP
3. Подключитесь к `127.0.0.1:22005`

### 3. Проверьте команды

В игре введите:
```
/help          # Должен показать список команд
/team 1        # Присоединиться к команде 1
/role rifleman # Выбрать роль
```

## 🎮 Первый запуск игры

### Для администратора:

```
1. /team 1              # Присоединиться к команде
2. /role squad_leader   # Выбрать роль лидера отряда
3. /start               # Запустить матч (только для админа)
4. /objectives          # Посмотреть цели
5. /status              # Статус матча
```

### Для игроков:

```
1. /help                # Список команд
2. /team <1|2>          # Выбрать команду
3. /role <название>     # Выбрать роль
4. /squad info          # Информация об отряде
5. /objectives          # Цели на карте
```

## 🔧 Настройка админа

Чтобы стать админом, отредактируйте `conf.json`:

```json
{
  "admin": {
    "enable": true,
    "admins": [
      "ВашНикВИгре"
    ]
  }
}
```

Или используйте встроенную админ-систему RAGE MP.

## ⚠️ Устранение ошибок

### Ошибка: "Necessary resources folder does not exist"

**Решение:**
```bash
mkdir resources
```
Это предупреждение, не критично, но создайте папку.

### Ошибка: "Package not found"

**Проверьте:**
1. Путь: `packages/tactical-warfare/index.js` существует?
2. Файл `package.json` в папке `tactical-warfare`?
3. Права доступа на чтение файлов?

### Команды не работают

**Проверьте:**
1. Сервер полностью запущен?
2. В логах есть `BATTLE ARENA SERVER READY`?
3. Вы подключены к правильному серверу?

### Не показывается welcome message

**Возможные причины:**
1. Пакет не загружен
2. Проверьте логи сервера на ошибки
3. Убедитесь что `index.js` в правильной папке

## 📊 Мониторинг сервера

### Проверка активных игроков:
```javascript
// В логах сервера увидите:
[JOIN] PlayerName (192.168.1.1)
[TEAM] PlayerName joined Team 1
[ROLE] PlayerName selected rifleman
```

### Статус матча:
```javascript
[MATCH] Match started by AdminName
[OBJECTIVE] Alpha Objective captured by Team 1
[MATCH] Match ended. Winner: Team 1
```

## 🎯 Быстрая проверка функционала

### Тест 1: Команды
```
/team 1     → "Joined: Task Force Phantom"
/team 2     → "Joined: Soviet Defenders"
```

### Тест 2: Роли
```
/role rifleman      → "Role set to: rifleman"
/role medic         → "Role set to: medic"
/role squad_leader  → "Role set to: squad_leader"
```

### Тест 3: Матч (админ)
```
/start      → "Match Started!"
/objectives → Показывает Alpha, Bravo, Charlie
/status     → "Match Status: ACTIVE"
/end        → "Match ended!"
```

## 📝 Дополнительная настройка

### Изменить точку спавна:

Отредактируйте в `index.js`:
```javascript
// Найдите строку:
player.position = new mp.Vector3(-1041.0, -2746.0, 21.0);

// Замените на ваши координаты:
player.position = new mp.Vector3(X, Y, Z);
```

### Добавить новые команды:

```javascript
mp.events.addCommand('mycommand', (player, fullText, arg1, arg2) => {
    player.outputChatBox('My custom command!');
});
```

### Изменить время респавна:

В `conf.json`:
```json
"battle": {
  "respawn_time": 15  // секунды
}
```

## 🌐 Публикация сервера

### 1. Измените conf.json:

```json
{
  "announce": true,
  "name": "Ваше название сервера",
  "maxplayers": 100
}
```

### 2. Откройте порты:

- **Порт 22005** (TCP/UDP) - игровой
- **Порт 22006** (TCP) - ресурсы

### 3. Настройте внешний IP:

В роутере пробросьте порты на ваш компьютер.

## 📞 Поддержка

Если возникли проблемы:

1. **Проверьте логи сервера** - все ошибки там
2. **GitHub Issues** - создайте issue с логами
3. **Документация** - README.md, INSTALLATION.md

## ✨ Следующие шаги

1. ✅ Установить и запустить сервер
2. ✅ Протестировать команды
3. ✅ Настроить под себя (conf.json)
4. ✅ Пригласить друзей
5. ✅ Получать удовольствие!

---

**Версия:** 1.0.0  
**Дата:** 04.01.2026  
**Статус:** Production Ready ✅
