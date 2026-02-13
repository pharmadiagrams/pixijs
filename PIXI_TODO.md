# PixiJS unsafe-eval Polyfill Fix Analysis

**Date**: 2026-02-13
**PixiJS Version**: 8.16.0
**Source Location**: `/home/bartek/pixi-source`

## Assessment: Fixing the polyfill would be **moderately difficult**

## Bugs Identified

### 1. Shader Sync Polyfill

**File**: `src/unsafe-eval/shader/generateShaderSyncPolyfill.ts`

- Uses `syncData.blockIndex++` (lines 38, 51) for runtime index tracking
- Original uses compile-time baked indices from `shader.glProgram._uniformBlockData[resName].index`
- This can cause uniform block binding mismatches

### 2. Uniform Sync Polyfill

**File**: `src/unsafe-eval/uniforms/generateUniformsSyncPolyfill.ts`

- Iterates `group.uniformStructures` but original iterates `group.uniforms`
- **Missing nested UniformGroup/BufferResource handling** - original handles these specially (lines 34-56 of `generateUniformsSync.ts`) but polyfill skips them entirely
- Returns 3-parameter function but callers pass 4 parameters (missing `syncData`)

### 3. Signature Mismatch

```typescript
// Original (generateUniformsSync.ts:97)
return new Function('ud', 'uv', 'renderer', 'syncData', funcFragments.join('\n'))

// Polyfill (generateUniformsSyncPolyfill.ts:55-70)
return (ud, uv, renderer) => { ... }  // Missing syncData!
```

- `syncData.textureCount` tracking is broken
- Caller at `GlUniformGroupSystem.ts:69`: `syncFunc(programData.uniformData, group.uniforms, this._renderer, syncData)`

## Fix Difficulty: Medium

The fixes are conceptually straightforward:

1. Add `syncData` parameter to polyfill return function
2. Handle nested `UniformGroup` and `BufferResource` in the iteration
3. Use proper uniform block indices from shader metadata

### Challenges

- **Testing** - Need comprehensive test coverage across different shader types (2D, 3D, particles, etc.)
- **Edge cases** - Matrix uniforms, array uniforms, UBOs, textures all have different codepaths
- **Regression risk** - The polyfill is auto-generated (note at top of `uniformSyncFunctions.ts`: "auto generated... Do not edit manually")

## Key Files to Modify

| Polyfill File | Original File |
|---------------|---------------|
| `src/unsafe-eval/uniforms/generateUniformsSyncPolyfill.ts` | `src/rendering/renderers/gl/shader/utils/generateUniformsSync.ts` |
| `src/unsafe-eval/shader/generateShaderSyncPolyfill.ts` | `src/rendering/renderers/gl/shader/GenerateShaderSyncCode.ts` |
| `src/unsafe-eval/ubo/generateUboSyncPolyfill.ts` | `src/rendering/renderers/shared/shader/utils/createUboSyncFunction.ts` |

## Contributing to PixiJS

1. Create a failing test case with a minimal reproduction
2. File an issue (or comment on existing issues #10666, #10315)
3. Submit a PR with the fix

The PixiJS team would likely be receptive - they clearly want CSP compliance to work but the polyfill has fallen out of sync with the main rendering code as v8 evolved.

## Related GitHub Issues

- [Issue #10315](https://github.com/pixijs/pixijs/issues/10315) - "Current environment does not allow unsafe-eval"
- [Issue #10666](https://github.com/pixijs/pixijs/issues/10666) - "@pixi/unsafe-eval suddenly stopped working"
- [Issue #7324](https://github.com/pixijs/pixijs/issues/7324) - "PIXI requires unsafe CSP"
- [Issue #9113](https://github.com/pixijs/pixijs/issues/9113) - "@pixi/unsafe-eval not self installable"
