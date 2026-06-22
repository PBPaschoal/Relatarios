# Diário de Bordo — Relatórios Diários de TI

Sistema web desenvolvido para registrar e gerenciar atividades diárias de TI, com login multiusuário e geração automática de relatórios organizados e profissionais.

## Sobre o sistema

O sistema permite registrar atividades realizadas ao longo do dia de forma rápida e prática, direto do navegador (computador ou celular).

Ao criar uma nova atividade, o usuário pode informar manualmente o horário de início ou utilizar o horário atual sugerido pelo sistema. Caso a atividade permaneça em andamento, ela é sinalizada visualmente e pode ser encerrada com um toque — o sistema preenche automaticamente o horário de término. Também é possível editar esse horário manualmente, caso o encerramento não tenha sido registrado no momento correto.

Cada usuário tem sua própria conta e só visualiza seus próprios registros. Novas contas só podem ser criadas por um administrador.

### Funcionalidades

* Login multiusuário, com perfis de administrador e usuário comum.
* Cadastro de múltiplas atividades por dia.
* Edição e exclusão de atividades já registradas.
* Definição manual dos horários de início e término.
* Encerramento rápido de atividades em andamento.
* Navegação entre registros de diferentes datas.
* Geração automática do relatório diário.
* Cópia do relatório para a área de transferência.
* Exportação do relatório em PDF.
* Versão offline standalone, como backup em caso de instabilidade de internet.

### Tecnologias utilizadas

* **Front-end:** HTML, CSS e JavaScript puro (sem frameworks).
* **Back-end:** PHP, com autenticação via sessão e senhas com hash bcrypt.
* **Banco de dados:** MySQL.
* **Geração de PDF:** [jsPDF](https://github.com/parallax/jsPDF).
* **Hospedagem:** Hostinger.

### Objetivo

Centralizar o registro das atividades diárias de TI e facilitar a criação de relatórios organizados, reduzindo o tempo gasto com documentação manual e aumentando a precisão das informações registradas.