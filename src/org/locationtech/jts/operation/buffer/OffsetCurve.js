import Distance from "../../algorithm/Distance.js";
import CoordinateArrays from "../../geom/CoordinateArrays.js";
import Envelope from "../../geom/Envelope.js";
import LineSegment from "../../geom/LineSegment.js";
import MonotoneChainSelectAction from "../../index/chain/MonotoneChainSelectAction.js";
import BufferOp from "./BufferOp.js";
import BufferParameters from "./BufferParameters.js";
import OffsetCurveBuilder from "./OffsetCurveBuilder.js";
import OffsetCurveSection from "./OffsetCurveSection.js";
import Point from "../../geom/Point.js"
import Polygon from "../../geom/Polygon.js"
import LinearRing from "../../geom/LinearRing.js"
import SegmentMCIndex from "./SegmentMCIndex.js"

export default class OffsetCurve {
  static MATCH_DISTANCE_FACTOR = 10000;
  static MIN_QUADRANT_SEGMENTS = 8;

  constructor(geom, distance, bufParams = null) {
    this.inputGeom = geom;
    this.distance = distance;
    this.isJoined = false;

    this.matchDistance = Math.abs(distance) / OffsetCurve.MATCH_DISTANCE_FACTOR;
    this.geomFactory = this.inputGeom.getFactory();

    this.bufferParams = new BufferParameters();
    if (bufParams !== null) {
      let quadSegs = bufParams.getQuadrantSegments();
      if (quadSegs < OffsetCurve.MIN_QUADRANT_SEGMENTS) {
        quadSegs = OffsetCurve.MIN_QUADRANT_SEGMENTS;
      }
      this.bufferParams.setQuadrantSegments(quadSegs);
      this.bufferParams.setJoinStyle(bufParams.getJoinStyle());
      this.bufferParams.setMitreLimit(bufParams.getMitreLimit());
    }
  }

  static getCurve(geom, distance) {
    const oc = new OffsetCurve(geom, distance);
    return oc.getCurve();
  }

  static getCurveWithParams(geom, distance, quadSegs, joinStyle, mitreLimit) {
    const bufferParams = new BufferParameters();
    if (quadSegs >= 0) bufferParams.setQuadrantSegments(quadSegs);
    if (joinStyle >= 0) bufferParams.setJoinStyle(joinStyle);
    if (mitreLimit >= 0) bufferParams.setMitreLimit(mitreLimit);
    const oc = new OffsetCurve(geom, distance, bufferParams);
    return oc.getCurve();
  }

  static getCurveJoined(geom, distance) {
    const oc = new OffsetCurve(geom, distance);
    oc.setJoined(true);
    return oc.getCurve();
  }

  setJoined(isJoined) {
    this.isJoined = isJoined;
  }

  getCurve() {
    if(this.inputGeom instanceof Point)return this.geomFactory.createLineString()
    if(this.inputGeom instanceof Polygon)return this.toLineString(this.inputGeom.buffer(this.distance).getBoundary());
    return this.computeCurve(this.inputGeom, this.distance);
  }

  toLineString(geom){
    if (geom instanceof LinearRing) {
        return geom.getFactory().createLineString(geom.getCoordinateSequence());
      }
      return geom;
  }

  static rawOffset(line, distance, bufParams = new BufferParameters()) {
    const pts = line.getCoordinates();
    const cleanPts = CoordinateArrays.removeRepeatedPoints(pts);
    const ocb = new OffsetCurveBuilder(
      line.getFactory().getPrecisionModel(),
      bufParams
    );
    return ocb.getOffsetCurve(cleanPts, distance);
  }

  computeCurve(lineGeom, distance) {
    if (lineGeom.getNumPoints() < 2 || lineGeom.getLength() === 0.0) {
      return this.geomFactory.createLineString();
    }
    if (distance === 0) {
      return lineGeom.copy();
    }
    if (lineGeom.getNumPoints() === 2) {
      return this.offsetSegment(lineGeom.getCoordinates(), distance);
    }

    const sections = this.computeSections(lineGeom, distance);

    let offsetCurve;
    if (this.isJoined) {
      offsetCurve = OffsetCurveSection.toLine(sections, this.geomFactory);
    } else {
      offsetCurve = OffsetCurveSection.toGeometry(sections, this.geomFactory);
    }
    return offsetCurve;
  }

  computeSections(lineGeom, distance) {
    const rawCurve = OffsetCurve.rawOffset(
      lineGeom,
      distance,
      this.bufferParams
    );
    const sections = [];
    if (rawCurve.length === 0) {
      return sections;
    }

    const bufferPoly = OffsetCurve.getBufferOriented(
      lineGeom,
      distance,
      this.bufferParams
    );

    const shell = bufferPoly.getExteriorRing().getCoordinates();
    this.computeCurveSections(shell, rawCurve, sections);

    for (let i = 0; i < bufferPoly.getNumInteriorRing(); i++) {
      const hole = bufferPoly.getInteriorRingN(i).getCoordinates();
      this.computeCurveSections(hole, rawCurve, sections);
    }
    return sections;
  }

  offsetSegment(pts, distance) {
    const offsetSeg = new LineSegment(pts[0], pts[1]).offset(distance);
    return this.geomFactory.createLineString([offsetSeg.p0, offsetSeg.p1]);
  }

  static getBufferOriented(geom, distance, bufParams) {
    const buffer = BufferOp.bufferOp(geom, Math.abs(distance), bufParams);
    let bufferPoly = OffsetCurve.extractMaxAreaPolygon(buffer);
    if (distance < 0) {
      bufferPoly = bufferPoly.reverse();
    }
    return bufferPoly;
  }

  static extractMaxAreaPolygon(geom) {
    if (geom.getNumGeometries() === 1) return geom;

    let maxArea = 0;
    let maxPoly = null;
    for (let i = 0; i < geom.getNumGeometries(); i++) {
      const poly = geom.getGeometryN(i);
      const area = poly.getArea();
      if (maxPoly === null || area > maxArea) {
        maxPoly = poly;
        maxArea = area;
      }
    }
    return maxPoly;
  }

  computeCurveSections(bufferRingPts, rawCurve, sections) {
    const rawPosition = Array(bufferRingPts.length - 1).fill(
      OffsetCurve.NOT_IN_CURVE
    );
    const bufferSegIndex = new SegmentMCIndex(bufferRingPts);
    let bufferFirstIndex = -1;
    let minRawPosition = -1;

    for (let i = 0; i < rawCurve.length - 1; i++) {
      const minBufferIndexForSeg = this.matchSegments(
        rawCurve[i],
        rawCurve[i + 1],
        i,
        bufferSegIndex,
        bufferRingPts,
        rawPosition
      );
      if (minBufferIndexForSeg >= 0) {
        const pos = rawPosition[minBufferIndexForSeg];
        if (bufferFirstIndex < 0 || pos < minRawPosition) {
          minRawPosition = pos;
          bufferFirstIndex = minBufferIndexForSeg;
        }
      }
    }
    if (bufferFirstIndex < 0) return;
    this.extractSections(
      bufferRingPts,
      rawPosition,
      bufferFirstIndex,
      sections
    );
  }

  matchSegments(
    raw0,
    raw1,
    rawCurveIndex,
    bufferSegIndex,
    bufferPts,
    rawCurvePos
  ) {
    const matchEnv = new Envelope(raw0, raw1);
    matchEnv.expandBy(this.matchDistance);
    const matchAction = new MatchCurveSegmentAction(
      raw0,
      raw1,
      rawCurveIndex,
      this.matchDistance,
      bufferPts,
      rawCurvePos
    );
    bufferSegIndex.query(matchEnv, matchAction);
    return matchAction.getBufferMinIndex();
  }

  extractSections(ringPts, rawCurveLoc, startIndex, sections) {
    let sectionStart = startIndex;
    let sectionCount = 0;
    let sectionEnd;

    do {
      sectionEnd = this.findSectionEnd(rawCurveLoc, sectionStart, startIndex);
      const location = rawCurveLoc[sectionStart];
      const lastIndex = this.prev(sectionEnd, rawCurveLoc.length);
      const lastLoc = rawCurveLoc[lastIndex];
      const section = OffsetCurveSection.create(
        ringPts,
        sectionStart,
        sectionEnd,
        location,
        lastLoc
      );
      sections.push(section);
      sectionStart = this.findSectionStart(rawCurveLoc, sectionEnd);

      if (sectionCount++ > ringPts.length) {
        throw new Error("Too many sections for ring - probable bug");
      }
    } while (sectionStart !== startIndex && sectionEnd !== startIndex);
  }

  findSectionStart(loc, end) {
    let start = end;
    do {
      const next = this.next(start, loc.length);
      if (loc[start] === OffsetCurve.NOT_IN_CURVE) {
        start = next;
        continue;
      }
      const prev = this.prev(start, loc.length);
      if (loc[prev] === OffsetCurve.NOT_IN_CURVE) {
        return start;
      }
      if (this.isJoined) {
        const locDelta = Math.abs(loc[start] - loc[prev]);
        if (locDelta > 1) return start;
      }
      start = next;
    } while (start !== end);
    return start;
  }

  findSectionEnd(loc, start, firstStartIndex) {
    let end = start;
    let next;
    do {
      next = this.next(end, loc.length);
      if (loc[next] === OffsetCurve.NOT_IN_CURVE) return next;
      if (this.isJoined) {
        const locDelta = Math.abs(loc[next] - loc[end]);
        if (locDelta > 1) return next;
      }
      end = next;
    } while (end !== start && end !== firstStartIndex);
    return end;
  }
  next(i, size) {
    i += 1;
    return i < size ? i : 0;
  }

  prev(i, size) {
    i -= 1;
    return i < 0 ? size - 1 : i;
  }

  static get NOT_IN_CURVE() {
    return -1;
  }
}

class MatchCurveSegmentAction extends MonotoneChainSelectAction {
  constructor(
    raw0,
    raw1,
    rawCurveIndex,
    matchDistance,
    bufferRingPts,
    rawCurveLoc
  ) {
    super();
    this.raw0 = raw0;
    this.raw1 = raw1;
    this.rawLen = raw0.distance(raw1);
    this.rawCurveIndex = rawCurveIndex;
    this.bufferRingPts = bufferRingPts;
    this.matchDistance = matchDistance;
    this.rawCurveLoc = rawCurveLoc;
    this.minRawLocation = -1;
    this.bufferRingMinIndex = -1;
  }

  getBufferMinIndex() {
    return this.bufferRingMinIndex;
  }

  select(mc, segIndex) {
    const frac = this.segmentMatchFrac(
      this.bufferRingPts[segIndex],
      this.bufferRingPts[segIndex + 1],
      this.raw0,
      this.raw1,
      this.matchDistance
    );
    if (frac < 0) return;

    const location = this.rawCurveIndex + frac;
    this.rawCurveLoc[segIndex] = location;
    if (this.minRawLocation < 0 || location < this.minRawLocation) {
      this.minRawLocation = location;
      this.bufferRingMinIndex = segIndex;
    }
  }

  segmentMatchFrac(buf0, buf1, raw0, raw1, matchDistance) {
    if (!this.isMatch(buf0, buf1, raw0, raw1, matchDistance)) return -1;

    const seg = new LineSegment(raw0, raw1);
    return seg.segmentFraction(buf0);
  }

  isMatch(buf0, buf1, raw0, raw1, matchDistance) {
    const bufSegLen = buf0.distance(buf1);
    if (this.rawLen <= bufSegLen) {
      if (matchDistance < Distance.pointToSegment(raw0, buf0, buf1))
        return false;
      if (matchDistance < Distance.pointToSegment(raw1, buf0, buf1))
        return false;
    } else {
      if (matchDistance < Distance.pointToSegment(buf0, raw0, raw1))
        return false;
      if (matchDistance < Distance.pointToSegment(buf1, raw0, raw1))
        return false;
    }
    return true;
  }
}
