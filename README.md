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
Uso: confluence-space-exporter -k [key] -t [type]

Opções:
  --help       Mostra a ajuda                                         [boolean]
  --version    Mostra a versão                                         [boolean]
  -k, --key    Chave do espaço no Confluence                         [obrigatório]
  -t, --type   Tipo de exportação: xml, html ou pdf                  [obrigatório]
  -e, --envvar Caminho para o arquivo de variáveis de ambiente

Exemplos:
  confluence-space-exporter -k CAP -t xml
  confluence-space-exporter --envvar ./envvar -k CAP -t xml
```

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
