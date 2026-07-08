# Euricca Balanço

MVP simples para controle de produtos e balanço de estoque.

## Stack
- Google Sheets: banco de dados
- Google Apps Script: API e autenticação
- GitHub: versionamento do frontend
- Vercel: hospedagem do frontend

## Recursos
- Login por e-mail e senha
- Sessões com validade de 12 horas
- Perfis ADMIN e EQUIPE
- Cadastro, edição e exclusão lógica de produtos
- Registro de quem criou e alterou cada produto
- Dashboard com produtos, peças, valor total e categorias
- Resumo por categoria
- Busca e filtro de produtos
- Gestão de usuários pelo administrador

## 1. Configurar Apps Script

1. Abra a planilha do projeto.
2. Vá em Extensões > Apps Script.
3. Substitua o conteúdo do arquivo `Code.gs` pelo conteúdo de `appsscript/Code.gs`.
4. No Apps Script, edite o bloco `ADMIN_INICIAL` dentro de `setupSistema()` e coloque seu nome, e-mail e uma senha inicial.
5. Execute `setupSistema()` uma vez e autorize o acesso.
6. Clique em Implantar > Nova implantação.
7. Tipo: Aplicativo da Web.
8. Executar como: você.
9. Quem pode acessar: qualquer pessoa.
10. Conclua e copie a URL terminada em `/exec`.

Importante: o acesso ao sistema continua protegido por login da própria aplicação. A opção “qualquer pessoa” é necessária para o frontend publicado na Vercel conseguir chamar a API.

## 2. Configurar frontend

No arquivo `script.js`, troque:

```js
const API_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT';
```

pela URL `/exec` copiada no Apps Script.

Depois envie estes arquivos para a raiz do repositório GitHub:
- `index.html`
- `style.css`
- `script.js`

## 3. Publicar na Vercel

1. Importe o repositório no Vercel.
2. Framework Preset: Other.
3. Build Command: deixe vazio.
4. Output Directory: deixe vazio.
5. Deploy.

## Acesso inicial

O primeiro administrador é aquele definido em `ADMIN_INICIAL` antes de executar `setupSistema()`.
Após entrar, acesse **Usuários** e crie os logins da equipe.

## Estrutura criada automaticamente na planilha

### Produtos
ID, Codigo, Produto, Categoria, Quantidade, ValorUnitario, ValorTotal, Observacao, CriadoEm, CriadoPor, AtualizadoEm, AtualizadoPor, Ativo

### Usuarios
ID, Nome, Email, Salt, SenhaHash, Perfil, Ativo, CriadoEm, CriadoPor, UltimoLogin

### Sessoes
Token, UsuarioID, ExpiraEm, CriadoEm
