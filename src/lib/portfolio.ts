/**
 * Conteúdo do portfólio (página inicial pública), extraído do currículo.
 * Para atualizar textos, experiências ou contatos, edite só este arquivo.
 */

export interface Resultado {
  valor: string
  rotulo: string
}

export interface Experiencia {
  cargo: string
  empresa: string
  periodo: string
  local: string
  setor?: string
  atual?: boolean
  atividades: string[]
  resultados?: Resultado[]
  tecnologias: string[]
}

export interface Docencia {
  cargo: string
  instituicao: string
  periodo: string
  contexto: string
  atual?: boolean
  disciplinas?: string[]
  descricao?: string
}

export interface GrupoHabilidade {
  id: 'automacao' | 'apis' | 'cicd' | 'dados' | 'linguagens' | 'metodologias' | 'gestao' | 'ia'
  titulo: string
  descricao: string
  itens: string[]
}

export interface Projeto {
  id: string
  tipo: string
  titulo: string
  /** empresa ou contexto */
  origem?: string
  descricao: string
  resultados?: string[]
  tags: string[]
  /** título original (publicações em inglês) */
  idiomaOriginal?: 'en'
}

export interface Formacao {
  nivel: string
  curso: string
  /** linha de pesquisa */
  foco?: string
  instituicao: string
  periodo: string
  emAndamento?: boolean
}

export interface Publicacao {
  id: string
  area: string
  /** título original, em inglês */
  titulo: string
  descricao: string
  tags: string[]
}

export const PERFIL = {
  nome: 'Lucas Marques',
  cargo: 'Software QA Engineer',
  local: 'Teresina, PI',
  email: 'lucasm.desenvolvedor@gmail.com',
  telefone: '(86) 9 9956-0160',
  linkedin: 'https://www.linkedin.com/in/lucas-marques1204/',
  linkedinRotulo: 'lucas-marques1204',
  github: 'https://github.com/Lucasm12',
  githubRotulo: '@Lucasm12',
  instagram: 'https://www.instagram.com/llucas_marquess/',
  instagramRotulo: '@llucas_marquess',
  site: 'https://lucasmarques.dev.br',
  /** Frase de impacto do topo; o trecho em destaque aparece mais claro. */
  chamada: 'Engenharia de qualidade e automação de testes para',
  chamadaDestaque: 'sistemas críticos',
  resumoCurto:
    'Mais de 4 anos garantindo a qualidade de aplicações web, mobile e APIs nos setores de saúde e financeiro, com automação em Cypress integrada a pipelines de CI/CD. Professor universitário e doutorando em Ciência da Computação pela UFPI.',
}

/** Números do currículo (os aproximados mantêm o "~" do original). */
export const NUMEROS: { prefixo?: string; valor: number; sufixo?: string; rotulo: string }[] = [
  { valor: 4, sufixo: '+', rotulo: 'anos de experiência em QA nos setores de saúde e financeiro' },
  { prefixo: '~', valor: 60, sufixo: '%', rotulo: 'de aumento na cobertura de testes automatizados' },
  { prefixo: 'até ', valor: 40, sufixo: '%', rotulo: 'de redução no tempo de validação em CI/CD' },
  { prefixo: '~', valor: 35, sufixo: '%', rotulo: 'de redução nas falhas em produção' },
]

export const SOBRE = {
  paragrafos: [
    'Sou Engenheiro de QA com mais de 4 anos de experiência em testes manuais e automatizados de aplicações web, mobile e APIs, atuando em sistemas críticos dos setores de saúde e financeiro.',
    'Meu foco é automação com Cypress integrada a pipelines de CI/CD: ampliar a cobertura de testes, antecipar falhas e garantir entregas estáveis em produção. Também faço testes de API, validação de dados com SQL e BDD, sempre lado a lado com desenvolvedores e POs na definição dos critérios de qualidade.',
    'Sou mestre em Engenharia Elétrica (Deep Learning), doutorando em Ciência da Computação (Machine Learning) pela UFPI e professor universitário de Teste e Qualidade de Software, unindo prática de mercado e base acadêmica.',
    'Antes do QA, atuei de 2016 a 2021 com infraestrutura e suporte de TI: redes, servidores, backup e rotinas automatizadas em Oracle SQL.',
  ],
  caracteristicas: [
    {
      id: 'requisito',
      titulo: 'Qualidade desde o requisito',
      texto: 'Critérios de aceite e cenários BDD (Gherkin) definidos junto com POs e desenvolvedores.',
    },
    {
      id: 'pipeline',
      titulo: 'Automação no pipeline',
      texto: 'Testes E2E e de API rodando no CI/CD para encontrar a falha antes da produção.',
    },
    {
      id: 'criticos',
      titulo: 'Sistemas críticos',
      texto: 'Saúde e meios de pagamento: Pix, cartão, boleto, estornos e conciliação financeira.',
    },
    {
      id: 'academia',
      titulo: 'Ensino e pesquisa',
      texto: 'Professor de Teste e Qualidade de Software e pesquisador em Machine Learning e Visão Computacional.',
    },
  ],
} as const

export const EXPERIENCIAS_QA: Experiencia[] = [
  {
    cargo: 'Software Quality Assurance Engineer',
    empresa: 'Grupo Rede Mais',
    periodo: 'mai/2022 – atual',
    local: 'São Paulo, SP',
    setor: 'Saúde',
    atual: true,
    atividades: [
      'Criação e manutenção de testes automatizados com Cypress, ampliando a cobertura em ~60%.',
      'Monitoramento via Cypress Dashboard, reduzindo falhas críticas em produção em ~30%.',
      'Integração dos testes em pipelines CI/CD com CircleCI, reduzindo o tempo de validação em até 40% e aumentando a eficiência do time em ~25%.',
      'Testes de APIs REST e SOAP, validação de contratos e regras de negócio, e testes de integração entre serviços.',
      'Validação de dados com queries SQL em Oracle e atuação na sustentação de sistemas em produção.',
    ],
    resultados: [
      { valor: '~60%', rotulo: 'cobertura ampliada' },
      { valor: '~30%', rotulo: 'menos falhas críticas' },
      { valor: 'até 40%', rotulo: 'menos tempo de validação' },
      { valor: '~25%', rotulo: 'mais eficiência do time' },
    ],
    tecnologias: ['Cypress', 'Cypress Dashboard', 'CircleCI', 'REST', 'SOAP', 'Oracle SQL'],
  },
  {
    cargo: 'Analista de Testes / QA',
    empresa: 'PagPrime Bank',
    periodo: 'set/2026 – out/2026',
    local: 'Goiás',
    setor: 'Fintech de meios de pagamento',
    atividades: [
      'Testes funcionais, exploratórios e regressivos em fluxos críticos: cadastro, autenticação, Pix, cartão, boleto, estornos e conciliação financeira.',
      'Automação E2E e de API com Cypress, Selenium e Postman, integrada à pipeline de CI/CD.',
      'Escrita de cenários BDD (Gherkin) e definição de critérios de aceite com POs e desenvolvedores.',
    ],
    tecnologias: ['Cypress', 'Selenium', 'Postman', 'BDD (Gherkin)', 'CI/CD'],
  },
  {
    cargo: 'Software Quality Assurance Engineer',
    empresa: 'Rubcube',
    periodo: 'jul/2022 – jun/2024',
    local: 'Presidente Prudente, SP',
    setor: 'Fintech',
    atividades: [
      'Automação com Selenium, Cypress e Postman, aumentando a cobertura de testes em ~65%.',
      'Gestão de bugs que contribuiu para reduzir as falhas em produção em ~35%.',
      'Validação de APIs de pagamentos, crédito e serviços bancários, e testes de performance e carga.',
    ],
    resultados: [
      { valor: '~65%', rotulo: 'mais cobertura de testes' },
      { valor: '~35%', rotulo: 'menos falhas em produção' },
    ],
    tecnologias: ['Selenium', 'Cypress', 'Postman', 'Performance', 'Carga'],
  },
  {
    cargo: 'Software Quality Assurance Engineer',
    empresa: 'SmartLoad',
    periodo: 'jan/2022 – dez/2022',
    local: 'São Paulo, SP',
    atividades: [
      'Testes web e mobile automatizados com Cypress, Selenium, Appium e CodeceptJS.',
      'Testes de API com Postman e relatórios automatizados com Newman, em ambientes com Docker, Kubernetes e AWS.',
    ],
    tecnologias: ['Cypress', 'Selenium', 'Appium', 'CodeceptJS', 'Postman', 'Newman', 'Docker', 'Kubernetes', 'AWS'],
  },
]

export const DOCENCIA: Docencia[] = [
  {
    cargo: 'Professor Universitário',
    instituicao: 'Faculdade Maurício de Nassau',
    periodo: 'jan/2026 – atual',
    contexto: 'Teresina, PI',
    atual: true,
    disciplinas: [
      'Engenharia de Requisitos',
      'Teste e Qualidade de Software',
      'Machine Learning',
      'Programação para Dispositivos Móveis',
    ],
  },
  {
    cargo: 'Tutor EAD',
    instituicao: 'Universidade Estadual do Piauí (UESPI)',
    periodo: 'jul/2024 – atual',
    contexto: 'Tecnologia em Sistemas para Internet',
    atual: true,
    descricao: 'Apoio pedagógico, acompanhamento de alunos e elaboração de materiais e avaliações.',
  },
  {
    cargo: 'Professor Universitário',
    instituicao: 'Fatepi/Faespi',
    periodo: 'ago/2023 – dez/2025',
    contexto: 'Bacharelado em Sistemas de Informação',
    disciplinas: [
      'Desenvolvimento Web',
      'Inteligência Artificial',
      'Engenharia de Software',
      'Banco de Dados',
      'Desenvolvimento Mobile',
    ],
  },
  {
    cargo: 'Professor Substituto (EBTT)',
    instituicao: 'IFMA – Campus Imperatriz',
    periodo: 'abr/2021 – mar/2022',
    contexto: 'Técnico em Informática e Ciência da Computação',
    disciplinas: ['Estruturas de Dados', 'Padrões de Projeto', 'Banco de Dados', 'Requisitos de Software', 'Redes e Segurança'],
  },
]

export const EXPERIENCIA_ANTERIOR = {
  titulo: 'Infraestrutura e suporte de TI',
  periodo: '2016 – 2021',
  cargos: [
    'Analista de Sistemas na Serrana Distribuidora e na Premium Teresina',
    'Analista de Suporte Técnico na Nortelink Sistemas',
    'Passagens pelo Grupo JAP e pela UFPI',
  ],
  descricao:
    'Administração de redes e servidores, políticas de backup, automação de rotinas em Oracle SQL e suporte a ERP.',
  tecnologias: ['Active Directory', 'DNS', 'DHCP', 'VMware', 'pfSense', 'Oracle SQL', 'ERP'],
}

export const HABILIDADES: GrupoHabilidade[] = [
  {
    id: 'automacao',
    titulo: 'Automação',
    descricao: 'Testes E2E de aplicações web e mobile, do cenário à execução no pipeline.',
    itens: ['Cypress', 'Selenium', 'Appium', 'Robot Framework', 'CodeceptJS'],
  },
  {
    id: 'apis',
    titulo: 'APIs e performance',
    descricao: 'Contratos, regras de negócio, integração entre serviços, performance e carga.',
    itens: ['Postman', 'Newman', 'Insomnia', 'REST', 'SOAP', 'Testes de contrato', 'K6'],
  },
  {
    id: 'cicd',
    titulo: 'CI/CD e infraestrutura',
    descricao: 'Suítes integradas à entrega contínua, em ambientes conteinerizados e na nuvem.',
    itens: ['CircleCI', 'GitHub', 'Git', 'Docker', 'Kubernetes', 'AWS'],
  },
  {
    id: 'dados',
    titulo: 'Banco de dados',
    descricao: 'Validação de dados direto na fonte.',
    itens: ['SQL', 'Oracle', 'PostgreSQL'],
  },
  {
    id: 'linguagens',
    titulo: 'Linguagens',
    descricao: 'Para automatizar, pesquisar e ensinar.',
    itens: ['JavaScript', 'Python', 'Java'],
  },
  {
    id: 'metodologias',
    titulo: 'Metodologias',
    descricao: 'Times ágeis, critérios de aceite claros e testes guiados por risco.',
    itens: ['Scrum', 'Kanban', 'BDD (Gherkin)', 'TDD', 'Análise de risco'],
  },
  {
    id: 'gestao',
    titulo: 'Gestão',
    descricao: 'Bugs, backlog e evidências rastreáveis.',
    itens: ['Jira', 'Azure DevOps', 'Trello'],
  },
  {
    id: 'ia',
    titulo: 'Pesquisa e IA',
    descricao: 'Mestrado e doutorado na área.',
    itens: ['Machine Learning', 'Deep Learning', 'Visão Computacional'],
  },
]

export const PUBLICACOES: Publicacao[] = [
  {
    id: 'aedes',
    area: 'Visão computacional',
    titulo: 'Aedes Aegypti egg count in ovitrap straws based on Deep Learning',
    descricao: 'Contagem automatizada de ovos do Aedes aegypti em palhetas de ovitrampas com Deep Learning.',
    tags: ['Deep Learning', 'Visão Computacional'],
  },
  {
    id: 'inclusao',
    area: 'Extensão universitária',
    titulo: 'Digital Inclusion through Extensionist Actions in the Municipality of Picos-PI',
    descricao: 'Inclusão digital por meio de ações extensionistas no município de Picos (PI).',
    tags: ['Inclusão digital', 'Extensão universitária'],
  },
]

/** Seção "Projetos" (fora da página por enquanto; para voltar, inclua <Projetos /> em pages/Portfolio.tsx). */
export const PROJETOS: Projeto[] = [
  {
    id: 'plataforma',
    tipo: 'Projeto pessoal',
    titulo: 'Plataforma Lucas Marques Dev',
    descricao:
      'Aplicação web própria, organizada em módulos e protegida por login: controle financeiro do mês, treinos de triathlon (com importação de arquivos do relógio e exportação de treinos para o Garmin) e organização pessoal. Regras de acesso no banco (RLS) e testes automatizados de segurança.',
    tags: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Vitest', 'Vercel'],
  },
  {
    id: 'saude',
    tipo: 'Case · Saúde',
    titulo: 'Automação E2E em sistemas de saúde',
    origem: 'Grupo Rede Mais',
    descricao:
      'Suíte Cypress integrada ao CI/CD no CircleCI e monitorada pelo Cypress Dashboard, somada a testes de APIs REST e SOAP e à validação de dados em Oracle.',
    resultados: ['~60% de cobertura ampliada', '~30% menos falhas críticas', 'até 40% menos tempo de validação'],
    tags: ['Cypress', 'CircleCI', 'REST', 'SOAP', 'Oracle'],
  },
  {
    id: 'pagamentos',
    tipo: 'Case · Fintech',
    titulo: 'Qualidade em pagamentos digitais',
    origem: 'PagPrime Bank e Rubcube',
    descricao:
      'Testes funcionais, exploratórios, regressivos e automatizados em fluxos críticos (cadastro, autenticação, Pix, cartão, boleto, estornos e conciliação), além de APIs de pagamentos e crédito, performance e carga.',
    resultados: ['~65% mais cobertura', '~35% menos falhas em produção'],
    tags: ['Cypress', 'Selenium', 'Postman', 'BDD (Gherkin)'],
  },
  ...PUBLICACOES.map((p) => ({
    id: p.id,
    tipo: `Publicação · ${p.area}`,
    titulo: p.titulo,
    descricao: p.descricao,
    tags: p.tags,
    idiomaOriginal: 'en' as const,
  })),
]

const UFPI = 'Universidade Federal do Piauí (UFPI)'

export const FORMACAO: Formacao[] = [
  {
    nivel: 'Doutorado',
    curso: 'Ciência da Computação',
    foco: 'Machine Learning',
    instituicao: UFPI,
    periodo: '2024 – 2028',
    emAndamento: true,
  },
  { nivel: 'Mestrado', curso: 'Engenharia Elétrica', foco: 'Deep Learning', instituicao: UFPI, periodo: '2020 – 2022' },
  { nivel: 'Especialização', curso: 'Engenharia de Software', instituicao: 'Faculdade Unyleya', periodo: '2019 – 2020' },
  { nivel: 'Bacharelado', curso: 'Sistemas de Informação', instituicao: UFPI, periodo: '2013 – 2017' },
]

export const CERTIFICACOES = [
  { nome: 'Scrum Foundation Professional Certificate (SFPC)', detalhe: 'Fundamentos do Scrum e práticas ágeis' },
  { nome: 'Cisco CCNA Routing and Switching', detalhe: 'Conceitos Essenciais e Dimensionamento de Redes' },
]

export const IDIOMAS = [
  { idioma: 'Português', nivel: 'Nativo' },
  { idioma: 'Inglês', nivel: 'Proficiência profissional limitada' },
  { idioma: 'Espanhol', nivel: 'Proficiência profissional limitada' },
]

/** Todas as ferramentas, sem repetição (letreiro da seção de habilidades). */
export function todasAsFerramentas(grupos: GrupoHabilidade[] = HABILIDADES): string[] {
  return [...new Set(grupos.filter((g) => g.id !== 'ia').flatMap((g) => g.itens))]
}

const somenteDigitos = (texto: string) => texto.replace(/\D/g, '')

/** "(86) 9 9956-0160" → "tel:+5586999560160" */
export function linkTelefone(telefone: string): string {
  return `tel:+55${somenteDigitos(telefone)}`
}

/** "(86) 9 9956-0160" → "https://wa.me/5586999560160" */
export function linkWhatsApp(telefone: string): string {
  return `https://wa.me/55${somenteDigitos(telefone)}`
}

/** Dados estruturados (schema.org) para buscadores. */
export function dadosEstruturados() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: PERFIL.nome,
    jobTitle: PERFIL.cargo,
    description: PERFIL.resumoCurto,
    url: `${PERFIL.site}/`,
    email: `mailto:${PERFIL.email}`,
    address: { '@type': 'PostalAddress', addressLocality: 'Teresina', addressRegion: 'PI', addressCountry: 'BR' },
    sameAs: [PERFIL.linkedin, PERFIL.github, PERFIL.instagram],
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'Universidade Federal do Piauí (UFPI)' },
      { '@type': 'CollegeOrUniversity', name: 'Faculdade Unyleya' },
    ],
    knowsAbout: [
      'Garantia de qualidade de software',
      'Automação de testes',
      'Cypress',
      'Testes de API',
      'CI/CD',
      'BDD',
      'Machine Learning',
      'Visão Computacional',
    ],
    knowsLanguage: ['pt-BR', 'en', 'es'],
  }
}
