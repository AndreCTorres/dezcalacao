# ⚡ Quick Reference: Adicionar Notas

## TL;DR (3 passos)

```bash
# 1. Sincronizar times (se necessário)
curl -X POST http://localhost:3000/api/sync-offline

# 2. Inserir ratings via admin UI
# Vá para: http://localhost:3000/admin/rodadas/[roundId]

# 3. Recalcular pontuação
# Clique em "Recalcular pontuação"
```

---

## URLs Importantes

| Página | URL |
|--------|-----|
| Admin Rodadas | `http://localhost:3000/admin/rodadas` |
| Admin Rodada X | `http://localhost:3000/admin/rodadas/[roundId]` |
| Dashboard Participante | `http://localhost:3000/app` |
| Verificar Status | `http://localhost:3000/api/sync-check` |

---

## Inserir Ratings (Manual - Copiar/Colar)

1. Vá para `/admin/rodadas/[roundId]`
2. Clique "Criar jogo" → Preencha times → "Criar jogo"
3. Clique no jogo criado
4. Cole no bulk text (formato `Nome Nota Minutos`):

```
Abunada 6.9 90
Khoukhi 6.4 90
P. Miguel 7.4 90
A. A. Oui 6.1 90
```

5. Clique "Preencher notas" → "Salvar jogo"

---

## Inserir Ratings (Automático - Script)

```bash
node scripts/seed-round1-ratings.mjs <groupId> <roundId>
```

**IDs para seu projeto:**
- Group: `15497f7b-d85d-4ade-9a39-2539f39f5742`
- Round: `e174fa07-277f-4cc2-a35d-274fcc1fe7ae`

---

## Checklist Pós-Inserção

- [ ] Todos os jogos têm notas?
- [ ] Clicou "Recalcular pontuação"?
- [ ] Notas aparecem em `/app`?
- [ ] Ranking atualizou?

---

## Documentação Completa

Ver: `/docs/ADDNOTAS_WORKFLOW.md`

