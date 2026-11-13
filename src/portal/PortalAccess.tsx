import {createContext, useContext, useEffect, useState} from 'react';
import type {FormEvent, ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import {LockKeyhole, LogOut, RefreshCw, ShieldCheck, CloudUpload, Download} from 'lucide-react';
import {archiveLegacy, collectLegacy, validateAccountBackup} from '../../shared/portal-documents';
import {canLeaveWorkspace, loadWorkspace, setEditorDirty, supabase, workspace} from './cloud';
import './portal-access.css';

type Account = {email: string; reload: () => void; logout: () => Promise<void>};
const AccountContext = createContext<Account | null>(null);
export function PortalAccess({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null), [checking, setChecking] = useState(true);
  const [owner, setOwner] = useState(''), [error, setError] = useState(''), [revision, setRevision] = useState(0), [recovering, setRecovering] = useState(false);
  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    let active = true, changed = false;
    const {data: {subscription}} = supabase.auth.onAuthStateChange((event, session) => {
      changed = true;
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (!session) { workspace.clear(); setOwner(''); setRecovering(false); }
      setUser(session?.user || null); setChecking(false);
    });
    void supabase.auth.getUser().then(({data}) => { if (active && !changed) { setUser(data.user); setChecking(false); } });
    return () => { active = false; subscription.unsubscribe(); workspace.clear(); };
  }, []);
  useEffect(() => {
    workspace.clear(); setOwner(''); setError('');
    if (!user) return;
    let active = true;
    void loadWorkspace(user.id).then(rows => { if (active) { workspace.attach(user.id, rows); setOwner(user.id); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; workspace.clear(); };
  }, [user?.id, revision]);
  async function logout() {
    if (!canLeaveWorkspace()) return;
    const {error: failure} = await supabase!.auth.signOut({scope: 'local'});
    if (failure) { setError('Não foi possível encerrar a sessão. Tente novamente.'); return; }
    workspace.clear(); setUser(null); setOwner('');
  }
  const reload = () => { if (canLeaveWorkspace()) setRevision(r => r + 1); };
  if (!supabase) return <AccessShell><h1>Acesso privado em preparação</h1><p>A conexão com o banco ainda não foi configurada. Os documentos do portal permanecem indisponíveis até a conclusão.</p><a href="/">Voltar ao site</a></AccessShell>;
  if (checking) return <AccessShell><h1>Verificando seu acesso…</h1><p role="status">Aguarde a confirmação da sessão.</p></AccessShell>;
  if (!user) return <SignIn/>;
  if (recovering) return <PasswordUpdate onDone={() => setRecovering(false)}/>;
  if (owner !== user.id || error) return <AccessShell><h1>{error ? 'Não foi possível abrir o portal' : 'Abrindo seu workspace…'}</h1><p role={error ? 'alert' : 'status'}>{error || 'Carregando seus documentos da conta.'}</p>{error && <button onClick={reload}>Tentar novamente</button>}<button className="pa-secondary" onClick={() => void logout()}>Sair da conta</button></AccessShell>;
  return <AccountContext.Provider value={{email: user.email || '', reload, logout}}><div key={user.id + ':' + revision}>{children}</div></AccountContext.Provider>;
}
function AccessShell({children}: {children: ReactNode}) {
  return <main className="portal-access"><div className="pa-brand"><a href="/"><img src="/assets/eme-spatial-logo.png" alt="EME Spatial"/></a><span>SEU ESTÚDIO, EM QUALQUER LUGAR</span><h2>O próximo projeto<br/>começa com você.</h2><p>Projetos, orçamentos e contratos reunidos em um workspace privado.</p><div><ShieldCheck size={19}/> Acesso individual e documentos protegidos</div></div><section className="pa-card"><LockKeyhole size={25}/>{children}</section></main>;
}
function SignIn() {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login'), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const form = new FormData(e.currentTarget), email = String(form.get('email')).trim(), password = String(form.get('password') || '');
    setBusy(true); setMessage('');
    try {
      const redirectTo = new URL('/portal', location.origin).href;
      if (mode === 'login') {
        const {error} = await supabase!.auth.signInWithPassword({email, password});
        if (error) throw Error('Não foi possível entrar. Confira e-mail, senha e confirmação do e-mail.');
      } else if (mode === 'signup') {
        const {error} = await supabase!.auth.signUp({email, password, options: {emailRedirectTo: redirectTo}});
        if (error) throw Error('Não foi possível solicitar o acesso. Confira os dados e tente novamente mais tarde.');
        setMessage('Confira seu e-mail e abra o link neste mesmo navegador para confirmar o cadastro. O acesso aos documentos depende da liberação desta conta.');
      } else {
        const {error} = await supabase!.auth.resetPasswordForEmail(email, {redirectTo});
        if (error) throw Error('Não foi possível enviar a recuperação agora. Tente novamente mais tarde.');
        setMessage('Se houver uma conta para este e-mail, você receberá as instruções para recuperar o acesso. Abra o link neste mesmo navegador.');
      }
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  return <AccessShell><span className="pa-eyebrow">EME SPATIAL / PORTAL</span><h1>{mode === 'login' ? 'Entre no seu workspace.' : mode === 'signup' ? 'Prepare seu primeiro acesso.' : 'Recupere seu acesso.'}</h1><p>{mode === 'login' ? 'Use sua conta autorizada para continuar de onde parou.' : mode === 'signup' ? 'Cadastre o e-mail autorizado e confirme a mensagem recebida.' : 'Enviaremos as instruções para o e-mail da conta.'}</p><form onSubmit={submit}><label>E-mail<input name="email" type="email" autoComplete="username" required maxLength={254} placeholder="voce@empresa.com.br" disabled={busy}/></label>{mode !== 'reset' && <label>Senha<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 12 : undefined} maxLength={128} required disabled={busy}/></label>}{mode === 'signup' && <small>Use pelo menos 12 caracteres e uma senha exclusiva.</small>}<button type="submit" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Solicitar primeiro acesso' : 'Enviar recuperação'}</button></form>{message && <p role="status" className="pa-message">{message}</p>}<div className="pa-links">{mode !== 'login' && <button onClick={() => { setMode('login'); setMessage(''); }}>Voltar para entrar</button>}{mode === 'login' && <><button onClick={() => { setMode('reset'); setMessage(''); }}>Esqueci minha senha</button><button onClick={() => { setMode('signup'); setMessage(''); }}>Primeiro acesso</button></>}</div><small>Arquivos antigos deste navegador poderão ser importados depois do login.</small></AccessShell>;
}
function PasswordUpdate({onDone}: {onDone: () => void}) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget), password = String(form.get('password'));
    if (password !== String(form.get('confirmation'))) { setMessage('As senhas precisam ser iguais.'); return; }
    if (busy) return;
    setBusy(true);
    try { const {error} = await supabase!.auth.updateUser({password}); if (error) throw error; onDone(); }
    catch { setMessage('Não foi possível alterar a senha. Solicite um novo link de recuperação.'); }
    finally { setBusy(false); }
  }
  return <AccessShell><h1>Defina sua nova senha.</h1><form onSubmit={e => void submit(e)}><label>Nova senha<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><label>Confirme a nova senha<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/></label><button disabled={busy}>Salvar nova senha</button></form>{message && <p role="alert">{message}</p>}</AccessShell>;
}
export function AccountMenu() {
  const account = useContext(AccountContext);
  return account && <div className="pa-account"><span title={account.email}><ShieldCheck size={14}/>{account.email}</span><button onClick={() => void account.logout()}><LogOut size={15}/>Sair</button></div>;
}
export function AccountSettings() {
  const account = useContext(AccountContext)!;
  const [accountOwner] = useState(workspace.userId);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [legacy] = useState(() => collectLegacy(localStorage));
  useEffect(() => { setEditorDirty('migration', busy); return () => setEditorDirty('migration', false); }, [busy]);
  async function restore(file?: File) {
    if (!file || busy) return;
    setBusy(true); let copied = 0, skipped = 0;
    try {
      if (file.size > 20 * 1024 * 1024) throw Error('O backup deve ter até 20 MB.');
      const rows = validateAccountBackup(JSON.parse(await file.text()));
      if (!confirm('Restaurar os documentos ausentes deste backup na conta ' + account.email + '? Documentos existentes serão preservados. Para restaurar imagens e vídeos, importe o pacote pela Produção visual.')) return;
      for (const row of rows) {
        if (row.kind === 'media' || workspace.get(row.kind, row.document_id)) { skipped++; continue; }
        await workspace.save(row.kind, row.document_id, row.payload, 0, accountOwner); copied++;
      }
      setMessage(copied + ' documentos restaurados. ' + skipped + ' existentes ou referências de mídia ignorados. Use Atualizar dados para recarregar as telas.');
    } catch (e) { setMessage(copied + ' documentos restaurados antes da interrupção. ' + (e as Error).message); }
    finally { setBusy(false); }
  }
  async function migrateMedia() {
    setBusy(true);
    try {
      const {listLocal74, save74} = await import('./production74');
      const rows = await listLocal74();
      if (!rows.length) { setMessage('Nenhuma imagem ou vídeo antigo encontrado neste navegador.'); return; }
      if (!confirm('Copiar ' + rows.length + ' imagens e vídeos locais para ' + account.email + '? Arquivos já existentes serão preservados. Os originais locais não serão apagados.')) return;
      let copied = 0;
      for (const row of rows) {
        if (workspace.get('media', row.id)) continue;
        await save74([row], accountOwner); copied++;
      }
      setMessage(copied + ' arquivos copiados para a biblioteca privada. Os originais locais foram preservados.');
    } catch (e) { setMessage((e as Error).message + ' A cópia pode ser retomada; arquivos já enviados não serão duplicados.'); }
    finally { setBusy(false); }
  }
  async function migrate() {
    if (!canLeaveWorkspace()) return;
    if (!confirm('Copiar ' + legacy.documents.length + ' documentos deste navegador para ' + account.email + '? Os dados locais serão preservados e documentos já existentes na conta não serão substituídos.')) return;
    setBusy(true); let copied = 0, skipped = 0;
    try {
      for (const row of legacy.documents) {
        if (workspace.get(row.kind, row.id)) { skipped++; continue; }
        await workspace.save(row.kind, row.id, row.payload, 0, accountOwner); copied++;
      }
      setMessage(copied + ' documentos copiados. ' + skipped + ' já existiam e foram preservados. Use Atualizar dados para recarregar as telas.');
    } catch (e) { setMessage(copied + ' documentos copiados antes da interrupção. ' + (e as Error).message + ' Nenhum arquivo local foi apagado.'); }
    finally { setBusy(false); }
  }
  function backup(local = false) {
    const kinds = ['studio', 'budget', 'operation', 'management', 'briefs', 'production-queue', 'media'] as const;
    try {
      const payload = local ? archiveLegacy(localStorage) : {schema: 'eme-spatial-cloud-backup/1', exportedAt: new Date().toISOString(), documents: kinds.flatMap(k => workspace.list(k))};
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = local ? 'eme-spatial-rascunhos-originais.json' : 'eme-spatial-conta-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setMessage('Não foi possível exportar a cópia. Preserve o armazenamento deste navegador.'); }
  }
  return <section className="panel brief-form"><span className="eyebrow">CONTA E DOCUMENTOS</span><h2>Seu workspace na nuvem.</h2><p>Conta: <b>{account.email}</b>. Projetos, orçamentos, contratos, briefings e registros financeiros são vinculados a esta conta.</p><div className="cb-actions"><button className="secondary" disabled={busy} onClick={account.reload}><RefreshCw size={16}/>Atualizar dados</button><button className="secondary" disabled={busy} onClick={()=>backup()}><Download size={16}/>Exportar documentos da conta</button></div><label>Restaurar documentos de um backup<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void restore(file);}}/></label><h3>Trazer rascunhos deste computador</h3><button className="secondary" disabled={busy} onClick={()=>backup(true)}>Baixar cópia dos rascunhos locais</button><p>Encontrados {legacy.documents.length} documentos locais. A cópia é feita para a conta acima. Documentos que já estão na nuvem serão preservados.</p>{legacy.errors.length > 0 && <p role="alert">{legacy.errors.length} arquivos locais não puderam ser validados. Use Baixar cópia dos rascunhos locais para preservar os originais antes de qualquer limpeza.</p>}<button className="primary" disabled={busy || !legacy.documents.length} onClick={() => void migrate()}><CloudUpload size={17}/>{busy ? 'Copiando…' : 'Copiar rascunhos para minha conta'}</button><button className="secondary" disabled={busy} onClick={()=>void migrateMedia()}>Copiar imagens e vídeos antigos</button>{message && <p role="status">{message}</p>}<p className="fine">O backup JSON contém os documentos e referências dos arquivos. Não inclui os vídeos e imagens binários. Os originais locais não são apagados pela migração.</p></section>;
}
