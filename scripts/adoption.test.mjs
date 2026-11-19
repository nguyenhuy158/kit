import { describe, expect, it } from "vitest";
import {
  kitPin,
  MARK,
  replaceSection,
  versionMark,
  workflowPin,
} from "./adoption.mjs";

describe("adoption", () => {
  it("reads the tag from a kit git dependency", () => {
    const deps = {
      "@huyab/config": "github:nguyenhuy158/kit#v0.2.0&path:packages/config",
    };
    expect(kitPin(deps, "config")).toBe("v0.2.0");
    expect(kitPin(deps, "sso")).toBe("");
  });

  it("reads the tag of the reusable check workflow", () => {
    const yml = "uses: nguyenhuy158/kit/.github/workflows/check.yml@v0.1.1";
    expect(workflowPin(yml)).toBe("v0.1.1");
    expect(workflowPin("uses: ./.github/workflows/check.yml")).toBe("");
  });

  it("marks latest, older and missing versions", () => {
    expect(versionMark("v0.5.0", "v0.5.0")).toBe(`${MARK.done} v0.5.0`);
    expect(versionMark("v0.1.0", "v0.5.0")).toBe(`${MARK.old} v0.1.0`);
    expect(versionMark("", "v0.5.0")).toBe(MARK.missing);
  });

  it("replaces only the marked section", () => {
    const doc =
      "intro\n<!-- adoption:kit:start -->\nold\n<!-- adoption:kit:end -->\nend";
    expect(replaceSection(doc, "kit", "new")).toBe(
      "intro\n<!-- adoption:kit:start -->\nnew\n<!-- adoption:kit:end -->\nend",
    );
    expect(() => replaceSection("no markers", "kit", "x")).toThrow();
  });
});
