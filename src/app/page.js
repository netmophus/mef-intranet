'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, CircularProgress } from '@mui/material';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import DraftsIcon from '@mui/icons-material/Drafts';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import IntranetShell from '@/components/IntranetShell';
import { useAuth } from '@/lib/AuthContext';
import { apiGet } from '@/lib/api';
import { COLORS, TRICOLOR } from '@/theme';

// Carte de statistique (chiffre clé).
function StatCard({ icon: Icon, valeur, label, accent, loading }) {
  return (
    <Box
      sx={{
        flex: '1 1 200px', minWidth: 0,
        p: 2.25, borderRadius: 3, backgroundColor: '#fff',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 8px 22px rgba(0,40,80,0.06)',
        display: 'flex', alignItems: 'center', gap: 2,
      }}
    >
      <Box sx={{ width: 46, height: 46, borderRadius: 2, flexShrink: 0,
        backgroundColor: `${accent}14`, color: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 26 } }}>
        <Icon />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', lineHeight: 1, color: COLORS.blueDark }}>
          {loading ? <CircularProgress size={20} /> : valeur}
        </Typography>
        <Typography sx={{ color: COLORS.muted, fontSize: '0.8rem', fontWeight: 600, mt: 0.4 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

// Carte d'accès rapide (lien vers un module).
function ActionCard({ icon: Icon, titre, desc, accent, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: '1 1 240px', minWidth: 0, cursor: 'pointer',
        p: 2.25, borderRadius: 3, backgroundColor: '#fff',
        border: `1px solid ${COLORS.border}`,
        boxShadow: '0 8px 22px rgba(0,40,80,0.06)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 16px 30px ${accent}22`, borderColor: accent },
        '&:hover .ac-arrow': { color: accent, transform: 'translateX(3px)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 2, flexShrink: 0,
          backgroundColor: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 23 } }}>
          <Icon />
        </Box>
        <Typography sx={{ fontWeight: 800, color: COLORS.blue, fontSize: '1rem', flex: 1 }}>{titre}</Typography>
        <ArrowForwardIcon className="ac-arrow" sx={{ color: COLORS.muted, transition: 'all 0.2s ease' }} />
      </Box>
      <Typography sx={{ color: COLORS.muted, fontSize: '0.85rem', lineHeight: 1.5 }}>{desc}</Typography>
    </Box>
  );
}

function SectionTitre({ children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mt: 4, mb: 2 }}>
      <Box sx={{ width: 30, height: 4, borderRadius: 2, background: TRICOLOR }} />
      <Typography component="h2" sx={{ color: COLORS.blue, fontWeight: 800, fontSize: '1.15rem' }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function Accueil() {
  const router = useRouter();
  const { loading, utilisateur, doit_changer_mdp, has } = useAuth();

  const peutConsulter = has('courrier.consulter_courrier');
  const peutEnregistrer = has('courrier.enregistrer_courrier');
  const aBannette = has('courrier.imputer_premier_niveau') || has('courrier.accuser_reception');

  const [stats, setStats] = useState({ courriers: null, imputer: null, accuser: null });
  const [chargeStats, setChargeStats] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!utilisateur) { router.replace('/login'); return; }
    if (doit_changer_mdp) router.replace('/changer-mot-de-passe');
  }, [loading, utilisateur, doit_changer_mdp, router]);

  useEffect(() => {
    if (loading || !utilisateur || doit_changer_mdp) return;
    let vivant = true;
    (async () => {
      const maj = {};
      try { if (peutConsulter) { const d = await apiGet('/api/v1/courriers/?page=1'); maj.courriers = d.count ?? 0; } } catch { /* ignore */ }
      try {
        if (aBannette) {
          const b = await apiGet('/api/v1/bannette/');
          maj.imputer = b.a_imputer?.length || 0;
          maj.accuser = b.a_accuser?.length || 0;
        }
      } catch { /* ignore */ }
      if (vivant) { setStats((s) => ({ ...s, ...maj })); setChargeStats(false); }
    })();
    return () => { vivant = false; };
  }, [loading, utilisateur, doit_changer_mdp, peutConsulter, aBannette]);

  if (loading || !utilisateur || doit_changer_mdp) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const aDesStats = peutConsulter || aBannette;

  return (
    <IntranetShell>
      {/* Bandeau de bienvenue */}
      <Box
        sx={{
          position: 'relative', overflow: 'hidden', borderRadius: 4, color: '#fff',
          background: 'linear-gradient(105deg, #002B55 0%, #004080 58%, #0a5ca8 100%)',
          boxShadow: '0 18px 40px rgba(0,40,80,0.22)',
          p: { xs: 2.5, md: 3.5 },
          display: 'flex', alignItems: 'center', gap: { xs: 2, md: 3 },
        }}
      >
        <Box component="img" src="/armoiries-niger.png" alt="Armoiries du Niger"
          sx={{ height: { xs: 60, md: 82 }, filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: COLORS.gold, fontWeight: 800, letterSpacing: 1.4, fontSize: '0.72rem', textTransform: 'uppercase', mb: 0.5 }}>
            Espace intranet
          </Typography>
          <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.9rem' }, lineHeight: 1.15 }}>
            Bienvenue, {utilisateur.nom_complet}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', mt: 0.5 }}>
            {utilisateur.fonction || 'Agent'}
            {utilisateur.direction ? ` · ${utilisateur.direction.nom}` : ''}
          </Typography>
        </Box>
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: TRICOLOR }} />
      </Box>

      {/* Statistiques */}
      {aDesStats && (
        <>
          <SectionTitre>En un coup d'œil</SectionTitre>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {peutConsulter && (
              <StatCard icon={MarkEmailUnreadIcon} accent={COLORS.blue} label="Courriers enregistrés"
                valeur={stats.courriers ?? 0} loading={chargeStats && stats.courriers === null} />
            )}
            {aBannette && (
              <>
                <StatCard icon={AssignmentTurnedInIcon} accent={COLORS.gold} label="À imputer"
                  valeur={stats.imputer ?? 0} loading={chargeStats && stats.imputer === null} />
                <StatCard icon={DraftsIcon} accent={COLORS.green} label="À accuser réception"
                  valeur={stats.accuser ?? 0} loading={chargeStats && stats.accuser === null} />
              </>
            )}
          </Box>
        </>
      )}

      {/* Accès rapides */}
      <SectionTitre>Accès rapides</SectionTitre>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {aBannette && (
          <ActionCard icon={MoveToInboxIcon} accent={COLORS.gold} titre="Ma bannette"
            desc="Courriers à imputer ou à accuser réception, à traiter au plus vite."
            onClick={() => router.push('/bannette')} />
        )}
        {peutConsulter && (
          <ActionCard icon={MarkEmailUnreadIcon} accent={COLORS.blue} titre="Courrier arrivée"
            desc="Consulter, rechercher et suivre le courrier enregistré."
            onClick={() => router.push('/courrier')} />
        )}
        {peutEnregistrer && (
          <ActionCard icon={AddCircleIcon} accent={COLORS.green} titre="Enregistrer un courrier"
            desc="Saisir un nouveau courrier arrivée dans le registre."
            onClick={() => router.push('/courrier/enregistrer')} />
        )}
      </Box>
    </IntranetShell>
  );
}
