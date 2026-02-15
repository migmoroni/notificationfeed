# Users — Requisitos

## Definição

User é a raiz de identidade do sistema. Existe em dois papéis mutuamente exclusivos: consumer e creator. Ambos podem coexistir no mesmo dispositivo.

## UserConsumer

Conta local de consumo. Nunca publica conteúdo.

### Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | Sim (auto) | Identificador único |
| `role` | `'consumer'` | Sim (fixo) | Papel do usuário |
| `displayName` | string [1..100] | Sim | Nome de exibição |
| `follows` | FollowRef[] | Não | Referências a CreatorPages e/ou UserCreators seguidos |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

### Capacidades

- Segue CreatorPages e UserCreators (via pubkey, QR code ou import JSON)
- Ativa/desativa CreatorPages, Profiles e Fonts (via ConsumerState)
- Cria Profiles standalone com Fonts manuais de terceiros
- Cria e gerencia categorias custom (organização livre)
- Armazena localmente: follows, posts recebidos, estados de ativação
- Sincronização online: futura

## UserCreator

Conta de criação. Gerencia CreatorPages, Profiles e Fonts.

### Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | Sim (auto) | Identificador único |
| `role` | `'creator'` | Sim (fixo) | Papel do usuário |
| `displayName` | string [1..100] | Sim | Nome de exibição |
| `nostrKeypair` | NostrKeypair | Não | Par de chaves Nostr (opcional até sincronizar) |
| `syncStatus` | `'local' \| 'synced'` | Sim | Estado de sincronização |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

### Capacidades

- Cria e gerencia uma ou mais CreatorPages
- Cria e gerencia Profiles e Fonts para suas Pages
- Pode sincronizar conta via Nostr (identidade)
- Pode sincronizar Pages via Blossom (artefato)
- Compartilha chave pública (texto ou QR code) para consumers seguirem
- Pode exportar CreatorPages como JSON (offline, sem Nostr)

## Regras de negócio

- Papéis consumer e creator são mutuamente exclusivos por conta.
- Um dispositivo pode ter múltiplas contas de ambos os tipos.
- Deletar um UserCreator deleta em cascata todas as suas CreatorPages.
- Deletar um UserConsumer remove follows, ConsumerStates e categorias custom locais.

## Funcionalidades (MVP)

- [ ] Criar conta consumer
- [ ] Criar conta creator
- [ ] Editar displayName
- [ ] Deletar conta (com confirmação e cascade)
- [ ] Trocar entre contas ativas
