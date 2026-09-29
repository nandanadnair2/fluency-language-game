/**
 * Type augmentation for `z-ai-web-dev-sdk`.
 *
 * The shipped `.d.ts` declares `model` as REQUIRED on
 * `CreateChatCompletionVisionBody`:
 *
 *   interface CreateChatCompletionVisionBody {
 *     model: string;          // <-- required
 *     messages: VisionMessage[];
 *     ...
 *   }
 *
 * ...but the SDK itself never requires it at runtime, and its own documented
 * usage omits it:
 *
 *   - node_modules/z-ai-web-dev-sdk/README.md (section 3.2) calls
 *     `createVision({ messages, thinking })` with no `model`.
 *   - node_modules/z-ai-web-dev-sdk/dist/cli.js (~line 560) builds
 *     `const body = { messages: [...] }` and passes it straight to
 *     `client.chat.completions.createVision(body)` — again no `model`.
 *   - `createChatCompletionVision()` (dist/index.js) only spreads the body and
 *     defaults `thinking`; the server picks the vision model itself.
 *
 * So the required `model` is an upstream typing bug. We relax it to optional
 * here instead of inventing a model id, because passing a wrong/unknown model
 * name would change a request that currently works at runtime.
 *
 * Remove this file if the SDK ever ships corrected types.
 */
import "z-ai-web-dev-sdk";

declare module "z-ai-web-dev-sdk" {
  interface CreateChatCompletionVisionBody {
    model?: string;
  }
}
