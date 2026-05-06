# Fluxo da Ingestao ao Post Renderizado

Este documento descreve o fluxo completo desde um tick de ingestao ate um
post aparecer na interface. O foco principal e separar duas coisas que nao
devem ser confundidas:

- descoberta de `imageUrl` e `videoUrl`;
- download real dos bytes da imagem ou do video.

## Resumo direto

Durante a ingestao, o Notfeed baixa o payload do feed/evento, extrai dados do
post e salva apenas metadados e URLs. Isso inclui `imageUrl` e `videoUrl`.

Durante a ingestao, o Notfeed nao baixa os arquivos de imagem/video apontados
por essas URLs.

Os bytes da imagem/video so sao requisitados quando a UI renderiza uma imagem,
um player, uma thumbnail ou um iframe. Ou seja: posts podem ficar salvos em
espera com `imageUrl`/`videoUrl` persistidos sem que a midia tenha sido baixada.

Depois que uma imagem e requisitada e carregada, o service worker guarda essa
resposta no cache runtime de imagens. Imagens nao usadas por mais de 30 dias
sao removidas.

## Visao em camadas

```text
Scheduler / Service Worker / UI refresh
        |
        v
PostManager.tick()
        |
        v
Font node ativa -> protocolos declarados na font
        |
        v
Client do protocolo: RSS / Atom / JSON Feed / Nostr
        |
        v
Normalizer: CanonicalPost protocol-agnostic
        |
        v
savePostsForUser(userId, posts)
        |
        v
IndexedDB / storage backend: store posts
        |
        v
Feed store le posts persistidos
        |
        v
PostCard / PostMedia renderizam sob demanda
        |
        v
Browser requisita imagem/video apenas se a UI precisar exibir
```

## 1. Disparo da ingestao

A ingestao comeca quando o `PostManager` executa um tick. Esse tick pode ser
disparado pela pagina, pelo service worker, por background sync, por periodic
sync ou por uma acao manual de refresh.

O `PostManager` escolhe quais fonts estao ativas e devidas para busca. Cada
font e um node de conteudo com role de font e pode declarar uma ou mais fontes
de protocolo.

Neste ponto, o sistema ainda nao esta lidando com imagens/video como arquivos.
Ele esta apenas decidindo quais feeds/eventos deve consultar.

## 2. Selecao do protocolo/source

Para cada font, o `PostManager` avalia as sources declaradas:

- RSS;
- Atom;
- JSON Feed;
- Nostr.

O pipeline considera score, backoff, circuit breaker, headers de cache e
failover. O primeiro protocolo que retorna sucesso encerra a tentativa daquele
tick para a font.

O resultado esperado de um client de protocolo e uma lista de posts ja
normalizados, prontos para persistencia.

## 3. Client do protocolo: captura do que e especifico

O client de cada protocolo busca o payload principal daquele protocolo:

- RSS/Atom/JSON Feed: documento XML ou JSON do feed;
- Nostr: eventos vindos dos relays.

O client faz captura especifica do protocolo. Exemplos:

- RSS/Atom: `media:thumbnail`, `media:content`, enclosures, players e campos
  equivalentes do namespace do feed;
- JSON Feed: `image`, `banner_image`, attachments e hints proprios do item;
- Nostr: tags do evento que apontam para imagem/video.

Essa captura produz strings, como `imageUrl` e `videoUrl`. Ela nao baixa a
imagem nem o video apontado por essas strings.

Regra de fronteira:

- client entende o formato especifico do protocolo;
- client captura hints de midia especificos do protocolo;
- client nao deve fazer trabalho generico de canonicalizacao;
- client nao deve baixar o arquivo de midia final.

## 4. Normalizer: canonicalizacao e fallback generico

Depois do client, o normalizer transforma o item/evento em `CanonicalPost`.

O normalizer faz:

- padronizacao de campos comuns (`id`, `title`, `content`, `url`, `author`,
  `publishedAt`, `ingestedAt`);
- escolha final de `imageUrl` e `videoUrl`;
- fallback generico quando o protocolo nao trouxe hint especifico, por exemplo
  procurando uma URL de imagem/video em HTML/texto ja presente no payload do
  feed;
- resolucao de qualidade/candidato de URL em tempo de ingestao.

Mesmo quando o normalizer examina HTML ou texto, ele esta examinando conteudo
que ja veio no payload do feed/evento. Ele nao faz uma segunda requisicao para
baixar a imagem/video.

O `CanonicalPost` resultante carrega URLs e metadados:

```ts
interface CanonicalPost {
  userId: string;
  nodeId: string;
  id: string;
  protocol: FontProtocol;
  title: string;
  content: string;
  url: string;
  author: string;
  publishedAt: number;
  ingestedAt: number;
  imageUrl?: string;
  videoUrl?: string;
  read: boolean;
  savedAt: number | null;
  trashedAt: number | null;
  notifiedAt: number | null;
}
```

## 5. Persistencia do post

O `PostManager` chama `savePostsForUser(userId, posts)` para cada usuario que
tem aquela font ativada.

O store de posts salva o post por caixa de usuario. A identidade principal do
post persistido e:

```text
userId + nodeId + postId
```

O registro salvo contem:

- dados textuais do post;
- URL original do post;
- `imageUrl`, quando descoberta;
- `videoUrl`, quando descoberta;
- estado por usuario (`read`, `savedAt`, `trashedAt`, `notifiedAt`).

Importante: o store de posts nao salva o binario da imagem/video dentro do
post. Ele salva apenas as URLs canonicalizadas. Isso deixa a ingestao leve e
permite que milhares de posts fiquem em espera sem baixar midias pesadas.

## 6. Post em espera

Depois de salvo, o post pode ficar no storage por tempo indeterminado sem ser
renderizado. Nessa fase:

- `imageUrl` pode existir no registro;
- `videoUrl` pode existir no registro;
- nenhuma requisicao para a imagem/video precisa ter acontecido;
- nenhuma imagem/video precisa estar no cache runtime ainda.

Esse e o estado desejado: a ingestao descobre e guarda referencias, mas nao
antecipa o custo de rede da midia.

## 7. Leitura pelo feed store

Quando a interface precisa mostrar o feed, o feed store le os posts
persistidos. Essa leitura tambem nao baixa midia. Ela apenas entrega os campos
do post para os componentes Svelte.

Neste ponto, a UI conhece `imageUrl` e `videoUrl`, mas ainda nao necessariamente
baixou os arquivos.

## 8. Renderizacao: quando a midia e realmente carregada

O download real da midia acontece quando o browser encontra elementos que
precisam exibir a midia.

### Imagem em card/lista

Em modos de card/lista, o `PostCard` pode calcular uma thumbnail com base em:

- `post.imageUrl`;
- thumbnail de embed quando a URL do post aponta para provider suportado;
- `post.videoUrl`, quando houver thumbnail derivavel.

Se a thumbnail existir, o componente renderiza um `<img loading="lazy">`.

Isso significa:

- o post salvo em storage nao baixa imagem sozinho;
- a imagem pode ser requisitada quando o card entra na area de renderizacao do
  usuario;
- o `loading="lazy"` delega ao browser o momento exato de buscar a imagem.

### Imagem dentro do post

No modo de post, `PostMedia` renderiza imagem quando `imageUrl` existe e nao ha
embed/video com prioridade. A imagem tambem usa `loading="lazy"`.

Entao a imagem e baixada apenas quando aquela parte da UI e renderizada e o
browser decide que precisa carrega-la.

### Video direto

Quando `videoUrl` e um arquivo de video direto, `PostMedia` renderiza um
`<video>` com:

```html
<video preload="metadata" controls playsinline>
```

Isso permite que o browser busque metadados quando o player aparece, mas evita
baixar o video inteiro antecipadamente. O download pesado tende a acontecer
quando o usuario interage/reproduz, sujeito ao comportamento do browser.

### YouTube e embeds

Para YouTube, ha uma fachada:

- primeiro renderiza uma thumbnail em `<img loading="lazy">`;
- o iframe real so e carregado quando o usuario clica para reproduzir;
- no hover, a UI pode fazer preconnect para aquecer DNS/TLS, mas isso nao baixa
  o video.

Para outros iframes suportados, o iframe pode carregar quando `PostMedia` e
renderizado, pois o proprio iframe e a midia daquele provider.

## 9. Cache runtime de imagens

O service worker possui cache runtime especifico para imagens.

Politica atual:

- cache-first para requests cujo `request.destination` e `image`;
- se a imagem ja esta no cache, retorna do cache e atualiza `lastUsed`;
- se nao esta no cache, busca na rede, salva no cache e registra `lastUsed`;
- maximo de 500 entradas;
- imagens sem uso por mais de 30 dias sao removidas;
- limpeza roda periodicamente e tambem na ativacao do service worker.

Esse cache e separado do store de posts. O post continua guardando apenas a URL;
o binario da imagem fica no Cache Storage do navegador, controlado pelo service
worker.

Consequencia pratica:

1. Primeira vez que a imagem aparece para o usuario: o browser baixa da rede e
   o service worker salva.
2. Proximas vezes dentro da janela de uso: o service worker serve do cache.
3. Se a imagem ficar sem uso por mais de 30 dias: ela pode ser removida e sera
   baixada novamente quando voltar a ser requisitada.

## 10. Videos e cache persistente

A politica explicita de cache runtime foi implementada para imagens.

Videos nao sao armazenados pelo service worker em cache persistente proprio do
Notfeed. Motivos:

- videos podem ser muito grandes;
- streaming/range requests exigem tratamento diferente de imagem simples;
- providers externos e iframes ja possuem politicas proprias;
- o app evita consumir armazenamento local de forma agressiva sem acao clara do
  usuario.

Ainda assim, o browser ou o provider podem aplicar cache HTTP proprio. Isso e
separado da politica explicita do Notfeed.

## 11. O que cada etapa baixa

| Etapa | Baixa feed/evento? | Baixa imagem? | Baixa video? | Salva imageUrl/videoUrl? |
|-------|--------------------|----------------|--------------|--------------------------|
| Client RSS/Atom/JSON Feed | Sim | Nao | Nao | Captura hints |
| Client Nostr | Sim, eventos de relay | Nao | Nao | Captura hints |
| Normalizer | Nao, usa payload recebido | Nao | Nao | Escolhe/canonicaliza |
| savePostsForUser | Nao | Nao | Nao | Persiste URLs no post |
| Feed store | Nao | Nao | Nao | Le URLs persistidas |
| PostCard thumbnail | Nao | Sim, se renderizada | Nao diretamente | Nao altera post |
| PostMedia imagem | Nao | Sim, se renderizada | Nao | Nao altera post |
| PostMedia video direto | Nao | Nao | Metadata quando renderizado; bytes conforme playback | Nao altera post |
| YouTube facade | Nao | Thumbnail quando renderizada | Iframe/video so apos clique | Nao altera post |

## 12. Contrato arquitetural

O contrato esperado e:

- ingestion/client captura informacao especifica do protocolo;
- normalizer produz `CanonicalPost` protocol-agnostic;
- persistence guarda o post e as URLs de midia;
- UI decide quando uma midia e necessaria para renderizacao;
- browser/service worker baixam a imagem sob demanda;
- service worker conserva imagens vistas e remove as nao usadas por 30 dias;
- videos continuam sob demanda, sem cache persistente proprio do app.

Em uma frase: a ingestao salva referencias de midia; a visualizacao carrega a
midia; o cache runtime evita baixar novamente imagens ja vistas recentemente.

## 13. Observacoes de ambiente

O service worker nao e registrado no modo dev. Portanto, em `npm run dev`, o
comportamento de cache persistente de imagens pode nao aparecer. Ele e esperado
em build/preview/producao, nas plataformas em que service worker esta ativo.

Sem service worker ativo, ainda pode haver cache HTTP normal do browser, mas
esse cache nao e a politica controlada pelo Notfeed.
