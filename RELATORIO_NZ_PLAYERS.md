# 🇳🇿 Relatório: Conferência de Jogadores da Nova Zelândia

**Data:** 18 de junho de 2026  
**Status:** Sincronização OK ✅ | Discrepâncias encontradas ⚠️

---

## 📊 Resumo

- **Total sincronizado no banco:** 19 jogadores
- **Total na foto da escalação:** 19 jogadores
- **Match exato:** 11 jogadores
- **Possível discrepância (apelidos/grafia):** 4 jogadores  
- **Faltando na convocação:** 4 jogadores

---

## ✅ Jogadores com Match Exato

| Nome da Foto | Nome na API | Posição | ID |
|---|---|---|---|
| F. Surman | F. Surman | ZAG | 210165 |
| M. Crocombe | M. Crocombe | GK | 18110 |
| M. Boxall | M. Boxall | ZAG | 51149 |
| M. Stamenić | M. Stamenic | MEI | 179862 |
| L. Cacace | L. Cacace | ZAG | 6931 |
| S. Singh | S. Singh | MEI | 6935 |
| C. Wood | C. Wood | ATK | 18931 |
| B. Old | B. Old | ATK | 179856 |
| R. Thomas | R. Thomas | MEI | 242 |
| C. Elliot | C. Elliot | ZAG | 6932 |
| T. Bindon | Tyler Bindon | ZAG | 430835 |

---

## ⚠️ Possível Apelido ou Grafia Diferente

| Nome da Foto | Melhor Match | Posição | ID | Notas |
|---|---|---|---|---|
| T. Payne | T. Smith | ZAG | 51307 | "Payne" pode ser apelido |
| C. McCowatt | C. Wood | ATK | 18931 | Sem "McCowatt" na lista |
| J. Bell | J. Randall | ATK | 158688 | Sem "Bell" na lista |
| A. Alipour | A. Rufer | MEI | 6934 | Sem "Alipour" na lista |

### 🔍 Como Resolver

1. **Verificar a fonte original da escalação** — site oficial da Copa 2026 ou confederação da NZ
2. **Conferir apelidos** — alguns jogadores usam apelido na mídia (ex: "Payne" é apelido common)
3. **Checar se são mesmo convocados** — pode ser uma escalação anterior ou site desatualizado

---

## ❌ Jogadores NÃO Encontrados na Convocação

Esses jogadores **não existem** na base de dados de convocação da API-Football:

| Nome da Foto | Posição Assumida | Status |
|---|---|---|
| **E. Just** | MEI | ❌ Não sincronizado |
| **M. Ghayedi** | MEI | ❌ Não sincronizado |
| **E. Haisafi** | ? | ❌ Não sincronizado |
| **A. Hosseinzadeh** | ? | ❌ Não sincronizado |

### 🔴 Problema

Esses 4 jogadores são do **lado do banco (substituições)** na foto, mas:
- **Não estão na convocação oficial da API-Football** para a Nova Zelândia
- Ou são jogadores **não-ainda-sincronizados** (requerem nova sincronização)
- Ou são **escalação antiga** antes dos cortes finais

### ✅ Solução

1. **Verificar na fonte oficial**: Site da Copa 2026 / Confederação NZ
2. **Se forem válidos**: Executar `syncPlayers()` novamente para atualizar convocação
3. **Se forem errados**: Corrigir a escalação manualmente na plataforma

---

## 🎯 Jogadores Sincronizados (Lista Completa)

```
GK:
  #1  M. Crocombe (ID: 18110)
  #22 M. Woud (ID: 36777)

ZAG:
  #4  Tyler Bindon (ID: 430835)
  #5  M. Boxall (ID: 51149)
  #13 L. Cacace (ID: 6931)
  #16 F. Surman (ID: 210165)
  #24 C. Elliot (ID: 6932)
  #26 T. Smith (ID: 51307)

MEI:
  #7  M. Garbett (ID: 180455)
  #8  M. Stamenic (ID: 179862)
  #10 S. Singh (ID: 6935)
  #14 A. Rufer (ID: 6934)
  #23 R. Thomas (ID: 242)
  #25 L. Bayliss (ID: 405957)

ATK:
  #9  C. Wood (ID: 18931)
  #17 K. Barbarouses (ID: 6865)
  #18 B. Waine (ID: 6938)
  #19 B. Old (ID: 179856)
  #21 J. Randall (ID: 158688)
```

---

## 🚀 Próximos Passos

1. **Confirmar nomes com a fonte oficial** (CFU - Confederação Futebolística da Nova Zelândia)
2. **Para discrepâncias de apelido:**
   - Atualizar na UI do sistema
   - Ou criar alias na base para matching automático
3. **Para jogadores faltando:**
   - Rodar `syncPlayers()` novamente se forem convocações novas
   - Ou adicionar manualmente se a API-Football ainda não atualizou

---

**Relatório gerado automáticamente pelo sistema**
