/**
Two distance frames: the map units an engine draws with, and light-years for text, plus a stylised travel time for every
kind of route. A port of `Universe/Distances.cs`; nothing here draws from a seed. It lives in core (not universe) so
`Units.map` can use it without core importing outside itself; `LinkTier` is defined here for the same reason.
*/

/**
The three maps, each with its own units. C# `MapLevel`.
*/
export type MapLevel = 'Galaxy' | 'Cluster' | 'Universe';

/**
The kind of a link between galaxies. C# `LinkTier`; the order (Gate first) is the C# enum order, which decides which tier
wins when two links join the same pair.
*/
export type LinkTier = 'Gate' | 'Wormhole' | 'Tether' | 'Filament' | 'Tidal';

const galaxyUnitLightYears = 50;
const clusterUnitLightYears = 2000;
const universeUnitLightYears = 100_000;

function lightYears(level: MapLevel, units: number): number {
  return units * (level === 'Galaxy' ? galaxyUnitLightYears : (level === 'Cluster' ? clusterUnitLightYears : universeUnitLightYears));
}

function laneDays(length: number): number {
  return Math.max(1, Math.trunc(Math.ceil(length / 100)));
}

function travelDays(tier: LinkTier, length: number): number {
  switch (tier) {
    case 'Gate': {
      return 7;
    }

    case 'Wormhole': {
      return 3;
    }

    case 'Tether': {
      return 2;
    }

    case 'Tidal': {
      return 1;
    }

    default: {
      return 30 + Math.trunc(Math.ceil(length / 50));
    }
  }
}

/**
C# `Distances`: light-years per map unit at each level, and travel days along lanes and links.
*/
export const Distances = {
  galaxyUnitLightYears,
  clusterUnitLightYears,
  universeUnitLightYears,
  lightYears,
  laneDays,
  travelDays,
} as const;
