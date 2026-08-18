export function reserveStatusCopy(reachesWithReserve: boolean): string {
  return reachesWithReserve
    ? 'Se mantiene ≥15% de reserva por imprevistos.'
    : 'Por debajo de la reserva del 15% (imprevistos). No alcanza sin cargar.'
}
