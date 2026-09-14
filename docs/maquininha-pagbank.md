# Cobrança automática na maquininha (PagBank / Moderninha Smart)

## Por que existe um app no meio

O PDV do DanJu roda no navegador. A Moderninha Smart não aceita comando de fora:
o SDK oficial do PagBank (**PlugPag**) só roda como app Android **dentro da própria
maquininha**. Não existe endpoint público do PagBank que mande a maquininha cobrar.

Então o fluxo é assíncrono, com o ERP como fila:

```
PDV (navegador)            Backend DanJu                 App na Moderninha
      |                          |                              |
      |-- POST /terminal-payments ->|                            |
      |<-- id, status PENDENTE ----|                             |
      |                          |<-- GET /terminal-agent/next --|  (polling ~1s)
      |                          |--- dados da cobrança -------->|
      |                          |                              | PlugPag: passa o cartão
      |-- GET /terminal-payments/{id} (polling 2s)               |
      |                          |<-- POST /{id}/result ---------|
      |<-- status APROVADO + NSU -|                              |
      |                          |                              |
      |-- POST /sales (com terminalPaymentId) -->|
```

O PDV nunca registra a venda por conta própria: ele manda o `terminalPaymentId`, e o
backend confere que aquela cobrança **está aprovada, tem o mesmo valor, e ainda não foi
usada em outra venda**. Cartão recusado não vira venda.

## Configuração

Tudo por variável de ambiente. Enquanto `TERMINAL_ENABLED=false` (o padrão), o backend
responde `enabled: false`, o botão "Cobrar na maquininha" não aparece e o PDV segue no
modo manual de hoje.

| Variável | Padrão | O que é |
|---|---|---|
| `TERMINAL_ENABLED` | `false` | Liga a cobrança automática |
| `TERMINAL_ID` | `CAIXA01` | Identificador da maquininha deste caixa |
| `TERMINAL_AGENT_TOKEN` | *(vazio)* | Segredo compartilhado com o app da maquininha |
| `TERMINAL_TIMEOUT_SECONDS` | `180` | Tempo que a cobrança fica válida esperando resposta |

Gere um token longo e aleatório e use **o mesmo** no app da maquininha. Com
`TERMINAL_ENABLED=true` e token vazio, o backend continua recusando — é proposital.

Com mais de um caixa, dê um `TERMINAL_ID` diferente para cada um e configure o app de
cada maquininha com o seu. Duas maquininhas com o mesmo ID disputariam a mesma cobrança.

## API consumida pelo app da maquininha

Não usa JWT — o app não pertence a um usuário logado. Autentica pelo header
`X-Terminal-Token`.

### Buscar a próxima cobrança

```http
GET /api/terminal-agent/next?terminalId=CAIXA01
X-Terminal-Token: <TERMINAL_AGENT_TOKEN>
```

`204 No Content` quando não há nada. Quando há:

```json
{
  "success": true,
  "data": {
    "id": "35a1131e-f8a5-47c8-be85-a9c052ac35b4",
    "amount": 87.50,
    "amountCents": 8750,
    "method": "CARTAO_CREDITO",
    "installments": 1,
    "plugPagType": "CREDITO"
  }
}
```

**Use `amountCents`**, não `amount`: o PlugPag recebe o valor em centavos. Mandar reais
cobraria cem vezes menos do cliente.

A chamada já marca a cobrança como assumida. Se o app chamar de novo antes de devolver
o resultado, recebe `204` — é o que impede o cartão de ser passado duas vezes.

### Devolver o resultado

```http
POST /api/terminal-agent/{id}/result
X-Terminal-Token: <TERMINAL_AGENT_TOKEN>
Content-Type: application/json

{
  "status": "APROVADO",
  "nsu": "000123456",
  "authorizationCode": "A1B2C3",
  "transactionCode": "...",
  "cardBrand": "VISA",
  "cardLast4": "4321",
  "receiptCustomer": "<via do cliente>",
  "receiptMerchant": "<via do estabelecimento>"
}
```

`status` aceita `APROVADO`, `RECUSADO` ou `CANCELADO`. Em recusa, mande `errorCode` e
`errorMessage` — o PDV mostra a mensagem para o operador.

Responder duas vezes na mesma cobrança dá `409`: a transação já aconteceu no cartão do
cliente, e reescrever o resultado faria o ERP divergir do extrato do PagBank.

## O app Android (a construir)

Um app enxuto, em kiosk mode na Moderninha Smart:

1. Dependência `br.com.uol.pagseguro.plugpagservice.wrapper` (PlugPag).
2. Ativação: `PlugPag.initializeAndActivatePinpad(PlugPagActivationData(codigoAtivacao))`
   — o código de ativação vem do painel PagBank.
3. Loop de polling em `GET /terminal-agent/next` a cada ~1s.
4. Ao receber tarefa, montar e executar:

```kotlin
val tipo = when (task.plugPagType) {
    "CREDITO" -> PlugPag.TYPE_CREDITO
    "DEBITO"  -> PlugPag.TYPE_DEBITO
    "PIX"     -> PlugPag.TYPE_PIX
    "VOUCHER" -> PlugPag.TYPE_VOUCHER
    else      -> error("tipo desconhecido")
}

val data = PlugPagPaymentData(
    type = tipo,
    amount = task.amountCents.toInt(),   // centavos
    installmentType = PlugPag.INSTALLMENT_TYPE_A_VISTA,
    installments = task.installments,
    userReference = task.id,             // amarra a transação à ordem do ERP
)

val result = plugPag.doPayment(data)
```

5. Postar o resultado. `result.result == PlugPag.RET_OK` → `APROVADO`; caso contrário
   `RECUSADO`, repassando `result.errorCode` e `result.message`.
6. **Sempre poste o resultado, inclusive em erro.** Se o app morrer no meio, a cobrança
   expira sozinha em `TERMINAL_TIMEOUT_SECONDS` e o PDV avisa o operador — mas aí ninguém
   sabe se o cartão passou. Um `try/finally` que reporta `CANCELADO` na falha evita isso.

O app precisa alcançar o backend pela rede da loja — use o IP da máquina do ERP, não
`localhost`.

## Conciliação

Cada pagamento da venda guarda `nsu`, `authorization_code`, `card_brand`, `card_last4` e
o `terminal_payment_id`, então dá para casar a venda do DanJu com a linha do extrato do
PagBank pelo NSU.
