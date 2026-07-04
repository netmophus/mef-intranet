'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AppBar, Toolbar, Box, Typography, Button, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, IconButton, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { apiPost } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS, TRICOLOR } from '@/theme';

const LARGEUR = 240;

const NAV = [
  { label: 'Accueil', href: '/', icon: HomeIcon },
  { label: 'Courrier', href: '/courrier', icon: MarkEmailUnreadIcon, perm: 'courrier.consulter_courrier' },
  { label: 'Enregistrer un courrier', href: '/courrier/enregistrer', icon: AddCircleIcon, perm: 'courrier.enregistrer_courrier' },
];

export default function IntranetShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { utilisateur, has } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function deconnexion() {
    try { await apiPost('/api/v1/auth/logout/'); } catch { /* on redirige quand même */ }
    router.replace('/login');
  }

  const liens = NAV.filter((n) => !n.perm || has(n.perm));

  const contenuDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1 }}>
        <Box component="img" src="/armoiries-niger.png" alt="" sx={{ height: 34 }} />
        <Box>
          <Typography sx={{ fontWeight: 800, color: COLORS.blue, fontSize: '0.85rem', lineHeight: 1.1 }}>
            Intranet MEF
          </Typography>
          <Typography sx={{ color: COLORS.goldDark, fontSize: '0.68rem' }}>République du Niger</Typography>
        </Box>
      </Toolbar>
      <Box sx={{ height: 3, background: TRICOLOR }} />
      <List sx={{ flex: 1, py: 1 }}>
        {liens.map(({ label, href, icon: Icon }) => {
          const actif = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <ListItemButton
              key={href}
              selected={actif}
              onClick={() => { setMobileOpen(false); router.push(href); }}
              sx={{
                mx: 1, borderRadius: 2, mb: 0.5,
                '&.Mui-selected': { backgroundColor: `${COLORS.blue}14`, color: COLORS.blue },
                '&.Mui-selected .MuiListItemIcon-root': { color: COLORS.blue },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38 }}><Icon /></ListItemIcon>
              <ListItemText primary={label} slotProps={{ primary: { fontWeight: 600, fontSize: '0.9rem' } }} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <AppBar position="fixed" elevation={0} sx={{ backgroundColor: COLORS.blue, zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Typography component="div" sx={{ fontWeight: 800, flex: 1, fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
            Ministère des Finances
          </Typography>
          {utilisateur && (
            <Box sx={{ textAlign: 'right', mr: 2, display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.1 }}>
                {utilisateur.nom_complet}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', opacity: 0.85 }}>
                {utilisateur.direction ? utilisateur.direction.sigle : '—'}
              </Typography>
            </Box>
          )}
          <Button onClick={deconnexion} color="inherit" startIcon={<LogoutIcon />} sx={{ fontWeight: 700 }}>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Se déconnecter</Box>
          </Button>
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
