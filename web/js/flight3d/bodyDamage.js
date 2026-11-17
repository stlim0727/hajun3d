// Ported from stlim0727/flight3d (bodyDamage.js)
(function(ns) {
  'use strict';

  const BODY_DAMAGE_LIMITS = Object.freeze({
    engineL: { impact: 2, fatalImpact: 10, abrasionEnergy: 45000000 },
    engineR: { impact: 2, fatalImpact: 10, abrasionEnergy: 45000000 },
    belly: { impact: 3, fatalImpact: 12.5, abrasionEnergy: 300000000 },
    nose: { impact: 3, fatalImpact: 10, abrasionEnergy: 180000000 },
    tail: { impact: 2, fatalImpact: 8, abrasionEnergy: 100000000 },
    wingL: { impact: 2, fatalImpact: 8, abrasionEnergy: 100000000 },
    wingR: { impact: 2, fatalImpact: 8, abrasionEnergy: 100000000 },
  });

  const bodyDamageState = damage => damage >= 1 ? 'failed' : damage >= 0.3 ? 'damaged' : 'normal';

  function updateBodyDamage(damage, { sinkRate, firstContact, frictionWork }, limits) {
    const impact = firstContact
      ? Math.max(0, sinkRate * sinkRate - limits.impact ** 2) / (limits.fatalImpact ** 2 - limits.impact ** 2)
      : 0;
    return Math.min(1, damage + impact + Math.max(0, frictionWork) / limits.abrasionEnergy);
  }

  ns.BODY_DAMAGE_LIMITS = BODY_DAMAGE_LIMITS;
  ns.bodyDamageState = bodyDamageState;
  ns.updateBodyDamage = updateBodyDamage;
})(globalThis.Flight3dPhysics = globalThis.Flight3dPhysics || {});
