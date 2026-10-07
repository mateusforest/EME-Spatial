# Torre M — iluminação e publicação 75

## Entrega

- Sol direcional com trajetória contínua entre manhã e noite, incidência inicial de 32° e extinção no horizonte. Direção artística nos eixos locais, não estudo solar georreferenciado.
- Céu, névoa, reflexão de ambiente e balanço entre sol e iluminação difusa calibrados juntos. Tons quentes na luz direta e preenchimento mais frio nas sombras.
- Um único mapa de sombra, com enquadramento adaptado ao rooftop, fachada, térreo e pavimento interno. Distância de recorte reduzida para melhorar precisão. Mantidos os limites de 1024/2048 e renderização por demanda.
- Apartamento 14: luz indireta aproximada nas aberturas e sombras de contato em resolução reduzida nos perfis Equilibrada/Alta. Perfil Leve permanece sem pós-processamento.
- Cinco lotes de folhagem, ramos e costuras extraídos da revisão 74 aprovada em Blender. 42.440 triângulos adicionais, arquivo de 1.172.748 bytes, exclusivo da cena isolada do apartamento. Nenhuma alteração de paredes, móveis, circulação ou sacada.
- O pacote adicional é opcional: uma falha de download conserva o paisagismo anterior e a navegação. As escolhas do configurador continuam nos materiais originais e privados do apartamento.
- Os carros detalhados do subsolo (6,35 MB) carregam somente ao visitar a garagem. A abertura do exterior mantém os veículos simplificados, sem aguardar esse arquivo ou suas texturas.
- Galeria pública com três imagens Cycles de 1600 × 900, originais PNG para download e vídeo de seis segundos em 720p. Prévias WebP somam 260.148 bytes. Vídeo sem reprodução ou download automático; fontes .blend permanecem locais.

## Validação

- TypeScript e build Vite aprovados. Aviso de tamanho do pacote Three.js já existente.
- Testes de continuidade/extinção solar, precisão/reuso da sombra, materiais configuráveis isolados e geometria original do pavimento aprovados.
- Navegador: rooftop, living e lobby em dia, entardecer e noite, sem erros de JavaScript. Zero quadros extras no intervalo ocioso de 1,2 segundo.
- Navegação do living neste computador: 72 intervalos amostrados por perfil; mediana 33,3 ms nos perfis Equilibrada e Leve; p95 33,5 / 33,6 ms. Limite de 30 fps respeitado. Não representa teste em outro equipamento físico.
- Apartamento e galeria verificados a 390 px sem transbordamento horizontal. Vídeo público validado com duração de 6 s e sem download antes da interação.
- Evidência local: `conteudos/light75/final/`. Contadores do interior incluem os passes de contato; exterior não recebeu passes adicionais.
- Build de produção local: rooftop pronto em 43,3 s neste teste com navegador novo, zero requisições de carros detalhados na abertura; navegação pelo menu até a garagem carregou seus 22 veículos uma única vez, sem erros de JavaScript. A cena exterior continua exigente na primeira abertura.

## Limites

O navegador continua usando Three.js; as imagens e o vídeo da galeria usam Cycles. A iluminação indireta web é aproximada, a paisagem distante continua simplificada e esta revisão não promete equivalência visual entre os dois motores. O modelo exterior ainda é denso; esta entrega melhora a iluminação sem acrescentar geometria à cena exterior.
