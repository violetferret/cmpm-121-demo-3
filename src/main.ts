// import statements ---------------------------------------------------------------------------------------------
//@deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

import { Board, Cell } from "./board.ts";

// data ---------------------------------------------------------------------------------------------------------
// interface for Cache type
interface Cache {
  lat: number;
  lng: number;
  coins: Coin[];
}

interface Coin {
  lat: number;
  lng: number;
  serial: number;
}

// Add a marker to represent the player
interface Player {
  coords: leaflet.LatLng,
  cell: Cell,
  marker: leaflet.Marker
}

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Player's total amount of coins
const playerCoins: Coin[] = [];

// All caches
const cacheArray: Cache[] = [];

// Board for the game
const board = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

// app setup --------------------------------------------------------------------------------------------------------
// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Display the player's points
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No coins yet...";

// player movement ---------------------------------------------------------------------------------------------------
const player: Player = {
  coords: OAKES_CLASSROOM,
  cell: board.getCellForPoint(OAKES_CLASSROOM),
  marker: leaflet.marker(OAKES_CLASSROOM)
}

// identify player marker
player.marker.bindTooltip("That's you!");
player.marker.addTo(map);

// event that triggers when player moves
const playerMoved = new Event("player-moved");

// array of movement buttons
console.log(document.querySelector<HTMLButtonElement>("north"))
const movementButtons = [
  {name: "north", button: document.getElementById("north")!}, 
  {name: "south", button: document.getElementById("south")!}, 
  {name: "east", button: document.getElementById("east")!}, 
  {name: "west", button: document.getElementById("west")!}
];

// add click event listeners
movementButtons.forEach((direction) => {
  direction.button.addEventListener("click", () => {
    switch (direction.name) {
      case "north":
        player.coords.lat += TILE_DEGREES;
        break;
      case "south":
        player.coords.lat -= TILE_DEGREES;
        break;
      case "east":
        player.coords.lng += TILE_DEGREES;
        break;
      case "west":
        player.coords.lng -= TILE_DEGREES;
        break;
    }
    document.dispatchEvent(playerMoved);
  })
})

document.addEventListener("player-moved", () => {
  movePlayer(player);
})

function movePlayer(player: Player) {
  player.marker.remove();
  player.marker = leaflet.marker(player.coords);
  player.marker.bindTooltip(
    `You are here: ${player.cell.lat}, ${player.cell.lng}`,
  );
  player.marker.addTo(map);
  player.cell = board.getCellForPoint(player.coords);
  map.setView(player.coords, map.getZoom());
}



// functions ---------------------------------------------------------------------------------------------------------
// generate caches semi-randomly throughout map
function generateCaches() {
  const nearbyCells = board.getCellsNearPoint(OAKES_CLASSROOM);

  nearbyCells.forEach((cell) => {
    if (luck([cell.lat, cell.lng].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(cell);
    }
  });
}

// Add caches to the map by cell numbers
function spawnCache(cell: Cell) {
  const cache: Cache = {
    lat: cell.lat,
    lng: cell.lng,
    coins: [],
  };

  // amount of coins to create
  const cacheCoinsAmnt = Math.floor(
    luck([cell.lat, cell.lng, "initialValue"].toString()) * 100,
  );

  // create serialized coins
  for (let i = 0; i < cacheCoinsAmnt; i++) {
    cache.coins.push({
      lat: cell.lat,
      lng: cell.lng,
      serial: i,
    });
  }

  // get cache bounds from board class
  const cacheBounds = board.getCellBounds(cell);

  // Add a rectangle to the map to represent the cache
  const cacheRect = leaflet.rectangle(cacheBounds);
  cacheRect.addTo(map);

  // Handle interactions with the cache
  cacheRect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${cache.lat},${cache.lng}". It has value <span id="value">${cache.coins.length}</span>.</div>
                <button id="collect">collect</button>
                <button id= "deposit">deposit</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        collectCoin(cache, statusPanel);
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache
          .coins.length.toString();
      });

    // clicking 'deposit' button decrements the player's value and increments cache's value
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        depositCoin(cache, statusPanel);
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = cache
          .coins.length.toString();
      });

    return popupDiv;
  });
  // push to array of caches
  cacheArray.push(cache);
}

// collects a coin from the cache and gives to player
function collectCoin(cache: Cache, status: HTMLDivElement) {
  if (cache.coins.length > 0) {
    const poppedCoin: Coin = cache.coins.pop() as Coin;
    playerCoins.push(poppedCoin);
    updateDisplay(status);
  }
}

// deposits a coin from player into cache
function depositCoin(cache: Cache, status: HTMLDivElement) {
  if (playerCoins.length > 0) {
    const poppedCoin: Coin = playerCoins.pop() as Coin;
    cache.coins.push(poppedCoin);
    updateDisplay(status);
  }
}

function updateDisplay(status: HTMLDivElement) {
  status.innerHTML = `${playerCoins.length} coins accumulated`;
}

// run game ---------------------------------------------------------------------------------------------------------
generateCaches();
