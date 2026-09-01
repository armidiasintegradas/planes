export const project = {
  id: 'japaratinga-exp3',
  name: 'Japaratinga Resort — Expansão 3',
  company: 'Planes Engenharia',
  location: 'Japaratinga, AL',
  baseline: 'Planejamento 16.03.2026',
  sources: ['Linha de Balanço', 'Médio Prazo R4'],
  lastUpdate: '01/09/2026 06:00'
};

export const activities = [
  {id:'arena-01',source:'Linha de Balanço',front:'ARENA',location:'Quadra Coberta',discipline:'Fundações',name:'Estacas de fundação — 212 un',plannedStart:'2026-03-02',plannedEnd:'2026-03-13',status:'Concluída',progress:100,owner:'Produção',priority:'Alta'},
  {id:'arena-02',source:'Linha de Balanço',front:'ARENA',location:'Quadra Coberta',discipline:'Fundações',name:'Sapatas — 34 un / 10 sapatas por semana',plannedStart:'2026-03-16',plannedEnd:'2026-03-27',status:'Concluída',progress:100,owner:'Produção',priority:'Alta'},
  {id:'arena-03',source:'Linha de Balanço',front:'ARENA',location:'Quadra Coberta',discipline:'Terraplenagem',name:'Aterro para cota de subleito',plannedStart:'2026-03-30',plannedEnd:'2026-04-10',status:'Concluída',progress:100,owner:'Produção',priority:'Alta'},
  {id:'arena-04',source:'Linha de Balanço',front:'ARENA',location:'Quadra Coberta',discipline:'Pisos',name:'Piso da quadra e instalações em piso',plannedStart:'2026-04-13',plannedEnd:'2026-04-24',status:'Concluída',progress:100,owner:'Produção',priority:'Média'},
  {id:'arena-05',source:'Linha de Balanço',front:'ARENA',location:'Quadras Tênis / BT',discipline:'Terraplenagem',name:'Terraplanagem das quadras',plannedStart:'2026-03-02',plannedEnd:'2026-03-20',status:'Concluída',progress:100,owner:'Produção',priority:'Alta'},
  {id:'arena-06',source:'Linha de Balanço',front:'ARENA',location:'Quadras Tênis / BT',discipline:'Preparação',name:'Preparação para quadra — alvenaria, reboco, instalações e compactação',plannedStart:'2026-03-23',plannedEnd:'2026-04-03',status:'Concluída',progress:100,owner:'Produção',priority:'Alta'},
  {id:'infra-01',source:'Linha de Balanço',front:'INFRA',location:'Geral',discipline:'Hidrossanitário',name:'Infra de água',plannedStart:'2026-08-03',plannedEnd:'2026-09-11',status:'Em andamento',progress:74,owner:'Instalações',priority:'Alta'},
  {id:'infra-02',source:'Linha de Balanço',front:'INFRA',location:'Geral',discipline:'Drenagem',name:'Drenagem',plannedStart:'2026-08-10',plannedEnd:'2026-09-18',status:'Em andamento',progress:61,owner:'Instalações',priority:'Alta'},
  {id:'infra-03',source:'Linha de Balanço',front:'INFRA',location:'Geral',discipline:'Elétrica',name:'Infra elétrica',plannedStart:'2026-08-17',plannedEnd:'2026-09-25',status:'Em atraso',progress:43,owner:'Elétrica',priority:'Crítica'},
  {id:'infra-04',source:'Linha de Balanço',front:'INFRA',location:'Geral',discipline:'Incêndio',name:'Infra de incêndio',plannedStart:'2026-08-24',plannedEnd:'2026-10-02',status:'Em andamento',progress:35,owner:'Instalações',priority:'Alta'},
  {id:'infra-05',source:'Linha de Balanço',front:'INFRA',location:'Geral',discipline:'CFTV',name:'Infra CFTV',plannedStart:'2026-08-31',plannedEnd:'2026-10-09',status:'Planejada',progress:0,owner:'Elétrica',priority:'Média'},
  {id:'infra-06',source:'Linha de Balanço',front:'INFRA',location:'Geral',discipline:'Esgoto',name:'Infra de esgoto',plannedStart:'2026-08-10',plannedEnd:'2026-09-25',status:'Em andamento',progress:52,owner:'Instalações',priority:'Alta'},
  {id:'apt-01',source:'Linha de Balanço',front:'BLOCO APTOS',location:'Torre 3 — Rooftop',discipline:'Acabamento',name:'Rooftop externo',plannedStart:'2026-08-17',plannedEnd:'2026-09-11',status:'Em andamento',progress:68,owner:'Torre 3',priority:'Média'},
  {id:'apt-02',source:'Linha de Balanço',front:'BLOCO APTOS',location:'Torre 2 — P1',discipline:'Elétrica',name:'Infraestrutura elétrica do P1',plannedStart:'2026-08-24',plannedEnd:'2026-09-04',status:'Em atraso',progress:55,owner:'Torre 2',priority:'Crítica'},
  {id:'apt-03',source:'Linha de Balanço',front:'BLOCO APTOS',location:'Torre 1 — Térreo Int.',discipline:'Acabamento',name:'Acabamentos internos',plannedStart:'2026-08-31',plannedEnd:'2026-09-18',status:'Em andamento',progress:18,owner:'Torre 1',priority:'Alta'},
  {id:'pred-01',source:'Linha de Balanço',front:'PRÉDIOS',location:'Recepção',discipline:'Acabamento',name:'Recepção',plannedStart:'2026-08-24',plannedEnd:'2026-09-25',status:'Em andamento',progress:39,owner:'Edificações',priority:'Alta'},
  {id:'pred-02',source:'Linha de Balanço',front:'PRÉDIOS',location:'Restaurante Trama',discipline:'Acabamento',name:'Restaurante Trama',plannedStart:'2026-08-17',plannedEnd:'2026-09-18',status:'Em andamento',progress:47,owner:'Edificações',priority:'Alta'},
  {id:'pool-01',source:'Linha de Balanço',front:'ÁREA DA PISCINA',location:'Piscina',discipline:'Impermeabilização',name:'Impermeabilização da piscina',plannedStart:'2026-08-24',plannedEnd:'2026-09-11',status:'Em atraso',progress:32,owner:'Piscina',priority:'Crítica'},
  {id:'pool-02',source:'Linha de Balanço',front:'ÁREA DA PISCINA',location:'Deck seco',discipline:'Acabamento',name:'Deck seco interno e externo',plannedStart:'2026-09-07',plannedEnd:'2026-10-02',status:'Planejada',progress:0,owner:'Piscina',priority:'Média'},
  {id:'pool-03',source:'Linha de Balanço',front:'ÁREA DA PISCINA',location:'Bares / Palco',discipline:'Edificações',name:'Bares da piscina e palco',plannedStart:'2026-08-31',plannedEnd:'2026-09-25',status:'Em andamento',progress:14,owner:'Piscina',priority:'Alta'}
];

export const weeklyPlan = [
  {activityId:'infra-01',week:'31/08–06/09',commitment:'Concluir trecho principal de água'},
  {activityId:'infra-03',week:'31/08–06/09',commitment:'Liberar infraestrutura elétrica crítica'},
  {activityId:'apt-02',week:'31/08–06/09',commitment:'Concluir infraestrutura elétrica do P1'},
  {activityId:'apt-03',week:'31/08–06/09',commitment:'Avançar acabamentos internos'},
  {activityId:'pool-01',week:'31/08–06/09',commitment:'Eliminar pendências de impermeabilização'},
  {activityId:'pool-03',week:'31/08–06/09',commitment:'Avançar bares e palco'}
];

export const restrictions = [
  {id:'r-1',title:'Aguardando eletroduto 32 mm',activityId:'apt-02',severity:'Alta',owner:'Suprimentos',dueDate:'2026-09-04',status:'Aberta'},
  {id:'r-2',title:'Impermeabilização pendente de liberação',activityId:'pool-01',severity:'Alta',owner:'Engenharia',dueDate:'2026-09-03',status:'Aberta'},
  {id:'r-3',title:'Interferência de projeto na infraestrutura elétrica',activityId:'infra-03',severity:'Média',owner:'Projetos',dueDate:'2026-09-05',status:'Aberta'}
];

export const initialState = { activities, weeklyPlan, restrictions, history: [] };
