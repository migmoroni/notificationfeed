# Profiles — Requisitos

## Definição

Profile é a entidade central do Notfeed. Representa uma identidade do usuário que agrega múltiplas Fonts (fontes de dados).

## Propriedades

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | string (UUID) | Sim (auto) | Identificador único |
| `name` | string | Sim | Nome de exibição |
| `avatarUrl` | string | Não | URL do avatar |
| `createdAt` | Date | Sim (auto) | Data de criação |
| `updatedAt` | Date | Sim (auto) | Última atualização |

## Regras de negócio

- Um usuário pode ter múltiplos Profiles (ex: "Pessoal", "Trabalho", "Tech News").
- Cada Profile possui suas próprias Fonts independentes.
- Deletar um Profile deleta em cascata todas as suas Fonts e posts associados.
- O nome do Profile deve ter entre 1 e 100 caracteres.

## Funcionalidades (MVP)

- [ ] Listar todos os profiles
- [ ] Criar novo profile
- [ ] Editar profile (nome, avatar)
- [ ] Deletar profile (com confirmação)
- [ ] Trocar entre profiles ativos
