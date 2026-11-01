// Aplica o tema antes da renderização para evitar "piscar".
// Fica em arquivo próprio (e não embutido no HTML) para a Content-Security-Policy proibir scripts embutidos.
;(function () {
  try {
    var t = localStorage.getItem('tema') || 'sistema'
    var escuro = t === 'escuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches)
    if (escuro) document.documentElement.classList.add('dark')
  } catch (e) {}
})()
