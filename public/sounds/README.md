# Ringtone Assets

TODO: Adicione aqui um arquivo `ringtone.mp3` ou `ringtone.ogg` para substituir o
fallback WebAudio (oscilador). O widget usa WebAudio por padrão quando este arquivo
não existe, gerando um toque duplo-tom via OscillatorNode (440Hz + 480Hz).

Para usar o arquivo de áudio real, descomente o trecho comentado em
`incoming-call-toast.tsx` e coloque o arquivo aqui como `ringtone.mp3`.
