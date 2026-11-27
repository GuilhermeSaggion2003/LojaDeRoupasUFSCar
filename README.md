# Sistema Web de Gestão – Loja de Roupa UFSCar

MVP acadêmico (PRJ-LRU-2026-001) da disciplina de Gestão de Projetos, feito pelo Grupo G11: André Alves Baggio Esteves, Guilherme Da Cunha Braga e Guilherme Saggion Moraes.

É uma SPA em React + TypeScript + Vite que se comunica diretamente com o Firebase (Authentication e Cloud Firestore) e é hospedada no Firebase Hosting. O custo monetário é R$ 0,00 (plano Spark).

| Módulo | Requisitos | Tela |
| --- | --- | --- |
| Login e perfis (Gerente / Funcionário) | RF01 | `/` |
| Catálogo de produtos | RF02, RF03 | `/produtos` |
| Movimentações e alertas de estoque | RF04 | `/estoque` |
| Frente de Caixa (venda, troca e devolução) e histórico | RF05, RF06 | `/vendas` |
| Relatórios (só Gerente) | EAP 2.6 | `/relatorios` |

## Pré-requisitos

- Node.js 20 ou mais recente e npm.
- **JDK 21**, necessário apenas para os emuladores do Firebase (testes de regras, testes de integração e execução offline).

```bash
npm ci
```

## Executar

| Comando | O que faz |
| --- | --- |
| `npm run dev` | App ligado ao projeto real do Firebase (precisa de internet). |
| `npm run emulators` | Sobe os emuladores de Auth e Firestore. Ao sair, salva os dados em `emulator-data/`. |
| `npm run seed:emulators` | Com os emuladores rodando, cria os usuários de demonstração e o catálogo com estoque. |
| `npm run dev:emulators` | App ligado aos emuladores locais, sem depender da internet (RNF04). |
| `npm run emulators:salvos` | Sobe os emuladores reaproveitando os dados salvos em `emulator-data/`. |

### Demonstração offline (RNF04 / contingência do risco R5)

```bash
# terminal 1
npm run emulators
# terminal 2
npm run seed:emulators
npm run dev:emulators
```

Usuários de demonstração (só existem no emulador):

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Gerente | `gerente@loja.demo` | `loja123` |
| Funcionário | `funcionario@loja.demo` | `loja123` |

No modo emulador, o app usa o projeto `demo-lojaderoupasufscar`, então nada é gravado no projeto real. A interface dos emuladores fica em <http://127.0.0.1:4000>.

## Testes e qualidade

| Comando | Escopo |
| --- | --- |
| `npm test` | Testes unitários das regras de negócio (`src/lib/*.test.ts`). |
| `npm run test:coverage` | Mesmos testes, com cobertura mínima de 80% (PGP, seção 5.2). |
| `npm run test:rules` | Regras de segurança (`firestore.rules`) no emulador. |
| `npm run test:integration` | Camada de dados real (produtos, estoque e vendas) contra as regras no emulador, terminando nos relatórios. |
| `npm run lint` / `npm run build` | ESLint, checagem de tipos e build de produção. |

## Publicação (A10)

```bash
npm run build
npx firebase deploy --only hosting,firestore:rules --project lojaderoupasufscar
```

## Estrutura

```
src/
  firebase.ts          inicialização do Firebase (e modo emulador)
  lib/*.ts             regras de negócio (funções puras, testadas)
  lib/*-db.ts          acesso ao Firestore (transações e listeners)
  components/, pages/  interface (responsiva: desktop e celular)
firestore.rules        regras de segurança por perfil
tests/                 testes de regras, de integração e stubs
scripts/               seed dos emuladores
```
