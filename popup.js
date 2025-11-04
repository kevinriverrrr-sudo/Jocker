/**
 * FunPay Market Assistant - Popup Script
 * Скрипт для управления интерфейсом popup расширения
 */

class PopupManager {
  constructor() {
    this.currentTab = 'stats';
    this.settings = {};
    this.stats = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadStats();
    this.setupTabSwitching();
    this.setupEventListeners();
    this.updateUI();
  }

  /**
   * Загрузка настроек
   */
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        this.settings = result.settings || {
          notifyOrders: true,
          notifyMessages: true,
          soundNotifications: false,
          autoCollect: true,
          trackPrices: true,
          showPanel: true,
          darkMode: false,
          updateInterval: 30
        };
        this.applySettings();
        resolve();
      });
    });
  }

  /**
   * Загрузка статистики
   */
  async loadStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['stats', 'marketAnalysis', 'orders'], (result) => {
        this.stats = result.stats || {};
        this.marketAnalysis = result.marketAnalysis || [];
        this.orders = result.orders || [];
        resolve();
      });
    });
  }

  /**
   * Применение настроек к UI
   */
  applySettings() {
    document.getElementById('notify-orders').checked = this.settings.notifyOrders;
    document.getElementById('notify-messages').checked = this.settings.notifyMessages;
    document.getElementById('sound-notifications').checked = this.settings.soundNotifications;
    document.getElementById('auto-collect').checked = this.settings.autoCollect;
    document.getElementById('track-prices').checked = this.settings.trackPrices;
    document.getElementById('show-panel').checked = this.settings.showPanel;
    document.getElementById('dark-mode').checked = this.settings.darkMode;
    document.getElementById('update-interval').value = this.settings.updateInterval;

    // Применяем темную тему
    if (this.settings.darkMode) {
      document.body.classList.add('dark-mode');
    }
  }

  /**
   * Настройка переключения вкладок
   */
  setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        
        // Убираем активный класс со всех вкладок
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Активируем выбранную вкладку
        button.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        this.updateCurrentTab();
      });
    });
  }

  /**
   * Настройка обработчиков событий
   */
  setupEventListeners() {
    // Селектор периода
    document.getElementById('period-select').addEventListener('change', (e) => {
      this.updateStatsForPeriod(e.target.value);
    });

    // Кнопка анализа рынка
    document.getElementById('run-analysis').addEventListener('click', () => {
      this.runMarketAnalysis();
    });

    // Сохранение настроек
    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Сброс настроек
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });

    // Очистка данных
    document.getElementById('clear-data').addEventListener('click', () => {
      this.clearData();
    });

    // Темная тема
    document.getElementById('dark-mode').addEventListener('change', (e) => {
      if (e.target.checked) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    });
  }

  /**
   * Обновление UI
   */
  updateUI() {
    this.updateStatsTab();
    this.updateMarketTab();
  }

  /**
   * Обновление вкладки статистики
   */
  updateStatsTab() {
    const today = new Date().toDateString();
    const todayStats = this.stats[today] || { orders: 0, income: 0 };

    // Вычисляем общую статистику
    let totalOrders = 0;
    let totalIncome = 0;

    Object.values(this.stats).forEach(dayStat => {
      totalOrders += dayStat.orders || 0;
      totalIncome += dayStat.income || 0;
    });

    // Обновляем карточки статистики
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-income').textContent = `${totalIncome.toFixed(2)} ₽`;
    document.getElementById('today-orders').textContent = todayStats.orders;
    document.getElementById('today-income').textContent = `${todayStats.income.toFixed(2)} ₽`;

    // Обновляем список последних заказов
    this.updateRecentOrders();

    // Рисуем график
    this.drawSalesChart();
  }

  /**
   * Обновление списка последних заказов
   */
  updateRecentOrders() {
    const container = document.getElementById('recent-orders');
    
    if (!this.orders || this.orders.length === 0) {
      container.innerHTML = '<p class="no-data">Нет данных о заказах</p>';
      return;
    }

    const recentOrders = this.orders.slice(-10).reverse();
    
    container.innerHTML = recentOrders.map(order => `
      <div class="order-item">
        <div class="order-info">
          <span class="order-price">${order.price || 'N/A'}</span>
          <span class="order-date">${order.date || new Date(order.timestamp).toLocaleString()}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Рисование графика продаж
   */
  drawSalesChart() {
    const canvas = document.getElementById('sales-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 200;

    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);

    // Получаем данные за последние 7 дней
    const dates = [];
    const values = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      dates.push(date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }));
      values.push(this.stats[dateStr]?.income || 0);
    }

    const maxValue = Math.max(...values, 1);
    const padding = 30;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Рисуем оси
    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Рисуем линию графика
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((value, index) => {
      const x = padding + (graphWidth / (values.length - 1)) * index;
      const y = height - padding - (value / maxValue) * graphHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      // Точки на графике
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.stroke();

    // Подписи дат
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    dates.forEach((date, index) => {
      const x = padding + (graphWidth / (values.length - 1)) * index;
      ctx.fillText(date, x, height - 10);
    });
  }

  /**
   * Обновление вкладки рынка
   */
  updateMarketTab() {
    if (!this.marketAnalysis || this.marketAnalysis.length === 0) {
      return;
    }

    const lastAnalysis = this.marketAnalysis[this.marketAnalysis.length - 1];
    
    // Обновляем информацию о последнем анализе
    const lastAnalysisDiv = document.getElementById('last-analysis');
    lastAnalysisDiv.innerHTML = `
      <p><strong>Дата:</strong> ${new Date(lastAnalysis.timestamp).toLocaleString()}</p>
      <p><strong>URL:</strong> <a href="${lastAnalysis.url}" target="_blank">Открыть</a></p>
    `;

    // Обновляем статистику рынка
    const marketStatsDiv = document.getElementById('market-stats');
    if (lastAnalysis.prices) {
      marketStatsDiv.innerHTML = `
        <div class="price-stats">
          <div class="price-stat-item">
            <span class="label">Мин. цена:</span>
            <span class="value">${lastAnalysis.prices.min.toFixed(2)} ₽</span>
          </div>
          <div class="price-stat-item">
            <span class="label">Макс. цена:</span>
            <span class="value">${lastAnalysis.prices.max.toFixed(2)} ₽</span>
          </div>
          <div class="price-stat-item">
            <span class="label">Средняя цена:</span>
            <span class="value">${lastAnalysis.prices.avg.toFixed(2)} ₽</span>
          </div>
          <div class="price-stat-item">
            <span class="label">Медиана:</span>
            <span class="value">${lastAnalysis.prices.median.toFixed(2)} ₽</span>
          </div>
        </div>
      `;
    }

    // Обновляем список конкурентов
    if (lastAnalysis.competitors && lastAnalysis.competitors.length > 0) {
      const competitorsDiv = document.getElementById('competitors-list');
      competitorsDiv.innerHTML = lastAnalysis.competitors.map((comp, idx) => `
        <div class="competitor-row">
          <span class="rank">${idx + 1}</span>
          <span class="seller">${comp.seller}</span>
          <span class="price">${comp.price.toFixed(2)} ₽</span>
        </div>
      `).join('');
    }

    // Обновляем рекомендации
    if (lastAnalysis.prices) {
      const recommendationsDiv = document.getElementById('price-recommendations');
      const recommendedMin = (lastAnalysis.prices.median * 0.98).toFixed(2);
      const recommendedMax = (lastAnalysis.prices.median * 1.02).toFixed(2);
      
      recommendationsDiv.innerHTML = `
        <div class="recommendation-box">
          <p><strong>Рекомендуемая цена:</strong></p>
          <p class="recommended-price">${recommendedMin} - ${recommendedMax} ₽</p>
          <p class="recommendation-text">
            Для повышения конкурентоспособности рекомендуется установить цену 
            на уровне медианной или немного ниже. Это поможет привлечь больше покупателей.
          </p>
        </div>
      `;
    }
  }

  /**
   * Обновление статистики за период
   */
  updateStatsForPeriod(period) {
    // Здесь можно добавить логику фильтрации по периоду
    console.log('Updating stats for period:', period);
    this.updateStatsTab();
  }

  /**
   * Запуск анализа рынка
   */
  async runMarketAnalysis() {
    const button = document.getElementById('run-analysis');
    button.disabled = true;
    button.textContent = '⏳ Анализ...';

    try {
      // Отправляем сообщение content script для проведения анализа
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('funpay.com')) {
        alert('Откройте страницу FunPay для проведения анализа');
        return;
      }

      await chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_MARKET' });
      
      // Ждем обновления данных
      setTimeout(async () => {
        await this.loadStats();
        this.updateMarketTab();
      }, 2000);
      
    } catch (error) {
      console.error('Error running analysis:', error);
      alert('Ошибка при проведении анализа. Убедитесь, что вы на странице FunPay.');
    } finally {
      button.disabled = false;
      button.textContent = '🔍 Провести анализ цен';
    }
  }

  /**
   * Сохранение настроек
   */
  saveSettings() {
    this.settings = {
      notifyOrders: document.getElementById('notify-orders').checked,
      notifyMessages: document.getElementById('notify-messages').checked,
      soundNotifications: document.getElementById('sound-notifications').checked,
      autoCollect: document.getElementById('auto-collect').checked,
      trackPrices: document.getElementById('track-prices').checked,
      showPanel: document.getElementById('show-panel').checked,
      darkMode: document.getElementById('dark-mode').checked,
      updateInterval: parseInt(document.getElementById('update-interval').value)
    };

    chrome.storage.local.set({ settings: this.settings }, () => {
      // Уведомление о сохранении
      const button = document.getElementById('save-settings');
      const originalText = button.textContent;
      button.textContent = '✅ Сохранено!';
      
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);

      // Отправляем обновленные настройки в background
      chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        data: this.settings
      });
    });
  }

  /**
   * Сброс настроек
   */
  resetSettings() {
    if (confirm('Вы уверены, что хотите сбросить все настройки?')) {
      this.settings = {
        notifyOrders: true,
        notifyMessages: true,
        soundNotifications: false,
        autoCollect: true,
        trackPrices: true,
        showPanel: true,
        darkMode: false,
        updateInterval: 30
      };
      
      chrome.storage.local.set({ settings: this.settings }, () => {
        this.applySettings();
        alert('Настройки сброшены');
      });
    }
  }

  /**
   * Очистка данных
   */
  clearData() {
    if (confirm('Вы уверены, что хотите очистить все собранные данные? Это действие необратимо.')) {
      chrome.storage.local.set({
        stats: {},
        orders: [],
        marketAnalysis: []
      }, () => {
        this.stats = {};
        this.orders = [];
        this.marketAnalysis = [];
        this.updateUI();
        alert('Данные очищены');
      });
    }
  }

  /**
   * Обновление текущей вкладки
   */
  updateCurrentTab() {
    switch (this.currentTab) {
      case 'stats':
        this.updateStatsTab();
        break;
      case 'market':
        this.updateMarketTab();
        break;
    }
  }
}

// Инициализация при загрузке popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
