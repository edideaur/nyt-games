import countries from "./globle-countries.json";

export interface GlobleCountry {
  name: string;
  formalName: string;
  code: string;
  flag: string;
}

export interface GlobleResponse {
  date: string;
  game: "globle";
  index: number;
  name: string;
  formalName: string;
  code: string;
  flag: string;
  url: string;
}

export function decodeGloble(dateIso: string): GlobleResponse {
  const parts = dateIso.split("-");
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let d = parseInt(parts[2], 10);

  // Match Globle's date segment logic in module 3788:
  // if (i.length > 2) { i = s[0]; o = s[1]; a = s[2]; }
  if (parts[2].length > 2) {
    d = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    y = parseInt(parts[2], 10);
  }

  const utcMs = Date.UTC(y, m - 1, d);
  // Globle index computation: Math.floor(c / parseInt(f + "6")) % l.length
  // where f = REACT_APP_SHUFFLE_KEY || "1" -> parseInt("16") = 16
  const total = countries.length;
  const index = Math.floor(utcMs / 16) % total;
  const country = countries[index] as GlobleCountry;

  return {
    date: dateIso,
    game: "globle",
    index,
    name: country.name,
    formalName: country.formalName,
    code: country.code,
    flag: country.flag,
    url: "https://globle.org/",
  };
}
