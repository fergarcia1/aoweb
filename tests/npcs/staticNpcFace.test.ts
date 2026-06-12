import { describe, expect, it } from "vitest";
import {
  caraToFaceColumnIndex,
  resolveStaticNpcFaceColumn,
} from "../../src/player/faceColumn";

describe("static NPC face columns", () => {
  it("maps AO cara 9 to column index 8", () => {
    expect(caraToFaceColumnIndex(9)).toBe(8);
  });

  it("prefers faceCara over faceIndex", () => {
    expect(resolveStaticNpcFaceColumn(0, 9)).toBe(8);
    expect(resolveStaticNpcFaceColumn(6, 9)).toBe(8);
  });

  it("uses faceIndex when faceCara is omitted", () => {
    expect(resolveStaticNpcFaceColumn(6)).toBe(6);
  });
});
