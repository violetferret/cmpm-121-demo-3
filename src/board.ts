import leaflet from "leaflet";

// interface for Cell type
export interface Cell {
  readonly lat: number;
  readonly lng: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { lat, lng } = cell;
    const key = [lat, lng].toString();

    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key) as Cell;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const lat = point.lat / this.tileWidth;
    const lng = point.lng / this.tileWidth;
    return this.getCanonicalCell({
      lat,
      lng,
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.LatLngBounds([
      [cell.lat * this.tileWidth, cell.lng * this.tileWidth],
      [(cell.lat + 1) * this.tileWidth, (cell.lng + 1) * this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);

    for (
      let tileLat = -this.tileVisibilityRadius;
      tileLat < this.tileVisibilityRadius;
      tileLat++
    ) {
      for (
        let tileLng = -this.tileVisibilityRadius;
        tileLng < this.tileVisibilityRadius;
        tileLng++
      ) {
        resultCells.push(this.getCanonicalCell({
          lat: originCell.lat + tileLat,
          lng: originCell.lng + tileLng,
        }));
      }
    }
    return resultCells;
  }
}
