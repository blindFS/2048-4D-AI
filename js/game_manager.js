function GameManager(size, InputManager, Actuator, ScoreManager) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.scoreManager = new ScoreManager;
  this.actuator     = new Actuator;

  this.running      = false;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.inputManager.on('think', function() {
    var best = this.ai.getBest();
    this.actuator.showHint(best.move);
  }.bind(this));


  this.inputManager.on('run', function() {
    if (this.running) {
      this.running = false;
      this.actuator.setRunButton('Auto-run');
    } else {
      this.running = true;
      this.run()
    this.actuator.setRunButton('Stop');
    }
  }.bind(this));


  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.continue();
  this.running = false;
  this.actuator.setRunButton('Auto-run');
  this.setup();
};

// Keep playing after winning
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.ai.keepPlaying = true;
  if (this.running) {
    this.run();
  }
  this.actuator.continue();
};

GameManager.prototype.isGameTerminated = function () {
  if (this.over || (this.won && !this.keepPlaying)) {
    return true;
  } else {
    return false;
  }
};

// Set up the game
GameManager.prototype.setup = function () {
  this.grid        = new Grid(this.size);

  this.score       = 0;
  this.over        = false;
  this.won         = false;
  this.keepPlaying = false;
  this.grid.playerTurn  = true;
  this.ai          = new AI(this.grid);

  // Add the initial tiles
  this.grid.addStartTiles();

  // Update the actuator
  this.actuate();
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.scoreManager.get(),
    terminated: this.isGameTerminated()
  });

};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  var result = this.grid.move(direction);
  this.score += result.score;

  if (!result.won || this.keepPlaying) {
    if (result.moved) {
      this.grid.computerMove();
    }
  } else {
    this.won = true;
  }

  if (!this.grid.movesAvailable()) {
    this.over = true; // Game over!
  }

  this.actuate();
}

GameManager.prototype.run = function() {
  var best = this.ai.getBest();
  this.move(best.move);
  var timeout = animationDelay;
  if (this.running && !this.over && (!this.won || this.keepPlaying)) {
    var self = this;
    setTimeout(function(){
      self.run();
    }, timeout);
  }
}
