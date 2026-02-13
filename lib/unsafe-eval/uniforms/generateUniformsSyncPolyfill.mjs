import { BufferResource } from '../../rendering/renderers/shared/buffer/BufferResource.mjs';
import { UniformGroup } from '../../rendering/renderers/shared/shader/UniformGroup.mjs';
import { uniformParsers } from '../../rendering/renderers/shared/shader/utils/uniformParsers.mjs';
import { uniformParserFunctions, uniformSingleParserFunctions, uniformArrayParserFunctions } from './uniformSyncFunctions.mjs';

"use strict";
function generateUniformsSyncPolyfill(group, uniformData) {
  const functionMap = {};
  const nestedResources = [];
  for (const i in group.uniforms) {
    if (!uniformData[i]) {
      const uniform2 = group.uniforms[i];
      if (uniform2 instanceof UniformGroup) {
        if (uniform2.ubo) {
          nestedResources.push({ name: i, type: "uniformGroupUbo" });
        } else {
          nestedResources.push({ name: i, type: "uniformGroupNonUbo" });
        }
      } else if (uniform2 instanceof BufferResource) {
        nestedResources.push({ name: i, type: "bufferResource" });
      }
      continue;
    }
    const uniform = group.uniformStructures[i];
    let parsed = false;
    for (let j = 0; j < uniformParsers.length; j++) {
      const parser = uniformParsers[j];
      if (uniform.type === parser.type && parser.test(uniform)) {
        functionMap[i] = uniformParserFunctions[j];
        parsed = true;
        break;
      }
    }
    if (!parsed) {
      const templateType = uniform.size === 1 ? uniformSingleParserFunctions : uniformArrayParserFunctions;
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

export { generateUniformsSyncPolyfill };
//# sourceMappingURL=generateUniformsSyncPolyfill.mjs.map
