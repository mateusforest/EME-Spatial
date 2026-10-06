# EME Spatial

Landing independente do EME Spatial, com uma jornada de criação em página separada.

## Executar localmente

Com Node.js 18 ou superior:

```sh
npm start
```

Abra http://127.0.0.1:4195. Não há dependências para instalar.

```sh
npm run check
```

## Páginas

- `/`: apresentação da plataforma e experiências.
- `/criar-projeto`: referências selecionáveis e briefing.

Edite `index.html`, `style.css` e `app.js`. As imagens prontas para publicação estão em `assets/`; sua geração não é necessária para executar o projeto.

## Hospedagem

Site estático, sem etapa de compilação. O `vercel.json` encaminha `/criar-projeto` para `index.html`. Em outras hospedagens, configure a mesma regra. O envio deste código ao GitHub não configura o domínio emespatial.com.

As experiências 3D continuam no EME Select e são abertas por links; a landing não as carrega em segundo plano.

## Briefing

O rascunho fica no localStorage do navegador e pode ser baixado em texto. Não há envio para servidor, recebimento de anexos ou serviço comercial conectado.

## Arquivos e imagens

As imagens conceituais e referências foram fornecidas ou produzidas para o projeto. G400 e Moradas da Serra usam as imagens correspondentes do EME Select. Não se presume licença aberta para esses materiais.

As pastas locais `conteudos/` e `unreal/`, os arquivos Blender, prévias e o script de preparação dependente do computador original não integram esta landing nem seu repositório.
