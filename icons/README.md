# Иконки расширения

## Создание иконок

Для создания PNG иконок из SVG файла используйте один из следующих методов:

### Метод 1: Используя ImageMagick (Linux/Mac)

```bash
# Установка ImageMagick
# Ubuntu/Debian:
sudo apt-get install imagemagick

# Mac:
brew install imagemagick

# Конвертация SVG в PNG разных размеров
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

### Метод 2: Используя Inkscape (Windows/Linux/Mac)

```bash
# Установка Inkscape
# Ubuntu/Debian:
sudo apt-get install inkscape

# Windows: скачайте с https://inkscape.org/

# Конвертация
inkscape icon.svg --export-filename=icon16.png --export-width=16
inkscape icon.svg --export-filename=icon48.png --export-width=48
inkscape icon.svg --export-filename=icon128.png --export-width=128
```

### Метод 3: Онлайн конвертер

1. Откройте https://cloudconvert.com/svg-to-png
2. Загрузите `icon.svg`
3. Настройте размеры: 16x16, 48x48, 128x128
4. Скачайте готовые файлы

### Метод 4: Используя GIMP (GUI)

1. Откройте GIMP
2. Импортируйте `icon.svg`
3. Задайте нужный размер при импорте
4. Экспортируйте как PNG
5. Повторите для всех размеров

## Требуемые размеры

- **icon16.png** - 16x16 пикселей (используется в панели инструментов)
- **icon48.png** - 48x48 пикселей (используется на странице расширений)
- **icon128.png** - 128x128 пикселей (используется в Chrome Web Store)

## Альтернатива

Если у вас нет инструментов для конвертации, вы можете:

1. Создать иконки вручную в любом графическом редакторе
2. Использовать готовые иконки из библиотек (например, Font Awesome)
3. Нанять дизайнера для создания профессиональных иконок

## Рекомендации по дизайну

- Используйте простой и узнаваемый дизайн
- Иконка должна хорошо выглядеть в маленьком размере (16x16)
- Используйте контрастные цвета
- PNG файлы должны иметь прозрачный фон
- Следуйте guidelines вашего браузера для иконок расширений
