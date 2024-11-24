// import statements ---------------------------------------------------------------------------------------------
// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// data ---------------------------------------------------------------------------------------------------------
// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// interface for Cache type
interface Cache {
  lat: number;
  lng: number;
  coins: number;
}

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);

// Player's total amount of coins
let playerCoins = 0;

// app setup --------------------------------------------------------------------------------------------------------
// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// identify player marker
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

// Display the player's points
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No points yet...";

// functions ---------------------------------------------------------------------------------------------------------
// generate caches semi-randomly throughout map
function generateCaches() {
  for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
    for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
      // If location i,j is lucky enough, spawn a cache!
      if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
        spawnCache(i, j);
      }
    }
  }
}

// Add caches to the map by cell numbers
function spawnCache(lat: number, lng: number) {
  const cache: Cache = {
    lat: lat,
    lng: lng,
    coins: Math.floor(luck([lat, lng, "initialValue"].toString()) * 100),
  };

  // Add a rectangle to the map to represent the cache
  const cacheRect = leaflet.rectangle(cellToCoords(cache));
  cacheRect.addTo(map);

  // Handle interactions with the cache
  cacheRect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
                <div>There is a cache here at "${lat},${lng}". It has value <span id="value">${cache.coins}</span>.</div>
                <button id="collect">collect</button>
                <button id= "deposit">deposit</button>`;

    // Clicking the button decrements the cache's value and increments the player's points
    popupDiv
      .querySelector<HTMLButtonElement>("#collect")!
      .addEventListener("click", () => {
        collectCoin(cache, statusPanel);
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          cache.coins.toString();
      });

    // clicking 'deposit' button decrements the player's value and increments cache's value
    popupDiv
      .querySelector<HTMLButtonElement>("#deposit")!
      .addEventListener("click", () => {
        depositCoin(cache, statusPanel);
        popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
          cache.coins.toString();
      });

    return popupDiv;
  });
}

// Convert cell numbers into lat/lng bounds
function cellToCoords(cache: Cache) {
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [
      origin.lat + cache.lat * TILE_DEGREES,
      origin.lng + cache.lng * TILE_DEGREES,
    ],
    [
      origin.lat + (cache.lat + 1) * TILE_DEGREES,
      origin.lng + (cache.lng + 1) * TILE_DEGREES,
    ],
  ]);
  return bounds;
}

// collects a coin from the cache and gives to player
function collectCoin(cache: Cache, status: HTMLDivElement) {
  if (cache.coins > 0) {
    cache.coins--;
    playerCoins++;
    updateDisplay(status);
  }
}

// deposits a coin from player into cache
function depositCoin(cache: Cache, status: HTMLDivElement) {
  if (playerCoins > 0) {
    cache.coins++;
    playerCoins--;
    updateDisplay(status);
  }
}

function updateDisplay(status: HTMLDivElement) {
  status.innerHTML = `${playerCoins} points accumulated`;
}

// run game ---------------------------------------------------------------------------------------------------------
generateCaches();
