// Push по откликам заказчиков на предложения водителей (S10, ТЗ 10, п. 3-5).
// Схема responses — см. src/lib/db.js: customerId/customerName на самой
// записи, offerDriverId — денормализованный владелец предложения.

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { sendToUid } = require('./messaging');

/** Новый отклик заказчика → водителю-владельцу предложения. */
exports.onResponseCreated = onDocumentCreated('responses/{responseId}', async (event) => {
  const response = event.data.data();
  await sendToUid(response.offerDriverId, {
    title: 'Новый отклик на вашу поездку',
    body: `${response.customerName} · ${response.arrivalTime}`,
    url: `/board/drivers/${response.offerId}/responses`,
  });
});

/**
 * Смена статуса отклика → противоположной стороне. `confirmed`/`rejected`
 * решает водитель — уведомляем заказчика (автора отклика); `cancelled`
 * снимает заказчик (п. 7.7 ТЗ) — уведомляем водителя.
 */
exports.onResponseUpdated = onDocumentUpdated('responses/{responseId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (before.status === after.status) return;

  if (after.status === 'confirmed') {
    await sendToUid(after.customerId, {
      title: 'Отклик подтверждён',
      body: `Ваша поездка на ${after.arrivalTime} подтверждена водителем`,
      url: '/trips',
    });
  } else if (after.status === 'rejected') {
    await sendToUid(after.customerId, {
      title: 'Отклик отклонён',
      body: `Поездку на ${after.arrivalTime} водитель не подтвердил`,
      url: '/board/drivers',
    });
  } else if (after.status === 'cancelled') {
    await sendToUid(after.offerDriverId, {
      title: 'Поездка отменена',
      body: `${after.customerName} отменил бронь на ${after.arrivalTime}`,
      url: '/trips',
    });
  }
});
