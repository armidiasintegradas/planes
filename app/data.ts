export type Activity = {
  id: string; area: string; location: string; discipline: string; name: string;
  start: string; end: string; progress: number; planned: number; status: 'Em dia' | 'Atenção' | 'Atrasada';
};

export const activities: Activity[] = [
  { id:'a1', area:'Arena', location:'Quadra coberta', discipline:'Estrutura', name:'Estrutura metálica da coberta', start:'18/05', end:'19/06', progress:75, planned:100, status:'Atenção' },
  { id:'a2', area:'Arena', location:'Apoio quadra', discipline:'Revestimento', name:'Revestimento cerâmico piso e parede (517 m²)', start:'13/07', end:'31/07', progress:35, planned:100, status:'Atrasada' },
  { id:'a3', area:'Arena', location:'Quadra tênis 1', discipline:'Pavimentação', name:'Resina e pintura da quadra', start:'27/07', end:'14/08', progress:100, planned:100, status:'Em dia' },
  { id:'a4', area:'Arena', location:'Área 1', discipline:'Drenagem', name:'Drenagem – tubulações profundas', start:'08/06', end:'19/06', progress:100, planned:100, status:'Em dia' },
  { id:'a5', area:'Bloco de apartamentos', location:'Torre 1 · P1', discipline:'Alvenaria', name:'Elevação de alvenaria Torre 1 P1', start:'27/07', end:'07/08', progress:100, planned:100, status:'Em dia' },
  { id:'a6', area:'Bloco de apartamentos', location:'Torre 1 · P2', discipline:'Alvenaria', name:'Elevação de alvenaria Torre 1 P2', start:'03/08', end:'14/08', progress:62, planned:100, status:'Atenção' },
  { id:'a7', area:'Bloco de apartamentos', location:'Torre 1 · P1', discipline:'Revestimento', name:'Reboco e contramarco Torre 1 P1', start:'10/08', end:'21/08', progress:48, planned:100, status:'Atrasada' },
  { id:'a8', area:'Bloco de apartamentos', location:'Torre 2 · Térreo', discipline:'Estrutura', name:'Cintas e pilares do térreo', start:'03/08', end:'28/08', progress:54, planned:70, status:'Atenção' },
  { id:'a9', area:'Bloco de apartamentos', location:'Torre 3 · Fundações', discipline:'Fundações', name:'Sapatas Torre 3', start:'13/07', end:'07/08', progress:100, planned:100, status:'Em dia' },
  { id:'a10', area:'Infraestrutura', location:'Área 1', discipline:'Elétrica', name:'Infra de alimentadores Área 1', start:'08/06', end:'26/06', progress:50, planned:100, status:'Atrasada' },
  { id:'a11', area:'Infraestrutura', location:'Área 1', discipline:'Hidrossanitária', name:'Infra de água Área 1', start:'22/06', end:'10/07', progress:75, planned:100, status:'Atenção' },
  { id:'a12', area:'Infraestrutura', location:'Área 1', discipline:'Esgoto', name:'Infra de esgoto Área 1', start:'29/06', end:'17/07', progress:50, planned:100, status:'Atrasada' },
  { id:'a13', area:'Recepção e restaurante', location:'Recepção', discipline:'Acabamentos', name:'Forro ripado', start:'17/08', end:'04/09', progress:30, planned:50, status:'Atenção' },
  { id:'a14', area:'Recepção e restaurante', location:'SPA e lojas', discipline:'Instalações', name:'Acabamentos elétricos e luminárias', start:'10/08', end:'28/08', progress:42, planned:60, status:'Atenção' },
  { id:'a15', area:'Área da piscina', location:'Piscina', discipline:'Estrutura', name:'Estrutura e impermeabilização da piscina', start:'01/06', end:'31/07', progress:88, planned:100, status:'Atrasada' },
  { id:'a16', area:'Área da piscina', location:'Deck seco', discipline:'Paisagismo', name:'Obras em madeira', start:'17/08', end:'18/09', progress:10, planned:20, status:'Em dia' }
];

export const constraints = [
  { id:'r1', type:'Projeto', title:'Refrigeração – provável alteração', owner:'Projetos', due:'18/08', area:'Arena', status:'Vencida' },
  { id:'r2', type:'Orçamento', title:'Estouro do orçamento – Apoio Quadra', owner:'Suprimentos', due:'21/08', area:'Arena', status:'Em tratamento' },
  { id:'r3', type:'Escopo', title:'Definição de escopo Arante', owner:'Engenharia', due:'24/08', area:'Recepção e restaurante', status:'Aberta' },
  { id:'r4', type:'Mão de obra', title:'Reforço da equipe de alvenaria Torre 1', owner:'Produção', due:'28/08', area:'Bloco de apartamentos', status:'Em tratamento' }
];

export const navItems = [
  ['dashboard','Painel Planes','◫'], ['estrutura','Estrutura da obra','⌘'], ['gantt','Cronograma mestre','▥'],
  ['balance','Linha de balanço','⌁'], ['lookahead','Lookahead','◷'], ['weekly','Plano semanal','✓'],
  ['field','Minha Obra','⌂'], ['validation','Validações','◉'], ['constraints','Restrições','△']
] as const;
