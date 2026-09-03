// Push по откликам водителей на запросы заказчиков (S10), зеркально
// responseTriggers.js. Схема requestResponses — см. src/lib/db.js:
// driverId/driverName на самой записи, requestCustomerId — денормализованный
// владелец запроса.

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { sendToUid } = require('./messaging');

/** Новый отклик водителя → заказчику-владельцу запроса. */
exports.onRequestResponseCreated = onDocumentCreated('requestResponses/{responseId}', async (event) => {
  const response = event.data.data();
  await sendToUid(response.requestCustomerId, {
    title: 'Новый отклик на ваш запрос',
    body: `${response.driverName} · ${response.arrivalTime}`,
    url: `/board/requests/${response.requestId}/responses`,
  });
});

/**
 * Смена статуса отклика → противоположной стороне. `confirmed`/`rejected`
 * решает заказчик — уведомляем водителя (автора отклика); `cancelled`
 * снимает заказчик (п. 8.4 ТЗ, симметрично п. 7.7) — тоже уведомляем
 * водителя, он здесь и есть «вторая сторона».
 */
exports.onRequestResponseUpdated = onDocumentUpdated('requestResponses/{responseId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status) return;

  if (after.status === 'confirmed') {
    await sendToUid(after.driverId, {
      title: 'Отклик подтверждён',
      body: `Заказчик подтвердил поездку на ${after.arrivalTime}`,
      url: '/trips',
    });
  } else if (after.status === 'rejected') {
    await sendToUid(after.driverId, {
      title: 'Отклик отклонён',
      body: `Запрос на ${after.arrivalTime} закрыт без вас`,
      url: '/board/requests',
    });
  } else if (after.status === 'cancelled') {
    await sendToUid(after.driverId, {
      title: 'Поездка отменена',
      body: `Заказчик отменил бронь на ${after.arrivalTime}`,
      url: '/trips',
    });
  }
});
