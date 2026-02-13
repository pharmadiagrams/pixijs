'use strict';

var BufferResource = require('../../rendering/renderers/shared/buffer/BufferResource.js');
var UniformGroup = require('../../rendering/renderers/shared/shader/UniformGroup.js');
var uniformParsers = require('../../rendering/renderers/shared/shader/utils/uniformParsers.js');
var uniformSyncFunctions = require('./uniformSyncFunctions.js');

"use strict";
function generateUniformsSyncPolyfill(group, uniformData) {
  const functionMap = {};
  const nestedResources = [];
  for (const i in group.uniforms) {
    if (!uniformData[i]) {
      const uniform2 = group.uniforms[i];
      if (uniform2 instanceof UniformGroup.UniformGroup) {
        if (uniform2.ubo) {
          nestedResources.push({ name: i, type: "uniformGroupUbo" });
        } else {
          nestedResources.push({ name: i, type: "uniformGroupNonUbo" });
        }
      } else if (uniform2 instanceof BufferResource.BufferResource) {
        nestedResources.push({ name: i, type: "bufferResource" });
      }
      continue;
    }
    const uniform = group.uniformStructures[i];
    let parsed = false;
    for (let j = 0; j < uniformParsers.uniformParsers.length; j++) {
      const parser = uniformParsers.uniformParsers[j];
      if (uniform.type === parser.type && parser.test(uniform)) {
        functionMap[i] = uniformSyncFunctions.uniformParserFunctions[j];
        parsed = true;
        break;
      }
    }
    if (!parsed) {
      const templateType = uniform.size === 1 ? uniformSyncFunctions.uniformSingleParserFunctions : uniformSyncFunctions.uniformArrayParserFunctions;
      functionMap[i] = templateType[uniform.type];
    }
  }
  return (ud, uv, renderer, _syncData) => {
    const gl = renderer.gl;
    for (let k = 0; k < nestedResources.length; k++) {
      const nested = nestedResources[k];
      const resource = uv[nested.name];
      if (nested.type === "uniformGroupUbo") {
        renderer.shader.bindUniformBlock(resource, nested.name);
      } else if (nested.type === "uniformGroupNonUbo") {
        renderer.shader.updateUniformGroup(resource);
      } else if (nested.type === "bufferResource") {
        renderer.shader.bindUniformBlock(resource, nested.name);
      }
    }
    for (const i in functionMap) {
      const v = uv[i];
      const cu = ud[i];
      const cv = ud[i].value;
      functionMap[i](i, cu, cv, v, ud, uv, gl);
    }
  };
}

exports.generateUniformsSyncPolyfill = generateUniformsSyncPolyfill;
//# sourceMappingURL=generateUniformsSyncPolyfill.js.map
