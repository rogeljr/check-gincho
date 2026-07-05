# Revisão técnica — 05/07/2026

## Resultado principal

O backend já sabia criptografar PDF com PDFKit, mas o aplicativo também criava um
comprovante local por `expo-print`. Esse arquivo local não tinha senha, porque
`expo-print` não oferece criptografia. A interface não deixava clara a diferença
entre o comprovante local e o PDF definitivo do servidor.

O fluxo foi alterado para:

- manter dados, fotos e assinatura disponíveis offline;
- gerar o PDF definitivo somente no backend;
- usar CPF do cliente (11 números) como senha de usuário;
- aceitar o CNPJ da empresa (14 números) como senha de proprietário;
- permitir regenerar PDFs antigos pela tela de detalhes;
- substituir o mesmo arquivo no Cloudinary e invalidar o cache;
- mostrar a política de senha na tela, sem exibir CPF/CNPJ completos;
- abrir a tela de detalhes ao tocar em um sinistro finalizado.

## Verificações executadas

- TypeScript do aplicativo: aprovado.
- Build TypeScript do backend: aprovado.
- ESLint: nenhum erro; 27 avisos preexistentes.
- Teste isolado do PDFKit: dicionário `/Encrypt` presente e texto do documento
  ausente em formato simples.
- Health check do Railway: HTTP 200 em 05/07/2026.

## Prioridade alta — próxima etapa

1. Fazer deploy do backend e gerar um novo APK/atualização do app.
2. Em produção, regenerar um sinistro de teste e validar em dois leitores de PDF:
   CPF abre; CNPJ abre; senha incorreta falha.
3. Remover ativos antigos do Cloudinary criados com nomes contendo timestamp.
4. Parar de devolver `pdf_url` pública na listagem e criar download autenticado
   ou URL assinada com validade curta.
5. Adicionar rate limiting em login, cadastro e redefinição de senha.
6. Eliminar o modo retrocompatível que aceita token quando não há sessões ativas,
   após uma migração controlada das contas existentes.

## Layout e experiência

1. Dividir “Novo sinistro” em etapas visuais: cliente, veículo, coleta, entrega,
   fotos, assinatura e revisão. A tela atual é longa e mistura edição e conclusão.
2. Criar componentes de design compartilhados (cores, espaçamento, campos,
   botões e cartões). Hoje os estilos são repetidos em muitas telas.
3. Mostrar progresso de sincronização por item e uma ação clara de tentar de novo.
4. Separar “editar rascunho” de “consultar finalizado”; esta revisão já inicia
   essa separação pela navegação da lista.
5. Substituir emojis usados como ícones por `MaterialIcons`, melhorando consistência
   entre Android/iOS e acessibilidade.
6. Adicionar estados de foco, mensagens junto ao campo e identificadores de
   acessibilidade nos botões principais.

## Dívida técnica observada

- `app/sinistro/novo.tsx` concentra formulário, GPS, assinatura, banco local e
  modelo HTML do PDF; deve ser dividido em hooks/serviços/componentes.
- Há geração HTML local agora inativa que pode ser removida em uma limpeza dedicada.
- Há 27 avisos de lint, principalmente dependências ausentes em hooks e código morto.
- Existem documentos antigos que descrevem mudanças manuais e podem divergir do
  código executado; consolidar documentação evitará diagnósticos falsos.
- O backend aceita payload JSON de até 50 MB; uploads diretos ou limites por rota
  reduziriam consumo de memória e risco de abuso.
- Logs de criação de sinistro deixaram de registrar o corpo completo nesta revisão,
  evitando CPF, telefone e assinatura nos logs.

## Observação de implantação

As alterações desta revisão estão no workspace local. O health check confirma que
o Railway está online, não que ele já esteja executando estas mudanças.
