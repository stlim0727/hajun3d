// Ported from stlim0727/flight3d (gLimiter.js)
(function(ns) {
  'use strict';

  const { Atmosphere } = ns;

  function limitedPitchMoment({ requestedMoment, inertia, pitchRate, alphaRate,
    normalG, gPerAlpha, limits }) {
    const bandwidth = 6;
    const margin = 0.35;
    const lowerAcceleration = bandwidth ** 2 * (limits.min + margin - normalG) / gPerAlpha
      - 2 * bandwidth * alphaRate;
    const upperAcceleration = bandwidth ** 2 * (limits.max - margin - normalG) / gPerAlpha
      - 2 * bandwidth * alphaRate;
    const damping = 0.35 * pitchRate;
    return Math.max((lowerAcceleration + damping) * inertia,
      Math.min((upperAcceleration + damping) * inertia, requestedMoment));
  }

  function incidenceRate(u, v, w, omega, aY, aZ) {
    return omega.x + (-u * aY + w * aZ + v * (u * omega.z + w * omega.y))
      / Math.max(100, u * u + w * w);
  }

  function loadSlope(aero, qDyn, alpha) {
    return Math.max(0.1, qDyn * aero.wingArea * aero.CLa * Math.cos(alpha)
      * aero.tuning.liftMultiplier / (aero.mass * Atmosphere.G0));
  }

  ns.limitedPitchMoment = limitedPitchMoment;
  ns.incidenceRate = incidenceRate;
  ns.loadSlope = loadSlope;
})(globalThis.Flight3dPhysics = globalThis.Flight3dPhysics || {});
