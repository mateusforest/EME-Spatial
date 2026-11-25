// Posição do Sol (aproximação NOAA) para Vacaria/RS, horário de Brasília (UTC-3).
// Coordenadas da sede do município (IBGE): -28.51, -50.93. Não é levantamento do terreno.
export const SITE = { lat: -28.51, lon: -50.93, utcOffset: -3 };

// Azimute (graus, a partir do Norte, sentido horário) para onde a fachada frontal (+Z) olha.
// PROVISÓRIO: a implantação com o Norte não foi fornecida. Ajuste aqui quando chegar.
export const FRONT_AZIMUTH = 0;

export function timeLabel(hour: number) {
  const minutes = Math.round(hour * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function solarPosition(hour: number, date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const ordinal = (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000 + 1;
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
  const g = 2 * Math.PI / days * (ordinal - 1 + (hour - 12) / 24);
  const eq = 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g));
  const decl = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g);
  const lat = SITE.lat * Math.PI / 180;
  const ha = ((hour * 60 + eq + 4 * SITE.lon - 60 * SITE.utcOffset) / 4 - 180) * Math.PI / 180;
  const elevation = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha));
  const azimuth = (Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) + Math.PI) % (2 * Math.PI);
  return { elevation: elevation * 180 / Math.PI, azimuth: azimuth * 180 / Math.PI, direction: worldDirection(azimuth, elevation) };
}

/** Converte azimute/elevação (radianos) em vetor no mundo da cena (+Z = frente, Y para cima). */
export function worldDirection(azimuth: number, elevation: number): [number, number, number] {
  const a = azimuth - FRONT_AZIMUTH * Math.PI / 180;
  return [-Math.sin(a) * Math.cos(elevation), Math.sin(elevation), Math.cos(a) * Math.cos(elevation)];
}

/** Rumo (graus a partir do Norte) para onde a câmera olha, dado o yaw da cena. */
export function headingFromYaw(yaw: number) {
  // yaw 0 = olhando para -Z (para a torre, de costas para a rua).
  const deg = (FRONT_AZIMUTH + 180 - yaw * 180 / Math.PI) % 360;
  return (deg + 360) % 360;
}

export function compassLabel(deg: number) {
  const names = ['Norte', 'Nordeste', 'Leste', 'Sudeste', 'Sul', 'Sudoeste', 'Oeste', 'Noroeste'];
  return names[Math.round(deg / 45) % 8];
}

export function sunTimes(date: string) {
  let rise = 6, set = 18;
  for (let h = 3; h < 12; h += 1 / 60) if (solarPosition(h, date).elevation > -.83) { rise = h; break; }
  for (let h = 22; h > 12; h -= 1 / 60) if (solarPosition(h, date).elevation > -.83) { set = h; break; }
  return { rise, set };
}
