# Confluence Space Exporter

## Sumário
- [Visão geral](#visão-geral)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
  - [Instalação via NPM (global)](#instalação-via-npm-global)
  - [Instalação via NPM local / no projeto](#instalação-via-npm-local--no-projeto)
  - [Instalação manual (clonando o repositório)](#instalação-manual-clonando-o-repositório)
  - [Uso do Docker](#uso-do-docker)
- [Configuração](#configuração)
- [Uso](#uso)
- [Exemplo](#exemplo)
- [Dúvidas comuns](#dúvidas-comuns)
- [Recursos adicionais](#recursos-adicionais)

## Visão geral

Confluence Space Exporter é uma ferramenta de linha de comando que exporta um espaço do Confluence para arquivos nos formatos **XML**, **HTML** ou **PDF**. Um caso de uso comum é a criação de backups e o arquivamento de espaços em um armazenamento externo.

A exportação em XML abrange praticamente todo o conteúdo de um espaço e permite que você restaure os dados em um servidor Confluence compatível. PDF e HTML cobrem apenas parte do conteúdo, porém geram arquivos prontos para leitura imediata, facilitando a distribuição.

| Conteúdo              | Exportação PDF | Exportação XML | Exportação HTML |
|-----------------------|----------------|----------------|-----------------|
| Páginas               | Sim            | Sim            | Sim             |
| Blogs                 | Não            | Sim            | Não             |
| Comentários           | Não            | Opcional       | Opcional        |
| Anexos                | Apenas imagens | Sim            | Sim             |
| Alterações não publicadas | Não       | Sim            | Não             |
| Numeração de páginas  | Opcional       | N/A            | N/A             |

## Requisitos

- **Node.js**: versão 14 LTS ou superior é recomendada para garantir compatibilidade com as dependências atuais.
- **Arquivo de variáveis de ambiente (`envvar`)**: defina protocolo, host, porta e credenciais de acesso ao seu Confluence. Um exemplo funcional está disponível no arquivo [`envvar`](./envvar).

## Instalação

### Instalação do Node.js

#### Ubuntu 24.04

Para instalar a versão mais recente do Node.js e do npm:

```
sudo apt update
sudo apt install curl -y

NODE_MAJOR=24
curl -sL https://deb.nodesource.com/setup_$NODE_MAJOR.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh

sudo apt install nodejs -y

# Verifique a instalação
node -v
npm -v
```

#### Rocky Linux 9

Para instalar Node.js e npm usando o NodeSource:

```
sudo dnf install -y curl

NODE_MAJOR=24
curl -sL https://rpm.nodesource.com/setup_$NODE_MAJOR.x | sudo bash -
sudo dnf install -y nodejs

# Verifique a instalação
node -v
npm -v
```

#### Windows

1. Acesse o site oficial: https://nodejs.org/en/download
2. Baixe o instalador Windows (.msi) recomendado para sua arquitetura.
3. Execute o instalador e siga as instruções na tela (Next > Next > Finish).
4. Abra o Prompt de Comando (cmd) e verifique a instalação:

```
node -v
npm -v
```

### Instalação via NPM (global)

Instale a CLI diretamente a partir deste repositório utilizando o NPM:

```
npm install -g marcuscabrera/Confluence-Space-Exporter
```

Após a instalação global, o comando `confluence-space-exporter` ficará disponível em qualquer diretório do seu sistema.

### Instalação via NPM local / no projeto

Para adicionar o exportador como dependência local, execute:

```
npm install marcuscabrera/Confluence-Space-Exporter
npx confluence-space-exporter -k SPACE_KEY -t xml
```

A execução via `npx` garante que a versão instalada no projeto seja utilizada, o que é útil para pipelines específicos ou repositórios que precisam versionar a ferramenta junto ao código.

### Instalação manual (clonando o repositório)

Este modo é ideal para contribuir com o projeto ou utilizá-lo diretamente a partir do código fonte.

```
git clone https://github.com/marcuscabrera/Confluence-Space-Exporter.git
cd Confluence-Space-Exporter
npm install
npm link
confluence-space-exporter -k SPACE_KEY -t xml
```

O comando `npm link` cria um link simbólico global para o executável do repositório clonado, permitindo testar alterações localmente antes de publicar uma nova versão.

### Uso do Docker

Para ambientes isolados ou execução em pipelines, você pode construir e executar uma imagem Docker utilizando o repositório:

```
docker build -t confluence-space-exporter .
docker run --rm \
  -e PROTOCOL=http \
  -e HOST=confluence.local \
  -e PORT=8090 \
  -e USERNAME=admin \
  -e PASSWORD=admin \
  confluence-space-exporter \
  -k SPACE_KEY -t xml
```

Monte os valores conforme o ambiente que você estiver utilizando. Você também pode criar um arquivo `docker.env` com pares `CHAVE=valor` (sem o prefixo `export`) e passá-lo com `--env-file docker.env`.

## Configuração

1. **Habilite a API remota** (XML-RPC & SOAP) no servidor Confluence, caso ainda não esteja ativa.

   ![remote_api](./lib/remote_api.png)

2. **Configure as variáveis de ambiente** necessárias para autenticação e comunicação com o Confluence. Utilize o arquivo de exemplo [`envvar`](./envvar) como base:

   ```
   source envvar
   ```

   Alternativamente, informe o caminho do arquivo diretamente ao executar o exportador:

   ```
   confluence-space-exporter --envvar ./envvar -k CAP -t xml
   ```

## Uso

```
Uso: confluence-space-exporter -k [key] -t [type] | --list-spaces | --page [id|title] -t [type]

Opções:
  --help          Mostra a ajuda                                      [boolean]
  --version       Mostra a versão                                      [boolean]
  -k, --key       Chave do espaço no Confluence            [obrigatório*]
  -t, --type      Tipo de exportação: xml, html ou pdf               [obrigatório]
  -l, --list-spaces Lista os espaços acessíveis ao usuário autenticado [boolean]
  -p, --page      Exporta somente a página informada (ID ou título)     [string]
  -c, --with-children Exporta recursivamente todas as subpáginas         [boolean]
  -v, --verbose   Ativa logs detalhados para troubleshooting            [boolean]
  -e, --envvar    Caminho para o arquivo de variáveis de ambiente

(* ) A flag `--key` continua obrigatória para exportações completas de espaço e também quando `--page` receber um título. Para exportar por ID, a chave do espaço é opcional.

Exemplos:
  confluence-space-exporter -k CAP -t xml
  confluence-space-exporter --envvar ./envvar -k CAP -t xml
  confluence-space-exporter --page "Guia de Integração" -k CAP -t html
  confluence-space-exporter --page 123456 --with-children -t html
  confluence-space-exporter -k CAP -t xml --verbose
  confluence-space-exporter --list-spaces
```

### Modo verbose

Utilize a flag opcional `--verbose` (ou `-v`) para habilitar um modo de execução com logs detalhados. Esse recurso é indicado para troubleshooting ou para acompanhar cada etapa do processo de exportação em ambientes avançados.

Quando ativado, o modo verbose exibe:

- Informações adicionais sobre as variáveis de configuração utilizadas (sem revelar senhas).
- Etapas de autenticação e chamadas à API do Confluence, incluindo respostas retornadas.
- Progresso detalhado do download, com registro de bytes transferidos e cabeçalhos HTTP.
- Relatórios de tempo de execução das principais fases (geração da exportação e download).
- Erros com stack trace completo para facilitar a identificação de problemas.

Exemplos:

```
confluence-space-exporter -k SPACE_KEY -t xml --verbose
confluence-space-exporter -k SPACE_KEY -t xml -v
```

### Exportação de páginas individuais

- Utilize `--page` (ou `-p`) para informar o **ID** ou o **título exato** de uma página. Para títulos, informe também o espaço via `--key` para evitar ambiguidades.
- Combine com `--with-children` (ou `-c`) para exportar automaticamente todas as subpáginas em qualquer profundidade, preservando a hierarquia em diretórios aninhados.
- Os formatos suportados para exportação individual são **HTML** (`-t html`) e **PDF** (`-t pdf`). O conteúdo principal é salvo em `index.html` (HTML) ou em um arquivo PDF nomeado com o ID da página.
- Em modo verbose (`--verbose`), o exportador exibe cada página processada, tempos de execução parciais e a árvore de diretórios criada.
- Se o Confluence retornar múltiplas páginas com o mesmo título, a execução é interrompida e a CLI lista os IDs encontrados para que você escolha o correto.
- Caso a página ou o ID não sejam encontrados, uma mensagem clara informa o motivo para agilizar o diagnóstico.

> **Atenção:** exportar páginas com um número muito grande de descendentes pode levar mais tempo e consumir recursos adicionais, pois cada página é recuperada individualmente via API. Em ambientes com milhares de páginas filhas, considere limitar a profundidade (não suportado atualmente) ou realizar exportações segmentadas.

### Listar espaços disponíveis

Utilize a flag `--list-spaces` (ou `-l`) para consultar, sem realizar exportações, todos os espaços que a conta autenticada tem permissão de visualizar. O comando pode ser combinado com `--verbose` para obter detalhes das chamadas à API.

```
confluence-space-exporter --list-spaces
```

Exemplo de saída:

```
Consulting Confluence for accessible spaces...
Found 3 spaces:

Key  Nome                    Tipo
CAP  Espaço principal        global
DOC  Documentação interna    global
USR  Espaço pessoal João     personal
```

Caso nenhum espaço seja retornado ou ocorra falha de autenticação, a CLI exibirá uma mensagem de erro amigável com orientações para revisar as credenciais e a conectividade com o Confluence.

## Exemplo

```
$ confluence-space-exporter -k SAN -t xml
Generating export file for space SAN ...
SAN space archiving file download link: http://localhost:8090/download/temp/Confluence-space-export-052036-20.xml.zip
SAN space download starting time: 2019-10-18 04:20:36
Downloading...
status code is: 200
SAN space export file size: 0.38 MB
3.98 % has been downloaded for SAN
20.31 % has been downloaded for SAN
36.65 % has been downloaded for SAN
46.86 % has been downloaded for SAN
61.15 % has been downloaded for SAN
63.20 % has been downloaded for SAN
69.32 % has been downloaded for SAN
71.36 % has been downloaded for SAN
75.45 % has been downloaded for SAN
77.49 % has been downloaded for SAN
79.53 % has been downloaded for SAN
83.62 % has been downloaded for SAN
87.70 % has been downloaded for SAN
89.74 % has been downloaded for SAN
93.83 % has been downloaded for SAN
95.87 % has been downloaded for SAN
97.91 % has been downloaded for SAN
99.95 % has been downloaded for SAN
100.00 % has been downloaded for SAN
SAN space download finished! localhost-SAN-sandbox.xml.zip
SAN space download ending time: 2019-10-18 04:20:36
```

## Dúvidas comuns

- **Onde devo guardar minhas credenciais?** Utilize um arquivo `envvar` fora do controle de versão ou variáveis de ambiente definidas diretamente no terminal ou contêiner.
- **Posso exportar múltiplos espaços em sequência?** Sim, basta chamar o comando repetidamente com diferentes valores de `-k` ou automatizar via script/scheduler.
- **O que fazer se o download falhar?** Verifique conectividade com o servidor Confluence, credenciais e se a API remota está habilitada. Consulte os logs do terminal ou do contêiner Docker para diagnosticar a falha.

## Recursos adicionais

- [Sandbox space pdf export](./lib/sandbox.pdf)
- [Issue tracker](https://github.com/marcuscabrera/Confluence-Space-Exporter/issues)
