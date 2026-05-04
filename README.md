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

### 3) Criar tabelas do app (jogos, listas, sessões)

No **SQL Editor** do Supabase, rode:

```sql
create table if not exists public.games (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  rawg_id integer,
  title text not null,
  cover_url text,
  description text,
  released text,
  genres text[] not null default '{}',
  platforms text[] not null default '{}',
  current_platform text,
  metacritic integer,
  status text not null,
  rating numeric,
  rating_note text,
  target_hours numeric,
  hltb jsonb,
  price_paid numeric,
  purchased_at_iso text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

create table if not exists public.lists (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

create table if not exists public.list_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id text not null,
  game_id text not null,
  primary key (user_id, list_id, game_id),
  foreign key (user_id, list_id) references public.lists(user_id, id) on delete cascade,
  foreign key (user_id, game_id) references public.games(user_id, id) on delete cascade
);

create table if not exists public.sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  game_id text not null,
  created_at timestamptz not null,
  minutes integer not null,
  note text,
  primary key (user_id, id),
  foreign key (user_id, game_id) references public.games(user_id, id) on delete cascade
);

create table if not exists public.achievements_unlocked (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null,
  primary key (user_id, achievement_id)
);

alter table public.games enable row level security;
alter table public.lists enable row level security;
alter table public.list_games enable row level security;
alter table public.sessions enable row level security;
alter table public.achievements_unlocked enable row level security;

create policy "Games are owned by user"
on public.games for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Lists are owned by user"
on public.lists for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "List games are owned by user"
on public.list_games for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Sessions are owned by user"
on public.sessions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Achievements are owned by user"
on public.achievements_unlocked for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### 4) Como a sincronização funciona no app

- Ao logar, o app tenta carregar os dados do Supabase.
- Se o Supabase estiver vazio e você já tiver dados locais, o app faz o seed inicial (upsert) e depois recarrega do banco.
- A cada alteração (adicionar/editar/remover jogo, sessão, lista e conquista), o app adiciona um evento numa fila offline e envia automaticamente quando estiver online.

### 5) O que ainda falta (opcional)

- OAuth (Google) via Supabase + deep links no Expo (`signInWithOAuth`)
- Cloud multi-device com resolução de conflito (atualmente o app faz upsert com IDs locais)

## Scripts

- `npm run start` — inicia o Expo
- `npm run test` — roda os testes (Jest)
