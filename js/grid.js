function Grid(size) {
  this.size = size;
  this.startTiles = 2;

  this.cells = [];

  this.build();
  this.playerTurn = true;
}

// Set up the initial tiles to start the game with
Grid.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
Grid.prototype.addRandomTile = function () {
  if (this.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    // var value = 512;
    var tile = new Tile(this.randomAvailableCell(), value);

    this.insertTile(tile);
  }
};

// Save all tile positions and remove merger info
Grid.prototype.prepareTiles = function () {
  this.eachCell(function (x, y, z, w, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
Grid.prototype.moveTile = function (tile, cell) {
  this.cells[tile.x][tile.y][tile.z][tile.w] = null;
  this.cells[cell.x][cell.y][cell.z][cell.w] = tile;
  tile.updatePosition(cell);
};

// Same position?
Grid.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y &&
    first.z === second.z && first.w == second.w;
};

// Get the vector representing the chosen direction
Grid.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1, z: 0,  w: 0  },  // up
    1: { x: 1,  y: 0,  z: 0,  w: 0  },  // right
    2: { x: 0,  y: 1,  z: 0,  w: 0  },  // down
    3: { x: -1, y: 0,  z: 0,  w: 0  },  // left
    4: { x: 0,  y: 0,  z: 0,  w: -1 },  // hyper-up
    5: { x: 0,  y: 0,  z: 1,  w: 0  },  // hyper-right
    6: { x: 0,  y: 0,  z: 0,  w: 1  },  // hyper-down
    7: { x: 0,  y: 0,  z: -1, w: 0  },  // hyper-left
  };

  return map[direction];
};

// Check for available matches between tiles (more expensive check)
Grid.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      for (var z = 0; z < this.size; z++) {
        for (var w = 0; w < this.size; w++) {
          tile = this.cellContent({ x: x, y: y, z: z, w: w });

          if (tile) {
            for (var direction = 0; direction < 8; direction++) {
              var vector = self.getVector(direction);
              var cell   = { x: x + vector.x, y: y + vector.y,
                z: z + vector.z, w: w + vector.w };

              var other  = self.cellContent(cell);

              if (other && other.value === tile.value) {
                return true; // These two tiles can be merged
              }
            }
          }
        }
      }
    }
  }

  return false;
};

// Moves available?
Grid.prototype.movesAvailable = function () {
  return this.cellsAvailable() || this.tileMatchesAvailable();
};

// Build a grid of the specified size
Grid.prototype.build = function () {
  for (var x = 0; x < this.size; x++) {
    var row = this.cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      var col = [];
      row.push(col);
      for (var z = 0; z < this.size; z++) {
        var beam = [];
        col.push(beam);
        for (var w = 0; w < this.size; w++) {
          beam.push(null);
        }
      }
    }
  }
};

// Build a list of positions to traverse in the right order
Grid.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [], z: [], w: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
    traversals.z.push(pos);
    traversals.w.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();
  if (vector.z === 1) traversals.z = traversals.z.reverse();
  if (vector.w === 1) traversals.w = traversals.w.reverse();
  return traversals;
};

// Find farthest position
Grid.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y,
      z: previous.z + vector.z, w: previous.w + vector.w };
  } while (this.withinBounds(cell) &&
      this.cellAvailable(cell));

  return {
    farthest: previous,
      next: cell // Used to check if a merge is required
  };
};

// Find the first available random position
Grid.prototype.randomAvailableCell = function () {
  var cells = this.availableCells();

  if (cells.length) {
    return cells[Math.floor(Math.random() * cells.length)];
  }
};

Grid.prototype.availableCells = function () {
  var cells = [];

  this.eachCell(function (x, y, z, w, tile) {
    if (!tile) {
      cells.push({ x: x, y: y, z: z, w: w });
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      for (var z = 0; z < this.size; z++) {
        for (var w = 0; w < this.size; w++) {
          callback(x, y, z, w, this.cells[x][y][z][w]);
        }
      }
    }
  }
};

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

// Check if the specified cell is taken
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell);
};

Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells[cell.x][cell.y][cell.z][cell.w];
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells[tile.x][tile.y][tile.z][tile.w] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.x][tile.y][tile.z][tile.w] = null;
};

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
    position.y >= 0 && position.y < this.size &&
    position.z >= 0 && position.z < this.size &&
    position.w >= 0 && position.w < this.size;
};

Grid.prototype.clone = function() {
  newGrid = new Grid(this.size);
  newGrid.playerTurn = this.playerTurn;
  for (var x=0; x < this.size; x++) {
    for (var y=0; y < this.size; y++) {
      for (var z=0; z < this.size; z++) {
        for (var w=0; w < this.size; w++) {
          if (this.cellOccupied({x: x, y: y, z: z ,w: w})) {
            newGrid.insertTile(this.cells[x][y][z][w].clone());
          }
        }
      }
    }
  }
  return newGrid;
};

Grid.prototype.isWin = function () {
  var self = this;
  for (var x=0; x<this.size; x++) {
    for (var y=0; y<this.size; y++) {
      for (var z=0; z<this.size; z++) {
        for (var w=0; w<this.size; w++) {
          if (self.cellOccupied({x:x, y:y, z:z, w:w})) {
            if (self.cellContent({x:x, y:y, z:z, w:w}).value == 2048) {
              return true;
            }
          }
        }
      }
    }
  }

};

Grid.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  // x + 4: hyper-x
  var self = this;

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  var score      = 0;
  var won        = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      traversals.z.forEach(function (z) {
        traversals.w.forEach(function (w) {
          cell = { x: x, y: y, z: z, w: w };
          tile = self.cellContent(cell);

          if (tile) {
            var positions = self.findFarthestPosition(cell, vector);
            var next      = self.cellContent(positions.next);

            // Only one merger per row traversal?
            if (next && next.value === tile.value && !next.mergedFrom) {
              var merged = new Tile(positions.next, tile.value * 2);
              merged.mergedFrom = [tile, next];

              self.insertTile(merged);
              self.removeTile(tile);

              // Converge the two tiles' positions
              tile.updatePosition(positions.next);

              // Update the score
              score += merged.value;

              // The mighty 2048 tile
              if (merged.value === 2048) won = true;
            } else {
              self.moveTile(tile, positions.farthest);
            }

            if (!self.positionsEqual(cell, tile)) {
              moved = true; // The tile moved from its original cell!
            }
          }
        });
      });
    });
  });
  return {moved: moved, score: score, won: won};
};

Grid.prototype.smoothness = function () {
  var smoothness = 0;
  for (var x=0; x<this.size; x++) {
    for (var y=0; y<this.size; y++) {
      for (var z=0; z<this.size; z++) {
        for (var w=0; w<this.size; w++) {
          cell = {x: x, y: y, z: z, w: w};
          if ( this.cellOccupied(cell)) {
            var value = Math.log(this.cellContent(cell).value) / Math.log(2);
            for (var direction in [1, 2, 5, 6]) {
              var vector = this.getVector(direction);
              var targetCell = this.findFarthestPosition(cell, vector).next;

              if (this.cellOccupied(targetCell)) {
                var target = this.cellContent(targetCell);
                var targetValue = Math.log(target.value) / Math.log(2);
                if (Math.abs(value - targetValue) == 1) {
                  smoothness -= Math.abs(value - targetValue);
                } else {
                  smoothness -= 2;
                }
              }
            }
          }
        }
      }
    }
  }
  return smoothness;
};

Grid.prototype.maxValue = function() {
  var max = 0;
  for (var x=0; x<this.size; x++) {
    for (var y=0; y<this.size; y++) {
      for (var z=0; z<this.size; z++) {
        for (var w=0; w<this.size; w++) {
          cell = {x: x, y: y, z: z, w: w};
          if (this.cellOccupied(cell)) {
            var value = this.cellContent(cell).value;
            if (value > max) {
              max = value;
            }
          }
        }
      }
    }
  }

  return Math.log(max) / Math.log(2);
}

Grid.prototype.monotonicity2 = function() {
  // scores for all four directions
  var totals = [0, 0, 0, 0, 0, 0, 0, 0];

  // up/down direction
  for (var x=0; x<this.size; x++) {
    for (var z=0; z<this.size; z++) {
      for (var w=0; w<this.size; w++) {
        var current = 0;
        var next = current+1;
        while ( next<this.size ) {
          while ( next<this.size && !this.cellOccupied( {x:x, y:next, z:z, w:w} )) {
            next++;
          }
          if (next>=this.size) { next--; }
          var currentValue = this.cellOccupied({x:x, y:current, z:z, w:w}) ?
            Math.log(this.cellContent( {x:x, y:current, z:z, w:w} ).value) / Math.log(2) :
              0;
          var nextValue = this.cellOccupied({x:x, y:next, z:z, w:w}) ?
            Math.log(this.cellContent( {x:x, y:next, z:z, w:w} ).value) / Math.log(2) :
              0;
          if (currentValue > nextValue) {
            totals[0] += nextValue - currentValue;
          } else if (nextValue > currentValue) {
            totals[1] += currentValue - nextValue;
          }
          current = next;
          next++;
        }
      }
    }
  }

  // left/right direction
  for (var y=0; y<this.size; y++) {
    for (var z=0; z<this.size; z++) {
      for (var w=0; w<this.size; w++) {
        var current = 0;
        var next = current+1;
        while ( next<this.size ) {
          while ( next<this.size && !this.cellOccupied({x:next, y:y, z:z, w:w})) {
            next++;
          }
          if (next>=this.size) { next--; }
          var currentValue = this.cellOccupied({x:current, y:y, z:z, w:w}) ?
            Math.log(this.cellContent({x:current, y:y, z:z, w:w}).value) / Math.log(2) :
              0;
          var nextValue = this.cellOccupied({x:next, y:y, z:z, w:w}) ?
            Math.log(this.cellContent({x:next, y:y, z:z, w:w}).value) / Math.log(2) :
              0;
          if (currentValue > nextValue) {
            totals[2] += nextValue - currentValue;
          } else if (nextValue > currentValue) {
            totals[3] += currentValue - nextValue;
          }
          current = next;
          next++;
        }
      }
    }
  }

  // hyper left/right
  for (var x=0; x<this.size; x++) {
    for (var y=0; y<this.size; y++) {
      for (var w=0; w<this.size; w++) {
        var current = 0;
        var next = current+1;
        while ( next<this.size ) {
          while ( next<this.size && !this.cellOccupied({x:x, y:y, z:next, w:w})) {
            next++;
          }
          if (next>=this.size) { next--; }
          var currentValue = this.cellOccupied({x:x, y:y, z:current, w:w}) ?
            Math.log(this.cellContent({x:x, y:y, z:current, w:w}).value) / Math.log(2) :
              0;
          var nextValue = this.cellOccupied({x:x, y:y, z:next, w:w}) ?
            Math.log(this.cellContent({x:x, y:y, z:next, w:w}).value) / Math.log(2) :
              0;
          if (currentValue > nextValue) {
            totals[4] += nextValue - currentValue;
          } else if (nextValue > currentValue) {
            totals[5] += currentValue - nextValue;
          }
          current = next;
          next++;
        }
      }
    }
  }

  // hyper up/down
  for (var x=0; x<this.size; x++) {
    for (var y=0; y<this.size; y++) {
      for (var z=0; z<this.size; z++) {
        var current = 0;
        var next = current+1;
        while ( next<this.size ) {
          while ( next<this.size && !this.cellOccupied({x:x, y:y, z:z, w:next})) {
            next++;
          }
          if (next>=this.size) { next--; }
          var currentValue = this.cellOccupied({x:x, y:y, z:z, w:current}) ?
            Math.log(this.cellContent({x:x, y:y, z:z, w:current}).value) / Math.log(2) :
              0;
          var nextValue = this.cellOccupied({x:x, y:y, z:z, w:next}) ?
            Math.log(this.cellContent({x:x, y:y, z:z, w:next}).value) / Math.log(2) :
              0;
          if (currentValue > nextValue) {
            totals[4] += nextValue - currentValue;
          } else if (nextValue > currentValue) {
            totals[5] += currentValue - nextValue;
          }
          current = next;
          next++;
        }
      }
    }
  }
  return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]) + Math.max(totals[4], totals[5]) + Math.max(totals[6], totals[7]);
}

Grid.prototype.computerMove = function () {
  this.addRandomTile();
  this.playerTurn = true;
};

Grid.prototype.sum = function () {
  var sum = 0;
  for (var x=0; x < this.size.length; x++) {
    for (var y=0; y < this.size.length; y++) {
      for (var z=0; z < this.size.length; z++) {
        for (var w=0; w < this.size.length; w++) {
          cell = {x:x, y:y, z:z, w:w};
          if (this.cellOccupied(cell)) {
            sum += Math.log(this.cellContent(cell).value) / Math.log(2);
          }
        }
      }
    }
  }
  return sum;
}
