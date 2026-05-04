# Backlog Gamer

App mobile (Expo + React Native) para organizar seu backlog de jogos: wishlist, jogando, finalizados, sessões de gameplay, listas personalizadas e conquistas.

## Destaques

- Backlog com status (wishlist, backlog, jogando, finalizado, 100%, abandonado)
- Busca de jogos via RAWG (capa + metadados) ao adicionar
- Sessões de gameplay por jogo (tempo + anotação)
- Listas personalizadas (ex.: “Zerar 2026”, “Co-op”, “Platináveis”)
- Conquistas/achievements com notificações locais
- Autenticação (Login/Cadastro) com UI gamer
- Preparado para Supabase (Auth + banco)

## Stack

- Expo SDK 54, React Native, TypeScript
- React Navigation (tabs + stacks)
- AsyncStorage (persistência local)
- Supabase (`@supabase/supabase-js`) para autenticação e dados
- RAWG API (busca/metadados de jogos)

## Rodando o projeto

### 1) Instalar dependências

```bash
npm install
```

### 2) Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
EXPO_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="SUA_ANON_KEY"

# Opcional (RAWG)
EXPO_PUBLIC_RAWG_API_KEY="SUA_RAWG_API_KEY"
```

### 3) Iniciar o app

```bash
npm run start
```

## Supabase (configuração completa)

### 1) Criar projeto

1. Acesse https://supabase.com e crie um novo projeto
2. Pegue as credenciais em **Project Settings → API**:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - anon public key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
3. (Recomendado para dev) Em **Authentication → Providers → Email**, você pode desativar “Confirm email” para entrar automaticamente após cadastro.

### 2) Criar tabela `profiles` para username

No **SQL Editor** do Supabase, rode:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by owner"
on public.profiles for select
using (auth.uid() = id);

create policy "Profiles are insertable by owner"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
on public.profiles for update
using (auth.uid() = id);
```

### 3) Próximo passo no app (o que implementar)

O projeto já está com:
- cliente do Supabase configurado em `src/api/supabase.ts`
- login/cadastro por e-mail/senha integrado no fluxo existente
- sessão persistida automaticamente (AsyncStorage)

Sugestão de evolução (ordem prática):

1. **Salvar username no banco**  
   - Após o cadastro, inserir na tabela `profiles` usando `auth.users.id`.
2. **Sincronizar backlog com tabelas no Supabase**  
   - Criar tabelas `games`, `lists`, `sessions` (todas com `user_id` e RLS por `auth.uid()`).
3. **OAuth (Google) via Supabase**  
   - Configurar provider no Supabase e adicionar fluxo de deep link no Expo para `signInWithOAuth`.

## Scripts

- `npm run start` — inicia o Expo
- `npm run test` — roda os testes (Jest)
