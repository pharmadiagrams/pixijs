import type { GlUniformData } from '../../rendering/renderers/gl/shader/GlProgram';
import type { UniformsSyncCallback } from '../../rendering/renderers/shared/shader/types';
import type { UniformGroup as UniformGroupType } from '../../rendering/renderers/shared/shader/UniformGroup';
/**
 * @param group
 * @param uniformData
 * @internal
 */
export declare function generateUniformsSyncPolyfill(group: UniformGroupType, uniformData: Record<string, GlUniformData>): UniformsSyncCallback;
