// Сборка «моих поездок» (S8) из четырёх сырых списков Firestore в единую
// плоскую структуру для TripCard. Вынесено из MyTrips.jsx — чистая логика,
// не JSX, отдельно проще перечитывать и держать экран компактным.

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

function formatDateLabel(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

function childrenWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ребёнок';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'ребёнка';
  return 'детей';
}

function childrenLabel(children) {
  const count = children.length;
  return `${count} ${childrenWord(count)}: ${children.map((child) => child.name).join(', ')}`;
}

/**
 * Собирает единый список откликов из четырёх ролей пользователя. `offerCache`
 * и `requestCache` — разово подгруженные rideOffers/requests для ролей, у
 * которых на самом отклике нет данных второй стороны (см. хэндофф S8).
 * Общая для buildTrips (S8) и buildResponses (S16) — они лишь по-разному
 * фильтруют один и тот же список по статусу.
 */
function buildResponseList({ respCustomer, respDriver, reqRespDriver, reqRespCustomer, offerCache, requestCache }) {
  const list = [];

  for (const r of respCustomer) {
    const offer = offerCache[r.offerId];
    list.push({
      key: `resp-${r.id}`,
      kind: 'response',
      id: r.id,
      raw: r,
      myRole: 'customer',
      status: r.status,
      date: r.date,
      arrivalTime: r.arrivalTime,
      dateLabel: formatDateLabel(r.date),
      otherName: offer?.driverName,
      otherPhone: offer?.driverPhone,
      otherCar: offer?.driverCar,
      otherStartStreet: offer?.driverStartStreet,
      queues: offer?.pickupQueues,
      childrenLabel: childrenLabel(r.children),
      note: r.note,
    });
  }

  for (const r of respDriver) {
    list.push({
      key: `resp-${r.id}`,
      kind: 'response',
      id: r.id,
      raw: r,
      myRole: 'driver',
      status: r.status,
      date: r.date,
      arrivalTime: r.arrivalTime,
      dateLabel: formatDateLabel(r.date),
      otherName: r.customerName,
      otherPhone: r.customerPhone,
      address: r.address,
      queues: [r.homeQueue],
      childrenLabel: childrenLabel(r.children),
      note: r.note,
    });
  }

  for (const r of reqRespDriver) {
    const request = requestCache[r.requestId];
    list.push({
      key: `reqresp-${r.id}`,
      kind: 'requestResponse',
      id: r.id,
      raw: r,
      myRole: 'driver',
      status: r.status,
      date: r.date,
      arrivalTime: r.arrivalTime,
      dateLabel: formatDateLabel(r.date),
      otherName: request?.customerName,
      otherPhone: request?.customerPhone,
      address: request?.address,
      queues: request ? [request.homeQueue] : [],
      childrenLabel: request ? childrenLabel(request.children) : '',
      note: r.note,
    });
  }

  for (const r of reqRespCustomer) {
    list.push({
      key: `reqresp-${r.id}`,
      kind: 'requestResponse',
      id: r.id,
      raw: r,
      myRole: 'customer',
      status: r.status,
      date: r.date,
      arrivalTime: r.arrivalTime,
      dateLabel: formatDateLabel(r.date),
      otherName: r.driverName,
      otherPhone: r.driverPhone,
      otherCar: r.driverCar,
      otherStartStreet: r.driverStartStreet,
      queues: r.pickupQueues,
      note: r.note,
    });
  }

  // Получатель отклика — та сторона, что решает подтвердить/отклонить: у
  // предложения это водитель (myRole 'driver'), у запроса — заказчик
  // (myRole 'customer'); другая сторона только отправила отклик и ждёт.
  return list.map((trip) => ({
    ...trip,
    actionable: trip.kind === 'response' ? trip.myRole === 'driver' : trip.myRole === 'customer',
  }));
}

/**
 * «Мои поездки» (S8) — только подтверждённые/завершённые отклики.
 */
export function buildTrips(input) {
  return buildResponseList(input).filter((trip) => trip.status === 'confirmed' || trip.status === 'delivered');
}

/**
 * «Отклики» (S16) — отклики, ещё не подтверждённые (`pending`, с действием
 * для получателя) или уже отклонённые (`rejected`, без действий — просто
 * факт, видимый обеим сторонам). `confirmed`/`delivered` сюда не попадают —
 * они уже показаны в «Поездках», дублировать незачем.
 */
export function buildResponses(input) {
  return buildResponseList(input).filter((trip) => trip.status === 'pending' || trip.status === 'rejected');
}

/**
 * Мои открытые публикации (S14) — предложения и запросы, которые я
 * опубликовал(а) и которые ещё висят на доске без подтверждённого отклика.
 * В отличие от buildTrips, тут нет статуса confirmed/delivered — статус
 * ролей здесь один, 'open', иначе документ не попал бы в подписку.
 */
export function buildMyListings({ offers, requests }) {
  const list = [];

  for (const o of offers) {
    list.push({
      key: `offer-${o.id}`,
      kind: 'offer',
      id: o.id,
      date: o.date,
      arrivalTime: o.arrivalTime,
      dateLabel: formatDateLabel(o.date),
      title: `${o.seatsFree} из ${o.seatsTotal} свободно`,
      queues: o.pickupQueues,
      note: o.note,
      editHref: `/board/drivers/${o.id}/edit`,
    });
  }

  for (const r of requests) {
    list.push({
      key: `request-${r.id}`,
      kind: 'request',
      id: r.id,
      date: r.date,
      arrivalTime: r.arrivalTime,
      dateLabel: formatDateLabel(r.date),
      title: childrenLabel(r.children),
      queues: [r.homeQueue],
      note: r.note,
      editHref: `/board/requests/${r.id}/edit`,
    });
  }

  return list.sort((a, b) => (a.date + a.arrivalTime).localeCompare(b.date + b.arrivalTime));
}
