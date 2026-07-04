'use client';

import { Box, Typography, Button } from '@mui/material';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { apiBase } from '@/lib/api';
import { COLORS } from '@/theme';

// Composant UNIQUE d'affichage du scan PDF, réutilisé par la fiche courrier,
// l'écran d'imputation et tout futur écran — pour que l'affichage ne puisse
// plus diverger d'un écran à l'autre.
//
// Rendu NATIF via <object type="application/pdf"> : on demande explicitement au
// navigateur d'interpréter le flux comme un PDF (visionneuse native, zoom,
// pages), au lieu de le laisser deviner et l'afficher en octets bruts. Le
// contenu enfant sert de REPLI natif si le PDF ne peut pas s'afficher.
//
// L'URL pointe sur la vue Django protégée : les cookies de session partent
// automatiquement (requête same-site), et les en-têtes CSP frame-ancestors +
// Content-Type: application/pdf + Content-Disposition: inline sont déjà posés
// côté backend.

function Repli({ url, message }) {
  return (
    <Box sx={{ height: '100%', minHeight: 220, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 1.5, p: 4, textAlign: 'center', color: COLORS.muted }}>
      <PictureAsPdfOutlinedIcon sx={{ fontSize: 46 }} />
      <Typography sx={{ fontWeight: 700 }}>{message}</Typography>
      {url && (
        <Button component="a" href={url} target="_blank" rel="noopener noreferrer"
          variant="outlined" startIcon={<OpenInNewIcon />} sx={{ fontWeight: 700, borderRadius: 999 }}>
          Ouvrir dans un onglet
        </Button>
      )}
    </Box>
  );
}

export default function VisionneuseScan({ courrierId, aScan = true }) {
  if (!aScan) {
    return <Repli message="Aucun scan disponible pour ce courrier." />;
  }
  const url = `${apiBase()}/api/v1/courriers/${courrierId}/scan/`;
  return (
    <Box
      component="object"
      data={url}
      type="application/pdf"
      aria-label="Scan du courrier"
      sx={{ width: '100%', height: '100%', minHeight: 220, border: 0, display: 'block' }}
    >
      {/* Repli natif : affiché uniquement si le PDF ne peut pas être rendu. */}
      <Repli url={url} message="Scan indisponible." />
    </Box>
  );
}
