/**
 * Conteúdo do portfólio (página inicial pública), extraído do currículo e do repositório.
 * Para atualizar textos, experiências, casos ou contatos, edite só este arquivo.
 *
 * Regra de conteúdo: nada aqui pode ser inventado. Números mantêm o "~" do original e aparecem
 * dentro da frase de origem (com o contexto de contribuição), nunca soltos como destaque.
 */

export interface Experiencia {
  cargo: string
  empresa: string
  periodo: string
  local: string
  setor?: string
  atual?: boolean
  atividades: string[]
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
  /** preencher só com dados verificáveis */
  ano?: string
  veiculo?: string
  link?: string
}

export interface LinkEvidencia {
  rotulo: string
  href: string
}

/** Caso prático de QA. Só é publicado quando todos os campos obrigatórios estão preenchidos (veja casoPublicavel). */
export interface Caso {
  id: string
  titulo: string
  /** ex.: "Projeto próprio · Segurança e testes" */
  tipo: string
  periodo: string
  contexto: string
  problema: string
  riscos: string[]
  participacao: string
  abordagem: string[]
  ferramentas: string[]
  resultados: string[]
  /** o que ficou fora do escopo; opcional, mas recomendado */
  limites?: string[]
  /** links públicos para conferir (repositório, relatório, demonstração) */
  evidencias: LinkEvidencia[]
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
  site: 'https://www.lucasmarquesdev.com.br',
  /** Especialidade, em destaque no topo; o trecho final aparece em verde. */
  chamada: 'Engenharia de qualidade e automação de testes para',
  chamadaDestaque: 'sistemas críticos',
  resumoCurto:
    'Mais de 4 anos em QA de aplicações web, mobile e APIs nos setores de saúde e financeiro, com foco em automação de testes integrada ao CI/CD.',
  /** Diferenciais complementares, abaixo do resumo. */
  diferenciais: ['Professor de Teste e Qualidade de Software', 'Doutorando em Ciência da Computação (UFPI)'],
  /**
   * Caminho do currículo em PDF dentro de public/ (ex.: '/curriculo-lucas-marques.pdf').
   * Fica null até existir um arquivo atualizado: sem arquivo, o botão "Baixar currículo" não aparece.
   */
  curriculo: null as string | null,
}

/** "Sobre": a abordagem de trabalho (o posicionamento fica na abertura; as contribuições, nas experiências). */
export const SOBRE = {
  introducao:
    'Trabalho lado a lado com desenvolvedores e POs na definição dos critérios de qualidade, uso análise de risco para priorizar os fluxos críticos e automatizo testes para antecipar falhas e manter as entregas estáveis em produção.',
  pilares: [
    {
      id: 'requisito',
      titulo: 'Qualidade desde o requisito',
      texto: 'Critérios de aceite e cenários BDD (Gherkin) escritos junto com POs e desenvolvedores.',
    },
    {
      id: 'risco',
      titulo: 'Foco nos fluxos críticos',
      texto: 'Testes funcionais, exploratórios e regressivos em autenticação, pagamentos, estornos e conciliação.',
    },
    {
      id: 'pipeline',
      titulo: 'Automação no pipeline',
      texto: 'Testes E2E e de API integrados aos pipelines de CI/CD para antecipar falhas.',
    },
    {
      id: 'dados',
      titulo: 'APIs, contratos e dados',
      texto: 'Contratos e regras de negócio em APIs REST e SOAP, integração entre serviços e dados conferidos com SQL.',
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
      'Criação e manutenção de testes automatizados com Cypress, contribuindo para ampliar a cobertura de testes em ~60%.',
      'Monitoramento da suíte no Cypress Dashboard, contribuindo para reduzir as falhas críticas em produção em ~30%.',
      'Integração dos testes aos pipelines de CI/CD com CircleCI, contribuindo para reduzir o tempo de validação em até 40% e aumentar a eficiência do time em ~25%.',
      'Testes de APIs REST e SOAP, validação de contratos e regras de negócio, e testes de integração entre serviços.',
      'Validação de dados com queries SQL em Oracle e atuação na sustentação de sistemas em produção.',
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
      'Automação de testes com Selenium, Cypress e Postman, contribuindo para aumentar a cobertura de testes em ~65%.',
      'Gestão de bugs que contribuiu para reduzir as falhas em produção em ~35%.',
      'Validação de APIs de pagamentos, crédito e serviços bancários, e testes de performance e carga.',
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
    descricao: 'Testes E2E de aplicações web e mobile.',
    itens: ['Cypress', 'Selenium', 'Appium', 'Robot Framework', 'CodeceptJS'],
  },
  {
    id: 'apis',
    titulo: 'APIs e performance',
    descricao: 'Contratos, regras de negócio, performance e carga.',
    itens: ['Postman', 'Newman', 'Insomnia', 'REST', 'SOAP', 'Testes de contrato', 'K6'],
  },
  {
    id: 'cicd',
    titulo: 'CI/CD e infraestrutura',
    descricao: 'Testes na entrega contínua, em contêineres e na nuvem.',
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
    descricao: 'Automação, pesquisa e ensino.',
    itens: ['JavaScript', 'Python', 'Java'],
  },
  {
    id: 'metodologias',
    titulo: 'Metodologias',
    descricao: 'Times ágeis, critérios de aceite e testes guiados por risco.',
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
    descricao: 'Linha de pesquisa do mestrado e do doutorado.',
    itens: ['Machine Learning', 'Deep Learning', 'Visão Computacional'],
  },
]

const REPOSITORIO = 'https://github.com/Lucasm12/Finance_Personal'

/**
 * Casos práticos de QA. Fonte do primeiro: SEGURANCA.md e tests/ deste mesmo repositório (público).
 * Para incluir um caso de empresa, ele precisa de contexto, riscos, abordagem, resultados e evidência pública.
 */
export const CASOS: Caso[] = [
  {
    id: 'seguranca-plataforma',
    titulo: 'Auditoria de segurança e suíte de testes de uma aplicação com dados pessoais',
    tipo: 'Projeto próprio · Segurança e testes',
    periodo: 'nov/2026',
    contexto:
      'Aplicação web (React, Supabase e Vercel) com módulos de finanças, treinos e organização pessoal. Todo o controle de acesso fica no banco, com Row Level Security, e o código é aberto no GitHub.',
    problema:
      'Verificar se a aplicação protegia de fato os dados de cada usuário: acesso entre contas, cadastro, recursos que podiam ser abusados e segredos no código publicado.',
    riscos: [
      'Cadastro público aberto pela API, mesmo sem tela de cadastro (risco alto)',
      'Lembrete por e-mail utilizável como canal de spam ou phishing (risco alto)',
      'Leitura, alteração ou exclusão de dados de outra conta pelo id (IDOR)',
      'Falta de cabeçalhos de segurança, campos sem limite de tamanho, injeção de fórmula em CSV e zip bomb',
    ],
    participacao: 'Projeto próprio, do qual sou autor e mantenedor.',
    abordagem: [
      'Revisão da arquitetura e das permissões de cada camada: frontend, banco, função serverless e integrações',
      'Classificação dos achados por risco (alto, médio e baixo), com correção e teste para cada um',
      'Testes de banco que aplicam todas as migrações em um Postgres real em memória (PGlite): RLS, IDOR, chaves estrangeiras, SQL injection e limites',
      'Testes de configuração e frontend: CSP e cabeçalhos, segredos no bundle, injeção em CSV e arquivos maliciosos',
      'Testes da função serverless com a API externa simulada: 401, 404, 429, erros 5xx e tempo limite',
    ],
    ferramentas: ['Vitest', 'PGlite (Postgres)', 'TypeScript', 'Supabase (RLS)', 'npm audit'],
    resultados: [
      '13 achados documentados (2 de risco alto): 11 corrigidos, 1 mitigado e 1 dependente de ação externa (revogação de credenciais)',
      '62 testes de segurança passando e npm audit sem vulnerabilidades na conclusão da auditoria (01/11/2026)',
    ],
    limites: [
      'Migrações validadas em banco local (PGlite), não no projeto Supabase de produção',
      'Sem varredura dinâmica (OWASP ZAP) nem análise estática (Semgrep), recomendadas no relatório',
    ],
    evidencias: [
      { rotulo: 'Relatório técnico de segurança', href: `${REPOSITORIO}/blob/main/SEGURANCA.md` },
      { rotulo: 'Testes de segurança do banco', href: `${REPOSITORIO}/blob/main/tests/banco/seguranca.test.ts` },
      { rotulo: 'Testes de frontend e configuração', href: `${REPOSITORIO}/blob/main/tests/frontend/seguranca.test.ts` },
      { rotulo: 'Repositório completo', href: REPOSITORIO },
    ],
  },
]

/** Um caso só vai para a página com todos os campos obrigatórios e ao menos uma evidência https. */
export function casoPublicavel(caso: Caso): boolean {
  const textos = [caso.titulo, caso.tipo, caso.periodo, caso.contexto, caso.problema, caso.participacao]
  const listas = [caso.riscos, caso.abordagem, caso.ferramentas, caso.resultados, caso.evidencias]
  return (
    textos.every((t) => t.trim().length > 0) &&
    listas.every((l) => l.length > 0) &&
    caso.evidencias.every((e) => e.rotulo.trim().length > 0 && /^https:\/\//.test(e.href))
  )
}

export const CASOS_PUBLICADOS = CASOS.filter(casoPublicavel)

export const PUBLICACOES: Publicacao[] = [
  {
    id: 'aedes',
    area: 'Visão computacional',
    titulo: 'Aedes Aegypti egg count in ovitrap straws based on Deep Learning',
    descricao: 'Contagem automatizada de ovos do Aedes aegypti em palhetas de ovitrampas com Deep Learning.',
  },
  {
    id: 'inclusao',
    area: 'Extensão universitária',
    titulo: 'Digital Inclusion through Extensionist Actions in the Municipality of Picos-PI',
    descricao: 'Inclusão digital por meio de ações extensionistas no município de Picos (PI).',
  },
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

/** Como estão no currículo. O item da CCNA precisa de revisão: certificação oficial ou cursos da trilha? */
export const CERTIFICACOES: { nome: string; detalhe?: string }[] = [
  { nome: 'Scrum Foundation Professional Certificate (SFPC)' },
  { nome: 'CCNA Routing and Switching', detalhe: 'Conceitos Essenciais e Dimensionamento de Redes' },
]

export const IDIOMAS = [
  { idioma: 'Português', nivel: 'Nativo' },
  { idioma: 'Inglês', nivel: 'Proficiência profissional limitada' },
  { idioma: 'Espanhol', nivel: 'Proficiência profissional limitada' },
]

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
