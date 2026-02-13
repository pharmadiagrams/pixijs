import { BufferResource } from '../../rendering/renderers/shared/buffer/BufferResource';
import { UniformGroup } from '../../rendering/renderers/shared/shader/UniformGroup';
import { uniformParsers } from '../../rendering/renderers/shared/shader/utils/uniformParsers';
import { uniformArrayParserFunctions, uniformParserFunctions, uniformSingleParserFunctions } from './uniformSyncFunctions';

import type { GlUniformData } from '../../rendering/renderers/gl/shader/GlProgram';
import type { WebGLRenderer } from '../../rendering/renderers/gl/WebGLRenderer';
import type { UniformsSyncCallback } from '../../rendering/renderers/shared/shader/types';
import type { UniformGroup as UniformGroupType } from '../../rendering/renderers/shared/shader/UniformGroup';
import type { UniformUploadFunction } from './uniformSyncFunctions';

interface NestedResource
{
    name: string;
    type: 'uniformGroupUbo' | 'uniformGroupNonUbo' | 'bufferResource';
}

/**
 * @param group
 * @param uniformData
 * @internal
 */
export function generateUniformsSyncPolyfill(
    group: UniformGroupType,
    uniformData: Record<string, GlUniformData>
): UniformsSyncCallback
{
    // loop through all the uniforms..
    const functionMap: Record<string, UniformUploadFunction> = {};
    const nestedResources: NestedResource[] = [];

    // Iterate group.uniforms to match the original implementation
    for (const i in group.uniforms)
    {
        if (!uniformData[i])
        {
            // Handle nested UniformGroup and BufferResource
            const uniform = group.uniforms[i];

            if (uniform instanceof UniformGroup)
            {
                if ((uniform as UniformGroupType).ubo)
                {
                    nestedResources.push({ name: i, type: 'uniformGroupUbo' });
                }
                else
                {
                    nestedResources.push({ name: i, type: 'uniformGroupNonUbo' });
                }
            }
            else if (uniform instanceof BufferResource)
            {
                nestedResources.push({ name: i, type: 'bufferResource' });
            }

            continue;
        }

        const uniform = group.uniformStructures[i];

        let parsed = false;

        for (let j = 0; j < uniformParsers.length; j++)
        {
            const parser = uniformParsers[j];

            if (uniform.type === parser.type && parser.test(uniform))
            {
                functionMap[i] = uniformParserFunctions[j];

                parsed = true;

                break;
            }
        }

        // if not parsed...

        if (!parsed)
        {
            const templateType = uniform.size === 1 ? uniformSingleParserFunctions : uniformArrayParserFunctions;

            functionMap[i] = templateType[uniform.type];
        }
    }

    return (
        ud: Record<string, any>,
        uv: Record<string, any>,
        renderer: WebGLRenderer,
        _syncData: { textureCount: number }) =>
    {
        const gl = renderer.gl;

        // Handle nested UniformGroups and BufferResources first
        for (let k = 0; k < nestedResources.length; k++)
        {
            const nested = nestedResources[k];
            const resource = uv[nested.name];

            if (nested.type === 'uniformGroupUbo')
            {
                renderer.shader.bindUniformBlock(resource, nested.name);
            }
            else if (nested.type === 'uniformGroupNonUbo')
            {
                renderer.shader.updateUniformGroup(resource);
            }
            else if (nested.type === 'bufferResource')
            {
                renderer.shader.bindUniformBlock(resource, nested.name);
            }
        }

        // Handle regular uniforms
        for (const i in functionMap)
        {
            const v = uv[i];
            const cu = ud[i];
            const cv = ud[i].value;

            functionMap[i](i, cu, cv, v, ud, uv, gl);
        }
    };
}
