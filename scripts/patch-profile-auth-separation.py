#!/usr/bin/env python3
from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
if 'async function handleChangeProfilePassword() {' in s:
    print('Already patched')
    raise SystemExit(0)

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1: raise SystemExit(f'Anchor drift ({label}): {n}')
    s=s.replace(old,new,1)

once("if (birthInput) birthInput.value = u.birthDate || '1985-05-15';", "if (birthInput) birthInput.value = u.birthDate || '';",'birth date')
once("if (companyInput) companyInput.value = u.company || 'Planes ENG';", "if (companyInput) companyInput.value = u.company || '';",'company')
once("if (sectorInput) sectorInput.value = u.sector || (u.level === 'Admin' ? 'Diretoria Geral' : 'Geral');", "if (sectorInput) sectorInput.value = u.sector || '';",'sector')
once('id="edit-profile-newpass"\n                type="password"', 'id="edit-profile-newpass"\n                type="password"\n                autocomplete="new-password"','password autocomplete')
once('id="edit-profile-passconfirm"\n                type="password"', 'id="edit-profile-passconfirm"\n                type="password"\n                autocomplete="new-password"','confirm autocomplete')
once('Deixe em branco para manter a atual', 'Alteração de senha independente do perfil', 'password label')
once('        <!-- Seção de Passkeys / Biometria -->',
'''        <div class="flex flex-wrap items-center gap-3 px-1">
          <button type="button" onclick="handleChangeProfilePassword()"
            class="px-4 py-2.5 bg-slate-950 text-white font-extrabold text-xs rounded-[12px] hover:bg-slate-800">Atualizar senha</button>
          <span class="text-[11px] text-slate-500">Salvar perfil não altera sua senha. Autenticação recente pode ser exigida.</span>
        </div>

        <!-- Seção de Passkeys / Biometria -->''','password action UI')
once('''        <button
          type="button"
          onclick="handleSaveProfile()"''',
'''        <button type="button" onclick="handleChangeProfileEmail()"
          class="px-3 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-[12px]">
          Alterar e-mail
        </button>
        <button
          type="button"
          onclick="handleSaveProfile()"''','email action UI')
once('          ✓ Salvar Alterações\n        </button>\n      </div>\n    </div>\n  </div>\n\n  <script>',
'          ✓ Salvar perfil\n        </button>\n      </div>\n    </div>\n  </div>\n\n  <script>',
'save profile button title')

handlers=r"""    async function handleChangeProfilePassword() {
      const newPass=document.getElementById('edit-profile-newpass')?.value || '';
      const confirmation=document.getElementById('edit-profile-passconfirm')?.value || '';
      if (!currentUser || !supabaseClient || navigator.onLine===false) {
        showToast('Autenticação indisponível. Nenhuma senha foi alterada.');
        return;
      }
      if (newPass.length<8 || newPass.length>128) {
        showToast('A nova senha deve ter de 8 a 128 caracteres.');
        return;
      }
      if (newPass!==confirmation) {
        showToast('A confirmação da senha não corresponde.');
        return;
      }
      const {data:auth,error:identityError}=await supabaseClient.auth.getUser();
      if (identityError || !auth?.user?.id || auth.user.id!==currentUser.id) {
        showToast('Entre novamente para validar a sessão antes de alterar a senha.');
        return;
      }
      const {error}=await supabaseClient.auth.updateUser({password:newPass});
      if (error) {
        console.warn('Password update rejected:',error?.code||error?.status);
        showToast('Senha não alterada. O Supabase pode exigir um login recente. Entre novamente e tente de novo.');
        return;
      }
      const pass=document.getElementById('edit-profile-newpass');
      const conf=document.getElementById('edit-profile-passconfirm');
      if(pass)pass.value='';
      if(conf)conf.value='';
      showToast('Senha atualizada no Supabase Auth.');
    }

    async function handleChangeProfileEmail() {
      const email=String(document.getElementById('edit-profile-email')?.value||'').trim().toLowerCase();
      if(!validateEmail(email)) { showToast('Informe um e-mail válido.'); return; }
      if(email===String(currentUser?.email||'').toLowerCase()) {
        showToast('Este já é o e-mail cadastrado.');
        return;
      }
      if(!currentUser || !supabaseClient || navigator.onLine===false) {
        showToast('Autenticação indisponível. O e-mail não foi alterado.');
        return;
      }
      const {data:auth,error:identityError}=await supabaseClient.auth.getUser();
      if(identityError || !auth?.user?.id || auth.user.id!==currentUser.id) {
        showToast('Entre novamente para validar sua sessão antes de alterar o e-mail.');
        return;
      }
      const {error}=await supabaseClient.auth.updateUser({email});
      if(error) {
        console.warn('Email update rejected:',error?.code||error?.status);
        showToast('Não foi possível solicitar a alteração do e-mail. Entre novamente e tente de novo.');
        return;
      }
      // Never change local email/profile until Supabase Auth confirms the change.
      showToast('Solicitação enviada. Confirme o link de segurança antes de usar o novo e-mail.');
    }

"""
once('    async function handleSaveProfile() {',handlers+'    async function handleSaveProfile() {','separate auth handlers')
once("""      const newPass = (document.getElementById('edit-profile-newpass') ? document.getElementById('edit-profile-newpass').value : '').trim();
      const passConfirm = (document.getElementById('edit-profile-passconfirm') ? document.getElementById('edit-profile-passconfirm').value : '').trim();

""",'','remove password from profile')
scope=s.index('    async function handleSaveProfile() {')
start=s.index('      if (newPass) {',scope)
end=s.index('      const localDev = ',start)
if end-start>600:raise SystemExit('Password validation region changed')
s=s[:start]+s[end:]
scope=s.index('    async function handleSaveProfile() {')
start=s.index('        let authUser = null;',scope)
end=s.index('        const profilePayload = {',start)
if end-start>2300:raise SystemExit('Auth mutation region changed')
s=s[:start]+'        // Profile-only save; credential updates require explicit action.\n'+s[end:]
once('        if (authEmailConfirmed) profilePayload.email = email;\n','','no pending email')
once('        currentUser.email = profile.email || authUser?.email || oldEmail;', '        currentUser.email = profile.email || oldEmail;','email source')
old_start=s.index('        if (authChanges.email && !authEmailConfirmed) {',scope)
old_end=s.index('        return;',old_start)
if old_end-old_start>580:raise SystemExit('Unexpected profile feedback block')
s=s[:old_start]+"""        if (email!==oldEmail) {
          showToast('Perfil salvo. Para alterar o e-mail de acesso, use Alterar e-mail e confirme o link.');
        } else {
          showToast('Perfil atualizado. E-mail e senha não foram alterados.');
        }
"""+s[old_end:]
p.write_text(s,encoding='utf-8')
assert 'async function handleChangeProfilePassword() {' in s
assert 'await supabaseClient.auth.updateUser(authChanges)' not in s
print('PATCHED: profile save isolated; email/password require explicit authenticated actions')
