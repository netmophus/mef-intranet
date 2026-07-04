// Badge de délai (calcul client) : orange si ≤ 3 jours, rouge si dépassé.
export function badgeDelai(delai) {
  if (!delai) return null;
  const jours = Math.ceil((new Date(delai + 'T00:00:00') - new Date()) / 86400000);
  if (jours < 0) return { couleur: 'error', libelle: `En retard (${-jours} j)` };
  if (jours <= 3) return { couleur: 'warning', libelle: jours === 0 ? "Aujourd'hui" : `J-${jours}` };
  return { couleur: 'default', libelle: `J-${jours}` };
}
