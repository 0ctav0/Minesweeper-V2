function Minesweeper(canvasID, options) {

	var cells = {};
	var prevHoveredCell;

	var BACKGROUND_COLOR = options.backgroundColor || "#aaa";
	var COLORS = options.colors || ["red", "blue", "yellow", "green", "#f0f", "orange", "aqua", "white"];

	var COUNT_CELLS_X = options.countCellsX || 8;
	var COUNT_CELLS_Y = options.countCellsY || 8;
	var COUNT_CELLS = COUNT_CELLS_X * COUNT_CELLS_Y;

	var MIN_POSSIBLE_MINES = options.minPossibleMines || COUNT_CELLS / 5;
	var MAX_POSSIBLE_MINES = options.maxPossibleMines || COUNT_CELLS / 3;
	var COUNT_MINES = options.countMines || getRandom(MIN_POSSIBLE_MINES, MAX_POSSIBLE_MINES);

	var remainOpen = COUNT_CELLS - COUNT_MINES;

	var CELL_WIDTH = options.cellWidth || 64;
	var CELL_HEIGHT = options.cellHeight || 64;

	var FLAG_WIDTH = CELL_WIDTH / 1.5;
	var FLAG_HEIGHT = CELL_HEIGHT / 1.5;

	var FONT_SIZE = Math.floor((CELL_WIDTH + CELL_HEIGHT) / 3.5);


	var WIDTH  = CELL_WIDTH * COUNT_CELLS_X;
	var HEIGHT = CELL_HEIGHT * COUNT_CELLS_Y;


	var resourcesNeededToLoad = 0;

	var IMG = {};
		IMG.CELL 					= initImg("img/cell.svg", CELL_WIDTH, CELL_HEIGHT);
		IMG.SELECTED_CELL = initImg("img/selected cell.svg", CELL_WIDTH, CELL_HEIGHT);
		IMG.FLAG 					= initImg("img/flag.svg", CELL_WIDTH, CELL_HEIGHT);
		IMG.MINE 					= initImg("img/mine.svg", CELL_WIDTH, CELL_HEIGHT);

	var SOUND = {};
		SOUND.BOOM = new Audio("Pig Bomb.mp3") //initAudio("Pig Bomb.mp3");

	window.SOUND = SOUND;


	var canvas = document.getElementById(canvasID);

	var ctx = canvas.getContext("2d");


	this.start = function() {

		if ( !resourcesNeededToLoad ) {
			init();
		}

		setTimeout(this.start, 100);
	}

	function initResource(obj) {
		resourcesNeededToLoad++;
		obj.onload = function() {
			resourcesNeededToLoad--;
		}
		return obj;
	}

	function initAudio(src) {
		var audio = new Audio(src);
		return initResource(audio);
	}

	function initImg(src, width, height) {
		var img = new Image(width, height);
		img.src = src;
		return initResource(img);
	}

	function getRandom(min, max) {
		min = Math.floor(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}


	function init() {

		canvas.width  = WIDTH;
		canvas.height = HEIGHT;
		ctx.fillStyle = BACKGROUND_COLOR;
		ctx.fillRect(0, 0, WIDTH, HEIGHT);
		ctx.textAlign = "center";
		ctx.font = "normal normal " + FONT_SIZE + "px Tahoma";

		for ( var x = 0; x < COUNT_CELLS_X; x++ ) {
			cells[x] = {};
			for ( var y = 0; y < COUNT_CELLS_Y; y++ ) {
				ctx.drawImage(IMG.CELL, x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
				cells[x][y] = new Cell;
			}
		}

		setMines();


		canvas.addEventListener("mousemove", mousemove);
		canvas.addEventListener("click", click);
		canvas.addEventListener("contextmenu", contextmenu);
	}

	function setMines() {
		var i = COUNT_MINES;
		while ( i > 0 ) {
			var x = getRandom(0, COUNT_CELLS_X - 1);
			var y = getRandom(0, COUNT_CELLS_Y - 1);
			if ( !cells[x][y].hasMine ) {
				cells[x][y].hasMine = true;
				i--;
			}
		}
	}

	function getPos(offsetX, offsetY) {
		return {
			x : Math.floor(offsetX / CELL_WIDTH)
			,y : Math.floor(offsetY / CELL_HEIGHT)
		};
	}

	function end() {
		canvas.removeEventListener("mousemove", mousemove);
		canvas.removeEventListener("click", click);
		canvas.removeEventListener("contextmenu", contextmenu);
	}

	function badlyEnd() {
		end();
		if ( options.gameOver ) {
			options.gameOver();
		}
		SOUND.BOOM.play();
	}

	function happyEnd() {
		end();
		if ( options.happyEnd ) {
			options.happyEnd();
		}
	}


	function redraw(x, y) {
		var cell = cells[x][y];

		if ( cell.hasFlag ) {
			ctx.drawImage(IMG.CELL, x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
			ctx.drawImage(IMG.FLAG, x * CELL_WIDTH + FLAG_WIDTH / 2.3, y * CELL_HEIGHT + FLAG_HEIGHT / 2.3, FLAG_WIDTH, FLAG_HEIGHT);
			return;
		}

		if ( cell.hovered ) {
			ctx.drawImage(IMG.SELECTED_CELL, x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
		} else {
			ctx.drawImage(IMG.CELL, x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
		}

		if ( cell.type === "opened" ) {
			ctx.fillRect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
			ctx.strokeRect(x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);

			if ( cell.hasMine ) {
				ctx.drawImage(IMG.MINE, x * CELL_WIDTH, y * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
			} 

			if ( cell.digit ) {
				ctx.fillStyle = COLORS[cell.digit - 1];
				ctx.fillText( cell.digit, x * CELL_WIDTH + (CELL_WIDTH / 2), y * CELL_HEIGHT + (CELL_HEIGHT / 1.5) );
				ctx.fillStyle = BACKGROUND_COLOR;
			}
		}
	}

	// function look around our cell and counting mines
	function defineCountMines(x, y) {
		var countMines = 0;
		for ( var i = x - 1; i <= x + 1; i++ ) {
			for ( var j = y - 1; j <= y + 1; j++ ) {
				if ( i >= 0 && i <= COUNT_CELLS_X - 1   // check if we are not come x-bounds out
						&& j >= 0 && j <= COUNT_CELLS_Y - 1 // y-bounds
						&& !(i == x && j == y) 							// not same cell, 'cause we open and here not be mine
					) {
					if ( cells[i][j].hasMine ) {
						countMines++;
					}
				}
			}
		}
		return countMines;
	}

	function expandExploreMap(x, y) {
		for ( var i = x - 1; i <= x + 1; i++ ) {
			for ( var j = y - 1; j <= y + 1; j++ ) {
				if ( i >= 0 && i <= COUNT_CELLS_X - 1   // check if we are not come x-bounds out
						&& j >= 0 && j <= COUNT_CELLS_Y - 1 // y-bounds
						&& !(i == x && j == y) 							// not same cell, 'cause we open and here not be mine
					) {
					if ( cells[i][j].type !== "opened" && !cells[i][j].hasMine ) {
						cells[i][j].digit = defineCountMines(i, j);
						cells[i][j].type = "opened";
						remainOpen--;

						if ( !cells[i][j].digit ) {
							expandExploreMap(i, j);
						}
						redraw(i, j);
					}
				}
			}
		}	
	}


	/////////// UI ///////////


	function mousemove(e) {
		var pos = getPos(e.offsetX, e.offsetY);
		var cell = cells[pos.x][pos.y];

		if ( pos.x < 0 || pos.y < 0 ) {
			return;
		}

		if ( prevHoveredCell ) {
			var prevCell = cells[prevHoveredCell.x][prevHoveredCell.y];
			prevCell.hovered = false;
			redraw(prevHoveredCell.x, prevHoveredCell.y);
		}

		if ( cell.type !== "opened" ) {
			prevHoveredCell = { x : pos.x, y : pos.y };
			cell.hovered = true;
			redraw(pos.x, pos.y);
		}
		
	}

	function click(e) {
		var pos = getPos(e.offsetX, e.offsetY);
		var cell = cells[pos.x][pos.y];

		if ( cell.hasFlag ) {
			return;
		}

		if ( cell.type !== "opened" ) {

			cell.type = "opened";
			remainOpen--;
			
			if ( cell.hasMine ) {
				redraw(pos.x, pos.y);
				badlyEnd();
				return;
			}

			cell.digit = defineCountMines(pos.x, pos.y);
			if ( !cell.digit ) {
				expandExploreMap(pos.x, pos.y);
			}

			if ( remainOpen === 0 ) {
				happyEnd();
			}
			redraw(pos.x, pos.y);
		}
	}

	function contextmenu(e) {
		e.preventDefault();
		var pos = getPos(e.offsetX, e.offsetY);
		var cell = cells[pos.x][pos.y];

		if ( cell.hasFlag ) {
			cell.hasFlag = false;
		} else if ( cell.type !== "opened" ) {
			cell.hasFlag = true;
		}

		redraw(pos.x, pos.y);
	}



	/////// Classes //////////


	function Cell() {

		this.hasMine = false;
		this.hasFlag = false;
		this.type = "";
		this.digit = 0;
		this.hovered = false;
	}

}