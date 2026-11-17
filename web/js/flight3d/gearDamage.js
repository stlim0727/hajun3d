// Ported from stlim0727/flight3d (gearDamage.js)
(function(ns) {
  'use strict';

  const GEAR_DAMAGE_LIMITS = Object.freeze({
    nose: Object.freeze({ vertical: 900000, lateral: 450000, longitudinal: 650000, impact: 2.8, collapseImpact: 8 }),
    main: Object.freeze({ vertical: 1800000, lateral: 900000, longitudinal: 1300000, impact: 3.8, collapseImpact: 10 }),
  });

  function updateGearDamage(contact, demand, dt, limits) {
    if (contact.damageState === 'collapsed') return;
    const { sinkRate, firstContact, normalLoad, lateralLoad, longitudinalLoad, overtravel, locked } = demand;
    const ratio = Math.hypot(normalLoad / limits.vertical,
      lateralLoad / limits.lateral, longitudinalLoad / limits.longitudinal);
    let increment = Math.max(0, ratio - 1) ** 2 * dt * 2;
    if (firstContact && sinkRate > limits.impact) {
      increment += 0.35 + 0.65 * (sinkRate - limits.impact) / (limits.collapseImpact - limits.impact);
    }
    if (overtravel > 0.08) {
      if (firstContact) contact.damage = Math.max(0.3, contact.damage);
      increment += (overtravel - 0.08) * dt * 2;
    }
    if (!locked && normalLoad > 50000) increment += normalLoad / limits.vertical * dt * 8;
    contact.damage = Math.min(1, contact.damage + increment);
    contact.damageState = contact.damage >= 1 ? 'collapsed' : contact.damage >= 0.3 ? 'damaged' : 'normal';
  }

  ns.GEAR_DAMAGE_LIMITS = GEAR_DAMAGE_LIMITS;
  ns.updateGearDamage = updateGearDamage;
})(globalThis.Flight3dPhysics = globalThis.Flight3dPhysics || {});
