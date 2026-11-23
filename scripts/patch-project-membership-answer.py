#!/usr/bin/env python3
"""Patch actual inline Copiloto with authorized project membership count.
No schema changes, no service role, no storage of personal data.
"""
from pathlib import Path
path=Path("index.html")
src=path.read_text(encoding="utf-8")
marker="    async function answerPlanesProjectMembershipQuestion(rawQuestion) {"
anchor="    async function askPlanesIntelligence(predefinedPrompt) {"
flow="      const intelligenceTopic = inferIntelligenceTopic(promptText);"
if marker in src:
    print("Project membership answer already installed")
    raise SystemExit(0)
if src.count(anchor)!=1 or src.count(flow)!=1:
    raise SystemExit("Unexpected legacy handler; refuse patch")
if "answerLegacyChatSpecificQuestion(rawPromptText)" not in src:
    raise SystemExit("Previous inline guard absent; refuse patch")

helper=r"""    // User-selected project access count under the CURRENT Supabase JWT and RLS.
    // Only admins see the full count: ordinary users may only see themselves.
    async function answerPlanesProjectMembershipQuestion(rawQuestion) {
      const q = String(rawQuestion || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[!?.,]/g, ' ').replace(/\s+/g, ' ').trim();
      const countIntent = /(?:quantas?|numero|total|lista|listar|mostrar|mostre)/.test(q)
        && /(?:pessoas?|usuarios?|membros?|participantes?)/.test(q)
        && /(?:cadastrad\w*|vinculad\w*|associad\w*|acesso|nessa obra|nesta obra|na obra|do projeto|nesse projeto)/.test(q);
      if (!countIntent) return null;
      const client=window.__PLANES_SUPABASE_CLIENT__;
      if (!client || !client.auth || typeof client.auth.getUser !== 'function') {
        return 'Não consigo consultar os usuários cadastrados nesta obra: a conexão autenticada está indisponível.';
      }
      const project=selectedProject || (Array.isArray(projectsList) && projectsList.length===1 ? projectsList[0] : null);
      const projectId=String(project?.id || '');
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuid.test(projectId)) {
        return 'Selecione uma obra com cadastro sincronizado para eu contar os usuários vinculados a ela.';
      }
      try {
        const {data:auth,error:authError}=await client.auth.getUser();
        if (authError || !auth?.user?.id) {
          return 'Sua sessão expirou. Entre novamente para consultar os usuários desta obra.';
        }
        const {data:profile,error:profileError}=await client.from('profiles')
          .select('role,status').eq('id',auth.user.id).single();
        if (profileError || !profile || profile.status!=='approved') {
          return 'Seu perfil não está autorizado a consultar os participantes desta obra.';
        }
        if (!['admin','super_admin'].includes(profile.role)) {
          return 'A contagem completa dos usuários vinculados à obra é restrita a administradores. Não vou apresentar uma contagem parcial como se fosse o total.';
        }
        const {data:visibleProject,error:projectError}=await client.from('projects')
          .select('id,name').eq('id',projectId).single();
        if (projectError || !visibleProject) {
          return 'Não foi possível verificar o acesso à obra selecionada.';
        }
        const {count,error}=await client.from('user_project_access')
          .select('user_id',{count:'exact',head:true}).eq('project_id',projectId);
        if (error || !Number.isInteger(count)) {
          return 'Não consegui obter a contagem dos usuários vinculados a esta obra. Nenhum número foi estimado.';
        }
        const name=String(visibleProject.name||'obra selecionada').slice(0,140);
        return 'A obra '+name+' possui '+count+' usuário'+(count===1?'':'s')+
          ' vinculado'+(count===1?'':'s')+' no cadastro de acesso do Planes OS. '+
          'Este é o número de contas vinculadas à obra, não a quantidade de trabalhadores presentes no canteiro.';
      } catch (error) {
        console.warn('Planes Intelligence project membership unavailable');
        return 'A consulta de usuários da obra está temporariamente indisponível. Nenhum número foi inventado.';
      }
    }

"""
insertion="""      const membershipAnswer = await answerPlanesProjectMembershipQuestion(rawPromptText);
      if (membershipAnswer !== null) {
        intelligenceChatHistory.push({
          sender: 'ai',
          text: membershipAnswer,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
        render();
        return;
      }

"""
src=src.replace(anchor,helper+anchor,1)
src=src.replace(flow,insertion+flow,1)
path.write_text(src,encoding="utf-8")
print("PATCHED: project membership intent now queries exact admin-authorized RLS count")
