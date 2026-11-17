// Ported from stlim0727/flight3d (contactCompliance.js)
(function(ns) {
  'use strict';

  function compliantNormalForce(depth, speed, stiffness, damping, inverseEffectiveMass, dt) {
    return Math.max(0, (stiffness * depth - (damping + dt * stiffness) * speed)
      / (1 + dt * (damping + dt * stiffness) * inverseEffectiveMass));
  }

  function inverseContactMass(arm, normal, mass, inverseInertia) {
    const x = arm.y * normal.z - arm.z * normal.y;
    const y = arm.z * normal.x - arm.x * normal.z;
    const z = arm.x * normal.y - arm.y * normal.x;
    return 1 / mass + x * x * inverseInertia.x + y * y * inverseInertia.y + z * z * inverseInertia.z;
  }

  ns.compliantNormalForce = compliantNormalForce;
  ns.inverseContactMass = inverseContactMass;
})(globalThis.Flight3dPhysics = globalThis.Flight3dPhysics || {});
