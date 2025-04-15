import expect from "expect.js";
import OffsetCurve from "../../../../src/org/locationtech/jts/operation/buffer/OffsetCurve.js";
import WKTReader from "../../../src/org/locationtech/jts/io/WKTReader.js";
import WKTWriter from "../../../src/org/locationtech/jts/io/WKTWriter.js";

const TOLERANCE = 0.05;

function checkOffsetCurve(inputWKT, distance, expectedWKT, tolerance) {
  if (expectedWKT == null) return;
  const reader = new WKTReader();
  const input = reader.read(inputWKT);
  const result = OffsetCurve.getCurve(input, distance);
  const expected = reader.read(expectedWKT);
  checkEqual(expected, result, tolerance ?? TOLERANCE);
}

function checkEqual(expected, actual, tolerance) {
  const writer = new WKTWriter();
  const actualNorm = actual.norm();
  const expectedNorm = expected.norm();
  const equal = actualNorm.equalsExact(expectedNorm, tolerance);
  if (!equal) {
    const CHECK_EQUAL_FAIL = "Expected: %s, but got: %s";
    console.error(
      CHECK_EQUAL_FAIL,
      writer.write(expectedNorm),
      writer.write(actualNorm)
    );
  }
  expect(equal).toBe(true);
}

describe("Offset Curve", () => {
  it("testPoint", () => {
    checkOffsetCurve("POINT (0 0)", 1, "LINESTRING EMPTY");
  });

  it("testEmpty", () => {
    checkOffsetCurve("LINESTRING EMPTY", 1, "LINESTRING EMPTY");
  });

  it("testZeroLenLine", () => {
    checkOffsetCurve("LINESTRING (1 1, 1 1)", 1, "LINESTRING EMPTY");
  });

  it("testZeroOffsetLine", () => {
    checkOffsetCurve(
      "LINESTRING (0 0, 1 0, 1 1)",
      0,
      "LINESTRING (0 0, 1 0, 1 1)"
    );
  });

  // it("testZeroOffsetPolygon", () => {
  //     checkOffsetCurve("POLYGON ((1 9, 9 1, 1 1, 1 9))", 0, "LINESTRING (1 9, 1 1, 9 1, 1 9)");
  // });

  it("testRepeatedPoint", () => {
    checkOffsetCurve(
      "LINESTRING (4 9, 1 2, 7 5, 7 5, 4 9)",
      1,
      "LINESTRING (4.24 7.02, 2.99 4.12, 5.48 5.36, 4.24 7.02)"
    );
  });

  it("testSegment1Short", () => {
    checkOffsetCurve(
      "LINESTRING (2 2, 2 2.0000001)",
      1,
      "LINESTRING (1 2, 1 2.0000001)",
      0.00000001
    );
  });

  it("testSegment1", () => {
    checkOffsetCurve(
      "LINESTRING (0 0, 9 9)",
      1,
      "LINESTRING (-0.71 0.71, 8.29 9.71)"
    );
  });

  it("testSegment1Neg", () => {
    checkOffsetCurve(
      "LINESTRING (0 0, 9 9)",
      -1,
      "LINESTRING (0.71 -0.71, 9.71 8.29)"
    );
  });

  it("testSegments2", () => {
    checkOffsetCurve(
      "LINESTRING (0 0, 9 9, 25 0)",
      1,
      "LINESTRING (-0.707 0.707, 8.293 9.707, 8.435 9.825, 8.597 9.915, 8.773 9.974, 8.956 9.999, 9.141 9.99, 9.321 9.947, 9.49 9.872, 25.49 0.872)"
    );
  });

  it("testSegments3", () => {
    checkOffsetCurve(
      "LINESTRING (0 0, 9 9, 25 0, 30 15)",
      1,
      "LINESTRING (-0.71 0.71, 8.29 9.71, 8.44 9.83, 8.6 9.92, 8.77 9.97, 8.96 10, 9.14 9.99, 9.32 9.95, 9.49 9.87, 24.43 1.47, 29.05 15.32)"
    );
  });

  it("testRightAngle", () => {
    checkOffsetCurve(
      "LINESTRING (2 8, 8 8, 8 1)",
      1,
      "LINESTRING (2 9, 8 9, 8.2 8.98, 8.38 8.92, 8.56 8.83, 8.71 8.71, 8.83 8.56, 8.92 8.38, 8.98 8.2, 9 8, 9 1)"
    );
  });

  it("testZigzagOneEndCurved4", () => {
    checkOffsetCurve(
      "LINESTRING (1 3, 6 3, 4 5, 9 5)",
      4,
      "LINESTRING (0.53 6.95, 0.67 7.22, 1.17 7.83, 1.78 8.33, 2.47 8.7, 3.22 8.92, 4 9, 9 9)"
    );
  });

  it("testZigzagOneEndCurved1", () => {
    checkOffsetCurve(
      "LINESTRING (1 3, 6 3, 4 5, 9 5)",
      1,
      "LINESTRING (1 4, 3.59 4, 3.29 4.29, 3.17 4.44, 3.08 4.62, 3.02 4.8, 3 5, 3.02 5.2, 3.08 5.38, 3.17 5.56, 3.29 5.71, 3.44 5.83, 3.62 5.92, 3.8 5.98, 4 6, 9 6)"
    );
  });

  it("testAsymmetricU1", () => {
    checkOffsetCurve("LINESTRING (1 1, 9 1, 9 2, 1 2)", 1, "LINESTRING EMPTY");
  });

  it("testAsymmetricU2", () => {
    checkOffsetCurve(
      "LINESTRING (1 1, 9 1, 9 2, 1 2)",
      -1,
      "LINESTRING (1 0, 9 0, 9.2 0.02, 9.38 0.08, 9.56 0.17, 9.71 0.29, 9.83 0.44, 9.92 0.62, 9.98 0.8, 10 1, 10 2, 9.98 2.2, 9.92 2.38, 9.83 2.56, 9.71 2.71, 9.56 2.83, 9.38 2.92, 9.2 2.98, 9 3, 1 3)"
    );
  });

  it("testEmptyResult", () => {
    checkOffsetCurve("LINESTRING (3 5, 5 7, 7 5)", -4, "LINESTRING EMPTY");
  });

  it("testSelfCross", () => {
    checkOffsetCurve(
      "LINESTRING (50 90, 50 10, 90 50, 10 50)",
      10,
      "MULTILINESTRING ((60 90, 60 60), (60 40, 60 34.14, 65.85 40, 60 40), (40 40, 10 40))"
    );
  });

  it("testSelfCrossNeg", () => {
    checkOffsetCurve(
      "LINESTRING (50 90, 50 10, 90 50, 10 50)",
      -10,
      "MULTILINESTRING ((40 90, 40 60, 10 60), (40 40, 40 10, 40.19 8.05, 40.76 6.17, 41.69 4.44, 42.93 2.93, 44.44 1.69, 46.17 0.76, 48.05 0.19, 50 0, 51.95 0.19, 53.83 0.76, 55.56 1.69, 57.07 2.93, 97.07 42.93, 98.31 44.44, 99.24 46.17, 99.81 48.05, 100 50, 99.81 51.95, 99.24 53.83, 98.31 55.56, 97.07 57.07, 95.56 58.31, 93.83 59.24, 91.95 59.81, 90 60, 60 60))"
    );
  });

  it("testSelfCrossCWNeg", () => {
    checkOffsetCurve(
      "LINESTRING (0 70, 100 70, 40 0, 40 100)",
      -10,
      "MULTILINESTRING ((0 60, 30 60), (50 60, 50 27.03, 78.25 60, 50 60), (50 80, 50 100))"
    );
  });

  it("testSelfCrossDartInside", () => {
    checkOffsetCurve(
      "LINESTRING (60 50, 10 80, 50 10, 90 80, 40 50)",
      10,
      "MULTILINESTRING ((54.86 41.43, 50 44.34, 45.14 41.43), (43.9 40.83, 50 30.16, 56.1 40.83))"
    );
  });

  it("testSelfCrossDartOutside", () => {
    checkOffsetCurve(
      "LINESTRING (60 50, 10 80, 50 10, 90 80, 40 50)",
      -10,
      "LINESTRING (50 67.66, 15.14 88.57, 13.32 89.43, 11.35 89.91, 9.33 89.98, 7.34 89.64, 5.46 88.91, 3.76 87.82, 2.32 86.4, 1.19 84.73, 0.42 82.86, 0.04 80.88, 0.07 78.86, 0.5 76.88, 1.32 75.04, 41.32 5.04, 42.42 3.48, 43.8 2.16, 45.4 1.12, 47.17 0.41, 49.05 0.05, 50.95 0.05, 52.83 0.41, 54.6 1.12, 56.2 2.16, 57.58 3.48, 58.68 5.04, 98.68 75.04, 99.5 76.88, 99.93 78.86, 99.96 80.88, 99.58 82.86, 98.81 84.73, 97.68 86.4, 96.24 87.82, 94.54 88.91, 92.66 89.64, 90.67 89.98, 88.65 89.91, 86.68 89.43, 84.86 88.57, 50 67.66)"
    );
  });

  it("testSelfCrossDart2Inside", () => {
    checkOffsetCurve(
      "LINESTRING (64 45, 10 80, 50 10, 90 80, 35 45)",
      10,
      "LINESTRING (55.00 38.91, 49.58 42.42, 44.74 39.34, 50 30.15, 55.00 38.91)"
    );
  });

  it("testRing", () => {
    checkOffsetCurve(
      "LINESTRING (10 10, 50 90, 90 10, 10 10)",
      -10,
      "LINESTRING (26.18 20, 50 67.63, 73.81 20, 26.18 20)"
    );
  });

  it("testClosedCurve", () => {
    checkOffsetCurve(
      "LINESTRING (30 70, 80 80, 50 10, 10 80, 60 70)",
      10,
      "LINESTRING (45 83.2, 78.04 89.81, 80 90, 81.96 89.81, 83.85 89.23, 85.59 88.29, 87.11 87.04, 88.35 85.5, 89.27 83.76, 89.82 81.87, 90 79.9, 89.79 77.94, 89.19 76.06, 59.19 6.06, 58.22 4.3, 56.91 2.77, 55.32 1.53, 53.52 0.64, 51.57 0.12, 49.56 0.01, 47.57 0.3, 45.68 0.98, 43.96 2.03, 42.49 3.4, 41.32 5.04, 1.32 75.04, 0.53 76.77, 0.09 78.63, 0.01 80.53, 0.29 82.41, 0.93 84.2, 1.89 85.85, 3.14 87.28, 4.65 88.45, 6.34 89.31, 8.17 89.83, 10.07 90, 11.96 89.81, 45 83.2)"
    );
  });

  it("testOverlapTriangleInside", () => {
    checkOffsetCurve(
      "LINESTRING (70 80, 10 80, 50 10, 90 80, 40 80)",
      10,
      "LINESTRING (70 70, 40 70, 27.23 70, 50 30.15, 72.76 70, 70 70)"
    );
  });

  it("testOverlapTriangleOutside", () => {
    checkOffsetCurve(
      "LINESTRING (70 80, 10 80, 50 10, 90 80, 40 80)",
      -10,
      "LINESTRING (70 90, 40 90, 10 90, 8.11 89.82, 6.29 89.29, 4.6 88.42, 3.11 87.25, 1.87 85.82, 0.91 84.18, 0.29 82.39, 0.01 80.51, 0.1 78.61, 0.54 76.77, 1.32 75.04, 41.32 5.04, 42.42 3.48, 43.8 2.16, 45.4 1.12, 47.17 0.41, 49.05 0.05, 50.95 0.05, 52.83 0.41, 54.6 1.12, 56.2 2.16, 57.58 3.48, 58.68 5.04, 98.68 75.04, 99.46 76.77, 99.9 78.61, 99.99 80.51, 99.71 82.39, 99.09 84.18, 98.13 85.82, 96.89 87.25, 95.4 88.42, 93.71 89.29, 91.89 89.82, 90 90, 70 90)"
    );
  });

  it("testMultiPoint", () => {
    checkOffsetCurve("MULTIPOINT ((0 0), (1 1))", 1, "LINESTRING EMPTY");
  });

  // it("testMultiLine", () => {
  //     checkOffsetCurve(
  //         "MULTILINESTRING ((20 30, 60 10, 80 60), (40 50, 80 30))",
  //         10,
  //         "MULTILINESTRING ((24.47 38.94, 54.75 23.8, 70.72 63.71), (44.47 58.94, 84.47 38.94))"
  //     );
  // });

  it("testMixedWithPoint", () => {
    checkOffsetCurve(
      "GEOMETRYCOLLECTION (LINESTRING (20 30, 60 10, 80 60), POINT (0 0))",
      10,
      "LINESTRING (24.47 38.94, 54.75 23.8, 70.72 63.71)"
    );
  });

  it("testPolygon1", () => {
    checkOffsetCurve(
      "POLYGON ((100 200, 200 100, 100 100, 100 200))",
      10,
      "LINESTRING (90 200, 90.19 201.95, 90.76 203.83, 91.69 205.56, 92.93 207.07, 94.44 208.31, 96.17 209.24, 98.05 209.81, 100 210, 101.95 209.81, 103.83 209.24, 105.56 208.31, 107.07 207.07, 207.07 107.07, 208.31 105.56, 209.24 103.83, 209.81 101.95, 210 100, 209.81 98.05, 209.24 96.17, 208.31 94.44, 207.07 92.93, 205.56 91.69, 203.83 90.76, 201.95 90.19, 200 90, 100 90, 98.05 90.19, 96.17 90.76, 94.44 91.69, 92.93 92.93, 91.69 94.44, 90.76 96.17, 90.19 98.05, 90 100, 90 200)"
    );
  });
  it("testPolygon2", () => {
    checkOffsetCurve(
      "POLYGON ((100 200, 200 100, 100 100, 100 200))",
      -10,
      "LINESTRING (110 175.86, 175.86 110, 110 110, 110 175.86)"
    );
  });
  it("testPolygonWithHole1", () => {
    checkOffsetCurve(
      "POLYGON ((20 80, 80 80, 80 20, 20 20, 20 80), (30 70, 70 70, 70 30, 30 30, 30 70))",
      10,
      "MULTILINESTRING ((10 80, 10.19 81.95, 10.76 83.83, 11.69 85.56, 12.93 87.07, 14.44 88.31, 16.17 89.24, 18.05 89.81, 20 90, 80 90, 81.95 89.81, 83.83 89.24, 85.56 88.31, 87.07 87.07, 88.31 85.56, 89.24 83.83, 89.81 81.95, 90 80, 90 20, 89.81 18.05, 89.24 16.17, 88.31 14.44, 87.07 12.93, 85.56 11.69, 83.83 10.76, 81.95 10.19, 80 10, 20 10, 18.05 10.19, 16.17 10.76, 14.44 11.69, 12.93 12.93, 11.69 14.44, 10.76 16.17, 10.19 18.05, 10 20, 10 80), (40 60, 40 40, 60 40, 60 60, 40 60))"
    );
  });
  // it("testPolygonWithHole2", () => {
  //     checkOffsetCurve(
  //         "POLYGON ((20 80, 80 80, 80 20, 20 20, 20 80), (30 70, 70 70, 70 30, 30 30, 30 70))",
  //         -10,
  //         "LINESTRING EMPTY"
  //     );
  // });
  //-------------------------------------------------

  // it("testJoined1", () => {
  //     checkOffsetCurveJoined(
  //         "LINESTRING (0 50, 100 50, 50 100, 50 0)",
  //         10,
  //         "LINESTRING (0 60, 75.85 60, 60 75.85, 60 0)"
  //     );
  // });
  // it("testJoined2", () => {
  //     checkOffsetCurveJoined(
  //         "LINESTRING (0 50, 100 50, 50 100, 50 0)",
  //         -10,
  //         "LINESTRING (0 40, 100 40, 101.95 40.19, 103.83 40.76, 105.56 41.69, 107.07 42.93, 108.31 44.44, 109.24 46.17, 109.81 48.05, 110 50, 109.81 51.95, 109.24 53.83, 108.31 55.56, 107.07 57.07, 57.07 107.07, 55.56 108.31, 53.83 109.24, 51.95 109.81, 50 110, 48.05 109.81, 46.17 109.24, 44.44 108.31, 42.93 107.07, 41.69 105.56, 40.76 103.83, 40.19 101.95, 40 100, 40 0))"
  //     );
  // });
  //-------------------------------------------------

  it("testInfiniteLoop", () => {
    checkOffsetCurve(
      "LINESTRING (21 101, -1 78, 12 43, 50 112, 73 -5, 19 2, 87 85, -7 38, 105 40)",
      4,
      null
    );
  });

  // see https://github.com/shapely/shapely/issues/820
  it("testOffsetError", () => {
    checkOffsetCurve(
      "LINESTRING (12 20, 60 68, 111 114, 151 159, 210 218)",
      3,
      "LINESTRING (9.878679656440358 22.121320343559642, 57.878679656440355 70.12132034355965, 57.99069368916718 70.22770917070595, 108.86775926900314 116.11682714467565, 148.75777204394902 160.99309151648976, 148.87867965644037 161.12132034355963, 207.87867965644037 220.12132034355963)"
    );
  });
});
