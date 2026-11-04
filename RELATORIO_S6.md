# Relatório de Desenvolvimento — Semana 06
**Projeto:** Loja de Roupas UFSCar  
**Objetivo:** Implementação de A6 (Controle de estoque e alertas, RF04) e Início de A7 (Vendas / Frente de Caixa, RF05 e RF06)  
**Data:** 03 de novembro de 2026  

---

## 1. Testes Automatizados

### 1.1. Resumo Quantitativo
- **Testes Unitários Jest (Regras de Negócio):** **125 testes** (3 arquivos, 100% aprovados)
  - `src/lib/products.test.ts`: **40 testes**
  - `src/lib/estoque.test.ts`: **43 testes**
  - `src/lib/sales.test.ts`: **42 testes**
- **Testes das Regras de Segurança (Emulador do Cloud Firestore):** **45 testes** (`tests/firestore.rules.test.ts`, 100% aprovados)
- **Total Geral de Testes:** **170 testes automatizados**

---

### 1.2. Lista Nominal dos Testes Jest (Regras de Negócio)

#### A) `src/lib/products.test.ts` (40 testes)
1. `conversão de preço > converte reais em centavos sem erro de ponto flutuante`
2. `conversão de preço > interpreta "59,90" como 5990 centavos`
3. `conversão de preço > interpreta "59.90" como 5990 centavos`
4. `conversão de preço > interpreta "59,9" como 5990 centavos`
5. `conversão de preço > interpreta "59" como 5900 centavos`
6. `conversão de preço > interpreta "R$ 1.234,56" como 123456 centavos`
7. `conversão de preço > interpreta "1.234" como 123400 centavos`
8. `conversão de preço > interpreta "0,01" como 1 centavos`
9. `conversão de preço > interpreta "  149,90 " como 14990 centavos`
10. `conversão de preço > rejeita o valor inválido ""`
11. `conversão de preço > rejeita o valor inválido "   "`
12. `conversão de preço > rejeita o valor inválido "abc"`
13. `conversão de preço > rejeita o valor inválido "12,345"`
14. `conversão de preço > rejeita o valor inválido "-10"`
15. `conversão de preço > rejeita o valor inválido "1,2,3"`
16. `conversão de preço > rejeita o valor inválido "10.5.3"`
17. `conversão de preço > rejeita o valor inválido "R$"`
18. `conversão de preço > formata o preço para o campo do formulário`
19. `validateProductForm > aceita um cadastro válido e normaliza os campos`
20. `validateProductForm > aponta todos os campos obrigatórios vazios`
21. `validateProductForm > rejeita preço zero, inválido ou acima do limite`
22. `validateProductForm > rejeita categoria fora da lista e cor em formato inválido`
23. `validateProductForm > rejeita textos acima do tamanho máximo`
24. `findDuplicate > detecta mesmo nome, tamanho e cor ignorando acentos e maiúsculas`
25. `findDuplicate > permite outro tamanho do mesmo produto`
26. `findDuplicate > não acusa duplicidade com o próprio produto em edição`
27. `mapeamento do Firestore > converte um documento válido em produto (centavos para reais)`
28. `mapeamento do Firestore > ignora documento malformado (sem nome)`
29. `mapeamento do Firestore > ignora documento malformado (preço como texto)`
30. `mapeamento do Firestore > ignora documento malformado (categoria desconhecida)`
31. `mapeamento do Firestore > ignora documento malformado (sem cor)`
32. `mapeamento do Firestore > ignora documento malformado (sem estoque)`
33. `mapeamento do Firestore > gera o documento com os nomes de campo do banco`
34. `mapeamento do Firestore > preenche o formulário de edição a partir do produto`
35. `busca e filtro > retorna tudo sem busca e sem categoria`
36. `busca e filtro > busca por nome ignorando acentos e maiúsculas`
37. `busca e filtro > combina vários termos (nome, cor e tamanho)`
38. `busca e filtro > filtra por categoria junto com a busca`
39. `busca e filtro > ordena alfabeticamente por nome e tamanho`
40. `busca e filtro > reconhece apenas categorias cadastradas`

#### B) `src/lib/estoque.test.ts` (43 testes)
1. `validateMovement > fluxo principal (sucesso) > valida entrada com quantidade inteira positiva`
2. `validateMovement > fluxo principal (sucesso) > valida saída com quantidade menor que o estoque atual`
3. `validateMovement > fluxo principal (sucesso) > valida saída com quantidade exatamente igual ao estoque atual (zera o saldo)`
4. `validateMovement > fluxos alternativos e tratamento de erros > rejeita produtoId vazio`
5. `validateMovement > fluxos alternativos e tratamento de erros > rejeita tipo vazio`
6. `validateMovement > fluxos alternativos e tratamento de erros > rejeita quantidade inválida (vazio string)`
7. `validateMovement > fluxos alternativos e tratamento de erros > rejeita quantidade inválida (null)`
8. `validateMovement > fluxos alternativos e tratamento de erros > rejeita quantidade inválida (undefined)`
9. `validateMovement > fluxos alternativos e tratamento de erros > rejeita quantidade inválida (zero)`
10. `validateMovement > fluxos alternativos e tratamento de erros > rejeita quantidade inválida (negativo)`
11. `validateMovement > fluxos alternativos e tratamento de erros > rejeita quantidade inválida (decimal)`
12. `validateMovement > fluxos alternativos e tratamento de erros > rejeita quantidade inválida (NaN)`
13. `validateMovement > fluxos alternativos e tratamento de erros > rejeita quantidade inválida (Infinity)`
14. `validateMovement > fluxos alternativos e tratamento de erros > rejeita saída que excede o estoque atual (saldo insuficiente)`
15. `validateMovement > fluxos alternativos e tratamento de erros > rejeita saída quando o estoque atual é zero`
16. `calculateNewBalance > fluxo principal > soma quantidade no estoque existente em entrada`
17. `calculateNewBalance > fluxo principal > adiciona quantidade a estoque zerado em entrada`
18. `calculateNewBalance > fluxo principal > subtrai quantidade do estoque em saída`
19. `calculateNewBalance > fluxo principal > permite saída que zera o estoque (saldo 0)`
20. `calculateNewBalance > fluxo com erro (defesa em profundidade) > lança erro ao tentar retirar quantidade maior que o estoque`
21. `calculateNewBalance > fluxo com erro (defesa em profundidade) > lança erro ao tentar retirar de estoque já zerado`
22. `classifyStockLevel > classifica estoque zero como "Esgotado"`
23. `classifyStockLevel > classifica estoque entre 1 e LOW_STOCK_THRESHOLD como "Baixo"`
24. `classifyStockLevel > classifica estoque acima de LOW_STOCK_THRESHOLD como "Disponível"`
25. `classifyStockLevel > aceita threshold customizado`
26. `listAlerts > retorna lista vazia se todos os produtos estiverem com estoque normal`
27. `listAlerts > filtra e classifica produtos com estoque <= threshold`
28. `listAlerts > ordena "Esgotado" antes de "Baixo", e depois por nome alfabético (pt-BR)`
29. `listAlerts > permite passar threshold customizado`
30. `filterMovementsByCategory > retorna todas as movimentações quando categoria for "all"`
31. `filterMovementsByCategory > filtra movimentações apenas da categoria selecionada`
32. `filterMovementsByCategory > retorna vazio quando nenhum produto pertence à categoria`
33. `filterMovementsByCategory > ignora movimentação cujo produtoId não existe no categoryMap`
34. `filterProductsByCategory > retorna todos os produtos quando categoria for "all"`
35. `filterProductsByCategory > filtra produtos apenas da categoria informada`
36. `filterProductsByCategory > retorna array vazio quando nenhum produto pertence à categoria`
37. `formatMovementDate > formata objeto Date em data e hora no fuso horário de SP`
38. `describeEstoqueError > traduz FirebaseError "permission-denied" para mensagem clara`
39. `describeEstoqueError > traduz FirebaseError "unavailable" para mensagem clara`
40. `describeEstoqueError > traduz FirebaseError "not-found" para mensagem clara`
41. `describeEstoqueError > traduz FirebaseError "aborted" para mensagem clara`
42. `describeEstoqueError > traduz FirebaseError "unknown-code" para mensagem clara`
43. `describeEstoqueError > retorna mensagem genérica para erros desconhecidos ou genéricos`

#### C) `src/lib/sales.test.ts` (42 testes)
1. `calculateSubtotal > retorna 0 para lista vazia de itens`
2. `calculateSubtotal > calcula o subtotal de um único item em centavos`
3. `calculateSubtotal > soma múltiplos itens sem erro de ponto flutuante`
4. `calculateSubtotal > trata quantidades e preços negativos como zero`
5. `parseDiscountInput > interpreta a entrada "10" corretamente como 10`
6. `parseDiscountInput > interpreta a entrada "10%" corretamente como 10`
7. `parseDiscountInput > interpreta a entrada "15,50" corretamente como 15.5`
8. `parseDiscountInput > interpreta a entrada "R$ 25,00" corretamente como 25`
9. `parseDiscountInput > interpreta a entrada "0" corretamente como 0`
10. `parseDiscountInput > interpreta a entrada "" corretamente como 0`
11. `parseDiscountInput > interpreta a entrada "   " corretamente como 0`
12. `parseDiscountInput > interpreta a entrada "abc" corretamente como 0`
13. `parseDiscountInput > lida com números diretos`
14. `calculateDiscount > modo percentual (%) > calcula desconto percentual proporcional em centavos`
15. `calculateDiscount > modo percentual (%) > arredonda os centavos corretamente`
16. `calculateDiscount > modo percentual (%) > limita percentual máximo a 100% (nunca ultrapassa o subtotal)`
17. `calculateDiscount > modo valor em reais (R$) > converte o valor informado em reais para centavos`
18. `calculateDiscount > modo valor em reais (R$) > limita o desconto ao valor do subtotal quando o desconto é maior`
19. `calculateDiscount > restrições de regras e tipos de transação > retorna 0 para trocas e devoluções mesmo se houver desconto digitado`
20. `calculateDiscount > restrições de regras e tipos de transação > retorna 0 se o subtotal for zero ou negativo`
21. `calculateTotal > calcula o total subtraindo o desconto do subtotal`
22. `calculateTotal > retorna 0 quando desconto é igual ao subtotal`
23. `calculateTotal > nunca retorna total negativo mesmo se desconto for maior que subtotal`
24. `validateSale > valida uma venda coerente com sucesso`
25. `validateSale > rejeita venda com carrinho vazio`
26. `validateSale > rejeita tipo de transação inválido`
27. `validateSale > rejeita item sem produtoId`
28. `validateSale > rejeita item com quantidade zero ou decimal`
29. `validateSale > rejeita item com preço unitário zero ou inválido`
30. `validateSale > rejeita subtotal incoerente com os itens`
31. `validateSale > rejeita desconto em troca ou devolução`
32. `validateSale > rejeita desconto maior que o subtotal ou negativo`
33. `validateSale > rejeita total que não corresponde a subtotal - desconto`
34. `helpers de vendas > converte CartItem para SaleItem com precoUnitario em centavos`
35. `helpers de vendas > formata centavos para moeda brasileira via formatCents`
36. `helpers de vendas > gera barcode válido a partir do produto`
37. `describeSalesError > traduz erro "permission-denied" para mensagem clara`
38. `describeSalesError > traduz erro "unavailable" para mensagem clara`
39. `describeSalesError > traduz erro "not-found" para mensagem clara`
40. `describeSalesError > traduz erro "aborted" para mensagem clara`
41. `describeSalesError > traduz erro "unknown-code" para mensagem clara`
42. `describeSalesError > retorna mensagem genérica para erros não-Firebase`

---

### 1.3. Lista Nominal dos Testes das Regras no Emulador (`tests/firestore.rules.test.ts` — 45 testes)
1. `usuários > usuário lê o próprio perfil, mas não o de outro`
2. `usuários > funcionário não pode se promover a gerente`
3. `usuários > anônimo não lê perfis`
4. `produtos: consulta > gerente e funcionário consultam o catálogo`
5. `produtos: consulta > anônimo não consulta`
6. `produtos: cadastro > gerente cadastra um produto válido`
7. `produtos: cadastro > funcionário não cadastra produto`
8. `produtos: cadastro > rejeita produto com preço decimal`
9. `produtos: cadastro > rejeita produto com preço zero`
10. `produtos: cadastro > rejeita produto com nome vazio`
11. `produtos: cadastro > rejeita produto com categoria inexistente`
12. `produtos: cadastro > rejeita produto com cor sem hexadecimal válido`
13. `produtos: cadastro > rejeita produto com estoque inicial diferente de zero`
14. `produtos: cadastro > rejeita produto com campo extra`
15. `produtos: cadastro > rejeita produto com data de criação forjada`
16. `produtos: edição e exclusão > gerente edita os metadados do produto sem alterar estoque`
17. `produtos: edição e exclusão > edição direta do estoque pelo formulário é bloqueada`
18. `produtos: edição e exclusão > edição não pode alterar data de criação`
19. `produtos: edição e exclusão > funcionário não edita nem exclui`
20. `produtos: edição e exclusão > gerente exclui produto`
21. `produtos: atualização de estoque via movimentação atômica > gerente registra entrada de 5 unidades com batch atômico`
22. `produtos: atualização de estoque via movimentação atômica > gerente registra saída de 3 unidades com batch atômico`
23. `produtos: atualização de estoque via movimentação atômica > bloqueia batch com saldo incoerente na entrada (quantidade != diferença)`
24. `produtos: atualização de estoque via movimentação atômica > bloqueia batch com saldo incoerente na saída (quantidade != diferença)`
25. `produtos: atualização de estoque via movimentação atômica > bloqueia saída que resultaria em saldo negativo`
26. `produtos: atualização de estoque via movimentação atômica > bloqueia atualização de estoque sem movimentação correspondente`
27. `produtos: atualização de estoque via movimentação atômica > bloqueia batch com movimentação de produto diferente do produto atualizado`
28. `estoque: criação de movimentações > gerente cria movimentação de entrada válida`
29. `estoque: criação de movimentações > gerente cria movimentação de saída válida`
30. `estoque: criação de movimentações > funcionário não cria movimentação`
31. `estoque: criação de movimentações > anônimo não cria movimentação`
32. `estoque: criação de movimentações > rejeita movimentação com tipo inválido`
33. `estoque: criação de movimentações > rejeita movimentação com quantidade zero`
34. `estoque: criação de movimentações > rejeita movimentação com quantidade negativa`
35. `estoque: criação de movimentações > rejeita movimentação com quantidade decimal (float)`
36. `estoque: criação de movimentações > rejeita movimentação com produtoId vazio`
37. `estoque: criação de movimentações > rejeita movimentação com campo extra`
38. `estoque: criação de movimentações > rejeita movimentação com usuarioId diferente do uid autenticado`
39. `estoque: leitura > gerente lê o histórico de movimentações`
40. `estoque: leitura > funcionário lê o histórico de movimentações`
41. `estoque: leitura > anônimo não lê movimentações`
42. `estoque: imutabilidade (update e delete negados) > gerente não consegue atualizar uma movimentação existente`
43. `estoque: imutabilidade (update e delete negados) > gerente não consegue deletar uma movimentação`
44. `estoque: imutabilidade (update e delete negados) > funcionário não consegue deletar uma movimentação`
45. `vendas > funcionário registra venda, mas só o gerente consulta as vendas`

---

## 2. Tabela de Cobertura Jest (Meta do PGP: ≥ 80%)

| Arquivo | % Instruções (Stmts) | % Branches | % Funções (Funcs) | % Linhas | Meta PGP (≥ 80%) | Status |
|---|---|---|---|---|---|---|
| `src/lib/products.ts` | **100%** | **100%** | **100%** | **100%** | ≥ 80% | **Superada (+20%)** |
| `src/lib/estoque.ts` | **100%** | **100%** | **100%** | **100%** | ≥ 80% | **Superada (+20%)** |
| `src/lib/sales.ts` | **100%** | **92.72%** | **100%** | **100%** | ≥ 80% | **Superada (+12.72%)** |
| **Total Geral (All files)** | **100%** | **97.31%** | **100%** | **100%** | **≥ 80%** | **Superada (+17.31%)** |

---

## 3. Arquivos Criados e Alterados

| Arquivo | Resumo |
|---|---|
| `firestore.rules` | Regras de segurança com `movimentacaoValida`, validação de `getAfter()` para alteração de estoque via batch e rascunho de vendas. |
| `tests/firestore.rules.test.ts` | 45 testes automatizados no emulador cobrindo perfis, atomicidade de estoque, getAfter, imutabilidade e vendas. |
| `jest.config.js` | Configuração do Jest estendida para coletar cobertura dos 3 módulos de negócio (`products.ts`, `estoque.ts`, `sales.ts`). |
| `src/lib/estoque.ts` | Funções puras de negócio para validação de movimentação, cálculo de novo saldo, classificação de níveis e alertas de reposição. |
| `src/lib/estoque-db.ts` | Camada de acesso ao Firestore com `writeBatch` atômico para estoque e listener em tempo real (`subscribeMovements`). |
| `src/lib/estoque.test.ts` | Suíte com 43 testes unitários cobrindo fluxos felizes e exceções provocadas do controle de estoque. |
| `src/components/stock/stock-view.tsx` | Visão principal de estoque conectada ao Firestore em tempo real com controle de visibilidade por perfil. |
| `src/components/stock/stock-alerts.tsx` | Painel de cartões de nível de estoque (total/baixo/esgotado) e lista prioritária de alertas com ação rápida "Repor". |
| `src/components/stock/stock-toolbar.tsx` | Barra responsiva de filtro por categoria (Select para desktop e pills horizontais deslizáveis para mobile). |
| `src/components/stock/movement-form.tsx` | Formulário de entrada/saída integrado a batch atômico no Firestore com bloqueio de duplo envio e feedback. |
| `src/components/stock/movement-history.tsx` | Tabela desktop e lista de cards mobile para exibição em tempo real do histórico de movimentações. |
| `src/components/stock/movement-badge.tsx` | Componente de badge de movimentação e quantidade com sinal (`+` ou `−`) adaptado para `estoque.ts`. |
| `src/components/DashboardLayout.tsx` | Rota protegida permitindo acesso à consulta de estoque para `funcionario` e bloqueio de usuários não autenticados. |
| `src/components/app-shell/app-sidebar.tsx` | Menu lateral de navegação com item "Estoque" acessível para ambos os perfis autorizados. |
| `src/components/app-shell/mobile-nav.tsx` | Barra inferior mobile com item "Estoque" acessível para ambos os perfis autorizados. |
| `src/lib/sales.ts` | Schema do documento de venda e funções puras de cálculo de subtotal, desconto (valor/percentual) e total em centavos. |
| `src/lib/sales-db.ts` | Camada de acesso ao Firestore para persistência de vendas na coleção `vendas` com tratamento de erros. |
| `src/lib/sales.test.ts` | Suíte com 42 testes unitários para a lógica pura do PDV e Frente de Caixa. |
| `src/components/sales/pos-view.tsx` | Tela de Frente de Caixa conectada ao catálogo real de produtos e gravação de vendas no Firestore. |
| `src/components/sales/order-summary.tsx` | Resumo de pedido com cálculo preciso em centavos, alternância de modos de desconto e trava de submissão. |

---

## 4. Estrutura Final dos Documentos

### 4.1. Coleção `estoque` (Movimentações de Estoque)
Cada documento possui ID determinístico no formato `{produtoId}_{tipo}`:
```typescript
{
  produtoId: string,   // ID do documento correspondente na coleção 'produtos'
  tipo: string,        // 'entrada' | 'saida'
  quantidade: number,  // Número inteiro estritamente positivo (> 0)
  data: timestamp,     // Gravado via serverTimestamp()
  usuarioId: string    // UID do operador autenticado (request.auth.uid)
}
```
*Regras:* Apenas `create` é permitido (sem `update` nem `delete`). Campos extras são estritamente rejeitados via `.keys().hasOnly()`.

### 4.2. Coleção `vendas` (Transações Comerciais)
Cada documento possui ID gerado automaticamente pelo Firestore:
```typescript
{
  itens: Array<{
    produtoId: string,      // ID do produto na coleção 'produtos'
    nome: string,           // Nome do produto no momento da venda
    tamanho: string,        // Tamanho (ex: 'M', 'GG')
    cor: {
      nome: string,         // Nome da cor (ex: 'Azul-marinho')
      hex: string           // Hexadecimal (ex: '#1e2a5a')
    },
    quantidade: number,     // Quantidade vendida (inteiro > 0)
    precoUnitario: number   // Preço em centavos (inteiro > 0, ex: 5990 = R$ 59,90)
  }>,
  subtotal: number,         // Soma exata em centavos (inteiro >= 0)
  desconto: number,         // Valor do desconto em centavos (inteiro >= 0 e <= subtotal)
  total: number,            // Valor líquido final em centavos (subtotal - desconto)
  tipo: string,             // 'venda' | 'troca' | 'devolucao'
  data: timestamp,          // Gravado via serverTimestamp()
  usuarioId: string         // UID do operador autenticado no Firebase Auth
}
```

---

## 5. Regras de Segurança e o Uso de `getAfter()`

### 5.1. Trecho do `firestore.rules` (Novas Regras de `estoque` e `produtos`)

```javascript
    // -----------------------------------------------------------------------
    // Restrições de Produtos: Edição com verificação via getAfter()
    // -----------------------------------------------------------------------
    allow update: if request.auth != null && getPerfil() == 'gerente'
      && produtoValido(request.resource.data)
      && request.resource.data.criadoEm == resource.data.criadoEm
      && request.resource.data.atualizadoEm == request.time
      && (
        // Caminho 1 — edição de metadados: estoque inalterado
        request.resource.data.estoque == resource.data.estoque
        ||
        // Caminho 2 — atualização de estoque via movimentação atômica:
        (
          request.resource.data.estoque != resource.data.estoque
          && (
            // Verifica movimentação de entrada: saldo aumenta
            (
              request.resource.data.estoque > resource.data.estoque
              && existsAfter(/databases/$(database)/documents/estoque/$(produtoId + '_entrada'))
              && getAfter(/databases/$(database)/documents/estoque/$(produtoId + '_entrada')).data.produtoId == produtoId
              && getAfter(/databases/$(database)/documents/estoque/$(produtoId + '_entrada')).data.tipo == 'entrada'
              && getAfter(/databases/$(database)/documents/estoque/$(produtoId + '_entrada')).data.quantidade == (request.resource.data.estoque - resource.data.estoque)
            )
            ||
            // Verifica movimentação de saída: saldo diminui, nunca negativo
            (
              request.resource.data.estoque < resource.data.estoque
              && request.resource.data.estoque >= 0
              && existsAfter(/databases/$(database)/documents/estoque/$(produtoId + '_saida'))
              && getAfter(/databases/$(database)/documents/estoque/$(produtoId + '_saida')).data.produtoId == produtoId
              && getAfter(/databases/$(database)/documents/estoque/$(produtoId + '_saida')).data.tipo == 'saida'
              && getAfter(/databases/$(database)/documents/estoque/$(produtoId + '_saida')).data.quantidade == (resource.data.estoque - request.resource.data.estoque)
            )
          )
        )
      );

    // -----------------------------------------------------------------------
    // Restrições de Estoque: Imutabilidade e Perfis
    // -----------------------------------------------------------------------
    match /estoque/{movId} {
      // Gerente e funcionário lêem o histórico de movimentações
      allow read: if request.auth != null;

      // Apenas gerente pode criar movimentações; campos exatos validados
      allow create: if request.auth != null
        && getPerfil() == 'gerente'
        && movimentacaoValida(request.resource.data);

      // Movimentações são imutáveis: update e delete sempre negados
      allow update: if false;
      allow delete: if false;
    }
```

### 5.2. Explicação Técnica do Uso de `getAfter()`
A função `getAfter()` é um recurso do Cloud Firestore que permite consultar o estado projetado de um documento **após** a aplicação do conjunto de operações de um lote atômico (`writeBatch`) ou transação, mas **antes** do commit ser persistido definitivamente no banco.

No nosso design:
1. Um usuário não pode editar diretamente o campo `estoque` de um produto por um formulário comum (a regra bloqueia alterações de estoque desacompanhadas).
2. Para alterar o estoque, a aplicação cliente deve emitir um `writeBatch` contendo duas operações:
   - `batch.set(doc(estoqueRef, movId), { produtoId, tipo, quantidade, data, usuarioId })`
   - `batch.update(doc(produtosRef, produtoId), { estoque: novoSaldo, atualizadoEm: serverTimestamp() })`
3. A regra de segurança de `produtos` utiliza `existsAfter(...)` e `getAfter(...)` apontando para o caminho determinístico `/estoque/{produtoId}_{tipo}`. Ela verifica que o documento de movimentação realmente foi incluído no mesmo commit, que pertence àquele produto, que possui o tipo correto e que a diferença entre o estoque antigo e o novo saldo é **exatamente igual** à quantidade declarada na movimentação.
4. Caso alguém tente forjar um batch com saldo incoerente ou sem criar o documento de auditoria em `estoque`, a regra rejeita toda a operação atomicamente.

---

## 6. Decisões Tomadas

1. **Perfil que Registra Movimentações:**
   - **Gerente:** Possui privilégios para criar movimentações de estoque (entradas e saídas manuais) e consultar todo o histórico.
   - **Funcionário:** Acesso de consulta (leitura) liberado para que possa checar a disponibilidade de peças no atendimento aos clientes da loja, visualizar indicadores de nível e alertas de reposição, com bloqueio na submissão de movimentações (exibição de banner de "Modo de Consulta" na interface).
2. **Limite de Estoque Baixo:**
   - Definido na constante exportada `LOW_STOCK_THRESHOLD = 5`. Produtos com estoque igual a 0 são classificados como `Esgotado` (crítico); produtos com `1 <= estoque <= 5` são classificados como `Baixo`; e acima de 5 como `Disponível`.
3. **Transação vs. Batch Atômico:**
   - Adotou-se o `writeBatch` com IDs determinísticos (`{produtoId}_{tipo}`) para as movimentações de estoque. Essa abordagem simplifica o código do cliente sem a sobrecarga de retry de transações e permite que o `getAfter()` do Firestore Rules comprove a consistência sem necessidade de funções de backend Cloud Functions.

---

## 7. Percentual de Conclusão e Próximos Passos (A7)

- **A6 (Controle de Estoque e Alertas — RF04):** **100% concluído**.
  - Regras de segurança rigorosas com imutabilidade e validação via `getAfter()`.
  - Lógica pura de cálculo e alertas com 100% de cobertura de código.
  - Interface desktop/mobile completa com filtros, indicadores, alertas e histórico em tempo real.
- **A7 (Vendas e PDV — RF05 e RF06):** **60% concluído**.
  - Modelo de dados do documento de vendas definido e testado.
  - Frente de Caixa funcional com busca de produtos, carrinho, controle de quantidade e subtotal automático em centavos.
  - Mecanismo de descontos percentuais e por valor fixo com proteção contra estouro de subtotal.
  - Gravação de transações (venda, troca, devolução) na coleção `vendas` no Firestore.

### O que falta para a Semana 7 (A7):
1. **Abatimento Automático de Estoque na Venda:** Orquestrar o lote atômico no checkout do PDV para decrementar o estoque dos produtos e gerar os documentos correspondentes em `estoque` simultaneamente à criação da venda.
2. **Histórico e Relatórios de Vendas:** Tela gerencial para listagem, consulta e filtros de vendas por data, tipo e operador.
3. **Comprovante de Venda:** Geração de recibo imprimível/digital após a finalização da compra.

---

## 8. Problemas Encontrados e Como Foram Resolvidos

1. **Ambiente Windows e Binário do Jest no Emulador:**
   - *Problema:* O comando `firebase emulators:exec` no PowerShell não encontrava o binário global do `jest`.
   - *Solução:* Ajustou-se o script `test:rules` no `package.json` para invocar o executável local do Windows em `node_modules\.bin\jest.cmd -c jest.rules.config.js`.
2. **Erros de Tipagem no Build do Vite/TypeScript (`tsc -b`):**
   - *Problema:* Declaração de variáveis e imports não utilizados (`updateDoc`, `MovementType`, `location`, `ShoppingBag`) causavam erro `TS6133` com o compilador em modo estrito.
   - *Solução:* Todos os imports redundantes foram limpos e as propriedades mantidas por padrão de interface foram devidamente tratadas.
3. **Inconsistência de Nomenclatura no Mapeamento de Cores:**
   - *Problema:* O schema de `Product` utiliza `color.name` (inglês), enquanto o schema de `SaleItem` e as regras de segurança exigem `cor.nome` (português).
   - *Solução:* A função pura `cartItemToSaleItem` realiza a conversão explícita entre `{ name, hex }` e `{ nome, hex }`, assegurando tipagem estrita e conformidade com o Firestore Rules.

---

## 9. Comandos para Reproduzir os Testes e Sugestão de Commit

### 9.1. Comandos de Validação
```bash
# 1. Executar os 125 testes unitários de regras de negócio
npm test

# 2. Executar os testes unitários com relatório de cobertura (meta ≥ 80%)
npm run test:coverage

# 3. Executar os 45 testes de regras de segurança no emulador local do Firestore
npm run test:rules

# 4. Validar o build de produção (TypeScript + Vite)
npm run build
```

### 9.2. Mensagem de Commit Sugerida para o Pull Request
```text
feat(semana-6): implementar controle de estoque A6 e iniciar frente de caixa PDV A7

- Implementar regras de seguranca para colecao estoque com imutabilidade e getAfter()
- Adicionar 45 testes de regras no emulador cobrindo perfis, batch e saldo coerente
- Criar logica pura de controle de estoque e alertas (estoque.ts) com 100% de cobertura
- Criar camada de acesso estoque-db.ts com gravacao atomica e listener em tempo real
- Implementar interface completa de Estoque com indicadores, alertas e filtros responsivos
- Ajustar visibilidade por perfil no DashboardLayout, AppSidebar e MobileBottomNav
- Implementar logica de negocio e calculos em centavos para vendas (sales.ts)
- Implementar tela de Frente de Caixa (pos-view.tsx) com carrinho, descontos e gravacao no Firestore
- Adicionar 42 testes unitarios para vendas, alcancando 125 testes Jest totais (100% aprovados)
- Entregar RELATORIO_S6.md detalhado com cobertura, decisoes e documentacao de schemas
```
