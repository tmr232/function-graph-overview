import type { CallHandler } from "./call-processor.ts";
import type { Language } from "./cfg.ts";

export const perLanguageHandlers: Partial<Record<Language, CallHandler[]>> = {
  Python: [
    { pattern: "self.assert*", is: "ASSERT" },
    { pattern: "sys.exit", is: "TERMINATE" },
    { pattern: "os.abort", is: "TERMINATE" },
  ],
  Go: [{ pattern: "panic", is: "TERMINATE" }],
};
