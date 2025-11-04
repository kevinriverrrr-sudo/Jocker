/**
 * FunPay Market Assistant - Background Service Worker
 * Обработка фоновых задач, уведомлений и хранения данных
 */

class BackgroundService {
  constructor() {
    this.settings = null;
    this.stats = {};
    this.orders = [];
    this.marketAnalysis = [];
    this.init();
  }

  async init() {
    console.log('[FunPay Assistant] Background service started');
    await this.loadData();
    this.setupMessageHandlers();
    this.setupAlarms();
    this.checkNotificationPermission();
  }

  /**
   * Загрузка данных из storage
   */
  async loadData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings', 'stats', 'orders', 'marketAnalysis'], (result) => {
        this.settings = result.settings || this.getDefaultSettings();
        this.stats = result.stats || {};
        this.orders = result.orders || [];
        this.marketAnalysis = result.marketAnalysis || [];
        resolve();
      });
    });
  }

  /**
   * Настройки по умолчанию
   */
  getDefaultSettings() {
    return {
      notifyOrders: true,
      notifyMessages: true,
      soundNotifications: false,
      autoCollect: true,
      trackPrices: true,
      showPanel: true,
      darkMode: false,
      updateInterval: 30
    };
  }

  /**
   * Проверка разрешений на уведомления
   */
  async checkNotificationPermission() {
    try {
      const permission = await chrome.notifications.getPermissionLevel();
      console.log('[FunPay Assistant] Notification permission:', permission);
    } catch (error) {
      console.error('[FunPay Assistant] Error checking notification permission:', error);
    }
  }

  /**
   * Настройка обработчиков сообщений
   */
  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Асинхронный ответ
    });
  }

  /**
   * Обработка сообщений
   */
  async handleMessage(message, sender, sendResponse) {
    console.log('[FunPay Assistant] Message received:', message.type);

    switch (message.type) {
      case 'NEW_ORDER':
        await this.handleNewOrder(message.data);
        break;

      case 'PRICE_DATA':
        await this.handlePriceData(message.data);
        break;

      case 'UPDATE_STATS':
        await this.handleStatsUpdate(message.data);
        break;

      case 'MARKET_ANALYSIS':
        await this.handleMarketAnalysis(message.data);
        break;

      case 'SETTINGS_UPDATED':
        await this.handleSettingsUpdate(message.data);
        break;

      case 'GET_STATS':
        sendResponse({ stats: this.stats, orders: this.orders });
        break;

      default:
        console.log('[FunPay Assistant] Unknown message type:', message.type);
    }
  }

  /**
   * Обработка нового заказа
   */
  async handleNewOrder(data) {
    console.log('[FunPay Assistant] New order detected:', data);

    // Добавляем заказ в список
    this.orders.push({
      ...data,
      timestamp: Date.now(),
      date: new Date().toLocaleString()
    });

    // Обновляем статистику
    const today = new Date().toDateString();
    if (!this.stats[today]) {
      this.stats[today] = { orders: 0, income: 0 };
    }
    this.stats[today].orders += 1;

    // Сохраняем данные
    await this.saveData();

    // Отправляем уведомление
    if (this.settings.notifyOrders) {
      this.sendNotification({
        title: '📦 Новый заказ на FunPay!',
        message: 'Получен новый заказ. Проверьте детали на сайте.',
        iconUrl: 'icons/icon128.png'
      });
    }
  }

  /**
   * Обработка данных о ценах
   */
  async handlePriceData(data) {
    console.log('[FunPay Assistant] Price data received:', data);

    // Здесь можно добавить логику сохранения истории цен
    // Для будущих анализов и трендов
    
    const priceHistory = {
      url: data.url,
      prices: data.prices,
      timestamp: data.timestamp,
      date: new Date(data.timestamp).toLocaleString()
    };

    // Сохраняем в отдельное хранилище для истории цен
    chrome.storage.local.get(['priceHistory'], (result) => {
      const history = result.priceHistory || [];
      history.push(priceHistory);
      
      // Ограничиваем историю последними 100 записями
      if (history.length > 100) {
        history.shift();
      }
      
      chrome.storage.local.set({ priceHistory: history });
    });
  }

  /**
   * Обработка обновления статистики
   */
  async handleStatsUpdate(data) {
    console.log('[FunPay Assistant] Stats update received:', data);

    // Обновляем количество активных лотов
    const today = new Date().toDateString();
    if (!this.stats[today]) {
      this.stats[today] = { orders: 0, income: 0 };
    }

    // Обрабатываем информацию о заказах
    if (data.orders && data.orders.length > 0) {
      data.orders.forEach(order => {
        // Пытаемся извлечь сумму из цены
        if (order.price) {
          const match = order.price.match(/(\d+(?:[.,]\d+)?)/);
          if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            this.stats[today].income += amount;
          }
        }
      });
    }

    await this.saveData();
  }

  /**
   * Обработка анализа рынка
   */
  async handleMarketAnalysis(data) {
    console.log('[FunPay Assistant] Market analysis received:', data);

    // Добавляем анализ в список
    this.marketAnalysis.push({
      ...data,
      id: Date.now(),
      date: new Date(data.timestamp).toLocaleString()
    });

    // Ограничиваем количество сохраненных анализов
    if (this.marketAnalysis.length > 50) {
      this.marketAnalysis.shift();
    }

    await this.saveData();

    // Уведомление о завершении анализа
    if (this.settings.notifyOrders) {
      const { min, max, median } = data.prices;
      this.sendNotification({
        title: '💹 Анализ рынка завершен',
        message: `Мин: ${min.toFixed(2)}₽ | Макс: ${max.toFixed(2)}₽ | Медиана: ${median.toFixed(2)}₽`,
        iconUrl: 'icons/icon128.png'
      });
    }
  }

  /**
   * Обработка обновления настроек
   */
  async handleSettingsUpdate(data) {
    console.log('[FunPay Assistant] Settings updated:', data);
    this.settings = data;
    await chrome.storage.local.set({ settings: data });

    // Обновляем интервал алармов если изменился
    this.setupAlarms();
  }

  /**
   * Сохранение данных
   */
  async saveData() {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        stats: this.stats,
        orders: this.orders,
        marketAnalysis: this.marketAnalysis
      }, resolve);
    });
  }

  /**
   * Настройка периодических задач
   */
  setupAlarms() {
    // Очищаем старые алармы
    chrome.alarms.clearAll();

    // Создаем новый аларм для периодического обновления
    const interval = this.settings?.updateInterval || 30;
    chrome.alarms.create('updateStats', {
      periodInMinutes: interval / 60
    });

    // Обработчик алармов
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'updateStats') {
        this.periodicUpdate();
      }
    });
  }

  /**
   * Периодическое обновление
   */
  async periodicUpdate() {
    console.log('[FunPay Assistant] Periodic update triggered');

    // Отправляем сообщение всем вкладкам FunPay для обновления данных
    const tabs = await chrome.tabs.query({ url: 'https://funpay.com/*' });
    
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_STATS' }).catch(() => {
        // Игнорируем ошибки для неактивных вкладок
      });
    });
  }

  /**
   * Отправка уведомления
   */
  sendNotification({ title, message, iconUrl }) {
    const notificationOptions = {
      type: 'basic',
      iconUrl: iconUrl || 'icons/icon128.png',
      title: title,
      message: message,
      priority: 2
    };

    chrome.notifications.create('', notificationOptions, (notificationId) => {
      console.log('[FunPay Assistant] Notification sent:', notificationId);

      // Автоматически закрываем через 5 секунд
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 5000);
    });

    // Воспроизводим звук если включено
    if (this.settings.soundNotifications) {
      // Можно добавить воспроизведение звука
      console.log('[FunPay Assistant] Sound notification triggered');
    }
  }

  /**
   * Обработка клика на иконку расширения
   */
  setupActionHandler() {
    chrome.action.onClicked.addListener(async (tab) => {
      if (tab.url.includes('funpay.com')) {
        // Отправляем сообщение для показа/скрытия панели
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' });
      }
    });
  }
}

// Инициализация background service
const backgroundService = new BackgroundService();

// Обработка установки расширения
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[FunPay Assistant] Extension installed/updated:', details.reason);

  if (details.reason === 'install') {
    // Открываем welcome страницу или устанавливаем начальные данные
    console.log('[FunPay Assistant] First time installation');
  } else if (details.reason === 'update') {
    console.log('[FunPay Assistant] Extension updated');
  }
});

// Обработка запуска браузера
chrome.runtime.onStartup.addListener(() => {
  console.log('[FunPay Assistant] Browser started');
  backgroundService.loadData();
});
