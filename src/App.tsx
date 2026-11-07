import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { Carregando } from '@/components/Carregando'
import { LayoutFinanceiro } from '@/components/layout/LayoutFinanceiro'
import { LayoutPessoal } from '@/components/layout/LayoutPessoal'
import { LayoutTriathlon } from '@/components/layout/LayoutTriathlon'
import { useAuth } from '@/hooks/useAuth'
import { supabaseConfigurado } from '@/lib/supabase'
import { ROTA_INICIO, ROTA_LOGIN, ROTA_MODULOS } from '@/modulos'
import ConfiguracaoAusente from '@/pages/ConfiguracaoAusente'
import Login from '@/pages/Login'
import Portfolio from '@/pages/Portfolio'
import SelecaoModulo from '@/pages/SelecaoModulo'

// Financeiro (sob demanda: quem só visita o portfólio não baixa o código do sistema)
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Contas = lazy(() => import('@/pages/Contas'))
const Categorias = lazy(() => import('@/pages/Categorias'))
const Historico = lazy(() => import('@/pages/Historico'))
const Economia = lazy(() => import('@/pages/Economia'))

// Triathlon
const PainelTriathlon = lazy(() => import('@/pages/triathlon/Painel'))
const TreinosTriathlon = lazy(() => import('@/pages/triathlon/Treinos'))
const AgendaTriathlon = lazy(() => import('@/pages/triathlon/Agenda'))
const EvolucaoTriathlon = lazy(() => import('@/pages/triathlon/Evolucao'))
const NutricaoTriathlon = lazy(() => import('@/pages/triathlon/Nutricao'))
const ProvasTriathlon = lazy(() => import('@/pages/triathlon/Provas'))
const CorpoTriathlon = lazy(() => import('@/pages/triathlon/Corpo'))
const PerfilAtletaTriathlon = lazy(() => import('@/pages/triathlon/PerfilAtleta'))

// Pessoal
const MeuDia = lazy(() => import('@/pages/pessoal/MeuDia'))
const Biblia = lazy(() => import('@/pages/pessoal/Biblia'))
const Leitura = lazy(() => import('@/pages/pessoal/Leitura'))
const Metas = lazy(() => import('@/pages/pessoal/Metas'))
const Habitos = lazy(() => import('@/pages/pessoal/Habitos'))
const Tarefas = lazy(() => import('@/pages/pessoal/Tarefas'))
const Diario = lazy(() => import('@/pages/pessoal/Diario'))

function Protegida({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (!sessao) return <Navigate to={ROTA_LOGIN} replace />
  return children
}

export default function App() {
  const { pathname } = useLocation()

  // O portfólio é público e não usa o banco: abre mesmo sem o Supabase configurado.
  if (!supabaseConfigurado && pathname !== ROTA_INICIO) return <ConfiguracaoAusente />

  return (
    <Suspense fallback={<Carregando />}>
      <Routes>
        {/* Página inicial pública: portfólio, com o botão "Acessar sistema" que leva ao login */}
        <Route path={ROTA_INICIO} element={<Portfolio />} />

        <Route path={ROTA_LOGIN} element={<Login />} />

        {/* Depois do login: escolha do módulo */}
        <Route
          path={ROTA_MODULOS}
          element={
            <Protegida>
              <SelecaoModulo />
            </Protegida>
          }
        />

        <Route
          path="/financeiro"
          element={
            <Protegida>
              <LayoutFinanceiro />
            </Protegida>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="economia" element={<Economia />} />
          <Route path="contas" element={<Contas />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="historico" element={<Historico />} />
        </Route>

        <Route
          path="/triathlon"
          element={
            <Protegida>
              <LayoutTriathlon />
            </Protegida>
          }
        >
          <Route index element={<PainelTriathlon />} />
          <Route path="treinos" element={<TreinosTriathlon />} />
          <Route path="agenda" element={<AgendaTriathlon />} />
          <Route path="evolucao" element={<EvolucaoTriathlon />} />
          <Route path="corpo" element={<CorpoTriathlon />} />
          <Route path="nutricao" element={<NutricaoTriathlon />} />
          <Route path="provas" element={<ProvasTriathlon />} />
          <Route path="perfil" element={<PerfilAtletaTriathlon />} />
        </Route>

        <Route
          path="/pessoal"
          element={
            <Protegida>
              <LayoutPessoal />
            </Protegida>
          }
        >
          <Route index element={<MeuDia />} />
          <Route path="biblia" element={<Biblia />} />
          <Route path="biblia/:livro/:capitulo" element={<Leitura />} />
          <Route path="metas" element={<Metas />} />
          <Route path="habitos" element={<Habitos />} />
          <Route path="tarefas" element={<Tarefas />} />
          <Route path="diario" element={<Diario />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
