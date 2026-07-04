'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Typography, Paper, Grid, Chip, Button, Divider, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ArchiveIcon from '@mui/icons-material/Archive';
import LockIcon from '@mui/icons-material/Lock';
import CheckIcon from '@mui/icons-material/Check';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread';
import OutboxIcon from '@mui/icons-material/Outbox';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import IntranetShell from '@/components/IntranetShell';
import AccesRefuse from '@/components/AccesRefuse';
import VisionneuseScan from '@/components/VisionneuseScan';
import { apiGet, apiPatch, apiPost, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { COLORS, TRICOLOR } from '@/theme';

// Carte de panneau (coins arrondis + ombre douce).
const CARTE = { border: `1px solid ${COLORS.border}`, borderRadius: 3, boxShadow: '0 8px 22px rgba(0,40,80,0.06)' };

// Titre de panneau avec petit accent tricolore.
function TitrePanneau({ children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      <Box sx={{ width: 22, height: 4, borderRadius: 2, background: TRICOLOR }} />
      <Typography sx={{ fontWeight: 800, color: COLORS.blue, fontSize: '0.98rem' }}>{children}</Typography>
    </Box>
  );
}

function Ligne({ label, valeur }) {
  return (
    <Box sx={{ mb: 1.25 }}>
      <Typography sx={{ color: COLORS.muted, fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography sx={{ color: COLORS.ink, fontSize: '0.95rem' }}>{valeur || '—'}</Typography>
    </Box>
  );
}

function horodate(iso) {
  try { return new Date(iso).toLocaleString('fr-FR'); } catch { return iso; }
}

// Première imputation EN_ATTENTE_ACCUSE ciblant la direction de l'utilisateur.
function trouverAccusable(imps, directionId) {
  for (const i of imps || []) {
    if (i.statut === 'EN_ATTENTE_ACCUSE' && i.direction_cible.id === directionId) return i;
    const sous = trouverAccusable(i.sous_imputations, directionId);
    if (sous) return sous;
  }
  return null;
}

function NoeudImputation({ imp, niveau }) {
  return (
    <Box sx={{ ml: niveau * 2.5, borderLeft: niveau ? `2px solid ${COLORS.border}` : 'none', pl: niveau ? 1.25 : 0, mt: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <Chip size="small" label={imp.direction_cible.sigle}
          sx={{ fontWeight: 800, backgroundColor: `${COLORS.blue}14`, color: COLORS.blue }} />
        <Typography sx={{ fontSize: '0.8rem', color: COLORS.ink }}>{imp.instruction_libelle}</Typography>
        <Chip size="small" variant="outlined" label={imp.statut_libelle} />
      </Box>
      <Typography sx={{ fontSize: '0.72rem', color: COLORS.muted, mt: 0.25 }}>
        Imputé par {imp.impute_par.nom_complet}
        {imp.accuse_le ? ` · accusé par ${imp.accuse_par?.nom_complet}` : " · en attente d'accusé"}
      </Typography>
      {(imp.sous_imputations || []).map((s) => (
        <NoeudImputation key={s.id} imp={s} niveau={niveau + 1} />
      ))}
    </Box>
  );
}

export default function FicheCourrier() {
  const { id } = useParams();
  const router = useRouter();
  const { loading, has, utilisateur } = useAuth();
  // Lecture autorisée pour toute permission courrier (le backend applique la
  // visibilité fine : large pour les rôles centraux, directionnelle pour les
  // secrétariats). Un 404 signale un courrier hors périmètre.
  const peutVoir = has('courrier.consulter_courrier') || has('courrier.accuser_reception')
    || has('courrier.imputer_sous_arbre') || has('courrier.imputer_premier_niveau');

  const [courrier, setCourrier] = useState(null);
  const [erreur, setErreur] = useState('');
  const [ouvertModif, setOuvertModif] = useState(false);
  const [form, setForm] = useState(null);
  const [correspondants, setCorrespondants] = useState([]);
  const [enCours, setEnCours] = useState(false);
  const [errModif, setErrModif] = useState('');

  const charger = useCallback(async () => {
    try {
      const c = await apiGet(`/api/v1/courriers/${id}/`);
      setCourrier(c);
    } catch (e) {
      setErreur(e.status === 404 ? 'Courrier introuvable ou non autorisé.'
        : (e.status >= 500 ? 'Erreur serveur.' : 'Impossible de charger le courrier.'));
    }
  }, [id]);

  useEffect(() => { if (peutVoir) charger(); }, [peutVoir, charger]);

  async function accuserImputation(impId) {
    try {
      await apiPost(`/api/v1/imputations/${impId}/accuser/`);
      await charger();
    } catch (e) {
      setErreur(e instanceof ApiError && e.data?.detail ? e.data.detail : "Échec de l'accusé de réception.");
    }
  }

  function ouvrirModif() {
    setErrModif('');
    setForm({
      objet: courrier.objet,
      correspondant: courrier.correspondant.id,
      date_document: courrier.date_document,
      date_arrivee: courrier.date_arrivee,
      nombre_pieces: courrier.nombre_pieces,
      confidentialite: courrier.confidentialite,
      delai_reponse: courrier.delai_reponse || '',
    });
    apiGet('/api/v1/courriers/correspondants/').then(setCorrespondants).catch(() => {});
    setOuvertModif(true);
  }

  async function enregistrerModif() {
    setEnCours(true);
    setErrModif('');
    try {
      const payload = { ...form };
      if (!payload.delai_reponse) payload.delai_reponse = null;
      const c = await apiPatch(`/api/v1/courriers/${id}/`, payload);
      setCourrier(c);
      setOuvertModif(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.data && typeof err.data === 'object') {
        const p = Object.values(err.data)[0];
        setErrModif(Array.isArray(p) ? p[0] : (err.data.detail || 'Données invalides.'));
      } else {
        setErrModif('Échec de la modification.');
      }
    } finally {
      setEnCours(false);
    }
  }

  async function classer() {
    if (!window.confirm('Classer ce courrier sans suite ? Cette action est définitive pour ce lot.')) return;
    try {
      const c = await apiPost(`/api/v1/courriers/${id}/classer/`);
      setCourrier(c);
    } catch (err) {
      setErreur(err.status === 409 ? 'Ce courrier ne peut plus être classé.' : 'Échec du classement.');
    }
  }

  // --- Courrier départ (lot C4) ---
  const inputScan = useRef(null);
  const [dialogDecharge, setDialogDecharge] = useState(false);

  async function attacherScan(fichier) {
    if (!fichier) return;
    if (!fichier.name.toLowerCase().endsWith('.pdf')) { setErreur('Le scan doit être un PDF.'); return; }
    setErreur('');
    try {
      const fd = new FormData(); fd.append('scan', fichier);
      const c = await apiPost(`/api/v1/courriers/${id}/attacher-scan/`, fd);
      setCourrier(c);
    } catch (e) {
      setErreur(e instanceof ApiError && e.data?.detail ? e.data.detail : "Échec de l'attachement du scan.");
    }
  }

  async function expedier() {
    setErreur('');
    try {
      const c = await apiPost(`/api/v1/courriers/${id}/expedier/`, {});
      setCourrier(c);
    } catch (e) {
      setErreur(e instanceof ApiError && e.data?.detail ? e.data.detail : "Échec de l'expédition.");
    }
  }

  const [dechargeDate, setDechargeDate] = useState('');
  const [dechargeComm, setDechargeComm] = useState('');
  const [errDecharge, setErrDecharge] = useState('');
  async function pointerDecharge() {
    setErrDecharge('');
    if (!dechargeDate) { setErrDecharge('La date de décharge est requise.'); return; }
    try {
      const c = await apiPost(`/api/v1/courriers/${id}/decharge/`, { date: dechargeDate, commentaire: dechargeComm });
      setCourrier(c); setDialogDecharge(false); setDechargeDate(''); setDechargeComm('');
    } catch (e) {
      setErrDecharge(e instanceof ApiError && e.data?.detail ? e.data.detail : 'Échec du pointage.');
    }
  }

  if (loading) {
    return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  }
  if (!peutVoir) {
    return <IntranetShell><AccesRefuse message="La consultation du courrier requiert une autorisation." /></IntranetShell>;
  }
  if (erreur) {
    return <IntranetShell><Alert severity="warning" sx={{ mt: 2 }}>{erreur}</Alert></IntranetShell>;
  }
  if (!courrier) {
    return <IntranetShell><Box sx={{ textAlign: 'center', mt: 8 }}><CircularProgress /></Box></IntranetShell>;
  }

  const estDepart = courrier.sens === 'DEPART';
  const peutGererDepart = estDepart && has('courrier.enregistrer_courrier');
  const peutModifier = has('courrier.modifier_courrier') && !estDepart;
  const peutClasser = has('courrier.classer_courrier') && courrier.statut === 'ENREGISTRE' && !estDepart;
  // Imputation en attente d'accusé ciblant la direction de l'utilisateur.
  const accusable = has('courrier.accuser_reception') && utilisateur?.direction && !estDepart
    ? trouverAccusable(courrier.imputations, utilisateur.direction.id) : null;

  return (
    <IntranetShell>
      <Button onClick={() => router.push('/courrier')} startIcon={<ArrowBackIcon />}
        sx={{ color: COLORS.blue, fontWeight: 700, borderRadius: 999, mb: 1.5 }}>Retour au courrier</Button>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5, flexWrap: 'wrap' }}>
        <Box sx={{ width: 42, height: 42, borderRadius: 2, backgroundColor: `${COLORS.blue}14`, color: COLORS.blue,
          display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 24 } }}>
          {estDepart ? <OutboxIcon /> : <MarkEmailUnreadIcon />}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" sx={{ fontWeight: 800, color: COLORS.blue, fontSize: { xs: '1.25rem', md: '1.6rem' }, lineHeight: 1.15, wordBreak: 'break-word' }}>
            {estDepart ? (courrier.reference_complete || courrier.numero_ordre) : courrier.numero_ordre}
          </Typography>
          {estDepart && courrier.reference_complete && (
            <Typography sx={{ color: COLORS.muted, fontSize: '0.78rem' }}>{courrier.numero_ordre}</Typography>
          )}
        </Box>
        <Chip label={courrier.statut_libelle} size="small"
          sx={{ backgroundColor: `${COLORS.blue}14`, color: COLORS.blue, fontWeight: 700, borderRadius: 1.5 }} />
        {courrier.confidentialite === 'CONFIDENTIEL' && (
          <Chip icon={<LockIcon />} label="Confidentiel" size="small"
            sx={{ backgroundColor: `${COLORS.orange}1f`, color: COLORS.orange, fontWeight: 700, borderRadius: 1.5 }} />
        )}
        <Box sx={{ flex: 1 }} />
        {estDepart ? (
          <>
            {peutGererDepart && !courrier.a_scan && (
              <Button startIcon={<AttachFileIcon />} onClick={() => inputScan.current?.click()} variant="outlined" sx={{ fontWeight: 700 }}>Attacher le scan</Button>
            )}
            {peutGererDepart && courrier.a_scan && !courrier.expedie_le && (
              <Button startIcon={<SendIcon />} onClick={expedier} variant="contained" sx={{ backgroundColor: COLORS.blue, fontWeight: 700 }}>Marquer expédié</Button>
            )}
            {peutGererDepart && courrier.expedie_le && !courrier.decharge_recue_le && (
              <Button startIcon={<FactCheckIcon />} onClick={() => setDialogDecharge(true)} variant="contained" sx={{ backgroundColor: COLORS.green, fontWeight: 700, '&:hover': { backgroundColor: COLORS.greenDark } }}>Pointer la décharge</Button>
            )}
            <input ref={inputScan} type="file" accept="application/pdf" hidden onChange={(e) => attacherScan(e.target.files[0])} />
          </>
        ) : (
          <>
            {peutModifier && <Button startIcon={<EditIcon />} onClick={ouvrirModif} variant="outlined" sx={{ fontWeight: 700 }}>Modifier</Button>}
            {peutClasser && <Button startIcon={<ArchiveIcon />} onClick={classer} variant="outlined" color="warning" sx={{ fontWeight: 700 }}>Classer sans suite</Button>}
          </>
        )}
      </Box>

      <Grid container spacing={2}>
        {/* Visionneuse PDF */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={0} sx={{ ...CARTE, overflow: 'hidden', height: { xs: 420, md: '72vh' } }}>
            <VisionneuseScan courrierId={courrier.id} aScan={courrier.a_scan} />
          </Paper>
        </Grid>

        {/* Métadonnées + chronologie */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ ...CARTE, p: 2.5, mb: 2 }}>
            <TitrePanneau>Informations</TitrePanneau>
            <Ligne label={estDepart ? 'Destinataire' : 'Correspondant'} valeur={courrier.correspondant.nom} />
            <Ligne label="Objet" valeur={courrier.objet} />
            {estDepart ? (
              <>
                <Grid container spacing={1}>
                  <Grid size={6}><Ligne label="Structure émettrice" valeur={courrier.structure_emettrice?.sigle} /></Grid>
                  <Grid size={6}><Ligne label="Date de signature" valeur={courrier.date_signature} /></Grid>
                  <Grid size={6}><Ligne label="Expédié le" valeur={courrier.expedie_le} /></Grid>
                  <Grid size={6}><Ligne label="Décharge reçue le" valeur={courrier.decharge_recue_le} /></Grid>
                </Grid>
                <Ligne label="Signataire" valeur={courrier.signataire_nom
                  ? `${courrier.signataire_nom}${courrier.signataire_qualite ? ' — ' + courrier.signataire_qualite : ''}` : '—'} />
                {courrier.ampliations?.length > 0 && (
                  <Ligne label="Ampliations" valeur={courrier.ampliations.map((a) => a.nom).join(', ')} />
                )}
                {courrier.decharge_commentaire && <Ligne label="Commentaire décharge" valeur={courrier.decharge_commentaire} />}
                {courrier.courrier_origine && (
                  <Box sx={{ mb: 1.25 }}>
                    <Typography sx={{ color: COLORS.muted, fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Répond à</Typography>
                    <Box component="button" onClick={() => router.push(`/courrier/${courrier.courrier_origine.id}`)}
                      sx={{ p: 0, border: 'none', background: 'none', cursor: 'pointer', color: COLORS.blue, fontWeight: 800, fontSize: '0.95rem' }}>
                      {courrier.courrier_origine.numero_ordre}
                    </Box>
                  </Box>
                )}
              </>
            ) : (
              <Grid container spacing={1}>
                <Grid size={6}><Ligne label="Date du document" valeur={courrier.date_document} /></Grid>
                <Grid size={6}><Ligne label="Date d'arrivée" valeur={courrier.date_arrivee} /></Grid>
                <Grid size={6}><Ligne label="Nb pièces" valeur={courrier.nombre_pieces} /></Grid>
                <Grid size={6}><Ligne label="Délai de réponse" valeur={courrier.delai_reponse} /></Grid>
              </Grid>
            )}
            <Ligne label="Enregistré par" valeur={`${courrier.enregistre_par.nom_complet} (${courrier.enregistre_par.matricule})`} />
            <Typography sx={{ color: COLORS.muted, fontSize: '0.7rem', mt: 1, wordBreak: 'break-all' }}>
              SHA-256 : {courrier.hash_sha256 || '—'}
            </Typography>
          </Paper>

          {/* Réponses liées (arrivée) — lot C4 */}
          {!estDepart && (courrier.reponses_liees || []).length > 0 && (
            <Paper elevation={0} sx={{ ...CARTE, p: 2.5, mb: 2 }}>
              <TitrePanneau>Réponses</TitrePanneau>
              {courrier.reponses_liees.map((r) => (
                <Box key={r.id} onClick={() => router.push(`/courrier/${r.id}`)}
                  sx={{ cursor: 'pointer', p: 1, mb: 0.75, borderRadius: 1.5, border: `1px solid ${COLORS.border}`,
                    '&:hover': { backgroundColor: '#f2f6fb' } }}>
                  <Typography sx={{ fontWeight: 800, color: COLORS.blue, fontSize: '0.85rem' }}>
                    {r.reference_complete || r.numero_ordre}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: COLORS.muted }}>
                    {r.decharge_recue_le ? `Déchargé le ${r.decharge_recue_le}`
                      : (r.expedie_le ? `Expédié le ${r.expedie_le}` : 'Enregistré')}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}

          {!estDepart && (
          <Paper elevation={0} sx={{ ...CARTE, p: 2.5, mb: 2 }}>
            <TitrePanneau>Circuit</TitrePanneau>
            {accusable && (
              <Button fullWidth size="small" variant="contained" startIcon={<CheckIcon />}
                onClick={() => accuserImputation(accusable.id)}
                sx={{ mb: 1.5, backgroundColor: COLORS.green, fontWeight: 700, '&:hover': { backgroundColor: COLORS.greenDark } }}>
                Accuser réception ({accusable.direction_cible.sigle})
              </Button>
            )}
            {(courrier.imputations || []).length === 0 ? (
              <Typography sx={{ color: COLORS.muted, fontSize: '0.85rem' }}>Courrier pas encore imputé.</Typography>
            ) : (
              courrier.imputations.map((i) => <NoeudImputation key={i.id} imp={i} niveau={0} />)
            )}
          </Paper>
          )}

          <Paper elevation={0} sx={{ ...CARTE, p: 2.5 }}>
            <TitrePanneau>Chronologie</TitrePanneau>
            {courrier.evenements.map((e, i) => (
              <Box key={e.id} sx={{ display: 'flex', gap: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.4 }}>
                  <Box sx={{ width: 11, height: 11, borderRadius: '50%', background: TRICOLOR, flexShrink: 0 }} />
                  {i < courrier.evenements.length - 1 && <Box sx={{ flex: 1, width: 2, backgroundColor: COLORS.border, mt: 0.5 }} />}
                </Box>
                <Box sx={{ pb: 2 }}>
                  <Typography sx={{ fontWeight: 700, color: COLORS.ink, fontSize: '0.9rem' }}>{e.type_libelle}</Typography>
                  <Typography sx={{ color: COLORS.muted, fontSize: '0.78rem' }}>
                    {e.acteur.nom_complet} · {horodate(e.horodatage)}
                  </Typography>
                  {e.details && e.details.avant && (
                    <Typography sx={{ color: COLORS.muted, fontSize: '0.74rem', mt: 0.25 }}>
                      {Object.keys(e.details.avant).join(', ')} modifié(s)
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog décharge (départ) */}
      <Dialog open={dialogDecharge} onClose={() => setDialogDecharge(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.blue }}>Pointer la décharge</DialogTitle>
        <DialogContent dividers>
          {errDecharge && <Alert severity="error" sx={{ mb: 2 }}>{errDecharge}</Alert>}
          <TextField label="Date de la décharge" type="date" value={dechargeDate}
            onChange={(e) => setDechargeDate(e.target.value)} fullWidth required sx={{ mb: 2 }}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Commentaire (optionnel)" value={dechargeComm}
            onChange={(e) => setDechargeComm(e.target.value)} fullWidth multiline minRows={2}
            slotProps={{ htmlInput: { maxLength: 255 } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogDecharge(false)}>Annuler</Button>
          <Button variant="contained" onClick={pointerDecharge}
            sx={{ backgroundColor: COLORS.green, fontWeight: 700, '&:hover': { backgroundColor: COLORS.greenDark } }}>Valider</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog modification */}
      <Dialog open={ouvertModif} onClose={() => setOuvertModif(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.blue }}>Modifier le courrier</DialogTitle>
        <DialogContent dividers>
          {errModif && <Alert severity="error" sx={{ mb: 2 }}>{errModif}</Alert>}
          {form && (
            <Grid container spacing={2} sx={{ mt: 0 }}>
              <Grid size={12}>
                <TextField label="Objet" value={form.objet} fullWidth
                  onChange={(e) => setForm({ ...form, objet: e.target.value })} />
              </Grid>
              <Grid size={12}>
                <TextField label="Correspondant" select value={form.correspondant} fullWidth
                  onChange={(e) => setForm({ ...form, correspondant: e.target.value })}>
                  {correspondants.map((c) => <MenuItem key={c.id} value={c.id}>{c.nom}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Date du document" type="date" value={form.date_document} fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => setForm({ ...form, date_document: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField label="Date d'arrivée" type="date" value={form.date_arrivee} fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => setForm({ ...form, date_arrivee: e.target.value })} />
              </Grid>
              <Grid size={6}>
                <TextField label="Nb pièces" type="number" value={form.nombre_pieces} fullWidth
                  slotProps={{ htmlInput: { min: 1 } }}
                  onChange={(e) => setForm({ ...form, nombre_pieces: Math.max(1, Number(e.target.value) || 1) })} />
              </Grid>
              <Grid size={6}>
                <TextField label="Confidentialité" select value={form.confidentialite} fullWidth
                  onChange={(e) => setForm({ ...form, confidentialite: e.target.value })}>
                  <MenuItem value="ORDINAIRE">Ordinaire</MenuItem>
                  <MenuItem value="CONFIDENTIEL">Confidentiel</MenuItem>
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField label="Délai de réponse" type="date" value={form.delai_reponse} fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => setForm({ ...form, delai_reponse: e.target.value })} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOuvertModif(false)}>Annuler</Button>
          <Button variant="contained" onClick={enregistrerModif} disabled={enCours}
            sx={{ backgroundColor: COLORS.blue, fontWeight: 700, '&:hover': { backgroundColor: COLORS.blueHover } }}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </IntranetShell>
  );
}
