'use client';

import { createTheme } from '@mui/material/styles';

// Charte reprise du site public (finance-frontend) : bleu d'État + or.
// Copie assumée pour l'instant (les deux projets sont séparés).
export const COLORS = {
  blue: '#004080',
  blueDark: '#002B55',
  blueHover: '#003366',
  green: '#2E8B57',
  greenDark: '#1F6E42',
  gold: '#E0A92E',
  goldDark: '#B5841F',
  orange: '#E07B2C',
  ink: '#37474F',
  muted: '#90A4AE',
  bg: '#EEF1F5',
  border: '#DCE3EC',
};

// Filet tricolore (orange · blanc · vert) — rappel du drapeau du Niger.
export const TRICOLOR =
  `linear-gradient(90deg, ${COLORS.orange} 0 33.33%, #ffffff 33.33% 66.66%, ${COLORS.green} 66.66% 100%)`;

const theme = createTheme({
  palette: {
    primary: { main: COLORS.blue, dark: COLORS.blueHover },
    secondary: { main: COLORS.gold, dark: COLORS.goldDark },
    text: { primary: COLORS.ink, secondary: COLORS.muted },
    background: { default: COLORS.bg },
  },
  typography: {
    fontFamily: 'var(--font-roboto), Roboto, Arial, sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 999 } } },
  },
});

export default theme;
