/**
 * Zod schema for loop node configuration.
 */
import { z } from '@hono/zod-openapi';

/**
 * A single provider/model target for per-role model selection inside a loop.
 * Both fields are explicit literals — the engine forwards `model` to the SDK
 * unchanged (no tier/alias resolution) so the adversarial role mapping is exact.
 */
export const roleModelTargetSchema = z.object({
  provider: z.string().trim().min(1, "roleModels target requires a non-empty 'provider'"),
  model: z.string().trim().min(1, "roleModels target requires a non-empty 'model'"),
});

export type RoleModelTarget = z.infer<typeof roleModelTargetSchema>;

/**
 * Per-role model selection. When present, each loop iteration reads the string
 * value of `field` from the JSON `stateFile` and picks the matching `map` entry
 * (case-sensitive). If the file/field is missing or the value has no matching
 * key, `default` is used. Lets a single loop run its generator and evaluator on
 * different providers/models — "fresh context AND different mind".
 */
export const roleModelsSchema = z.object({
  /** Path to the JSON state file the loop maintains (supports $ARTIFACTS_DIR). */
  stateFile: z.string().min(1, "loop.roleModels requires a non-empty 'stateFile'"),
  /** Top-level JSON field whose string value selects the role. */
  field: z.string().min(1, "loop.roleModels requires a non-empty 'field'"),
  /** field-value → provider/model target (case-sensitive keys). */
  map: z.record(z.string(), roleModelTargetSchema),
  /** Target used when the file/field is missing or the value has no map key. */
  default: roleModelTargetSchema,
});

export type RoleModels = z.infer<typeof roleModelsSchema>;

export const loopNodeConfigSchema = z
  .object({
    /** Inline prompt text executed each iteration. */
    prompt: z.string().min(1, "loop node requires 'loop.prompt' (non-empty string)"),
    /** Completion signal string detected in AI output (e.g., "COMPLETE"). */
    until: z.string().min(1, "loop node requires 'loop.until' (completion signal string)"),
    /** Maximum iterations allowed; exceeding this fails the node. */
    max_iterations: z.number().int().positive("'loop.max_iterations' must be a positive integer"),
    /** Whether to start fresh session each iteration (default: false). */
    fresh_context: z.boolean().default(false),
    /** Optional bash script run after each iteration; exit 0 = complete. */
    until_bash: z.string().optional(),
    /** When true, pause between iterations for user input via /workflow approve. */
    interactive: z.boolean().optional(),
    /** Message shown to user when paused (required when interactive is true). */
    gate_message: z.string().optional(),
    /** Optional per-iteration provider/model selection by role (see roleModelsSchema). */
    roleModels: roleModelsSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.interactive === true && !data.gate_message) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "interactive loop requires 'loop.gate_message' (non-empty string)",
        path: ['gate_message'],
      });
    }
    if (data.roleModels && Object.keys(data.roleModels.map).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'loop.roleModels.map must have at least one entry',
        path: ['roleModels', 'map'],
      });
    }
  });

export type LoopNodeConfig = z.infer<typeof loopNodeConfigSchema>;
