// Aplica o tema antes da renderização para evitar "piscar".
// Fica em arquivo próprio (e não embutido no HTML) para a Content-Security-Policy proibir scripts embutidos.
;(function () {
  // Página inicial (portfólio, sempre escuro): fundo escuro desde o primeiro quadro, sem clarão branco
  // antes de o React montar. O portfólio tira a classe ao sair (para o sistema seguir o tema escolhido).
  if (location.pathname === '/') document.documentElement.classList.add('portfolio')
  try {
    var t = localStorage.getItem('tema') || 'sistema'
    var escuro = t === 'escuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches)
    if (escuro) document.documentElement.classList.add('dark')
  } catch (e) {}
})()
