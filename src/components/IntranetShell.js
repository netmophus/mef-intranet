'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AppBar, Toolbar, Box, Typography, Button, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Badge, Avatar, Tooltip, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import OutboxIcon from '@mui/icons-material/Outbox';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LogoutIcon from '@mui/icons-material/Logout';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS, TRICOLOR } from '@/theme';

const LARGEUR = 248;

const NAV = [
  { label: 'Accueil', href: '/', icon: HomeIcon },
  { label: 'Tableau de bord', href: '/tableau-bord', icon: DashboardIcon, perm: 'courrier.voir_tableau_bord' },
  { label: 'Ma bannette', href: '/bannette', icon: MoveToInboxIcon, anyPerm: ['courrier.imputer_premier_niveau', 'courrier.accuser_reception'] },
  { label: 'Courrier', href: '/courrier', icon: MarkEmailUnreadIcon, perm: 'courrier.consulter_courrier' },
  { label: 'Enregistrer une arrivée', href: '/courrier/enregistrer', icon: AddCircleIcon, perm: 'courrier.enregistrer_courrier' },
  { label: 'Enregistrer un départ', href: '/courrier/depart/enregistrer', icon: OutboxIcon, perm: 'courrier.enregistrer_courrier' },
  { label: 'Expéditions', href: '/courrier/expeditions', icon: LocalShippingIcon, perm: 'courrier.enregistrer_courrier' },
];

// Initiales à partir du nom complet (pour l'avatar).
function initiales(nom = '') {
  const p = nom.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?';
}

// Détermine l'item de menu actif (gère /courrier vs /courrier/enregistrer).
function estActif(href, pathname) {
  if (href === '/') return pathname === '/';
  if (href === '/courrier') return pathname === '/courrier' || (pathname.startsWith('/courrier/')
    && !pathname.startsWith('/courrier/enregistrer') && !pathname.startsWith('/courrier/depart')
    && !pathname.startsWith('/courrier/expeditions'));
  return pathname === href || pathname.startsWith(href + '/');
}

export default function IntranetShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { utilisateur, has, nom_ministere } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [badgeBannette, setBadgeBannette] = useState(0);

  const aBannette = has('courrier.imputer_premier_niveau') || has('courrier.accuser_reception');

  useEffect(() => {
    if (!aBannette) return;
    apiGet('/api/v1/bannette/')
      .then((b) => setBadgeBannette((b.a_imputer?.length || 0) + (b.a_accuser?.length || 0)))
      .catch(() => {});
  }, [aBannette]);

  async function deconnexion() {
    try { await apiPost('/api/v1/auth/logout/'); } catch { /* on redirige quand même */ }
    window.location.href = '/login';  // vraie navigation : réinitialise le contexte d'auth
  }

  const liens = NAV.filter((n) => {
    if (n.perm) return has(n.perm);
    if (n.anyPerm) return n.anyPerm.some(has);
    return true;
  });

  const contenuDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
      <Toolbar sx={{ gap: 1.25 }}>
        <Box component="img" src="/armoiries-niger.png" alt="" sx={{ height: 38, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
        <Box>
          <Typography sx={{ fontWeight: 800, color: COLORS.blue, fontSize: '0.9rem', lineHeight: 1.1 }}>
            Intranet MEF
          </Typography>
          <Typography sx={{ color: COLORS.goldDark, fontSize: '0.68rem', fontWeight: 600 }}>République du Niger</Typography>
        </Box>
      </Toolbar>
      <Box sx={{ height: 3, background: TRICOLOR }} />

      <Typography sx={{ px: 2.5, pt: 2, pb: 0.5, color: COLORS.muted, fontSize: '0.68rem', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
        Navigation
      </Typography>
      <List sx={{ flex: 1, px: 0, py: 0.5 }}>
        {liens.map(({ label, href, icon: Icon }) => {
          const actif = estActif(href, pathname);
          return (
            <ListItemButton
              key={href}
              selected={actif}
              onClick={() => { setMobileOpen(false); router.push(href); }}
              sx={{
                position: 'relative', mx: 1.25, borderRadius: 2, mb: 0.4, py: 0.9,
                '&::before': {
                  content: '""', position: 'absolute', left: 0, top: '20%', bottom: '20%',
                  width: 3, borderRadius: 3, backgroundColor: COLORS.gold,
                  opacity: actif ? 1 : 0, transition: 'opacity 0.2s ease',
                },
                '&.Mui-selected': { backgroundColor: `${COLORS.blue}12` },
                '&.Mui-selected:hover': { backgroundColor: `${COLORS.blue}1c` },
                '&:hover': { backgroundColor: `${COLORS.blue}0a` },
                '&.Mui-selected .MuiListItemIcon-root': { color: COLORS.blue },
                '&.Mui-selected .MuiListItemText-primary': { color: COLORS.blue, fontWeight: 800 },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: COLORS.muted }}>
                {href === '/bannette' ? (
                  <Badge badgeContent={badgeBannette} color="error"><Icon /></Badge>
                ) : <Icon />}
              </ListItemIcon>
              <ListItemText primary={label} slotProps={{ primary: { fontWeight: 600, fontSize: '0.9rem', color: COLORS.ink } }} />
            </ListItemButton>
          );
        })}
      </List>

      {/* Carte utilisateur en pied de menu */}
      {utilisateur && (
        <>
          <Divider />
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: COLORS.blue, fontSize: '0.85rem', fontWeight: 800 }}>
              {initiales(utilisateur.nom_complet)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.82rem', color: COLORS.ink, lineHeight: 1.2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {utilisateur.nom_complet}
              </Typography>
              {utilisateur.direction && (
                <Typography sx={{ color: COLORS.muted, fontSize: '0.7rem' }}>
                  {utilisateur.direction.sigle}
                </Typography>
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <AppBar position="fixed" elevation={0}
        sx={{ background: 'linear-gradient(100deg, #002B55 0%, #004080 68%, #0a5ca8 100%)',
          zIndex: (t) => t.zIndex.drawer + 1, boxShadow: '0 4px 18px rgba(0,40,80,0.25)' }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}
            sx={{ mr: 0.5, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography component="div" sx={{ fontWeight: 800, flex: 1, lineHeight: 1.15,
            fontSize: { xs: '0.9rem', md: '1.15rem' } }}>
            {nom_ministere}
          </Typography>

          {utilisateur && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 1,
              px: { sm: 1.25 }, py: { sm: 0.5 }, borderRadius: 999,
              backgroundColor: { xs: 'transparent', sm: 'rgba(255,255,255,0.12)' } }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: COLORS.gold, color: COLORS.blueDark, fontSize: '0.82rem', fontWeight: 800 }}>
                {initiales(utilisateur.nom_complet)}
              </Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' }, mr: 0.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.15 }}>
                  {utilisateur.nom_complet}
                </Typography>
                {utilisateur.direction && (
                  <Typography sx={{ fontSize: '0.7rem', color: COLORS.gold, fontWeight: 600 }}>
                    {utilisateur.direction.sigle}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          <Tooltip title="Se déconnecter">
            <Button onClick={deconnexion} color="inherit" startIcon={<LogoutIcon />}
              sx={{ fontWeight: 700, borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)',
                px: { xs: 1, sm: 2 }, '&:hover': { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.6)' } }}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Se déconnecter</Box>
            </Button>
          </Tooltip>
        </Toolbar>
        <Box sx={{ height: 4, background: TRICOLOR }} />
      </AppBar>

      {/* Drawer permanent (md+) */}
      <Drawer variant="permanent" open
        sx={{ display: { xs: 'none', md: 'block' }, width: LARGEUR, flexShrink: 0,
          '& .MuiDrawer-paper': { width: LARGEUR, boxSizing: 'border-box', borderRight: `1px solid ${COLORS.border}` } }}>
        {contenuDrawer}
      </Drawer>
      {/* Drawer temporaire (mobile) */}
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: LARGEUR } }}>
        {contenuDrawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${LARGEUR}px)` } }}>
        <Toolbar />{/* espace sous l'AppBar */}
        <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
