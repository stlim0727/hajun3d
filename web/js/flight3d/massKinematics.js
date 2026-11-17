// Ported from stlim0727/flight3d (massKinematics.js)
(function(ns) {
  'use strict';

  const offset = new THREE.Vector3();
  const delta = new THREE.Vector3();

  function rebaseCgVelocity(velocity, omegaBody, quaternion, oldCg, newCg) {
    delta.set(newCg.x - oldCg.x, newCg.y - oldCg.y, newCg.z - oldCg.z);
    offset.copy(omegaBody).cross(delta).applyQuaternion(quaternion);
    velocity.add(offset);
  }

  function translateModelOrigin(position, velocityCg, oldQuaternion, newQuaternion, cg, dt) {
    position.addScaledVector(velocityCg, dt);
    offset.copy(cg).applyQuaternion(oldQuaternion);
    position.add(offset);
    offset.copy(cg).applyQuaternion(newQuaternion);
    position.sub(offset);
  }

  ns.rebaseCgVelocity = rebaseCgVelocity;
  ns.translateModelOrigin = translateModelOrigin;
})(globalThis.Flight3dPhysics = globalThis.Flight3dPhysics || {});
