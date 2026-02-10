import { describe, expect, it } from "vitest";
import { renderTemplate } from "../src/templates.js";

describe("renderTemplate", () => {
  it("replaces handlebars variables", () => {
    const result = renderTemplate("Hello {{name}}", { name: "world" });
    expect(result).toBe("Hello world");
  });

  it("keeps unmatched placeholders", () => {
    const result = renderTemplate("{{missing}}", { name: "world" });
    expect(result).toBe("");
  });
});
