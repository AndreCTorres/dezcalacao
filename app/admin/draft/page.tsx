// app/admin/draft/page.tsx — tela de draft (registrada pelo admin).
// Fluxo: escolher membro -> buscar jogador na lista de convocados -> atribuir
// (validando "um por seleção" e os slots de posição) -> repetir -> "fechar draft".
// NÃO é ao vivo: o draft rola no Discord, aqui só registra o resultado.
export default function DraftAdmin() {
  return <main><h1>Draft</h1><p>TODO: atribuir jogadores aos membros e fechar o draft.</p></main>;
}
