#!/usr/bin/env python3
"""
Создание простых PNG иконок для расширения
Требует установленной библиотеки Pillow: pip install pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import sys
    
    def create_gradient_icon(size, filename):
        """Создает иконку с градиентом и символом"""
        # Создаем изображение с прозрачностью
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Рисуем круг с градиентом (упрощенная версия)
        # Цвета градиента: #667eea -> #764ba2
        for i in range(size):
            for j in range(size):
                # Расстояние от центра
                dx = i - size/2
                dy = j - size/2
                distance = (dx*dx + dy*dy) ** 0.5
                
                if distance <= size/2 - 2:
                    # Градиент
                    factor = i / size
                    r = int(102 + (118 - 102) * factor)
                    g = int(126 + (75 - 126) * factor)
                    b = int(234 + (162 - 234) * factor)
                    img.putpixel((i, j), (r, g, b, 255))
        
        # Добавляем текст/иконку
        if size >= 32:
            try:
                font = ImageFont.truetype("arial.ttf", size // 3)
            except:
                font = ImageFont.load_default()
            
            # Рисуем символ $ или график
            text = "$"
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            text_x = (size - text_width) / 2
            text_y = (size - text_height) / 2
            
            draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)
        
        img.save(filename, 'PNG')
        print(f"✓ Создан {filename} ({size}x{size})")
    
    # Создаем иконки
    print("Создание иконок...")
    create_gradient_icon(16, 'icon16.png')
    create_gradient_icon(48, 'icon48.png')
    create_gradient_icon(128, 'icon128.png')
    print("✓ Все иконки созданы успешно!")
    
except ImportError:
    print("Ошибка: Библиотека Pillow не установлена")
    print("Установите её командой: pip install pillow")
    print("\nАльтернативно, используйте онлайн-конвертер SVG->PNG")
    sys.exit(1)
except Exception as e:
    print(f"Ошибка при создании иконок: {e}")
    sys.exit(1)
