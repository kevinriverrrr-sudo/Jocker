/**
 * FunPay Market Assistant - Content Script
 * Основной скрипт для интеграции с сайтом FunPay.com
 */

class FunPayAssistant {
  constructor() {
    this.init();
  }

  init() {
    console.log('[FunPay Assistant] Инициализация...');
    this.injectUI();
    this.setupOrderMonitoring();
    this.setupPriceMonitoring();
    this.collectStatistics();
    this.setupEventListeners();
  }

  /**
   * Внедрение UI элементов на страницу
   */
  injectUI() {
    // Добавляем панель расширения
    const panel = document.createElement('div');
    panel.id = 'funpay-assistant-panel';
    panel.className = 'funpay-assistant-panel';
    panel.innerHTML = `
      <div class="fpa-header">
        <h3>📊 FunPay Assistant</h3>
        <button id="fpa-toggle" class="fpa-toggle">−</button>
      </div>
      <div class="fpa-content">
        <div class="fpa-section">
          <h4>🔔 Уведомления</h4>
          <div id="fpa-notifications">
            <p class="fpa-status">Мониторинг активен</p>
          </div>
        </div>
        <div class="fpa-section">
          <h4>📈 Быстрая статистика</h4>
          <div id="fpa-quick-stats">
            <div class="stat-item">
              <span>Заказы сегодня:</span>
              <span id="orders-today">0</span>
            </div>
            <div class="stat-item">
              <span>Доход сегодня:</span>
              <span id="income-today">0 ₽</span>
            </div>
            <div class="stat-item">
              <span>Активные лоты:</span>
              <span id="active-lots">-</span>
            </div>
          </div>
        </div>
        <div class="fpa-section">
          <h4>💰 Анализ рынка</h4>
          <div id="fpa-market-analysis">
            <button id="analyze-competitors" class="fpa-button">
              Проанализировать цены конкурентов
            </button>
            <div id="analysis-results"></div>
          </div>
        </div>
      </div>
    `;

    // Вставляем панель на страницу
    document.body.appendChild(panel);

    // Обработчик сворачивания/разворачивания
    const toggleBtn = document.getElementById('fpa-toggle');
    const content = panel.querySelector('.fpa-content');
    toggleBtn.addEventListener('click', () => {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
      toggleBtn.textContent = content.style.display === 'none' ? '+' : '−';
    });

    // Обработчик анализа конкурентов
    const analyzeBtn = document.getElementById('analyze-competitors');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeCompetitors());
    }
  }

  /**
   * Мониторинг новых заказов
   */
  setupOrderMonitoring() {
    // Отслеживаем изменения в DOM для обнаружения новых заказов
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Проверяем, не является ли это новым заказом
            if (node.classList && (node.classList.contains('chat-msg') || 
                node.classList.contains('order-item'))) {
              this.handleNewOrder(node);
            }
          }
        });
      });
    });

    // Начинаем наблюдение
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Обработка нового заказа
   */
  handleNewOrder(element) {
    console.log('[FunPay Assistant] Обнаружен новый заказ');
    
    // Отправляем уведомление
    chrome.runtime.sendMessage({
      type: 'NEW_ORDER',
      data: {
        timestamp: Date.now(),
        element: element.textContent.substring(0, 100)
      }
    });

    // Обновляем статистику
    this.updateQuickStats();
  }

  /**
   * Мониторинг цен
   */
  setupPriceMonitoring() {
    // Собираем информацию о ценах на текущей странице
    const priceElements = document.querySelectorAll('.tc-price, .offer-price, [class*="price"]');
    const prices = [];

    priceElements.forEach(el => {
      const priceText = el.textContent.trim();
      const match = priceText.match(/(\d+(?:[.,]\d+)?)/);
      if (match) {
        prices.push(parseFloat(match[1].replace(',', '.')));
      }
    });

    if (prices.length > 0) {
      chrome.runtime.sendMessage({
        type: 'PRICE_DATA',
        data: {
          url: window.location.href,
          prices: prices,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Сбор статистики
   */
  collectStatistics() {
    const stats = {
      url: window.location.href,
      timestamp: Date.now(),
      activeLots: 0,
      orders: [],
      pageType: this.detectPageType()
    };

    // Определяем количество активных лотов
    const lotElements = document.querySelectorAll('.tc-item, .offer-list-item');
    stats.activeLots = lotElements.length;

    // Собираем информацию о заказах
    const orderElements = document.querySelectorAll('.order-item, .history-item');
    orderElements.forEach(order => {
      const orderData = this.extractOrderData(order);
      if (orderData) {
        stats.orders.push(orderData);
      }
    });

    // Сохраняем статистику
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATS',
      data: stats
    });

    // Обновляем быструю статистику в UI
    this.updateQuickStats();
  }

  /**
   * Определение типа страницы
   */
  detectPageType() {
    const path = window.location.pathname;
    if (path.includes('/lots/')) return 'lots';
    if (path.includes('/orders/')) return 'orders';
    if (path.includes('/chat/')) return 'chat';
    if (path.includes('/seller/')) return 'seller';
    return 'other';
  }

  /**
   * Извлечение данных заказа
   */
  extractOrderData(element) {
    try {
      const priceEl = element.querySelector('[class*="price"]');
      const dateEl = element.querySelector('[class*="date"], .tc-date-time');
      
      return {
        price: priceEl ? priceEl.textContent.trim() : null,
        date: dateEl ? dateEl.textContent.trim() : null,
        timestamp: Date.now()
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Обновление быстрой статистики
   */
  updateQuickStats() {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || {};
      const today = new Date().toDateString();
      const todayStats = stats[today] || { orders: 0, income: 0 };

      // Обновляем UI
      const ordersEl = document.getElementById('orders-today');
      const incomeEl = document.getElementById('income-today');
      const lotsEl = document.getElementById('active-lots');

      if (ordersEl) ordersEl.textContent = todayStats.orders;
      if (incomeEl) incomeEl.textContent = `${todayStats.income.toFixed(2)} ₽`;
      
      // Обновляем количество активных лотов
      const activeLots = document.querySelectorAll('.tc-item, .offer-list-item').length;
      if (lotsEl) lotsEl.textContent = activeLots;
    });
  }

  /**
   * Анализ цен конкурентов
   */
  async analyzeCompetitors() {
    const resultsDiv = document.getElementById('analysis-results');
    resultsDiv.innerHTML = '<p class="fpa-loading">Анализ...</p>';

    // Собираем все цены на странице
    const priceElements = document.querySelectorAll('.tc-price, .offer-price');
    const prices = [];
    const competitors = [];

    priceElements.forEach(el => {
      const priceText = el.textContent.trim();
      const match = priceText.match(/(\d+(?:[.,]\d+)?)/);
      if (match) {
        const price = parseFloat(match[1].replace(',', '.'));
        prices.push(price);
        
        // Пытаемся найти информацию о продавце
        const sellerEl = el.closest('.tc-item, .offer-list-item')?.querySelector('.media-user-name, .seller-name');
        competitors.push({
          price: price,
          seller: sellerEl ? sellerEl.textContent.trim() : 'Неизвестно'
        });
      }
    });

    if (prices.length === 0) {
      resultsDiv.innerHTML = '<p class="fpa-error">Не найдены цены на этой странице</p>';
      return;
    }

    // Вычисляем статистику
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = this.calculateMedian(prices);

    // Сортируем конкурентов по цене
    competitors.sort((a, b) => a.price - b.price);

    // Формируем результат
    let html = `
      <div class="analysis-summary">
        <div class="stat-row">
          <span>Минимальная цена:</span>
          <span class="highlight">${min.toFixed(2)} ₽</span>
        </div>
        <div class="stat-row">
          <span>Максимальная цена:</span>
          <span class="highlight">${max.toFixed(2)} ₽</span>
        </div>
        <div class="stat-row">
          <span>Средняя цена:</span>
          <span class="highlight">${avg.toFixed(2)} ₽</span>
        </div>
        <div class="stat-row">
          <span>Медианная цена:</span>
          <span class="highlight">${median.toFixed(2)} ₽</span>
        </div>
        <div class="stat-row">
          <span>Всего предложений:</span>
          <span class="highlight">${prices.length}</span>
        </div>
      </div>
      <div class="recommendation">
        <strong>💡 Рекомендация:</strong>
        <p>Рекомендуемая цена: ${(median * 0.98).toFixed(2)} - ${(median * 1.02).toFixed(2)} ₽</p>
        <p>Для конкурентоспособности установите цену немного ниже медианной.</p>
      </div>
    `;

    if (competitors.length > 0) {
      html += '<div class="competitors-list"><h5>Топ-5 конкурентов:</h5>';
      competitors.slice(0, 5).forEach((comp, idx) => {
        html += `
          <div class="competitor-item">
            <span>${idx + 1}. ${comp.seller}</span>
            <span>${comp.price.toFixed(2)} ₽</span>
          </div>
        `;
      });
      html += '</div>';
    }

    resultsDiv.innerHTML = html;

    // Сохраняем результаты анализа
    chrome.runtime.sendMessage({
      type: 'MARKET_ANALYSIS',
      data: {
        url: window.location.href,
        timestamp: Date.now(),
        prices: { min, max, avg, median },
        competitors: competitors.slice(0, 10)
      }
    });
  }

  /**
   * Вычисление медианы
   */
  calculateMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Слушаем сообщения от background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'REFRESH_STATS':
          this.collectStatistics();
          break;
        case 'ANALYZE_MARKET':
          this.analyzeCompetitors();
          break;
      }
    });

    // Обновляем статистику при переходе на новую страницу
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(() => {
          this.collectStatistics();
          this.setupPriceMonitoring();
        }, 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }
}

// Инициализация расширения
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FunPayAssistant();
  });
} else {
  new FunPayAssistant();
}
