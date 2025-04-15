/**
 * Models a section of a raw offset curve,
 * starting at a given location along the raw curve.
 * The location is a decimal number, with the integer part
 * containing the segment index and the fractional part
 * giving the fractional distance along the segment.
 * The location of the last section segment
 * is also kept, to allow optimizing joining sections together.
 *
 * @param pts - An array of coordinates representing the section
 * @param loc - The starting location along the raw curve
 * @param locLast - The location of the last section segment
 */
export default class OffsetCurveSection {
  constructor(pts, loc, locLast) {
    this.sectionPts = pts;
    this.location = loc;
    this.locLast = locLast;
  }

  static toGeometry(sections, geomFactory) {
    if (sections.length === 0) return geomFactory.createLineString();
    if (sections.length === 1)
      return geomFactory.createLineString(sections[0].getCoordinates());

    // Sort sections in order along the offset curve
    sections.sort((a, b) => a.compareTo(b));
    const lines = sections.map((section) =>
      geomFactory.createLineString(section.getCoordinates())
    );
    return geomFactory.createMultiLineString(lines);
  }

  /**
   * Joins section coordinates into a LineString.
   * Join vertices which lie in the same raw curve segment
   * are removed, to simplify the result linework.
   *
   * @param sections the sections to join
   * @param geomFactory the geometry factory to use
   * @return the simplified linestring for the joined sections
   */
  static toLine(sections, geomFactory) {
    if (sections.length === 0) return geomFactory.createLineString();
    if (sections.length === 1)
      return geomFactory.createLineString(sections[0].getCoordinates());

    // Sort sections in order along the offset curve
    sections.sort((a, b) => a.compareTo(b));
    const pts = [];

    let removeStartPt = false;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      let removeEndPt = false;
      if (i < sections.length - 1) {
        const nextStartLoc = sections[i + 1].location;
        removeEndPt = section.isEndInSameSegment(nextStartLoc);
      }
      const sectionPts = section.getCoordinates();
      for (let j = 0; j < sectionPts.length; j++) {
        if (
          (removeStartPt && j === 0) ||
          (removeEndPt && j === sectionPts.length - 1)
        )
          continue;
        pts.push(sectionPts[j]);
      }
      removeStartPt = removeEndPt;
    }
    return geomFactory.createLineString(pts);
  }

  static create(srcPts, start, end, loc, locLast) {
    let len = end - start + 1;
    if (end <= start) len = srcPts.length - start + end;

    const sectionPts = [];
    for (let i = 0; i < len; i++) {
      const index = (start + i) % (srcPts.length - 1);
      sectionPts.push(srcPts[index].copy());
    }
    return new OffsetCurveSection(sectionPts, loc, locLast);
  }

  getCoordinates() {
    return this.sectionPts;
  }

  isEndInSameSegment(nextLoc) {
    const segIndex = Math.floor(this.locLast);
    const nextIndex = Math.floor(nextLoc);
    return segIndex === nextIndex;
  }

  /**
   * Orders sections by their location along the raw offset curve.
   */
  compareTo(section) {
    return this.location - section.location;
  }
}
