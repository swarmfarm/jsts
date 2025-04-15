import MonotoneChainBuilder from "../../index/chain/MonotoneChainBuilder.js";
import ItemVisitor from "../../index/ItemVisitor.js";
import STRtree from "../../index/strtree/STRtree.js";
/**
 * A spatial index over a segment sequence
 * using MonotoneChains.
 *
 * @param segs - An array of coordinates representing the segments
 */
export default class SegmentMCIndex {
  constructor(segs) {
    // Initialize the STRtree index
    this._index = new STRtree();
    // Build the index with the provided segments
    this.buildIndex(segs);
    this._idCounter = 0; // Initialize the ID counter if needed
  }

  buildIndex(segs) {
    const segChains = MonotoneChainBuilder.getChains(segs, segs);
    for (let i = segChains.iterator(); i.hasNext(); ) {
      const mc = i.next();
      mc.setId(this._idCounter++);
      this._index.insert(mc.getEnvelope(), mc);
    }
  }

  query(env, action) {
    this._index.query(
      env,
      new (class {
        get interfaces_() {
          return [ItemVisitor];
        }
        visitItem(item) {
          const testChain = item;
          testChain.select(env, action);
        }
      })()
    );
  }
}