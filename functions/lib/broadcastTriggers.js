// Push по новым предложениям/запросам на досках (S10, ТЗ 10, п. 1-2) —
// уходит всем пользователям противоположной роли (решение из начала S10:
// без фильтра по очереди, площадка маленькая — растёт риск спама, не риск
// нерелевантности).

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { sendToUsers } = require('./messaging');

/**
 * Новое предложение водителя → всем заказчикам. Предложения, порождённые
 * генерацией шаблона (S9, поле `templateId`), пропускаются — иначе
 * публикация шаблона на месяц вперёд шлёт каждому заказчику до 30 push
 * подряд одним действием водителя.
 */
exports.onRideOfferCreated = onDocumentCreated('rideOffers/{offerId}', async (event) => {
  const offer = event.data.data();
  if (offer.templateId) return;

  const customers = await getFirestore().collection('users').where('isCustomer', '==', true).get();
  await sendToUsers(
    customers.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    {
      title: 'Новая поездка на доске',
      body: `${offer.driverName} · ${offer.arrivalTime} · мест: ${offer.seatsTotal}`,
      url: '/board/drivers',
    },
  );
});

/** Новый запрос заказчика → всем водителям. */
exports.onRequestCreated = onDocumentCreated('requests/{requestId}', async (event) => {
  const request = event.data.data();

  const drivers = await getFirestore().collection('users').where('isDriver', '==', true).get();
  await sendToUsers(
    drivers.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    {
      title: 'Новый запрос на трансфер',
      body: `${request.customerName} · ${request.arrivalTime}`,
      url: '/board/requests',
    },
  );
});
